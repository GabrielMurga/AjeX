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
    const items = await prisma.impediment.findMany({
      where: { projectId, project: { organizationId: req.orgId } },
      include: { reporter: { select: { id: true, name: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
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
    }).parse(req.body);
    if (!(await projectBelongsToOrg(data.projectId, req.orgId))) {
      return res.status(404).json({ error: "Project not found in this organization" });
    }
    const imp = await prisma.impediment.create({
      data: { ...data, reporterId: req.user!.userId },
    });
    res.json(imp);
  } catch (e) { next(e); }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const data = z.object({
      status: z.enum(["OPEN","IN_PROGRESS","RESOLVED"]).optional(),
      title: z.string().optional(),
      description: z.string().optional(),
    }).parse(req.body);
    const owned = await prisma.impediment.findFirst({
      where: { id: req.params.id, project: { organizationId: req.orgId } },
      select: { id: true },
    });
    if (!owned) return res.status(404).json({ error: "Not found" });
    const imp = await prisma.impediment.update({
      where: { id: req.params.id },
      data: { ...data, resolvedAt: data.status === "RESOLVED" ? new Date() : undefined },
    });
    res.json(imp);
  } catch (e) { next(e); }
});

export default router;
