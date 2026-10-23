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
  CreateLessonInput,
  UpdateLessonInput,
  ReorderLessonsInput,
  ListLessonsQueryInput,
} from "./lesson.schema";

/**
 * Parent module info returned with every lesson response.
 */
const lessonInclude = {
  module: {
    select: {
      id: true,
      title: true,
      order: true,
    },
  },
};

type CourseAccess = {
  id: string;
  teacherId: string;
  status: string;
};

function isOwnerOrAdmin(course: CourseAccess, user: AuthenticatedUser) {
  return user.role === "ADMIN" || course.teacherId === user.id;
}

/**
 * Loads a course's ownership/status fields or throws a 404.
 */
async function getCourseOrThrow(courseId: string): Promise<CourseAccess> {
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
 * Loads a module together with the course fields needed for authorization.
 */
async function getModuleOrThrow(moduleId: string) {
  const courseModule = await prisma.module.findUnique({
    where: { id: moduleId },
    select: {
      id: true,
      courseId: true,
      course: {
        select: {
          id: true,
          teacherId: true,
          status: true,
        },
      },
    },
  });

  if (!courseModule) {
    throw new AppError("Module not found", 404);
  }

  return courseModule;
}

/**
 * Archived courses are read-only (same rule as Courses and Modules).
 */
function assertCourseEditable(status: string) {
  if (status === "ARCHIVED") {
    throw new AppError("Archived courses cannot be edited", 400);
  }
}

/**
 * Students may only read lessons of a PUBLISHED course they are enrolled in.
 * Draft/archived courses stay hidden from non-owners (404, not 403).
 * Owner teachers and admins bypass the enrollment check.
 */
async function assertCanViewCourse(
  course: CourseAccess,
  user: AuthenticatedUser
): Promise<void> {
  if (course.status !== "PUBLISHED") {
    if (!isOwnerOrAdmin(course, user)) {
      throw new AppError("Course not found", 404);
    }
    return;
  }

  if (user.role !== "STUDENT") {
    return;
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: user.id,
        courseId: course.id,
      },
    },
    select: { id: true },
  });

  if (!enrollment) {
    throw new AppError("Enrollment required", 403);
  }
}

/**
 * Appends a new lesson after the last one of the module (order = max + 1).
 */
async function getNextOrder(moduleId: string): Promise<number> {
  const lastLesson = await prisma.lesson.findFirst({
    where: { moduleId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  return (lastLesson?.order ?? 0) + 1;
}

/**
 * Rejects an explicit `order` already used inside the module.
 * There is no unique constraint on (moduleId, order) because it would break
 * reordering, so this is enforced in the service layer.
 */
async function assertOrderAvailable(
  moduleId: string,
  order: number,
  ignoreLessonId?: string
) {
  const conflict = await prisma.lesson.findFirst({
    where: {
      moduleId,
      order,
      ...(ignoreLessonId ? { NOT: { id: ignoreLessonId } } : {}),
    },
    select: { id: true },
  });

  if (conflict) {
    throw new AppError("Lesson position already in use", 409);
  }
}

export async function createLesson(
  moduleId: string,
  data: CreateLessonInput,
  user: AuthenticatedUser
) {
  const courseModule = await getModuleOrThrow(moduleId);

  assertOwnerOrAdmin(courseModule.course.teacherId, user);
  assertCourseEditable(courseModule.course.status);

  let order: number;

  if (data.order !== undefined) {
    await assertOrderAvailable(moduleId, data.order);
    order = data.order;
  } else {
    order = await getNextOrder(moduleId);
  }

  return prisma.lesson.create({
    data: {
      title: data.title,
      content: data.content,
      videoUrl: data.videoUrl,
      order,
      moduleId,
    },
    include: lessonInclude,
  });
}

export async function listLessons(
  courseId: string,
  query: ListLessonsQueryInput,
  user: AuthenticatedUser
) {
  const course = await getCourseOrThrow(courseId);

  await assertCanViewCourse(course, user);

  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  const { skip, take } = getPagination(page, limit);

  const where = {
    module: {
      courseId,
    },
  };

  const [lessons, total] = await Promise.all([
    prisma.lesson.findMany({
      where,
      orderBy: [{ module: { order: "asc" } }, { order: "asc" }],
      skip,
      take,
      include: lessonInclude,
    }),
    prisma.lesson.count({ where }),
  ]);

  return buildPaginatedResponse(lessons, total, page, limit);
}

export async function getLessonById(id: string, user: AuthenticatedUser) {
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      videoUrl: true,
      order: true,
      moduleId: true,
      module: {
        select: {
          id: true,
          title: true,
          order: true,
          courseId: true,
          course: {
            select: {
              teacherId: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!lesson) {
    throw new AppError("Lesson not found", 404);
  }

  await assertCanViewCourse(
    {
      id: lesson.module.courseId,
      teacherId: lesson.module.course.teacherId,
      status: lesson.module.course.status,
    },
    user
  );

  return {
    id: lesson.id,
    title: lesson.title,
    content: lesson.content,
    videoUrl: lesson.videoUrl,
    order: lesson.order,
    moduleId: lesson.moduleId,
    module: {
      id: lesson.module.id,
      title: lesson.module.title,
      order: lesson.module.order,
    },
  };
}

export async function updateLesson(
  id: string,
  data: UpdateLessonInput,
  user: AuthenticatedUser
) {
  const existing = await prisma.lesson.findUnique({
    where: { id },
    include: {
      module: {
        select: {
          id: true,
          courseId: true,
          course: {
            select: {
              teacherId: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!existing) {
    throw new AppError("Lesson not found", 404);
  }

  assertOwnerOrAdmin(existing.module.course.teacherId, user);
  assertCourseEditable(existing.module.course.status);

  if (data.order !== undefined && data.order !== existing.order) {
    await assertOrderAvailable(existing.moduleId, data.order, existing.id);
  }

  try {
    return await prisma.lesson.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.videoUrl !== undefined && { videoUrl: data.videoUrl }),
        ...(data.order !== undefined && { order: data.order }),
      },
      include: lessonInclude,
    });
  } catch (error: any) {
    if (error?.code === "P2025") {
      throw new AppError("Lesson not found", 404);
    }
    throw error;
  }
}

export async function deleteLesson(id: string, user: AuthenticatedUser) {
  const existing = await prisma.lesson.findUnique({
    where: { id },
    include: {
      module: {
        select: {
          course: {
            select: {
              teacherId: true,
              status: true,
            },
          },
        },
      },
      _count: {
        select: {
          progress: true,
        },
      },
    },
  });

  if (!existing) {
    throw new AppError("Lesson not found", 404);
  }

  assertOwnerOrAdmin(existing.module.course.teacherId, user);
  assertCourseEditable(existing.module.course.status);

  // ERD §G (p.20): LessonProgress cascades when a lesson is deleted.
  // The count is returned so the client can warn about lost student progress.
  const deletedProgress = existing._count.progress;

  try {
    await prisma.lesson.delete({
      where: { id },
    });
  } catch (error: any) {
    if (error?.code === "P2025") {
      throw new AppError("Lesson not found", 404);
    }
    throw error;
  }

  // Ordering gap is intentionally NOT closed here: Modules API uses the same
  // behaviour and `PUT .../lessons/reorder` normalises positions to 1..N.
  return { id: existing.id, deletedProgress };
}

/**
 * Atomically replaces the ordering of every lesson inside a module.
 *
 * Validation:
 * 1. The payload must contain every lesson of the module (no extras/missing).
 * 2. Positions must be 1..N with no gaps.
 * Zod already guarantees unique ids and unique positive positions.
 */
export async function reorderLessons(
  moduleId: string,
  data: ReorderLessonsInput,
  user: AuthenticatedUser
) {
  const courseModule = await getModuleOrThrow(moduleId);

  assertOwnerOrAdmin(courseModule.course.teacherId, user);
  assertCourseEditable(courseModule.course.status);

  const existingLessons = await prisma.lesson.findMany({
    where: { moduleId },
    select: { id: true },
  });

  if (existingLessons.length === 0) {
    throw new AppError("Module has no lessons to reorder", 400);
  }

  const existingIds = new Set(existingLessons.map((lesson) => lesson.id));
  const providedIds = data.lessons.map((lesson) => lesson.id);

  const coversEveryLesson =
    providedIds.length === existingLessons.length &&
    providedIds.every((id) => existingIds.has(id));

  if (!coversEveryLesson) {
    throw new AppError(
      "Provided lessons do not match the lessons of this module",
      400
    );
  }

  const positions = data.lessons
    .map((lesson) => lesson.order)
    .sort((a, b) => a - b);

  const isSequential = positions.every(
    (position, index) => position === index + 1
  );

  if (!isSequential) {
    throw new AppError(
      "Lesson positions must be sequential starting from 1",
      400
    );
  }

  await prisma.$transaction(
    data.lessons.map((lesson) =>
      prisma.lesson.update({
        where: { id: lesson.id },
        data: { order: lesson.order },
      })
    )
  );

  return prisma.lesson.findMany({
    where: { moduleId },
    orderBy: { order: "asc" },
    include: lessonInclude,
  });
}
