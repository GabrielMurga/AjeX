import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { env } from "./lib/env";
import { errorHandler } from "./middleware/error";
import { setupChatSocket } from "./sockets/chat";

import authRouter from "./routes/auth";
import organizationsRouter from "./routes/organizations";
import projectsRouter from "./routes/projects";
import sprintsRouter from "./routes/sprints";
import ticketsRouter from "./routes/tickets";
import retrosRouter from "./routes/retros";
import impedimentsRouter from "./routes/impediments";
import roadmapRouter from "./routes/roadmap";
import discoveryRouter from "./routes/discovery";
import qaRouter from "./routes/qa";
import dailiesRouter from "./routes/dailies";
import dashboardRouter from "./routes/dashboard";
import chatRouter from "./routes/chat";

const app = express();
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "5mb" }));

app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.use("/api/auth", authRouter);
app.use("/api/organizations", organizationsRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/sprints", sprintsRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/retros", retrosRouter);
app.use("/api/impediments", impedimentsRouter);
app.use("/api/roadmap", roadmapRouter);
app.use("/api/discovery", discoveryRouter);
app.use("/api/qa", qaRouter);
app.use("/api/dailies", dailiesRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/chat", chatRouter);

app.use(errorHandler);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: env.CORS_ORIGIN, credentials: true },
});
setupChatSocket(io);

server.listen(env.PORT, () => {
  console.log(`[ajex-backend] listening on :${env.PORT}`);
  console.log(`[ajex-backend] ollama: ${env.OLLAMA_URL} (${env.OLLAMA_MODEL})`);
});
