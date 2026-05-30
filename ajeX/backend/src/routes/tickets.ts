import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireOrg, projectBelongsToOrg } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireOrg);

router.get("/", async (req, res, next) => {
  try {
    const { projectId, sprintId, status, assigneeId } = req.query as Record<string, string>;
    if (!projectId) return res.status(400).json({ error: "projectId required" });
    if (!(await projectBelongsToOrg(projectId, req.orgId))) {
      return res.status(404).json({ error: "Project not found in this organization" });
    }
    const tickets = await prisma.ticket.findMany({
      where: {
        projectId,
        project: { organizationId: req.orgId },
        sprintId: sprintId === "null" ? null : sprintId || undefined,
        status: status as any,
        assigneeId: assigneeId || undefined,
      },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        reporter: { select: { id: true, name: true } },
        labels: true,
        _count: { select: { comments: true } },
      },
      orderBy: [{ rank: "asc" }, { createdAt: "desc" }],
    });
    res.json(tickets);
  } catch (e) { next(e); }
});

const createSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  type: z.enum(["STORY","BUG","TASK","SPIKE","TECH_DEBT"]).default("STORY"),
  priority: z.enum(["LOWEST","LOW","MEDIUM","HIGH","HIGHEST"]).default("MEDIUM"),
  storyPoints: z.number().int().optional(),
  sprintId: z.string().optional(),
  assigneeId: z.string().optional(),
  labels: z.array(z.string()).optional(),
});

router.post("/", async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, organizationId: req.orgId },
      include: { _count: { select: { tickets: true } } },
    });
    if (!project) return res.status(404).json({ error: "Project not found in this organization" });
    const key = `${project.key}-${project._count.tickets + 1}`;
    const reporter = await prisma.user.findUnique({ where: { id: req.user!.userId } });

    const ticket = await prisma.ticket.create({
      data: {
        projectId: data.projectId,
        key,
        title: data.title,
        description: data.description,
        acceptanceCriteria: data.acceptanceCriteria,
        type: data.type,
        priority: data.priority,
        storyPoints: data.storyPoints,
        sprintId: data.sprintId,
        assigneeId: data.assigneeId,
        reporterId: reporter?.id,
        labels: data.labels ? { create: data.labels.map(label => ({ label })) } : undefined,
      },
      include: { assignee: true, reporter: true, labels: true },
    });
    res.json(ticket);
  } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const ticket = await prisma.ticket.findFirst({
      where: { id: req.params.id, project: { organizationId: req.orgId } },
      include: {
        assignee: true,
        reporter: true,
        labels: true,
        comments: { include: { user: true }, orderBy: { createdAt: "asc" } },
        history: { orderBy: { createdAt: "desc" }, take: 30 },
        sprint: true,
        project: true,
      },
    });
    if (!ticket) return res.status(404).json({ error: "Not found" });
    res.json(ticket);
  } catch (e) { next(e); }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const data = z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      acceptanceCriteria: z.string().optional(),
      status: z.enum(["BACKLOG","TODO","IN_PROGRESS","CODE_REVIEW","QA","DONE"]).optional(),
      priority: z.enum(["LOWEST","LOW","MEDIUM","HIGH","HIGHEST"]).optional(),
      storyPoints: z.number().int().nullable().optional(),
      sprintId: z.string().nullable().optional(),
      assigneeId: z.string().nullable().optional(),
      rank: z.number().optional(),
    }).parse(req.body);

    const previous = await prisma.ticket.findFirst({
      where: { id: req.params.id, project: { organizationId: req.orgId } },
    });
    if (!previous) return res.status(404).json({ error: "Not found" });

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: {
        ...data,
        completedAt: data.status === "DONE" ? new Date() : data.status ? null : undefined,
      },
      include: { assignee: true, labels: true },
    });

    if (data.status && data.status !== previous.status) {
      await prisma.ticketHistory.create({
        data: {
          ticketId: updated.id,
          action: "status_change",
          fromValue: previous.status,
          toValue: data.status,
          userId: req.user!.userId,
        },
      });
    }
    res.json(updated);
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const owned = await prisma.ticket.findFirst({
      where: { id: req.params.id, project: { organizationId: req.orgId } },
      select: { id: true },
    });
    if (!owned) return res.status(404).json({ error: "Not found" });
    await prisma.ticket.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post("/:id/comments", async (req, res, next) => {
  try {
    const { body } = z.object({ body: z.string().min(1) }).parse(req.body);
    const owned = await prisma.ticket.findFirst({
      where: { id: req.params.id, project: { organizationId: req.orgId } },
      select: { id: true },
    });
    if (!owned) return res.status(404).json({ error: "Not found" });
    const comment = await prisma.comment.create({
      data: { ticketId: req.params.id, userId: req.user!.userId, body },
      include: { user: true },
    });
    res.json(comment);
  } catch (e) { next(e); }
});

export default router;
