import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireOrg, projectBelongsToOrg } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireOrg);

router.get("/plans", async (req, res, next) => {
  try {
    const { projectId } = req.query as Record<string, string>;
    if (!projectId) return res.status(400).json({ error: "projectId required" });
    if (!(await projectBelongsToOrg(projectId, req.orgId))) {
      return res.status(404).json({ error: "Project not found in this organization" });
    }
    const plans = await prisma.testPlan.findMany({
      where: { projectId, project: { organizationId: req.orgId } },
      include: { cases: true },
    });
    res.json(plans);
  } catch (e) { next(e); }
});

router.post("/plans", async (req, res, next) => {
  try {
    const data = z.object({
      projectId: z.string(), name: z.string(), scope: z.string().optional(),
    }).parse(req.body);
    if (!(await projectBelongsToOrg(data.projectId, req.orgId))) {
      return res.status(404).json({ error: "Project not found in this organization" });
    }
    const plan = await prisma.testPlan.create({ data });
    res.json(plan);
  } catch (e) { next(e); }
});

router.post("/plans/:id/cases", async (req, res, next) => {
  try {
    const data = z.object({
      title: z.string(), steps: z.string(), expected: z.string(), ticketId: z.string().optional(),
    }).parse(req.body);
    const owned = await prisma.testPlan.findFirst({
      where: { id: req.params.id, project: { organizationId: req.orgId } },
      select: { id: true },
    });
    if (!owned) return res.status(404).json({ error: "Not found" });
    const tc = await prisma.testCase.create({ data: { ...data, testPlanId: req.params.id } });
    res.json(tc);
  } catch (e) { next(e); }
});

router.patch("/cases/:id", async (req, res, next) => {
  try {
    const { status } = z.object({
      status: z.enum(["NOT_RUN","PASSED","FAILED","BLOCKED"]),
    }).parse(req.body);
    const owned = await prisma.testCase.findFirst({
      where: { id: req.params.id, testPlan: { project: { organizationId: req.orgId } } },
      select: { id: true },
    });
    if (!owned) return res.status(404).json({ error: "Not found" });
    const tc = await prisma.testCase.update({ where: { id: req.params.id }, data: { status } });
    res.json(tc);
  } catch (e) { next(e); }
});

export default router;
