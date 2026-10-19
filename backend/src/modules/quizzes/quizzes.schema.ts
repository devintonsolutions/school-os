import { z } from "zod";

// 1. Create Quiz Schema
export const createQuizSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(150, "Title must not exceed 150 characters"),
  description: z.string().trim().max(5000).optional(),
  courseId: z.string().trim().min(1, "Course ID is required"),
  timeLimit: z
    .number()
    .int("Time limit must be an integer (in minutes)")
    .positive("Time limit must be greater than 0")
    .max(300, "Time limit cannot exceed 300 minutes (5 hours)")
    .optional(),
});

// 2. Update Quiz Schema
export const updateQuizSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(150, "Title must not exceed 150 characters")
    .optional(),
  description: z.string().trim().max(5000).optional(),
  timeLimit: z
    .number()
    .int()
    .positive()
    .max(300)
    .nullable()
    .optional(),
});

// 3. Question Option Schema
export const questionOptionSchema = z.object({
  optionText: z.string().trim().min(1, "Option text cannot be empty"),
  isCorrect: z.boolean().default(false),
});

// 4. Create Question Schema
export const createQuestionSchema = z
  .object({
    questionText: z.string().trim().min(3, "Question text must be at least 3 characters"),
    questionType: z.enum([
      "SINGLE_CHOICE",
      "MULTIPLE_CHOICE",
      "TRUE_FALSE",
      "SHORT_ANSWER",
    ]),
    points: z.number().positive("Points must be positive").default(1),
    options: z.array(questionOptionSchema).min(1, "At least one option is required"),
  })
  .refine(
    (data) => {
      if (data.questionType === "SINGLE_CHOICE" || data.questionType === "TRUE_FALSE") {
        const correctCount = data.options.filter((o) => o.isCorrect).length;
        return correctCount === 1;
      }
      if (data.questionType === "MULTIPLE_CHOICE") {
        const correctCount = data.options.filter((o) => o.isCorrect).length;
        return correctCount >= 1;
      }
      return true;
    },
    {
      message:
        "Single choice and True/False questions must have exactly one correct option. Multiple choice must have at least one.",
      path: ["options"],
    }
  );

// 5. Submit Quiz Attempt Schema
export const submitAnswerItemSchema = z.object({
  questionId: z.string().trim().min(1, "Question ID is required"),
  selectedOptionId: z.string().trim().optional(),
  answerText: z.string().trim().optional(),
});

export const submitQuizAttemptSchema = z.object({
  answers: z.array(submitAnswerItemSchema).min(1, "At least one answer must be submitted"),
});

// Type exports
export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type SubmitQuizAttemptInput = z.infer<typeof submitQuizAttemptSchema>;
