import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";
import type {
  CreateAssignmentInput,
  UpdateAssignmentInput,
  CreateSubmissionInput,
  GradeSubmissionInput,
} from "./assignments.schema";

interface RequestUser {
  id: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
}

// -------------------------------------------------------------
// 1. Create Assignment (Teacher or Admin)
// -------------------------------------------------------------
export async function createAssignment(
  user: RequestUser,
  input: CreateAssignmentInput
) {
  const course = await prisma.course.findUnique({
    where: { id: input.courseId },
  });

  if (!course) {
    throw new AppError("Course not found", 404);
  }

  // Teacher can only add assignments to their own courses
  if (user.role === "TEACHER" && course.teacherId !== user.id) {
    throw new AppError("You are not authorized to create assignments for this course", 403);
  }

  return await prisma.assignment.create({
    data: {
      title: input.title,
      description: input.description,
      courseId: input.courseId,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      maxScore: input.maxScore,
    },
    include: {
      course: {
        select: { id: true, title: true, teacherId: true },
      },
    },
  });
}

// -------------------------------------------------------------
// 2. Get Assignments by Course
// -------------------------------------------------------------
export async function getAssignmentsByCourse(courseId: string, user: RequestUser) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    throw new AppError("Course not found", 404);
  }

  // If student, check if enrolled
  if (user.role === "STUDENT") {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: user.id,
          courseId,
        },
      },
    });

    if (!enrollment) {
      throw new AppError("You must be enrolled in this course to view its assignments", 403);
    }
  }

  return await prisma.assignment.findMany({
    where: { courseId },
    include: {
      _count: {
        select: { submissions: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// -------------------------------------------------------------
// 3. Get Assignment by ID
// -------------------------------------------------------------
export async function getAssignmentById(assignmentId: string, user: RequestUser) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      course: {
        select: { id: true, title: true, teacherId: true },
      },
    },
  });

  if (!assignment) {
    throw new AppError("Assignment not found", 404);
  }

  // If student, verify enrollment
  if (user.role === "STUDENT") {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: user.id,
          courseId: assignment.courseId,
        },
      },
    });

    if (!enrollment) {
      throw new AppError("You are not enrolled in this course", 403);
    }
  }

  return assignment;
}

// -------------------------------------------------------------
// 4. Update Assignment (Teacher or Admin)
// -------------------------------------------------------------
export async function updateAssignment(
  assignmentId: string,
  user: RequestUser,
  input: UpdateAssignmentInput
) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { course: true },
  });

  if (!assignment) {
    throw new AppError("Assignment not found", 404);
  }

  if (user.role === "TEACHER" && assignment.course.teacherId !== user.id) {
    throw new AppError("You can only modify assignments for your own courses", 403);
  }

  return await prisma.assignment.update({
    where: { id: assignmentId },
    data: {
      title: input.title,
      description: input.description,
      dueDate: input.dueDate !== undefined ? (input.dueDate ? new Date(input.dueDate) : null) : undefined,
      maxScore: input.maxScore,
    },
  });
}

// -------------------------------------------------------------
// 5. Delete Assignment (Teacher or Admin)
// -------------------------------------------------------------
export async function deleteAssignment(assignmentId: string, user: RequestUser) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { course: true },
  });

  if (!assignment) {
    throw new AppError("Assignment not found", 404);
  }

  if (user.role === "TEACHER" && assignment.course.teacherId !== user.id) {
    throw new AppError("You can only delete assignments for your own courses", 403);
  }

  return await prisma.assignment.delete({
    where: { id: assignmentId },
  });
}

// -------------------------------------------------------------
// 6. Submit Assignment (Student)
// -------------------------------------------------------------
export async function submitAssignment(
  assignmentId: string,
  user: RequestUser,
  input: CreateSubmissionInput
) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
  });

  if (!assignment) {
    throw new AppError("Assignment not found", 404);
  }

  // Verify student enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: user.id,
        courseId: assignment.courseId,
      },
    },
  });

  if (!enrollment) {
    throw new AppError("You must be enrolled in this course to submit assignments", 403);
  }

  // Check if already submitted
  const existingSubmission = await prisma.submission.findUnique({
    where: {
      assignmentId_studentId: {
        assignmentId,
        studentId: user.id,
      },
    },
  });

  if (existingSubmission) {
    throw new AppError("You have already submitted this assignment. Duplicate submissions are not allowed.", 409);
  }

  const now = new Date();
  const isLate = assignment.dueDate ? now > assignment.dueDate : false;

  const submission = await prisma.submission.create({
    data: {
      assignmentId,
      studentId: user.id,
      content: input.content,
      fileUrl: input.fileUrl,
      submittedAt: now,
    },
    include: {
      student: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  });

  return {
    ...submission,
    isLate,
  };
}

// -------------------------------------------------------------
// 7. Get My Submission (Student)
// -------------------------------------------------------------
export async function getMySubmission(assignmentId: string, userId: string) {
  const submission = await prisma.submission.findUnique({
    where: {
      assignmentId_studentId: {
        assignmentId,
        studentId: userId,
      },
    },
    include: {
      assignment: {
        select: { id: true, title: true, maxScore: true, dueDate: true },
      },
    },
  });

  if (!submission) {
    throw new AppError("No submission found for this assignment", 404);
  }

  return submission;
}

// -------------------------------------------------------------
// 8. Get All Submissions for an Assignment (Teacher or Admin)
// -------------------------------------------------------------
export async function getAssignmentSubmissions(assignmentId: string, user: RequestUser) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { course: true },
  });

  if (!assignment) {
    throw new AppError("Assignment not found", 404);
  }

  if (user.role === "TEACHER" && assignment.course.teacherId !== user.id) {
    throw new AppError("You can only view submissions for your own courses", 403);
  }

  return await prisma.submission.findMany({
    where: { assignmentId },
    include: {
      student: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
    orderBy: { submittedAt: "desc" },
  });
}

// -------------------------------------------------------------
// 9. Grade Submission (Teacher or Admin)
// -------------------------------------------------------------
export async function gradeSubmission(
  submissionId: string,
  user: RequestUser,
  input: GradeSubmissionInput
) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: {
        include: { course: true },
      },
    },
  });

  if (!submission) {
    throw new AppError("Submission not found", 404);
  }

  // Teacher check
  if (user.role === "TEACHER" && submission.assignment.course.teacherId !== user.id) {
    throw new AppError("You can only grade submissions from your own courses", 403);
  }

  // Validate score against maxScore
  if (input.score > submission.assignment.maxScore) {
    throw new AppError(
      `Awarded score (${input.score}) cannot exceed maximum score (${submission.assignment.maxScore})`,
      400
    );
  }

  // Execute update and grade record creation in transaction
  return await prisma.$transaction(async (tx) => {
    // 1. Update submission
    const updatedSubmission = await tx.submission.update({
      where: { id: submissionId },
      data: {
        score: input.score,
        feedback: input.feedback,
      },
    });

    // 2. Check existing grade or create consolidated grade
    const existingGrade = await tx.grade.findFirst({
      where: {
        studentId: submission.studentId,
        courseId: submission.assignment.courseId,
        assignmentId: submission.assignmentId,
      },
    });

    if (existingGrade) {
      await tx.grade.update({
        where: { id: existingGrade.id },
        data: {
          score: input.score,
          maxScore: submission.assignment.maxScore,
          gradedAt: new Date(),
        },
      });
    } else {
      await tx.grade.create({
        data: {
          studentId: submission.studentId,
          courseId: submission.assignment.courseId,
          assignmentId: submission.assignmentId,
          score: input.score,
          maxScore: submission.assignment.maxScore,
          gradedAt: new Date(),
        },
      });
    }

    return updatedSubmission;
  });
}
