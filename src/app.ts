import "dotenv/config";
import express from "express";
import helmet from "helmet";
import chatRoutes from "./routes/chat.routes";
import userRoutes from "./routes/user.routes";
import { errorMiddleware } from "./middleware/error.middleware";

const app = express();

app.use(helmet());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_request, response) => {
  response.status(200).json({ status: "ok" });
});
app.use("/chat", chatRoutes);


app.use("/user", userRoutes);
app.use(errorMiddleware);



const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`Chat API listening on port ${port}`);
});
