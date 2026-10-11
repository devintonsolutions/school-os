import express from "express";
import authRouter from "./routes/auth.router";
import categoryRouter from "./routes/category.router";
import courseRouter from "./routes/course.router";
import { errorMiddleware } from "./middleware/error.middleware";

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

app.use("/api/auth", authRouter);

// Core LMS Routes (Developer 2)
// TODO [Team Lead]: Confirm prefix convention: currently "/api", may become "/api/v1"
const API_PREFIX = "/api";
app.use(`${API_PREFIX}/categories`, categoryRouter);
app.use(`${API_PREFIX}/courses`, courseRouter);

// Must be after all routes
app.use(errorMiddleware);

export default app;
