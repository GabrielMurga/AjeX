import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireOrg, projectBelongsToOrg } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireOrg);

// Personas
router.get("/personas", async (req, res, next) => {
  try {
    const { projectId } = req.query as Record<string, string>;
    if (!projectId) return res.status(400).json({ error: "projectId required" });
    if (!(await projectBelongsToOrg(projectId, req.orgId))) {
      return res.status(404).json({ error: "Project not found in this organization" });
    }
    const personas = await prisma.persona.findMany({
      where: { projectId, project: { organizationId: req.orgId } },
    });
    res.json(personas);
  } catch (e) { next(e); }
});

router.post("/personas", async (req, res, next) => {
  try {
    const data = z.object({
      projectId: z.string(),
      name: z.string(),
      role: z.string().optional(),
      goals: z.string().optional(),
      pains: z.string().optional(),
      bio: z.string().optional(),
    }).parse(req.body);
    if (!(await projectBelongsToOrg(data.projectId, req.orgId))) {
      return res.status(404).json({ error: "Project not found in this organization" });
    }
    const persona = await prisma.persona.create({ data });
    res.json(persona);
  } catch (e) { next(e); }
});

router.patch("/personas/:id", async (req, res, next) => {
  try {
    const data = z.object({
      name: z.string().optional(),
      role: z.string().optional(),
      goals: z.string().optional(),
      pains: z.string().optional(),
      bio: z.string().optional(),
    }).parse(req.body);
    const owned = await prisma.persona.findFirst({
      where: { id: req.params.id, project: { organizationId: req.orgId } },
      select: { id: true },
    });
    if (!owned) return res.status(404).json({ error: "Not found" });
    const persona = await prisma.persona.update({ where: { id: req.params.id }, data });
    res.json(persona);
  } catch (e) { next(e); }
});

router.delete("/personas/:id", async (req, res, next) => {
  try {
    const owned = await prisma.persona.findFirst({
      where: { id: req.params.id, project: { organizationId: req.orgId } },
      select: { id: true },
    });
    if (!owned) return res.status(404).json({ error: "Not found" });
    await prisma.persona.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Journeys
router.get("/journeys", async (req, res, next) => {
  try {
    const { projectId } = req.query as Record<string, string>;
    if (!projectId) return res.status(400).json({ error: "projectId required" });
    if (!(await projectBelongsToOrg(projectId, req.orgId))) {
      return res.status(404).json({ error: "Project not found in this organization" });
    }
    const journeys = await prisma.journey.findMany({
      where: { projectId, project: { organizationId: req.orgId } },
    });
    res.json(journeys.map(j => ({ ...j, steps: JSON.parse(j.steps || "[]") })));
  } catch (e) { next(e); }
});

router.post("/journeys", async (req, res, next) => {
  try {
    const { projectId, name, steps } = z.object({
      projectId: z.string(), name: z.string(), steps: z.array(z.any()),
    }).parse(req.body);
    if (!(await projectBelongsToOrg(projectId, req.orgId))) {
      return res.status(404).json({ error: "Project not found in this organization" });
    }
    const j = await prisma.journey.create({
      data: { projectId, name, steps: JSON.stringify(steps) },
    });
    res.json({ ...j, steps });
  } catch (e) { next(e); }
});

export default router;
