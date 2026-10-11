import express from "express";
import authRouter from "./routes/auth.router";
import userRouter from "./routes/users.router"
import { errorMiddleware } from "./middleware/error.middleware";

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter)

// Must be after all routes
app.use(errorMiddleware);

export default app;
