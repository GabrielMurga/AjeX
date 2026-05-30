import { prisma } from "../lib/prisma";

// ============================================================
// AI Tools — funcoes que o modelo pode invocar para consultar o
// backend. TUDO read-only e escopado ao usuario que chama (nunca
// confiamos em IDs vindos do modelo para autorizar — usamos sempre
// o userId/orgId vindos do JWT do socket).
// ============================================================

export interface ToolScope {
  userId: string;
  orgId: string;
  // projectId default da sala (quando AI room esta vinculada a um projeto).
  // Se o modelo pedir outro projectId, validamos membership antes de responder.
  defaultProjectId?: string;
}

// Tool definitions no formato do Ollama (compativel com OpenAI tool calls).
export const TOOLS_SPEC = [
  {
    type: "function",
    function: {
      name: "list_my_projects",
      description: "Lista os projetos da organizacao do usuario nos quais ele tem acesso (ProjectMember). Use quando o usuario perguntar 'quais projetos tenho', 'meus projetos', etc.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_project_members",
      description: "Lista pessoas (membros) de um projeto com nome e papel. Se nao informar projectId, usa o projeto da sala atual.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "ID do projeto. Opcional — usa o projeto da sala se omitido." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_tickets",
      description: "Lista tickets de um projeto, com filtros opcionais.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string", description: "ID do projeto. Opcional — usa o projeto da sala se omitido." },
          status:    { type: "string", description: "Filtra por status: BACKLOG, TODO, IN_PROGRESS, CODE_REVIEW, QA, DONE." },
          sprintId:  { type: "string", description: "Filtra por sprint." },
          onlyActiveSprint: { type: "boolean", description: "Se true, retorna so tickets da sprint ativa." },
          limit:     { type: "number", description: "Maximo de tickets a retornar (default 20, max 50)." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_ticket",
      description: "Retorna detalhes completos de um ticket pelo seu key (ex: 'VND-12') ou id.",
      parameters: {
        type: "object",
        properties: {
          ticketKeyOrId: { type: "string", description: "key ou id do ticket" },
        },
        required: ["ticketKeyOrId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_sprints",
      description: "Lista sprints de um projeto (mais recentes primeiro).",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          status:    { type: "string", description: "PLANNED | ACTIVE | COMPLETED" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_impediments",
      description: "Lista impedimentos de um projeto. Por padrao retorna so os nao resolvidos.",
      parameters: {
        type: "object",
        properties: {
          projectId:    { type: "string" },
          includeResolved: { type: "boolean" },
        },
        required: [],
      },
    },
  },
] as const;

// ============================================================
// Helpers de autorizacao
// ============================================================

async function assertProjectAccess(scope: ToolScope, projectId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId: scope.orgId,
      members: { some: { membership: { userId: scope.userId } } },
    },
  });
  if (!project) throw new Error("Acesso negado: voce nao e membro deste projeto.");
  return project;
}

function resolveProjectId(scope: ToolScope, requested?: string) {
  const id = requested || scope.defaultProjectId;
  if (!id) throw new Error("projectId nao informado e a sala atual nao esta vinculada a um projeto.");
  return id;
}

// ============================================================
// Executor
// ============================================================

export async function runTool(name: string, rawArgs: any, scope: ToolScope): Promise<any> {
  const args = rawArgs && typeof rawArgs === "object" ? rawArgs : {};

  switch (name) {
    case "list_my_projects": {
      const projects = await prisma.project.findMany({
        where: {
          organizationId: scope.orgId,
          members: { some: { membership: { userId: scope.userId } } },
        },
        select: { id: true, name: true, key: true, description: true },
        orderBy: { name: "asc" },
      });
      return projects;
    }

    case "list_project_members": {
      const projectId = resolveProjectId(scope, args.projectId);
      await assertProjectAccess(scope, projectId);
      const members = await prisma.projectMember.findMany({
        where: { projectId },
        include: { membership: { include: { user: { select: { id: true, name: true, email: true } } } } },
      });
      return members.map(m => ({
        userId: m.membership.user.id,
        name: m.membership.user.name,
        email: m.membership.user.email,
        role: m.role,
      }));
    }

    case "list_tickets": {
      const projectId = resolveProjectId(scope, args.projectId);
      await assertProjectAccess(scope, projectId);
      const limit = Math.min(50, Math.max(1, Number(args.limit) || 20));
      let sprintId = args.sprintId as string | undefined;
      if (args.onlyActiveSprint) {
        const active = await prisma.sprint.findFirst({ where: { projectId, status: "ACTIVE" } });
        sprintId = active?.id;
        if (!sprintId) return [];
      }
      const tickets = await prisma.ticket.findMany({
        where: {
          projectId,
          ...(args.status ? { status: args.status } : {}),
          ...(sprintId ? { sprintId } : {}),
        },
        select: {
          id: true, key: true, title: true, status: true, type: true, priority: true,
          storyPoints: true, sprintId: true,
          assignee: { select: { id: true, name: true } },
        },
        orderBy: [{ priority: "desc" }, { rank: "asc" }],
        take: limit,
      });
      return tickets;
    }

    case "get_ticket": {
      const term = String(args.ticketKeyOrId || "").trim();
      if (!term) throw new Error("ticketKeyOrId obrigatorio.");
      // achar ticket dentro da org do usuario, em projeto que ele acessa
      const ticket = await prisma.ticket.findFirst({
        where: {
          OR: [{ id: term }, { key: term }],
          project: {
            organizationId: scope.orgId,
            members: { some: { membership: { userId: scope.userId } } },
          },
        },
        include: {
          assignee: { select: { id: true, name: true } },
          reporter: { select: { id: true, name: true } },
          sprint:   { select: { id: true, name: true, status: true } },
          labels:   { select: { label: true } },
        },
      });
      if (!ticket) throw new Error("Ticket nao encontrado ou sem acesso.");
      return {
        id: ticket.id, key: ticket.key, title: ticket.title,
        description: ticket.description, acceptanceCriteria: ticket.acceptanceCriteria,
        type: ticket.type, status: ticket.status, priority: ticket.priority,
        storyPoints: ticket.storyPoints,
        assignee: ticket.assignee, reporter: ticket.reporter, sprint: ticket.sprint,
        labels: ticket.labels.map(l => l.label),
      };
    }

    case "list_sprints": {
      const projectId = resolveProjectId(scope, args.projectId);
      await assertProjectAccess(scope, projectId);
      const sprints = await prisma.sprint.findMany({
        where: { projectId, ...(args.status ? { status: args.status } : {}) },
        select: { id: true, name: true, goal: true, status: true, startDate: true, endDate: true },
        orderBy: { startDate: "desc" },
        take: 12,
      });
      return sprints;
    }

    case "list_impediments": {
      const projectId = resolveProjectId(scope, args.projectId);
      await assertProjectAccess(scope, projectId);
      const impediments = await prisma.impediment.findMany({
        where: {
          projectId,
          ...(args.includeResolved ? {} : { status: { not: "RESOLVED" } }),
        },
        select: { id: true, title: true, description: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 30,
      });
      return impediments;
    }

    default:
      throw new Error(`Tool desconhecida: ${name}`);
  }
}
