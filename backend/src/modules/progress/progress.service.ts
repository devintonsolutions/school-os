import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";
import type { AuthenticatedUser } from "../lms-shared/ownership";

type CourseAccess = {
  id: string;
  title: string;
  status: string;
};

type ProgressSnapshot = {
  totalLessons: number;
  completedLessons: number;
  percentage: number;
  allCompleted: boolean;
};

type NextLesson = {
  id: string;
  title: string;
  moduleId: string;
  moduleTitle: string;
  moduleOrder: number;
  lessonOrder: number;
};

const progressSelect = {
  id: true,
  completed: true,
  completedAt: true,
};

/**
 * Loads only the course fields needed for progress responses.
 */
async function getCourseOrThrow(courseId: string): Promise<CourseAccess> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      status: true,
    },
  });

  if (!course) {
    throw new AppError("Course not found", 404);
  }

  return course;
}

/**
 * Loads the lesson and its course in one query.
 */
async function getLessonOrThrow(lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      module: {
        select: {
          course: {
            select: {
              id: true,
              title: true,
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

  return lesson;
}

/**
 * Only students can use the Progress API.
 * The route also uses authorize("STUDENT"); this is defence in depth.
 */
function assertStudent(user: AuthenticatedUser) {
  if (user.role !== "STUDENT") {
    throw new AppError("Only students can access progress", 403);
  }
}

/**
 * Uses the same enrollment query as the Lessons API:
 *
 * prisma.enrollment.findUnique({
 *   where: { studentId_courseId: { studentId: user.id, courseId: course.id } },
 *   select: { id: true },
 * })
 *
 * There is intentionally no Enrollment.status filter, matching the current
 * Lessons API. Every enrollment created by this project is ACTIVE.
 *
 * PUBLISHED + no enrollment -> 403 "Enrollment required".
 * ARCHIVED + no enrollment -> 404 "Course not found" so archived course
 * existence is not leaked to non-enrolled students.
 */
async function assertEnrollment(
  course: CourseAccess,
  user: AuthenticatedUser
): Promise<void> {
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: user.id,
        courseId: course.id,
      },
    },
    select: { id: true },
  });

  if (enrollment) {
    return;
  }

  if (course.status === "ARCHIVED") {
    throw new AppError("Course not found", 404);
  }

  throw new AppError("Enrollment required", 403);
}

/**
 * Counts lessons and completed lesson-progress rows for one student/course.
 * Percentage is an integer 0-100.
 */
async function buildProgressSnapshot(
  course: CourseAccess,
  user: AuthenticatedUser
): Promise<ProgressSnapshot> {
  const [totalLessons, completedLessons] = await Promise.all([
    prisma.lesson.count({
      where: {
        module: {
          courseId: course.id,
        },
      },
    }),
    prisma.lessonProgress.count({
      where: {
        studentId: user.id,
        completed: true,
        lesson: {
          module: {
            courseId: course.id,
          },
        },
      },
    }),
  ]);

  const percentage =
    totalLessons === 0
      ? 0
      : Math.round((completedLessons / totalLessons) * 100);

  return {
    totalLessons,
    completedLessons,
    percentage,
    allCompleted: totalLessons > 0 && completedLessons === totalLessons,
  };
}

/**
 * FR-20 / UC-05: mark a lesson complete.
 *
 * Idempotent:
 * - If already completed, return the existing row and keep its completedAt.
 * - The @@unique([studentId, lessonId]) constraint is the final race guard.
 */
export async function markLessonComplete(
  lessonId: string,
  user: AuthenticatedUser
) {
  assertStudent(user);

  const lesson = await getLessonOrThrow(lessonId);
  const course = lesson.module.course;

  // Completion is allowed only for PUBLISHED courses. DRAFT and ARCHIVED
  // return 404 to students, matching the Lessons API.
  if (course.status !== "PUBLISHED") {
    throw new AppError("Course not found", 404);
  }

  await assertEnrollment(course, user);

  const existing = await prisma.lessonProgress.findUnique({
    where: {
      studentId_lessonId: {
        studentId: user.id,
        lessonId,
      },
    },
    select: progressSelect,
  });

  if (existing?.completed) {
    return {
      id: existing.id,
      lessonId,
      courseId: course.id,
      completed: true,
      completedAt: existing.completedAt,
      alreadyCompleted: true,
    };
  }

  const completedAt = new Date();

  if (existing) {
    const updated = await prisma.lessonProgress.update({
      where: { id: existing.id },
      data: {
        completed: true,
        completedAt,
      },
      select: progressSelect,
    });

    return {
      id: updated.id,
      lessonId,
      courseId: course.id,
      completed: updated.completed,
      completedAt: updated.completedAt,
      alreadyCompleted: false,
    };
  }

  try {
    const created = await prisma.lessonProgress.create({
      data: {
        studentId: user.id,
        lessonId,
        completed: true,
        completedAt,
      },
      select: progressSelect,
    });

    return {
      id: created.id,
      lessonId,
      courseId: course.id,
      completed: created.completed,
      completedAt: created.completedAt,
      alreadyCompleted: false,
    };
  } catch (error: any) {
    // Two simultaneous requests can both miss the pre-check. The unique
    // constraint makes one create fail; return the winner idempotently.
    if (error?.code === "P2002") {
      const raced = await prisma.lessonProgress.findUnique({
        where: {
          studentId_lessonId: {
            studentId: user.id,
            lessonId,
          },
        },
        select: progressSelect,
      });

      if (raced?.completed) {
        return {
          id: raced.id,
          lessonId,
          courseId: course.id,
          completed: true,
          completedAt: raced.completedAt,
          alreadyCompleted: true,
        };
      }

      if (raced) {
        const updated = await prisma.lessonProgress.update({
          where: { id: raced.id },
          data: {
            completed: true,
            completedAt,
          },
          select: progressSelect,
        });

        return {
          id: updated.id,
          lessonId,
          courseId: course.id,
          completed: updated.completed,
          completedAt: updated.completedAt,
          alreadyCompleted: false,
        };
      }
    }

    throw error;
  }
}

/**
 * FR-24: current student's lesson-only progress for one course.
 *
 * Archived courses are read-only for enrolled students and still return
 * courseStatus so the client can display history.
 */
export async function getCourseProgress(
  courseId: string,
  user: AuthenticatedUser
) {
  assertStudent(user);

  const course = await getCourseOrThrow(courseId);

  // Draft courses are not visible to students at all.
  if (course.status === "DRAFT") {
    throw new AppError("Course not found", 404);
  }

  await assertEnrollment(course, user);

  const snapshot = await buildProgressSnapshot(course, user);

  return {
    courseId: course.id,
    courseTitle: course.title,
    courseStatus: course.status,
    ...snapshot,
  };
}

/**
 * FR-25: next incomplete lesson in curriculum order.
 *
 * "Latest incomplete" from the SRS cannot be measured because LessonProgress
 * has no last-viewed timestamp. This uses the next incomplete lesson ordered
 * by module.order, then lesson.order.
 *
 * Archived courses are read-only: progress is returned, but nextLesson is null.
 */
export async function getContinueLearning(
  courseId: string,
  user: AuthenticatedUser
) {
  assertStudent(user);

  const course = await getCourseOrThrow(courseId);

  if (course.status === "DRAFT") {
    throw new AppError("Course not found", 404);
  }

  await assertEnrollment(course, user);

  const snapshot = await buildProgressSnapshot(course, user);

  let nextLesson: NextLesson | null = null;

  if (course.status !== "ARCHIVED") {
    const lessons = await prisma.lesson.findMany({
      where: {
        module: {
          courseId: course.id,
        },
      },
      orderBy: [{ module: { order: "asc" } }, { order: "asc" }],
      select: {
        id: true,
        title: true,
        order: true,
        module: {
          select: {
            id: true,
            title: true,
            order: true,
          },
        },
        progress: {
          where: {
            studentId: user.id,
          },
          select: {
            completed: true,
          },
          take: 1,
        },
      },
    });

    const firstIncomplete = lessons.find(
      (lesson) => lesson.progress[0]?.completed !== true
    );

    if (firstIncomplete) {
      nextLesson = {
        id: firstIncomplete.id,
        title: firstIncomplete.title,
        moduleId: firstIncomplete.module.id,
        moduleTitle: firstIncomplete.module.title,
        moduleOrder: firstIncomplete.module.order,
        lessonOrder: firstIncomplete.order,
      };
    }
  }

  return {
    courseId: course.id,
    courseTitle: course.title,
    courseStatus: course.status,
    ...snapshot,
    nextLesson,
  };
}
