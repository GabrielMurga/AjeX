import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireOrg, projectBelongsToOrg } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireOrg);

// Garante que o usuário tem uma sala de IA pessoal na org. Cria sob demanda.
async function ensurePersonalAiRoom(userId: string, orgId: string) {
  const existing = await prisma.chatRoom.findFirst({
    where: { organizationId: orgId, ownerId: userId, kind: "AI_ASSISTANT" },
  });
  if (existing) return existing;
  return prisma.chatRoom.create({
    data: {
      organizationId: orgId,
      ownerId: userId,
      kind: "AI_ASSISTANT",
      name: "IA - Minha conversa",
    },
  });
}

router.get("/rooms", async (req, res, next) => {
  try {
    // Auto-provisiona a sala AI individual antes de listar
    await ensurePersonalAiRoom(req.user!.userId, req.orgId!);

    const rooms = await prisma.chatRoom.findMany({
      where: {
        organizationId: req.orgId,
        OR: [
          { kind: "TEAM" }, // Salas de time são da org inteira
          { kind: "AI_ASSISTANT", ownerId: req.user!.userId }, // IA: só as do próprio usuário
        ],
      },
      include: { project: true, _count: { select: { messages: true } } },
      orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
    });
    res.json(rooms);
  } catch (e) { next(e); }
});

router.post("/rooms", async (req, res, next) => {
  try {
    const data = z.object({
      name: z.string(),
      kind: z.enum(["TEAM","AI_ASSISTANT"]).default("TEAM"),
      projectId: z.string().optional(),
    }).parse(req.body);

    if (data.projectId && !(await projectBelongsToOrg(data.projectId, req.orgId))) {
      return res.status(404).json({ error: "Project not found in this organization" });
    }

    const room = await prisma.chatRoom.create({
      data: {
        name: data.name,
        kind: data.kind,
        projectId: data.projectId,
        organizationId: req.orgId!,
        // Salas AI ficam vinculadas ao criador (individuais)
        ownerId: data.kind === "AI_ASSISTANT" ? req.user!.userId : null,
      },
    });
    res.json(room);
  } catch (e) { next(e); }
});

router.get("/rooms/:id/messages", async (req, res, next) => {
  try {
    // Valida acesso à sala: TEAM precisa ser da org; AI precisa ser do dono.
    const room = await prisma.chatRoom.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.orgId,
        OR: [
          { kind: "TEAM" },
          { kind: "AI_ASSISTANT", ownerId: req.user!.userId },
        ],
      },
    });
    if (!room) return res.status(404).json({ error: "Room not found" });

    const messages = await prisma.chatMessage.findMany({
      where: { chatRoomId: req.params.id },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    res.json(messages);
  } catch (e) { next(e); }
});

export default router;
