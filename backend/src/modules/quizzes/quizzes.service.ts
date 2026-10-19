import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";
import type {
  CreateQuizInput,
  UpdateQuizInput,
  CreateQuestionInput,
  SubmitQuizAttemptInput,
} from "./quizzes.schema";

interface RequestUser {
  id: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
}

// -------------------------------------------------------------
// 1. Create Quiz (Teacher or Admin)
// -------------------------------------------------------------
export async function createQuiz(user: RequestUser, input: CreateQuizInput) {
  const course = await prisma.course.findUnique({
    where: { id: input.courseId },
  });

  if (!course) {
    throw new AppError("Course not found", 404);
  }

  if (user.role === "TEACHER" && course.teacherId !== user.id) {
    throw new AppError("You are not authorized to create quizzes for this course", 403);
  }

  return await prisma.quiz.create({
    data: {
      title: input.title,
      description: input.description,
      courseId: input.courseId,
      timeLimit: input.timeLimit,
    },
    include: {
      course: {
        select: { id: true, title: true, teacherId: true },
      },
    },
  });
}

// -------------------------------------------------------------
// 2. Get Quizzes by Course
// -------------------------------------------------------------
export async function getQuizzesByCourse(courseId: string, user: RequestUser) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    throw new AppError("Course not found", 404);
  }

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
      throw new AppError("You must be enrolled in this course to view its quizzes", 403);
    }
  }

  return await prisma.quiz.findMany({
    where: { courseId },
    include: {
      _count: {
        select: { questions: true, attempts: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// -------------------------------------------------------------
// 3. Get Quiz Details & Questions
// (Sanitizes options so students cannot view answers before submitting!)
// -------------------------------------------------------------
export async function getQuizById(quizId: string, user: RequestUser) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      course: true,
      questions: {
        include: {
          options: true,
        },
      },
    },
  });

  if (!quiz) {
    throw new AppError("Quiz not found", 404);
  }

  if (user.role === "STUDENT") {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: user.id,
          courseId: quiz.courseId,
        },
      },
    });

    if (!enrollment) {
      throw new AppError("You are not enrolled in this course", 403);
    }

    // Security projection: remove isCorrect from options for students
    const sanitizedQuestions = quiz.questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      questionType: q.questionType,
      points: q.points,
      options: q.options.map((o) => ({
        id: o.id,
        optionText: o.optionText,
      })),
    }));

    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      timeLimit: quiz.timeLimit,
      courseId: quiz.courseId,
      createdAt: quiz.createdAt,
      questions: sanitizedQuestions,
    };
  }

  // Teachers/Admins get full view with isCorrect visible
  return quiz;
}

// -------------------------------------------------------------
// 4. Update Quiz (Teacher or Admin)
// -------------------------------------------------------------
export async function updateQuiz(
  quizId: string,
  user: RequestUser,
  input: UpdateQuizInput
) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { course: true },
  });

  if (!quiz) {
    throw new AppError("Quiz not found", 404);
  }

  if (user.role === "TEACHER" && quiz.course.teacherId !== user.id) {
    throw new AppError("You can only modify quizzes for your own courses", 403);
  }

  return await prisma.quiz.update({
    where: { id: quizId },
    data: {
      title: input.title,
      description: input.description,
      timeLimit: input.timeLimit,
    },
  });
}

// -------------------------------------------------------------
// 5. Delete Quiz (Teacher or Admin)
// -------------------------------------------------------------
export async function deleteQuiz(quizId: string, user: RequestUser) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { course: true },
  });

  if (!quiz) {
    throw new AppError("Quiz not found", 404);
  }

  if (user.role === "TEACHER" && quiz.course.teacherId !== user.id) {
    throw new AppError("You can only delete quizzes for your own courses", 403);
  }

  return await prisma.quiz.delete({
    where: { id: quizId },
  });
}

// -------------------------------------------------------------
// 6. Add Question to Quiz (Teacher or Admin)
// -------------------------------------------------------------
export async function addQuestion(
  quizId: string,
  user: RequestUser,
  input: CreateQuestionInput
) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { course: true },
  });

  if (!quiz) {
    throw new AppError("Quiz not found", 404);
  }

  if (user.role === "TEACHER" && quiz.course.teacherId !== user.id) {
    throw new AppError("You can only add questions to quizzes for your own courses", 403);
  }

  return await prisma.question.create({
    data: {
      quizId,
      questionText: input.questionText,
      questionType: input.questionType,
      points: input.points,
      options: {
        create: input.options.map((opt) => ({
          optionText: opt.optionText,
          isCorrect: opt.isCorrect,
        })),
      },
    },
    include: {
      options: true,
    },
  });
}

// -------------------------------------------------------------
// 7. Delete Question (Teacher or Admin)
// -------------------------------------------------------------
export async function deleteQuestion(questionId: string, user: RequestUser) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      quiz: {
        include: { course: true },
      },
    },
  });

  if (!question) {
    throw new AppError("Question not found", 404);
  }

  if (user.role === "TEACHER" && question.quiz.course.teacherId !== user.id) {
    throw new AppError("You can only delete questions from your own courses", 403);
  }

  return await prisma.question.delete({
    where: { id: questionId },
  });
}

// -------------------------------------------------------------
// 8. Start Quiz Attempt (Student)
// -------------------------------------------------------------
export async function startQuizAttempt(quizId: string, user: RequestUser) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        include: {
          options: {
            select: { id: true, optionText: true },
          },
        },
      },
    },
  });

  if (!quiz) {
    throw new AppError("Quiz not found", 404);
  }

  // Check enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: user.id,
        courseId: quiz.courseId,
      },
    },
  });

  if (!enrollment) {
    throw new AppError("You must be enrolled in this course to attempt this quiz", 403);
  }

  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId,
      studentId: user.id,
      startedAt: new Date(),
    },
  });

  return {
    attemptId: attempt.id,
    startedAt: attempt.startedAt,
    timeLimit: quiz.timeLimit,
    quiz: {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      questions: quiz.questions,
    },
  };
}

// -------------------------------------------------------------
// 9. Submit Quiz Attempt & Run Automated Grading Engine
// -------------------------------------------------------------
export async function submitQuizAttempt(
  attemptId: string,
  user: RequestUser,
  input: SubmitQuizAttemptInput
) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: {
        include: {
          questions: {
            include: { options: true },
          },
        },
      },
    },
  });

  if (!attempt) {
    throw new AppError("Quiz attempt not found", 404);
  }

  if (attempt.studentId !== user.id) {
    throw new AppError("You are not authorized to submit this attempt", 403);
  }

  if (attempt.completedAt !== null) {
    throw new AppError("This quiz attempt has already been submitted and graded", 409);
  }

  const now = new Date();

  // Check time limit if applicable (with a 2-minute grace period for network latency)
  if (attempt.quiz.timeLimit) {
    const elapsedMinutes = (now.getTime() - attempt.startedAt.getTime()) / 60000;
    const allowedMinutes = attempt.quiz.timeLimit + 2;
    if (elapsedMinutes > allowedMinutes) {
      throw new AppError(
        `Quiz time limit exceeded (${attempt.quiz.timeLimit} minutes). Attempt rejected.`,
        400
      );
    }
  }

  // --- AUTOMATED GRADING ENGINE ---
  let totalScore = 0;
  let maxScore = 0;
  const answerRecords: Array<{
    attemptId: string;
    questionId: string;
    selectedOptionId?: string;
    answerText?: string;
    isCorrect: boolean;
  }> = [];

  const answersMap = new Map(input.answers.map((a) => [a.questionId, a]));

  for (const question of attempt.quiz.questions) {
    maxScore += question.points;
    const studentAnswer = answersMap.get(question.id);

    let isCorrect = false;

    if (studentAnswer) {
      if (
        question.questionType === "SINGLE_CHOICE" ||
        question.questionType === "TRUE_FALSE" ||
        question.questionType === "MULTIPLE_CHOICE"
      ) {
        if (studentAnswer.selectedOptionId) {
          const matchingOption = question.options.find(
            (opt) => opt.id === studentAnswer.selectedOptionId
          );
          if (matchingOption && matchingOption.isCorrect) {
            isCorrect = true;
            totalScore += question.points;
          }
        }
      } else if (question.questionType === "SHORT_ANSWER") {
        if (studentAnswer.answerText) {
          const correctOption = question.options.find((opt) => opt.isCorrect);
          if (
            correctOption &&
            correctOption.optionText.trim().toLowerCase() ===
              studentAnswer.answerText.trim().toLowerCase()
          ) {
            isCorrect = true;
            totalScore += question.points;
          }
        }
      }

      answerRecords.push({
        attemptId: attempt.id,
        questionId: question.id,
        selectedOptionId: studentAnswer.selectedOptionId,
        answerText: studentAnswer.answerText,
        isCorrect,
      });
    }
  }

  // Atomic database update: save attempt score, answers, and update consolidated Grade
  return await prisma.$transaction(async (tx) => {
    // 1. Update QuizAttempt
    const gradedAttempt = await tx.quizAttempt.update({
      where: { id: attempt.id },
      data: {
        completedAt: now,
        score: totalScore,
      },
    });

    // 2. Insert Answers
    for (const record of answerRecords) {
      await tx.answer.upsert({
        where: {
          attemptId_questionId: {
            attemptId: record.attemptId,
            questionId: record.questionId,
          },
        },
        update: {
          selectedOptionId: record.selectedOptionId,
          answerText: record.answerText,
          isCorrect: record.isCorrect,
        },
        create: {
          attemptId: record.attemptId,
          questionId: record.questionId,
          selectedOptionId: record.selectedOptionId,
          answerText: record.answerText,
          isCorrect: record.isCorrect,
        },
      });
    }

    // 3. Upsert into consolidated Grade table
    const existingGrade = await tx.grade.findFirst({
      where: {
        studentId: user.id,
        courseId: attempt.quiz.courseId,
        quizId: attempt.quiz.id,
      },
    });

    if (existingGrade) {
      await tx.grade.update({
        where: { id: existingGrade.id },
        data: {
          score: totalScore,
          maxScore,
          gradedAt: now,
        },
      });
    } else {
      await tx.grade.create({
        data: {
          studentId: user.id,
          courseId: attempt.quiz.courseId,
          quizId: attempt.quiz.id,
          score: totalScore,
          maxScore,
          gradedAt: now,
        },
      });
    }

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 100;

    return {
      attemptId: gradedAttempt.id,
      score: totalScore,
      maxScore,
      percentage: `${percentage}%`,
      completedAt: gradedAttempt.completedAt,
    };
  });
}

// -------------------------------------------------------------
// 10. Get Student's Past Attempts (Student)
// -------------------------------------------------------------
export async function getStudentAttempts(quizId: string, studentId: string) {
  return await prisma.quizAttempt.findMany({
    where: { quizId, studentId },
    orderBy: { startedAt: "desc" },
    include: {
      answers: true,
    },
  });
}

// -------------------------------------------------------------
// 11. Get All Attempts for Quiz (Teacher or Admin)
// -------------------------------------------------------------
export async function getAllQuizAttempts(quizId: string, user: RequestUser) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { course: true },
  });

  if (!quiz) {
    throw new AppError("Quiz not found", 404);
  }

  if (user.role === "TEACHER" && quiz.course.teacherId !== user.id) {
    throw new AppError("You can only view attempts for your own courses", 403);
  }

  return await prisma.quizAttempt.findMany({
    where: { quizId },
    include: {
      student: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
    orderBy: { startedAt: "desc" },
  });
}
