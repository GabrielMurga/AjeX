import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireOrg, projectBelongsToOrg, sprintBelongsToOrg } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireOrg);

router.get("/", async (req, res, next) => {
  try {
    const projectId = req.query.projectId as string;
    if (!projectId) return res.status(400).json({ error: "projectId required" });
    if (!(await projectBelongsToOrg(projectId, req.orgId))) {
      return res.status(404).json({ error: "Project not found in this organization" });
    }
    const sprints = await prisma.sprint.findMany({
      where: { projectId, project: { organizationId: req.orgId } },
      include: { _count: { select: { tickets: true } } },
      orderBy: { startDate: "desc" },
    });
    res.json(sprints);
  } catch (e) { next(e); }
});

const createSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  goal: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
});

router.post("/", async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    if (!(await projectBelongsToOrg(data.projectId, req.orgId))) {
      return res.status(404).json({ error: "Project not found in this organization" });
    }
    const sprint = await prisma.sprint.create({
      data: {
        projectId: data.projectId,
        name: data.name,
        goal: data.goal,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
    });
    res.json(sprint);
  } catch (e) { next(e); }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const data = z.object({
      name: z.string().optional(),
      goal: z.string().optional(),
      status: z.enum(["PLANNED","ACTIVE","COMPLETED"]).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).parse(req.body);
    if (!(await sprintBelongsToOrg(req.params.id, req.orgId))) {
      return res.status(404).json({ error: "Sprint not found in this organization" });
    }
    const sprint = await prisma.sprint.update({
      where: { id: req.params.id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
    res.json(sprint);
  } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const sprint = await prisma.sprint.findFirst({
      where: { id: req.params.id, project: { organizationId: req.orgId } },
      include: {
        tickets: { include: { assignee: true } },
        retro: { include: { items: { include: { author: true, votes: true } } } },
      },
    });
    if (!sprint) return res.status(404).json({ error: "Not found" });
    res.json(sprint);
  } catch (e) { next(e); }
});

// Burndown data
router.get("/:id/burndown", async (req, res, next) => {
  try {
    const sprint = await prisma.sprint.findFirst({
      where: { id: req.params.id, project: { organizationId: req.orgId } },
      include: { tickets: true },
    });
    if (!sprint) return res.status(404).json({ error: "Not found" });

    const totalPoints = sprint.tickets.reduce((s, t) => s + (t.storyPoints || 0), 0);
    const days = Math.max(1, Math.ceil((sprint.endDate.getTime() - sprint.startDate.getTime()) / (1000*60*60*24)));
    const ideal: { day: number; remaining: number }[] = [];
    for (let i = 0; i <= days; i++) ideal.push({ day: i, remaining: totalPoints - (totalPoints * i / days) });

    const completedByDay = new Map<number, number>();
    for (const t of sprint.tickets) {
      if (t.completedAt && t.storyPoints) {
        const day = Math.floor((t.completedAt.getTime() - sprint.startDate.getTime()) / (1000*60*60*24));
        completedByDay.set(day, (completedByDay.get(day) || 0) + t.storyPoints);
      }
    }
    const actual: { day: number; remaining: number }[] = [];
    let remaining = totalPoints;
    for (let i = 0; i <= days; i++) {
      remaining -= completedByDay.get(i) || 0;
      actual.push({ day: i, remaining });
    }
    res.json({ totalPoints, days, ideal, actual });
  } catch (e) { next(e); }
});

export default router;
