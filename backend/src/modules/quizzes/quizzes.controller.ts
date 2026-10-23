import type { Request, Response } from "express";
import * as quizService from "./quizzes.service";

// 1. Create Quiz (Teacher/Admin)
export async function createQuiz(req: Request, res: Response) {
  const result = await quizService.createQuiz(req.user!, req.body);
  res.status(201).json({
    success: true,
    message: "Quiz created successfully",
    data: result,
  });
}

// 2. Get Quizzes by Course
export async function getQuizzesByCourse(req: Request, res: Response) {
  const courseId = req.params.courseId as string;
  const quizzes = await quizService.getQuizzesByCourse(courseId, req.user!);
  res.status(200).json({
    success: true,
    data: quizzes,
  });
}

// 3. Get Quiz Details
export async function getQuizById(req: Request, res: Response) {
  const id = req.params.id as string;
  const quiz = await quizService.getQuizById(id, req.user!);
  res.status(200).json({
    success: true,
    data: quiz,
  });
}

// 4. Update Quiz
export async function updateQuiz(req: Request, res: Response) {
  const id = req.params.id as string;
  const updated = await quizService.updateQuiz(id, req.user!, req.body);
  res.status(200).json({
    success: true,
    message: "Quiz updated successfully",
    data: updated,
  });
}

// 5. Delete Quiz
export async function deleteQuiz(req: Request, res: Response) {
  const id = req.params.id as string;
  await quizService.deleteQuiz(id, req.user!);
  res.status(200).json({
    success: true,
    message: "Quiz deleted successfully",
  });
}

// 6. Add Question to Quiz
export async function addQuestion(req: Request, res: Response) {
  const id = req.params.id as string;
  const question = await quizService.addQuestion(id, req.user!, req.body);
  res.status(201).json({
    success: true,
    message: "Question added to quiz successfully",
    data: question,
  });
}

// 7. Delete Question
export async function deleteQuestion(req: Request, res: Response) {
  const questionId = req.params.questionId as string;
  await quizService.deleteQuestion(questionId, req.user!);
  res.status(200).json({
    success: true,
    message: "Question removed successfully",
  });
}

// 8. Start Quiz Attempt (Student)
export async function startQuizAttempt(req: Request, res: Response) {
  const id = req.params.id as string;
  const session = await quizService.startQuizAttempt(id, req.user!);
  res.status(201).json({
    success: true,
    message: "Quiz attempt started",
    data: session,
  });
}

// 9. Submit Quiz Attempt & Auto-Grade
export async function submitQuizAttempt(req: Request, res: Response) {
  const attemptId = req.params.attemptId as string;
  const result = await quizService.submitQuizAttempt(attemptId, req.user!, req.body);
  res.status(200).json({
    success: true,
    message: "Quiz submitted and graded successfully",
    data: result,
  });
}

// 10. Get Student's Own Attempts
export async function getStudentAttempts(req: Request, res: Response) {
  const id = req.params.id as string;
  const attempts = await quizService.getStudentAttempts(id, req.user!.id);
  res.status(200).json({
    success: true,
    data: attempts,
  });
}

// 11. Get All Attempts for a Quiz (Teacher/Admin)
export async function getAllQuizAttempts(req: Request, res: Response) {
  const id = req.params.id as string;
  const attempts = await quizService.getAllQuizAttempts(id, req.user!);
  res.status(200).json({
    success: true,
    data: attempts,
  });
}
