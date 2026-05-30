import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireOrg, projectBelongsToOrg } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireOrg);

router.get("/", async (req, res, next) => {
  try {
    const { projectId } = req.query as Record<string, string>;
    if (!projectId) return res.status(400).json({ error: "projectId required" });
    if (!(await projectBelongsToOrg(projectId, req.orgId))) {
      return res.status(404).json({ error: "Project not found in this organization" });
    }
    const retros = await prisma.retrospective.findMany({
      where: { projectId, project: { organizationId: req.orgId } },
      include: { sprint: true, _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(retros);
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const { sprintId, projectId, title } = z.object({
      sprintId: z.string(), projectId: z.string(), title: z.string(),
    }).parse(req.body);
    if (!(await projectBelongsToOrg(projectId, req.orgId))) {
      return res.status(404).json({ error: "Project not found in this organization" });
    }
    const retro = await prisma.retrospective.upsert({
      where: { sprintId },
      update: { title },
      create: { sprintId, projectId, title },
    });
    res.json(retro);
  } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const retro = await prisma.retrospective.findFirst({
      where: { id: req.params.id, project: { organizationId: req.orgId } },
      include: {
        sprint: true,
        items: { include: { author: true, votes: true }, orderBy: { createdAt: "asc" } },
      },
    });
    if (!retro) return res.status(404).json({ error: "Not found" });
    res.json(retro);
  } catch (e) { next(e); }
});

router.post("/:id/items", async (req, res, next) => {
  try {
    const { column, body } = z.object({
      column: z.enum(["WENT_WELL","TO_IMPROVE","ACTION_ITEM"]),
      body: z.string().min(1),
    }).parse(req.body);
    const owned = await prisma.retrospective.findFirst({
      where: { id: req.params.id, project: { organizationId: req.orgId } },
      select: { id: true },
    });
    if (!owned) return res.status(404).json({ error: "Not found" });
    const item = await prisma.retroItem.create({
      data: { retrospectiveId: req.params.id, column, body, authorId: req.user!.userId },
      include: { author: true, votes: true },
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.post("/items/:itemId/vote", async (req, res, next) => {
  try {
    const existing = await prisma.retroVote.findUnique({
      where: { retroItemId_userId: { retroItemId: req.params.itemId, userId: req.user!.userId } },
    });
    if (existing) {
      await prisma.retroVote.delete({ where: { id: existing.id } });
      return res.json({ voted: false });
    }
    await prisma.retroVote.create({
      data: { retroItemId: req.params.itemId, userId: req.user!.userId },
    });
    res.json({ voted: true });
  } catch (e) { next(e); }
});

router.delete("/items/:itemId", async (req, res, next) => {
  try {
    await prisma.retroItem.delete({ where: { id: req.params.itemId } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
