import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireOrg, projectBelongsToOrg } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireOrg);

router.get("/overview", async (req, res, next) => {
  try {
    const { projectId } = req.query as Record<string, string>;
    if (projectId && !(await projectBelongsToOrg(projectId, req.orgId))) {
      return res.status(404).json({ error: "Project not found in this organization" });
    }

    const [tickets, sprints, impediments, members] = await Promise.all([
      prisma.ticket.findMany({
        where: projectId
          ? { projectId, project: { organizationId: req.orgId } }
          : { project: { organizationId: req.orgId } },
      }),
      prisma.sprint.findMany({
        where: projectId
          ? { projectId, project: { organizationId: req.orgId } }
          : { project: { organizationId: req.orgId } },
        include: { tickets: true },
        orderBy: { startDate: "desc" },
        take: 6,
      }),
      prisma.impediment.findMany({
        where: projectId
          ? { projectId, project: { organizationId: req.orgId }, status: { not: "RESOLVED" } }
          : { project: { organizationId: req.orgId }, status: { not: "RESOLVED" } },
      }),
      prisma.membership.count({ where: { organizationId: req.orgId } }),
    ]);

    const byStatus = tickets.reduce<Record<string, number>>((a, t) => {
      a[t.status] = (a[t.status] || 0) + 1;
      return a;
    }, {});
    const byType = tickets.reduce<Record<string, number>>((a, t) => {
      a[t.type] = (a[t.type] || 0) + 1;
      return a;
    }, {});

    // Velocity per completed sprint
    const velocity = sprints
      .filter(s => s.status === "COMPLETED")
      .map(s => ({
        sprint: s.name,
        points: s.tickets.filter(t => t.status === "DONE").reduce((a, t) => a + (t.storyPoints || 0), 0),
      }));

    // Lead/cycle time approximation
    const completed = tickets.filter(t => t.completedAt);
    const leadTimes = completed.map(t => (t.completedAt!.getTime() - t.createdAt.getTime()) / (1000*60*60*24));
    const avgLead = leadTimes.length ? leadTimes.reduce((a,b)=>a+b,0)/leadTimes.length : 0;

    res.json({
      counts: {
        totalTickets: tickets.length,
        done: tickets.filter(t => t.status === "DONE").length,
        inProgress: tickets.filter(t => ["IN_PROGRESS","CODE_REVIEW","QA"].includes(t.status)).length,
        backlog: tickets.filter(t => t.status === "BACKLOG").length,
        impediments: impediments.length,
        members,
      },
      byStatus,
      byType,
      velocity,
      avgLeadTimeDays: Number(avgLead.toFixed(1)),
      activeSprint: sprints.find(s => s.status === "ACTIVE") || null,
    });
  } catch (e) { next(e); }
});

router.get("/stakeholder", async (req, res, next) => {
  try {
    const { projectId } = req.query as Record<string, string>;
    if (!projectId) return res.status(400).json({ error: "projectId required" });
    if (!(await projectBelongsToOrg(projectId, req.orgId))) {
      return res.status(404).json({ error: "Project not found in this organization" });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: req.orgId },
      include: {
        sprints: { orderBy: { startDate: "desc" }, include: { tickets: true } },
        roadmapItems: true,
        okrs: { include: { keyResults: true } },
      },
    });
    if (!project) return res.status(404).json({ error: "Not found" });

    const active = project.sprints.find(s => s.status === "ACTIVE");
    const recentDone = project.sprints
      .flatMap(s => s.tickets.filter(t => t.status === "DONE"))
      .sort((a,b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))
      .slice(0, 10);

    res.json({
      project: { id: project.id, name: project.name, key: project.key, vision: project.vision },
      activeSprint: active ? {
        ...active,
        progress: {
          total: active.tickets.length,
          done: active.tickets.filter(t => t.status === "DONE").length,
          totalPoints: active.tickets.reduce((s, t) => s + (t.storyPoints||0), 0),
          donePoints: active.tickets.filter(t => t.status === "DONE").reduce((s, t) => s + (t.storyPoints||0), 0),
        },
      } : null,
      recentDelivered: recentDone,
      roadmap: project.roadmapItems,
      okrs: project.okrs,
    });
  } catch (e) { next(e); }
});

export default router;
