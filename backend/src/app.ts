import express from "express";
import authRouter from "./routes/auth.router";
import userRouter from "./routes/users.router";
import categoryRouter from "./routes/category.router";
import courseRouter from "./routes/course.router";
import moduleRouter from "./routes/module.router";
import lessonRouter from "./routes/lesson.router";
import enrollmentRouter from "./routes/enrollment.router";
import assignmentsRouter from "./routes/assignments.router";
import quizzesRouter from "./routes/quizzes.router";
import { errorMiddleware } from "./middleware/error.middleware";

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Auth & Users (Developer 1)
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);

// Core LMS (Developer 2)
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/courses", courseRouter);
app.use("/api/v1", moduleRouter);
app.use("/api/v1", lessonRouter);
app.use("/api/v1", enrollmentRouter);

// Assessments (Developer 3)
app.use("/api/v1/assignments", assignmentsRouter);
app.use("/api/v1/quizzes", quizzesRouter);

// Must be after all routes
app.use(errorMiddleware);

export default app;
