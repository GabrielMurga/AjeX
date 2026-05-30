import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireOrg } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireOrg);

router.get("/", async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { organizationId: req.orgId },
      include: {
        _count: { select: { tickets: true, sprints: true, members: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(projects);
  } catch (e) { next(e); }
});

const createSchema = z.object({
  name: z.string().min(1),
  key: z.string().min(2).max(8).regex(/^[A-Z0-9]+$/),
  description: z.string().optional(),
  vision: z.string().optional(),
});

router.post("/", async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const project = await prisma.project.create({
      data: { ...data, organizationId: req.orgId! },
    });
    res.json(project);
  } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const p = await prisma.project.findFirst({
      where: { id: req.params.id, organizationId: req.orgId },
      include: {
        members: { include: { membership: { include: { user: true } } } },
        sprints: { orderBy: { startDate: "desc" } },
        definitionOfDone: { orderBy: { order: "asc" } },
      },
    });
    if (!p) return res.status(404).json({ error: "Not found" });
    res.json(p);
  } catch (e) { next(e); }
});

router.post("/:id/members", async (req, res, next) => {
  try {
    const { membershipId, role } = z.object({
      membershipId: z.string(),
      role: z.enum([
        "PRODUCT_MANAGER","PRODUCT_OWNER","SCRUM_MASTER","DEVELOPER",
        "UX_DESIGNER","QA_ENGINEER","DATA_ANALYST","TECH_LEAD","STAKEHOLDER"
      ]),
    }).parse(req.body);
    const pm = await prisma.projectMember.upsert({
      where: { projectId_membershipId: { projectId: req.params.id, membershipId } },
      update: { role },
      create: { projectId: req.params.id, membershipId, role },
    });
    res.json(pm);
  } catch (e) { next(e); }
});

router.post("/:id/dod", async (req, res, next) => {
  try {
    const { text } = z.object({ text: z.string().min(1) }).parse(req.body);
    const count = await prisma.doDItem.count({ where: { projectId: req.params.id } });
    const item = await prisma.doDItem.create({
      data: { projectId: req.params.id, text, order: count },
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete("/:id/dod/:itemId", async (req, res, next) => {
  try {
    await prisma.doDItem.delete({ where: { id: req.params.itemId } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
