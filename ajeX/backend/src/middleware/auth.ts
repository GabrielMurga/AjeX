import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../lib/jwt";
import { prisma } from "../lib/prisma";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      orgId?: string;
      membershipId?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }
  try {
    const token = header.slice(7);
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export async function requireOrg(req: Request, res: Response, next: NextFunction) {
  const orgId = (req.headers["x-org-id"] as string) || (req.query.orgId as string);
  if (!orgId) return res.status(400).json({ error: "Missing organization context (x-org-id header)" });
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: req.user.userId, organizationId: orgId } },
  });
  if (!membership) return res.status(403).json({ error: "Not a member of this organization" });

  req.orgId = orgId;
  req.membershipId = membership.id;
  next();
}

// Valida que um projectId pertence à organização atual. Retorna true se for válido.
// Use em qualquer rota que receba projectId via query/body para evitar vazamento entre tenants.
export async function projectBelongsToOrg(projectId: string | undefined | null, orgId: string | undefined): Promise<boolean> {
  if (!projectId || !orgId) return false;
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: orgId },
    select: { id: true },
  });
  return !!project;
}

// Idem para sprintId
export async function sprintBelongsToOrg(sprintId: string | undefined | null, orgId: string | undefined): Promise<boolean> {
  if (!sprintId || !orgId) return false;
  const sprint = await prisma.sprint.findFirst({
    where: { id: sprintId, project: { organizationId: orgId } },
    select: { id: true },
  });
  return !!sprint;
}
