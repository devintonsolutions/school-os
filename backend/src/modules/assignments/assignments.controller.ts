import type { Request, Response } from "express";
import * as assignmentService from "./assignments.service";

// 1. Create Assignment
export async function createAssignment(req: Request, res: Response) {
  const result = await assignmentService.createAssignment(req.user!, req.body);
  res.status(201).json({
    success: true,
    message: "Assignment created successfully",
    data: result,
  });
}

// 2. Get Assignments by Course
export async function getAssignmentsByCourse(req: Request, res: Response) {
  const courseId = req.params.courseId as string;
  const assignments = await assignmentService.getAssignmentsByCourse(courseId, req.user!);
  res.status(200).json({
    success: true,
    data: assignments,
  });
}

// 3. Get Assignment by ID
export async function getAssignmentById(req: Request, res: Response) {
  const id = req.params.id as string;
  const assignment = await assignmentService.getAssignmentById(id, req.user!);
  res.status(200).json({
    success: true,
    data: assignment,
  });
}

// 4. Update Assignment
export async function updateAssignment(req: Request, res: Response) {
  const id = req.params.id as string;
  const updated = await assignmentService.updateAssignment(id, req.user!, req.body);
  res.status(200).json({
    success: true,
    message: "Assignment updated successfully",
    data: updated,
  });
}

// 5. Delete Assignment
export async function deleteAssignment(req: Request, res: Response) {
  const id = req.params.id as string;
  await assignmentService.deleteAssignment(id, req.user!);
  res.status(200).json({
    success: true,
    message: "Assignment deleted successfully",
  });
}

// 6. Submit Assignment (Student)
export async function submitAssignment(req: Request, res: Response) {
  const id = req.params.id as string;
  const submission = await assignmentService.submitAssignment(id, req.user!, req.body);
  res.status(201).json({
    success: true,
    message: submission.isLate
      ? "Assignment submitted (Flagged as Late)"
      : "Assignment submitted successfully",
    data: submission,
  });
}

// 7. Get My Submission (Student)
export async function getMySubmission(req: Request, res: Response) {
  const id = req.params.id as string;
  const submission = await assignmentService.getMySubmission(id, req.user!.id);
  res.status(200).json({
    success: true,
    data: submission,
  });
}

// 8. Get All Submissions for Assignment (Teacher/Admin)
export async function getAssignmentSubmissions(req: Request, res: Response) {
  const id = req.params.id as string;
  const submissions = await assignmentService.getAssignmentSubmissions(id, req.user!);
  res.status(200).json({
    success: true,
    data: submissions,
  });
}

// 9. Grade Submission (Teacher/Admin)
export async function gradeSubmission(req: Request, res: Response) {
  const submissionId = req.params.submissionId as string;
  const result = await assignmentService.gradeSubmission(submissionId, req.user!, req.body);
  res.status(200).json({
    success: true,
    message: "Submission graded successfully",
    data: result,
  });
}
