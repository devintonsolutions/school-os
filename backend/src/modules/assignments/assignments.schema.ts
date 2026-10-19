import { z } from "zod";

// 1. Create Assignment Schema (Teacher/Admin)
export const createAssignmentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(150, "Title must not exceed 150 characters"),
  description: z.string().trim().max(5000).optional(),
  courseId: z.string().trim().min(1, "Course ID is required"),
  dueDate: z
    .string()
    .datetime({ message: "Due date must be a valid ISO 8601 datetime string" })
    .optional(),
  maxScore: z
    .number()
    .positive("Max score must be greater than 0")
    .max(1000, "Max score cannot exceed 1000"),
});

// 2. Update Assignment Schema (Teacher/Admin)
export const updateAssignmentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(150, "Title must not exceed 150 characters")
    .optional(),
  description: z.string().trim().max(5000).optional(),
  dueDate: z
    .string()
    .datetime({ message: "Due date must be a valid ISO 8601 datetime string" })
    .nullable()
    .optional(),
  maxScore: z
    .number()
    .positive("Max score must be greater than 0")
    .max(1000, "Max score cannot exceed 1000")
    .optional(),
});

// 3. Submit Assignment Schema (Student)
export const createSubmissionSchema = z
  .object({
    content: z.string().trim().max(10000).optional(),
    fileUrl: z.string().url("File URL must be a valid URL").optional(),
  })
  .refine((data) => data.content || data.fileUrl, {
    message: "Either text content or a file URL must be provided for submission",
    path: ["content"],
  });

// 4. Grade Submission Schema (Teacher/Admin)
export const gradeSubmissionSchema = z.object({
  score: z
    .number()
    .min(0, "Score cannot be negative"),
  feedback: z.string().trim().max(2000).optional(),
});

// Type exports inferred from Zod schemas
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;
