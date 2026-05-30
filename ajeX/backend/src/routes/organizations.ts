import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireOrg } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const memberships = await prisma.membership.findMany({
      where: { userId: req.user!.userId },
      include: { organization: true },
    });
    res.json(memberships.map(m => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      role: m.role,
      isAdmin: m.isAdmin,
    })));
  } catch (e) { next(e); }
});

router.get("/:id/members", requireOrg, async (req, res, next) => {
  try {
    const members = await prisma.membership.findMany({
      where: { organizationId: req.orgId },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json(members.map(m => ({
      membershipId: m.id,
      role: m.role,
      isAdmin: m.isAdmin,
      user: m.user,
    })));
  } catch (e) { next(e); }
});

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  password: z.string().min(6),
  role: z.enum([
    "PRODUCT_MANAGER","PRODUCT_OWNER","SCRUM_MASTER","DEVELOPER",
    "UX_DESIGNER","QA_ENGINEER","DATA_ANALYST","TECH_LEAD","STAKEHOLDER"
  ]),
});

router.post("/:id/members", requireOrg, async (req, res, next) => {
  try {
    const data = inviteSchema.parse(req.body);
    let user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      const bcrypt = await import("bcryptjs");
      user = await prisma.user.create({
        data: { email: data.email, name: data.name, passwordHash: await bcrypt.hash(data.password, 10) },
      });
    }
    const membership = await prisma.membership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: req.orgId! } },
      update: { role: data.role },
      create: { userId: user.id, organizationId: req.orgId!, role: data.role },
    });
    res.json(membership);
  } catch (e) { next(e); }
});

export default router;
