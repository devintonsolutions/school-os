import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";
import { assertOwnerOrAdmin, type AuthenticatedUser } from "../lms-shared/ownership";
import { getPagination, buildPaginatedResponse } from "../lms-shared/pagination";
import type {
  CreateCourseInput,
  UpdateCourseInput,
  ListCoursesQueryInput,
  CourseStatus,
} from "./course.schema";

const teacherSelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
};

const categorySelect = {
  id: true,
  name: true,
  description: true,
};

export async function createCourse(data: CreateCourseInput, teacherId: string) {
  if (data.categoryId) {
    const categoryExists = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!categoryExists) {
      throw new AppError("Category not found", 404);
    }
  }

  return prisma.course.create({
    data: {
      title: data.title,
      description: data.description,
      thumbnail: data.thumbnail,
      categoryId: data.categoryId,
      teacherId,
      status: "DRAFT",
    },
    include: {
      teacher: { select: teacherSelect },
      category: { select: categorySelect },
    },
  });
}

export async function listCourses(
  query: ListCoursesQueryInput,
  user: AuthenticatedUser
) {
  const { skip, take } = getPagination(query.page, query.limit);

  const whereConditions: any[] = [];

  // 1. Role-based visibility
  if (user.role === "STUDENT") {
    whereConditions.push({ status: "PUBLISHED" });
  } else if (user.role === "TEACHER") {
    if (query.status) {
      if (query.status === "PUBLISHED") {
        whereConditions.push({ status: "PUBLISHED" });
      } else {
        // Teacher searching for non-published courses can only see their own
        whereConditions.push({
          status: query.status,
          teacherId: user.id,
        });
      }
    } else {
      whereConditions.push({
        OR: [
          { status: "PUBLISHED" },
          { teacherId: user.id },
        ],
      });
    }
  } else if (user.role === "ADMIN") {
    if (query.status) {
      whereConditions.push({ status: query.status });
    }
  }

  // 2. Category filter
  if (query.categoryId) {
    whereConditions.push({ categoryId: query.categoryId });
  }

  // 3. Search filter
  if (query.search) {
    whereConditions.push({
      OR: [
        { title: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ],
    });
  }

  const where = whereConditions.length > 0 ? { AND: whereConditions } : {};

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        teacher: { select: teacherSelect },
        category: { select: categorySelect },
        _count: {
          select: {
            modules: true,
            enrollments: true,
          },
        },
      },
    }),
    prisma.course.count({ where }),
  ]);

  return buildPaginatedResponse(courses, total, query.page ?? 1, query.limit ?? 10);
}

export async function listMyCourses(
  query: { page?: number; limit?: number },
  teacherId: string
) {
  const { skip, take } = getPagination(query.page, query.limit);
  const where = { teacherId };

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: categorySelect },
        _count: {
          select: {
            modules: true,
            enrollments: true,
          },
        },
      },
    }),
    prisma.course.count({ where }),
  ]);

  return buildPaginatedResponse(courses, total, query.page ?? 1, query.limit ?? 10);
}

export async function getCourseById(
  id: string,
  user: AuthenticatedUser
) {
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      teacher: { select: teacherSelect },
      category: { select: categorySelect },
      modules: {
        orderBy: { order: "asc" },
        include: {
          lessons: {
            orderBy: { order: "asc" },
          },
        },
      },
      _count: {
        select: {
          enrollments: true,
        },
      },
    },
  });

  if (!course) {
    throw new AppError("Course not found", 404);
  }

  // Visibility check: Return 404 (not 403) when user must not see the course
  if (course.status !== "PUBLISHED") {
    const isOwner = course.teacherId === user.id;
    const isAdmin = user.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      throw new AppError("Course not found", 404);
    }
  }

  return course;
}

export async function updateCourse(
  id: string,
  data: UpdateCourseInput,
  user: AuthenticatedUser
) {
  const course = await prisma.course.findUnique({
    where: { id },
  });

  if (!course) {
    throw new AppError("Course not found", 404);
  }

  assertOwnerOrAdmin(course.teacherId, user);

  if (course.status === "ARCHIVED") {
    throw new AppError("Archived courses cannot be edited", 400);
  }

  if (data.categoryId) {
    const categoryExists = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!categoryExists) {
      throw new AppError("Category not found", 404);
    }
  }

  try {
    return await prisma.course.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.thumbnail !== undefined && { thumbnail: data.thumbnail }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      },
      include: {
        teacher: { select: teacherSelect },
        category: { select: categorySelect },
      },
    });
  } catch (error: any) {
    if (error?.code === "P2025") {
      throw new AppError("Course not found", 404);
    }
    throw error;
  }
}

export async function updateCourseStatus(
  id: string,
  newStatus: CourseStatus,
  user: AuthenticatedUser
) {
  const course = await prisma.course.findUnique({
    where: { id },
  });

  if (!course) {
    throw new AppError("Course not found", 404);
  }

  assertOwnerOrAdmin(course.teacherId, user);

  const currentStatus = course.status;

  if (currentStatus === newStatus) {
    throw new AppError(`Course is already in ${newStatus} status`, 400);
  }

  // Transition validation
  const isAllowedTransition =
    (currentStatus === "DRAFT" && newStatus === "PUBLISHED") ||
    (currentStatus === "PUBLISHED" && newStatus === "ARCHIVED") ||
    (currentStatus === "DRAFT" && newStatus === "ARCHIVED") ||
    (currentStatus === "ARCHIVED" && newStatus === "PUBLISHED");

  if (!isAllowedTransition) {
    throw new AppError(
      `Cannot transition course from ${currentStatus} to ${newStatus}`,
      400
    );
  }

  // ARCHIVED -> PUBLISHED requires ADMIN role
  if (currentStatus === "ARCHIVED" && newStatus === "PUBLISHED") {
    if (user.role !== "ADMIN") {
      throw new AppError("Only administrators can unarchive courses", 403);
    }
  }

  // Transitioning to PUBLISHED requires curriculum readiness
  if (newStatus === "PUBLISHED") {
    const moduleWithLesson = await prisma.module.findFirst({
      where: {
        courseId: id,
        lessons: { some: {} },
      },
    });

    if (!moduleWithLesson) {
      throw new AppError(
        "Course must have at least one module containing at least one lesson before publishing",
        400
      );
    }
  }

  return prisma.course.update({
    where: { id },
    data: { status: newStatus },
    include: {
      teacher: { select: teacherSelect },
      category: { select: categorySelect },
    },
  });
}

export async function deleteCourse(id: string, user: AuthenticatedUser) {
  const course = await prisma.course.findUnique({
    where: { id },
  });

  if (!course) {
    throw new AppError("Course not found", 404);
  }

  assertOwnerOrAdmin(course.teacherId, user);

  if (course.status !== "DRAFT") {
    throw new AppError(
      "Only draft courses can be deleted. Please archive published courses instead.",
      409
    );
  }

  const enrollmentCount = await prisma.enrollment.count({
    where: { courseId: id },
  });

  if (enrollmentCount > 0) {
    throw new AppError(
      "Cannot delete course with existing enrollments. Please archive the course instead.",
      409
    );
  }

  try {
    await prisma.course.delete({
      where: { id },
    });
  } catch (error: any) {
    if (error?.code === "P2025") {
      throw new AppError("Course not found", 404);
    }
    throw error;
  }
}
