import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";
import {
  assertOwnerOrAdmin,
  type AuthenticatedUser,
} from "../lms-shared/ownership";
import {
  getPagination,
  buildPaginatedResponse,
} from "../lms-shared/pagination";
import type {
  CreateModuleInput,
  UpdateModuleInput,
  ReorderModulesInput,
  ListModulesQueryInput,
} from "./course-module.schema";

/**
 * Shared Prisma select used by module responses.
 * `_count.lessons` tells the client how many lessons the module holds
 * (needed by the frontend to show curriculum size and to disable delete).
 */
const moduleCounts = {
  _count: {
    select: {
      lessons: true,
    },
  },
};

/**
 * Loads a course's ownership/status fields or throws a 404.
 * Only the fields needed for authorization checks are selected.
 */
async function getCourseOrThrow(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      teacherId: true,
      status: true,
    },
  });

  if (!course) {
    throw new AppError("Course not found", 404);
  }

  return course;
}

/**
 * Archived courses are read-only (same rule as the Courses module).
 */
function assertCourseEditable(status: string) {
  if (status === "ARCHIVED") {
    throw new AppError("Archived courses cannot be edited", 400);
  }
}

/**
 * Students may only see modules of PUBLISHED courses.
 * Non-owner teachers and other users get a 404 (not 403) so draft
 * courses are never leaked — same behaviour as `getCourseById`.
 */
function assertCanViewCourse(
  course: { status: string; teacherId: string },
  user: AuthenticatedUser
) {
  if (course.status === "PUBLISHED") {
    return;
  }

  const isOwner = course.teacherId === user.id;
  const isAdmin = user.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    throw new AppError("Course not found", 404);
  }
}

/**
 * Appends a new module after the last one (order = max + 1).
 */
async function getNextOrder(courseId: string): Promise<number> {
  const lastModule = await prisma.module.findFirst({
    where: { courseId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  return (lastModule?.order ?? 0) + 1;
}

/**
 * Rejects an explicit `order` that is already taken inside the course.
 * The database has no unique constraint on (courseId, order) because that
 * would break reordering, so this check is enforced in the service layer.
 */
async function assertOrderAvailable(
  courseId: string,
  order: number,
  ignoreModuleId?: string
) {
  const conflict = await prisma.module.findFirst({
    where: {
      courseId,
      order,
      ...(ignoreModuleId ? { NOT: { id: ignoreModuleId } } : {}),
    },
    select: { id: true },
  });

  if (conflict) {
    throw new AppError("Module position already in use", 409);
  }
}

export async function createModule(
  courseId: string,
  data: CreateModuleInput,
  user: AuthenticatedUser
) {
  const course = await getCourseOrThrow(courseId);

  assertOwnerOrAdmin(course.teacherId, user);
  assertCourseEditable(course.status);

  let order: number;

  if (data.order !== undefined) {
    await assertOrderAvailable(courseId, data.order);
    order = data.order;
  } else {
    order = await getNextOrder(courseId);
  }

  return prisma.module.create({
    data: {
      title: data.title,
      description: data.description,
      order,
      courseId,
    },
    include: moduleCounts,
  });
}

export async function listModules(
  courseId: string,
  query: ListModulesQueryInput,
  user: AuthenticatedUser
) {
  const course = await getCourseOrThrow(courseId);

  assertCanViewCourse(course, user);

  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  const { skip, take } = getPagination(page, limit);

  const [modules, total] = await Promise.all([
    prisma.module.findMany({
      where: { courseId },
      orderBy: { order: "asc" },
      skip,
      take,
      include: moduleCounts,
    }),
    prisma.module.count({ where: { courseId } }),
  ]);

  return buildPaginatedResponse(modules, total, page, limit);
}

export async function updateModule(
  id: string,
  data: UpdateModuleInput,
  user: AuthenticatedUser
) {
  const existing = await prisma.module.findUnique({
    where: { id },
    include: {
      course: {
        select: {
          teacherId: true,
          status: true,
        },
      },
    },
  });

  if (!existing) {
    throw new AppError("Module not found", 404);
  }

  assertOwnerOrAdmin(existing.course.teacherId, user);
  assertCourseEditable(existing.course.status);

  if (data.order !== undefined && data.order !== existing.order) {
    await assertOrderAvailable(existing.courseId, data.order, existing.id);
  }

  try {
    return await prisma.module.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.order !== undefined && { order: data.order }),
      },
      include: moduleCounts,
    });
  } catch (error: any) {
    if (error?.code === "P2025") {
      throw new AppError("Module not found", 404);
    }
    throw error;
  }
}

export async function deleteModule(id: string, user: AuthenticatedUser) {
  const existing = await prisma.module.findUnique({
    where: { id },
    include: {
      course: {
        select: {
          teacherId: true,
          status: true,
        },
      },
      _count: {
        select: {
          lessons: true,
        },
      },
    },
  });

  if (!existing) {
    throw new AppError("Module not found", 404);
  }

  assertOwnerOrAdmin(existing.course.teacherId, user);
  assertCourseEditable(existing.course.status);

  // ERD §G: deleting a module cascades to its lessons (and, through them,
  // to LessonProgress). This is intentional — curriculum content only
  // exists inside its parent module. The count is returned so the client
  // can warn the teacher about the data that was removed.
  const deletedLessons = existing._count.lessons;

  try {
    await prisma.module.delete({
      where: { id },
    });
  } catch (error: any) {
    if (error?.code === "P2025") {
      throw new AppError("Module not found", 404);
    }
    throw error;
  }

  // Ordering gap is intentionally NOT closed here: the existing Courses
  // and Categories modules have no equivalent "shift positions" pattern,
  // and `PUT .../modules/reorder` already normalises positions to 1..N.
  return { id: existing.id, deletedLessons };
}

/**
 * Atomically replaces the ordering of every module in a course.
 *
 * Validation:
 * 1. The payload must contain every module of the course (no extras, no missing).
 * 2. Positions must be 1..N with no gaps, so the curriculum always renders
 *    in a predictable order.
 * Zod already guarantees unique ids and unique positive positions.
 */
export async function reorderModules(
  courseId: string,
  data: ReorderModulesInput,
  user: AuthenticatedUser
) {
  const course = await getCourseOrThrow(courseId);

  assertOwnerOrAdmin(course.teacherId, user);
  assertCourseEditable(course.status);

  const existingModules = await prisma.module.findMany({
    where: { courseId },
    select: { id: true },
  });

  if (existingModules.length === 0) {
    throw new AppError("Course has no modules to reorder", 400);
  }

  const existingIds = new Set(existingModules.map((module) => module.id));
  const providedIds = data.modules.map((module) => module.id);

  const coversEveryModule =
    providedIds.length === existingModules.length &&
    providedIds.every((id) => existingIds.has(id));

  if (!coversEveryModule) {
    throw new AppError(
      "Provided modules do not match the modules of this course",
      400
    );
  }

  const positions = data.modules
    .map((module) => module.order)
    .sort((a, b) => a - b);

  const isSequential = positions.every(
    (position, index) => position === index + 1
  );

  if (!isSequential) {
    throw new AppError(
      "Module positions must be sequential starting from 1",
      400
    );
  }

  await prisma.$transaction(
    data.modules.map((module) =>
      prisma.module.update({
        where: { id: module.id },
        data: { order: module.order },
      })
    )
  );

  return prisma.module.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    include: moduleCounts,
  });
}
