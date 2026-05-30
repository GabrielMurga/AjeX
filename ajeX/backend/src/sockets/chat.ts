import { Server, Socket } from "socket.io";
import { verifyToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { askOllama, ProjectContext } from "../services/ollama";
import { ToolScope } from "../services/aiTools";

export function setupChatSocket(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token"));
    try {
      const payload = verifyToken(token);
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = (socket as any).user as { userId: string; email: string };

    socket.on("join", async ({ roomId }: { roomId: string }) => {
      socket.join(`room:${roomId}`);
      socket.emit("joined", { roomId });
    });

    socket.on("leave", ({ roomId }: { roomId: string }) => {
      socket.leave(`room:${roomId}`);
    });

    socket.on("typing", ({ roomId }: { roomId: string }) => {
      socket.to(`room:${roomId}`).emit("typing", { userId: user.userId });
    });

    socket.on("message", async ({ roomId, body }: { roomId: string; body: string }) => {
      const trimmed = body?.trim();
      if (!trimmed) return;

      let isAiRoom = false;
      try {
        const room = await prisma.chatRoom.findUnique({ where: { id: roomId }, include: { project: true } });
        if (!room) return;
        isAiRoom = room.kind === "AI_ASSISTANT";

        // Validacao de membership na org da sala (defense in depth)
        const membership = await prisma.membership.findUnique({
          where: { userId_organizationId: { userId: user.userId, organizationId: room.organizationId } },
        });
        if (!membership) {
          socket.emit("error", { message: "Sem acesso a esta sala." });
          return;
        }

        // Salas de IA são individuais: somente o dono pode usar.
        if (isAiRoom && room.ownerId && room.ownerId !== user.userId) {
          socket.emit("error", { message: "Esta conversa de IA pertence a outro usuário." });
          return;
        }

        // Slash commands (apenas em salas de IA — evita perda de historico do time)
        const command = trimmed.toLowerCase();
        if (isAiRoom && (command === "/limpar" || command === "/clear")) {
          await prisma.chatMessage.deleteMany({ where: { chatRoomId: roomId } });
          io.to(`room:${roomId}`).emit("room:cleared", { roomId });
          return;
        }

        const userRecord = await prisma.user.findUnique({ where: { id: user.userId } });

        const userMsg = await prisma.chatMessage.create({
          data: { chatRoomId: roomId, userId: user.userId, role: "user", body },
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        });
        io.to(`room:${roomId}`).emit("message", userMsg);

        if (isAiRoom) {
          io.to(`room:${roomId}`).emit("ai:typing", { typing: true });

          try {
            const history = await prisma.chatMessage.findMany({
              where: { chatRoomId: roomId, id: { not: userMsg.id } },
              orderBy: { createdAt: "desc" },
              take: 10,
            });
            const historyOrdered = history.reverse().map(m => ({
              role: (m.role === "ai" ? "assistant" : "user") as "user" | "assistant",
              content: m.body,
            }));

            const context = await buildAiContext({
              userId: user.userId,
              orgId: room.organizationId,
              userName: userRecord?.name,
              projectId: room.projectId || undefined,
            });

            const scope: ToolScope = {
              userId: user.userId,
              orgId: room.organizationId,
              defaultProjectId: room.projectId || undefined,
            };

            const aiResponse = await askOllama(body, historyOrdered, context, scope);
            const aiMsg = await prisma.chatMessage.create({
              data: { chatRoomId: roomId, role: "ai", body: aiResponse },
            });
            io.to(`room:${roomId}`).emit("message", aiMsg);
          } catch (aiErr: any) {
            console.error("[ai error]", aiErr.message);
            const errMsg = await prisma.chatMessage.create({
              data: {
                chatRoomId: roomId,
                role: "ai",
                body: `⚠️ Não consegui responder agora: ${aiErr.message || "erro desconhecido"}. Verifique se o Ollama está rodando e tente novamente.`,
              },
            });
            io.to(`room:${roomId}`).emit("message", errMsg);
          } finally {
            io.to(`room:${roomId}`).emit("ai:typing", { typing: false });
          }
        }
      } catch (e: any) {
        console.error("[socket message]", e.message);
        if (isAiRoom) io.to(`room:${roomId}`).emit("ai:typing", { typing: false });
        socket.emit("error", { message: e.message });
      }
    });
  });
}

// Monta o contexto pre-carregado para a IA (so dados que o usuario tem acesso).
async function buildAiContext(input: {
  userId: string;
  orgId: string;
  userName?: string;
  projectId?: string;
}): Promise<ProjectContext> {
  const ctx: ProjectContext = { userName: input.userName };

  // Projetos acessiveis na org
  const projects = await prisma.project.findMany({
    where: {
      organizationId: input.orgId,
      members: { some: { membership: { userId: input.userId } } },
    },
    select: { id: true, name: true, key: true },
    orderBy: { name: "asc" },
  });
  ctx.accessibleProjects = projects;

  if (input.projectId && projects.some(p => p.id === input.projectId)) {
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      include: {
        tickets: true,
        sprints: { orderBy: { startDate: "desc" }, include: { tickets: true } },
        impediments: { where: { status: { not: "RESOLVED" } } },
        members: { include: { membership: { include: { user: { select: { name: true } } } } } },
      },
    });
    if (project) {
      const active = project.sprints.find(s => s.status === "ACTIVE");
      const completed = project.sprints.filter(s => s.status === "COMPLETED").slice(0, 5);
      ctx.projectId = project.id;
      ctx.projectName = project.name;
      ctx.activeSprintName = active?.name;
      ctx.activeSprintGoal = active?.goal || undefined;
      ctx.totalTickets = project.tickets.length;
      ctx.doneTickets = project.tickets.filter(t => t.status === "DONE").length;
      ctx.inProgressTickets = project.tickets.filter(t => ["IN_PROGRESS", "CODE_REVIEW", "QA"].includes(t.status)).length;
      ctx.impediments = project.impediments.length;
      ctx.velocity = completed.map(s =>
        s.tickets.filter(t => t.status === "DONE").reduce((a, t) => a + (t.storyPoints || 0), 0)
      );
      ctx.projectMembers = project.members.map(m => ({
        name: m.membership.user.name,
        role: m.role,
      }));
    }
  }

  return ctx;
}
