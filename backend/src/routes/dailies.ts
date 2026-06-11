import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireOrg, projectBelongsToOrg, sprintBelongsToOrg } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireOrg);

router.get("/", async (req, res, next) => {
  try {
    const { sprintId } = req.query as Record<string, string>;
    if (!sprintId) return res.status(400).json({ error: "sprintId required" });
    if (!(await sprintBelongsToOrg(sprintId, req.orgId))) {
      return res.status(404).json({ error: "Sprint not found in this organization" });
    }
    const dailies = await prisma.daily.findMany({
      where: { sprintId, project: { organizationId: req.orgId } },
      include: { updates: true },
      orderBy: { date: "desc" },
    });
    res.json(dailies);
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const { sprintId, projectId, date, notes } = z.object({
      sprintId: z.string(), projectId: z.string(), date: z.string(), notes: z.string().optional(),
    }).parse(req.body);
    if (!(await projectBelongsToOrg(projectId, req.orgId))) {
      return res.status(404).json({ error: "Project not found in this organization" });
    }
    const daily = await prisma.daily.create({
      data: { sprintId, projectId, date: new Date(date), notes },
    });
    res.json(daily);
  } catch (e) { next(e); }
});

router.post("/:id/update", async (req, res, next) => {
  try {
    const { yesterday, today, blockers } = z.object({
      yesterday: z.string(), today: z.string(), blockers: z.string().optional(),
    }).parse(req.body);
    const owned = await prisma.daily.findFirst({
      where: { id: req.params.id, project: { organizationId: req.orgId } },
      select: { id: true },
    });
    if (!owned) return res.status(404).json({ error: "Not found" });
    const u = await prisma.dailyUpdate.create({
      data: { dailyId: req.params.id, userId: req.user!.userId, yesterday, today, blockers },
    });
    res.json(u);
  } catch (e) { next(e); }
});

export default router;
