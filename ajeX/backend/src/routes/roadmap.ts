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
    const items = await prisma.roadmapItem.findMany({
      where: { projectId, project: { organizationId: req.orgId } },
      orderBy: [{ quarter: "asc" }, { riceScore: "desc" }],
    });
    res.json(items);
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const data = z.object({
      projectId: z.string(),
      title: z.string(),
      description: z.string().optional(),
      quarter: z.string(),
      status: z.enum(["IDEA","PLANNED","IN_PROGRESS","SHIPPED"]).default("IDEA"),
      riceScore: z.number().optional(),
    }).parse(req.body);
    if (!(await projectBelongsToOrg(data.projectId, req.orgId))) {
      return res.status(404).json({ error: "Project not found in this organization" });
    }
    const item = await prisma.roadmapItem.create({ data });
    res.json(item);
  } catch (e) { next(e); }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const data = z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      quarter: z.string().optional(),
      status: z.enum(["IDEA","PLANNED","IN_PROGRESS","SHIPPED"]).optional(),
      riceScore: z.number().optional(),
    }).parse(req.body);
    const owned = await prisma.roadmapItem.findFirst({
      where: { id: req.params.id, project: { organizationId: req.orgId } },
      select: { id: true },
    });
    if (!owned) return res.status(404).json({ error: "Not found" });
    const item = await prisma.roadmapItem.update({ where: { id: req.params.id }, data });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const owned = await prisma.roadmapItem.findFirst({
      where: { id: req.params.id, project: { organizationId: req.orgId } },
      select: { id: true },
    });
    if (!owned) return res.status(404).json({ error: "Not found" });
    await prisma.roadmapItem.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// OKRs
router.get("/okrs", async (req, res, next) => {
  try {
    const { projectId } = req.query as Record<string, string>;
    if (!projectId) return res.status(400).json({ error: "projectId required" });
    if (!(await projectBelongsToOrg(projectId, req.orgId))) {
      return res.status(404).json({ error: "Project not found in this organization" });
    }
    const okrs = await prisma.oKR.findMany({
      where: { projectId, project: { organizationId: req.orgId } },
      include: { keyResults: true },
      orderBy: { quarter: "desc" },
    });
    res.json(okrs);
  } catch (e) { next(e); }
});

router.post("/okrs", async (req, res, next) => {
  try {
    const data = z.object({
      projectId: z.string(),
      objective: z.string(),
      quarter: z.string(),
      keyResults: z.array(z.object({ text: z.string(), target: z.number() })).optional(),
    }).parse(req.body);
    if (!(await projectBelongsToOrg(data.projectId, req.orgId))) {
      return res.status(404).json({ error: "Project not found in this organization" });
    }
    const okr = await prisma.oKR.create({
      data: {
        projectId: data.projectId,
        objective: data.objective,
        quarter: data.quarter,
        keyResults: { create: data.keyResults || [] },
      },
      include: { keyResults: true },
    });
    res.json(okr);
  } catch (e) { next(e); }
});

router.patch("/okrs/kr/:id", async (req, res, next) => {
  try {
    const { current } = z.object({ current: z.number() }).parse(req.body);
    const kr = await prisma.keyResult.update({ where: { id: req.params.id }, data: { current } });
    res.json(kr);
  } catch (e) { next(e); }
});

export default router;
