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
import type { ListEnrollmentsQueryInput } from "./enrollment.schema";

/**
 * Course summary returned with a student's enrollment.
 * Deliberately does NOT include modules/lessons; those stay behind the
 * Lessons API, which enforces PUBLISHED + enrollment access.
 */
const enrollmentCourseSelect = {
  id: true,
  title: true,
  description: true,
  thumbnail: true,
  status: true,
  teacher: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
    },
  },
  category: {
    select: {
      id: true,
      name: true,
    },
  },
  _count: {
    select: {
      modules: true,
    },
  },
};

/**
 * Safe student fields for the course roster.
 * Never select passwordHash, refresh tokens or any other secret.
 */
const enrollmentStudentSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
};

type CourseAccess = {
  id: string;
  teacherId: string;
  status: string;
};

/**
 * Loads only the course fields needed for enrollment authorization.
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
 * BR-01: only authenticated students can enroll.
 * The route already uses authorize("STUDENT"); this is defence in depth.
 */
function assertStudent(user: AuthenticatedUser) {
  if (user.role !== "STUDENT") {
    throw new AppError("Only students can enroll in courses", 403);
  }
}

/**
 * FR-21 / UC-04: students may enroll only in PUBLISHED courses.
 * DRAFT and ARCHIVED return 404 so their existence is not leaked.
 */
function assertCoursePublished(course: CourseAccess) {
  if (course.status !== "PUBLISHED") {
    throw new AppError("Course not found", 404);
  }
}

export async function enrollInCourse(
  courseId: string,
  user: AuthenticatedUser
) {
  assertStudent(user);

  const course = await getCourseOrThrow(courseId);
  assertCoursePublished(course);

  // FR-22 / UC-04: check first so the client gets a clear 409.
  const existing = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: user.id,
        courseId,
      },
    },
    select: { id: true },
  });

  if (existing) {
    throw new AppError("Already enrolled in this course", 409);
  }

  try {
    return await prisma.enrollment.create({
      data: {
        studentId: user.id,
        courseId,
        status: "ACTIVE",
      },
      include: {
        course: {
          select: enrollmentCourseSelect,
        },
      },
    });
  } catch (error: any) {
    // Race-condition safety net: the DB unique constraint is still the
    // final authority for FR-22.
    if (error?.code === "P2002") {
      throw new AppError("Already enrolled in this course", 409);
    }
    throw error;
  }
}

export async function listMyEnrollments(
  query: ListEnrollmentsQueryInput,
  user: AuthenticatedUser
) {
  assertStudent(user);

  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  const { skip, take } = getPagination(page, limit);

  const where = {
    studentId: user.id,
    ...(query.status ? { status: query.status } : {}),
  };

  const [enrollments, total] = await Promise.all([
    prisma.enrollment.findMany({
      where,
      skip,
      take,
      orderBy: { enrolledAt: "desc" },
      include: {
        course: {
          select: enrollmentCourseSelect,
        },
      },
    }),
    prisma.enrollment.count({ where }),
  ]);

  return buildPaginatedResponse(enrollments, total, page, limit);
}

export async function listCourseEnrollments(
  courseId: string,
  query: ListEnrollmentsQueryInput,
  user: AuthenticatedUser
) {
  const course = await getCourseOrThrow(courseId);

  // FR-23: course owner or ADMIN can see the roster.
  assertOwnerOrAdmin(course.teacherId, user);

  const page = query.page ?? 1;
  const limit = query.limit ?? 50;
  const { skip, take } = getPagination(page, limit);

  const where = {
    courseId,
    ...(query.status ? { status: query.status } : {}),
  };

  const [enrollments, total] = await Promise.all([
    prisma.enrollment.findMany({
      where,
      skip,
      take,
      orderBy: { enrolledAt: "asc" },
      include: {
        student: {
          select: enrollmentStudentSelect,
        },
      },
    }),
    prisma.enrollment.count({ where }),
  ]);

  return buildPaginatedResponse(enrollments, total, page, limit);
}
