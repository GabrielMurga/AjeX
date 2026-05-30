import { PrismaClient, ScrumRole, TicketStatus, TicketType, Priority, SprintStatus, ImpedimentStatus, RoadmapStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const FIRST_NAMES = ["Ana","Bruno","Carla","Diego","Eduarda","Felipe","Gabriela","Henrique","Isabela","João","Karina","Lucas","Mariana","Nícolas","Olívia","Pedro","Quésia","Rafael","Sofia","Thiago","Úrsula","Vinícius","Wesley","Xavier","Yara","Zé"];
const LAST_NAMES = ["Silva","Souza","Costa","Pereira","Almeida","Ferreira","Rodrigues","Carvalho","Gomes","Martins","Araújo","Ribeiro","Lima","Cardoso","Teixeira","Moreira","Cavalcanti","Dias","Barbosa","Mendes"];

const PROJECTS = [
  { name: "Plataforma de Vendas", key: "VND", vision: "Tornar o processo de vendas online (web e mobile) o mais fluido e inteligente do Brasil." },
  { name: "Portal Interno", key: "PRT", vision: "Centralizar as ferramentas internas em um portal único e produtivo." },
];

const STORY_TITLES = [
  "Permitir login com email e senha","Implementar recuperação de senha","Adicionar tela de cadastro de usuário",
  "Criar dashboard de métricas","Adicionar filtro avançado na listagem","Implementar exportação CSV",
  "Otimizar query lenta no relatório de vendas","Migrar autenticação para JWT","Adicionar logs estruturados",
  "Criar pipeline de CI/CD","Implementar feature flag para checkout","Adicionar tracking de eventos analytics",
  "Refatorar componente de tabela","Adicionar testes E2E para fluxo principal","Implementar dark mode",
  "Adicionar acessibilidade (WCAG AA)","Cache de respostas da API","Suporte a múltiplos idiomas",
  "Validação de formulário no frontend","Bug: dropdown não fecha ao clicar fora",
];

const BUG_TITLES = [
  "Botão de salvar quebra em mobile","Tela em branco após login","Erro 500 ao subir imagem grande",
  "Filtro perde estado ao recarregar","Notificação aparece duplicada","Modal não fecha em ESC",
];

const ACCEPTANCE = [
  "Dado um usuário cadastrado\nQuando ele inserir email e senha válidos\nEntão deve ser redirecionado para o dashboard",
  "O sistema deve validar formato de email\nDeve mostrar mensagem clara em caso de erro\nDeve registrar tentativas falhas",
  "A página deve carregar em menos de 2s\nDeve ser responsiva em mobile\nDeve atender WCAG AA",
];

const RETRO_WENT_WELL = [
  "Bom alinhamento na daily","Entregamos antes do prazo a feature de checkout",
  "Boa colaboração entre dev e UX","Cobertura de testes melhorou",
];
const RETRO_TO_IMPROVE = [
  "Reuniões muito longas","Ambiguidade nos critérios de aceitação",
  "Tickets entrando no sprint sem refinamento","Comunicação com stakeholders demorada",
];
const RETRO_ACTIONS = [
  "Limitar daily a 15min com timer","Refinar 1 sprint à frente",
  "Incluir DoR no template de ticket","Slack semanal com stakeholders",
];

const IMPEDIMENTS = [
  { title: "Acesso ao ambiente de homologação não liberado", description: "TI ainda não criou as credenciais." },
  { title: "Dependência aguardando time de plataforma", description: "Bloqueado pela API que ainda não foi exposta." },
  { title: "Dúvidas sobre regra de negócio do cálculo", description: "Aguardando definição com stakeholders." },
];

const ROADMAP_ITEMS = [
  { title: "Lançamento do checkout v2", status: "PLANNED" as const, quarter: "2026-Q2", riceScore: 18.5 },
  { title: "Integração com gateway de pagamento alternativo", status: "IDEA" as const, quarter: "2026-Q3", riceScore: 12.0 },
  { title: "Sistema de cupons", status: "IN_PROGRESS" as const, quarter: "2026-Q2", riceScore: 22.0 },
  { title: "Migração para nova arquitetura de notificações", status: "SHIPPED" as const, quarter: "2026-Q1", riceScore: 9.5 },
];

const PERSONAS = [
  { name: "Mariana - Compradora frequente", role: "Cliente final", goals: "Comprar de forma rápida sem fricção", pains: "Cadastros longos, lentidão" },
  { name: "Carlos - Gestor de loja", role: "B2B", goals: "Gerir estoque e pedidos em tempo real", pains: "Relatórios manuais, falta de integração" },
];

const DOD_ITEMS = [
  "Código revisado por outro dev",
  "Testes unitários cobrindo o caso principal",
  "Critérios de aceitação validados pelo QA",
  "Documentação atualizada",
  "Deploy em homologação realizado",
  "Validação do PO/PM",
];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const ROLE_CYCLE: ScrumRole[] = [
  "PRODUCT_MANAGER","PRODUCT_OWNER","SCRUM_MASTER",
  "DEVELOPER","DEVELOPER","DEVELOPER",
  "UX_DESIGNER","QA_ENGINEER","DATA_ANALYST","TECH_LEAD",
  "STAKEHOLDER","STAKEHOLDER",
];

async function main() {
  console.log("[seed] starting...");

  const existing = await prisma.organization.findFirst({ where: { slug: "ajex-demo" } });
  if (existing) {
    console.log("[seed] organization 'ajex-demo' already exists, skipping seed.");
    return;
  }

  const passwordHash = await bcrypt.hash("ajex123", 10);

  const adminUser = await prisma.user.create({
    data: {
      email: "admin@ajex.dev",
      passwordHash,
      name: "Admin AjeX",
    },
  });

  const org = await prisma.organization.create({
    data: { name: "AjeX Demo Corp", slug: "ajex-demo" },
  });

  await prisma.membership.create({
    data: { userId: adminUser.id, organizationId: org.id, role: "PRODUCT_MANAGER", isAdmin: true },
  });

  // Create team members covering all roles
  const memberships: { id: string; role: ScrumRole; userId: string; userName: string }[] = [];
  for (let i = 0; i < ROLE_CYCLE.length; i++) {
    const role = ROLE_CYCLE[i];
    const fn = rand(FIRST_NAMES);
    const ln = rand(LAST_NAMES);
    const name = `${fn} ${ln}`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@ajex.dev`;
    const u = await prisma.user.create({ data: { email, passwordHash, name } });
    const m = await prisma.membership.create({
      data: { userId: u.id, organizationId: org.id, role },
    });
    memberships.push({ id: m.id, role, userId: u.id, userName: name });
  }

  // Add admin membership to memberships pool
  const adminMembership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: adminUser.id, organizationId: org.id } },
  });
  memberships.push({ id: adminMembership!.id, role: "PRODUCT_MANAGER", userId: adminUser.id, userName: "Admin AjeX" });

  console.log(`[seed] created ${memberships.length} memberships`);

  // For each project, populate everything
  for (const projDef of PROJECTS) {
    const project = await prisma.project.create({
      data: {
        organizationId: org.id,
        name: projDef.name,
        key: projDef.key,
        vision: projDef.vision,
        description: `Projeto ${projDef.name} criado para demonstrar o fluxo SCRUM completo no AjeX.`,
      },
    });

    // Add members to project
    for (const m of memberships) {
      await prisma.projectMember.create({
        data: { projectId: project.id, membershipId: m.id, role: m.role },
      });
    }

    // Definition of Done
    for (let i = 0; i < DOD_ITEMS.length; i++) {
      await prisma.doDItem.create({ data: { projectId: project.id, text: DOD_ITEMS[i], order: i } });
    }

    // Sprints: 2 completed, 1 active, 1 planned
    const now = new Date();
    const sprintConfigs = [
      { offset: -42, status: "COMPLETED" as SprintStatus, name: "Sprint 1" },
      { offset: -28, status: "COMPLETED" as SprintStatus, name: "Sprint 2" },
      { offset: -14, status: "ACTIVE"    as SprintStatus, name: "Sprint 3" },
      { offset: 0,   status: "PLANNED"   as SprintStatus, name: "Sprint 4" },
    ];

    for (const cfg of sprintConfigs) {
      const start = new Date(now.getTime() + cfg.offset * 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);
      const sprint = await prisma.sprint.create({
        data: {
          projectId: project.id,
          name: `${projDef.key} - ${cfg.name}`,
          goal: `Entregar valor incremental ao usuário focando em ${rand(["performance","UX","novas features","correções críticas"])}.`,
          startDate: start,
          endDate: end,
          status: cfg.status,
        },
      });

      // Tickets per sprint
      const ticketCount = randInt(6, 10);
      for (let i = 0; i < ticketCount; i++) {
        const isBug = Math.random() < 0.25;
        const title = isBug ? rand(BUG_TITLES) : rand(STORY_TITLES);
        const type: TicketType = isBug ? "BUG" : rand(["STORY","STORY","TASK","SPIKE","TECH_DEBT"]);
        const points = rand([1,2,3,3,5,5,8,13]);

        let status: TicketStatus;
        let completedAt: Date | null = null;
        if (cfg.status === "COMPLETED") {
          // Almost all done
          status = Math.random() < 0.85 ? "DONE" : rand(["QA","CODE_REVIEW"]);
          if (status === "DONE") {
            completedAt = new Date(start.getTime() + randInt(1, 13) * 24*60*60*1000);
          }
        } else if (cfg.status === "ACTIVE") {
          status = rand(["TODO","IN_PROGRESS","IN_PROGRESS","CODE_REVIEW","QA","DONE"]);
          if (status === "DONE") {
            completedAt = new Date(start.getTime() + randInt(1, 7) * 24*60*60*1000);
          }
        } else {
          status = "TODO";
        }

        const assignee = rand(memberships.filter(m => ["DEVELOPER","TECH_LEAD","UX_DESIGNER","QA_ENGINEER"].includes(m.role)));
        const reporter = rand(memberships.filter(m => ["PRODUCT_OWNER","PRODUCT_MANAGER","SCRUM_MASTER"].includes(m.role)));
        const ticketsCount = await prisma.ticket.count({ where: { projectId: project.id } });

        const ticket = await prisma.ticket.create({
          data: {
            projectId: project.id,
            sprintId: sprint.id,
            key: `${projDef.key}-${ticketsCount + 1}`,
            title,
            description: `Como usuário, quero ${title.toLowerCase()} para que eu tenha uma melhor experiência.`,
            acceptanceCriteria: rand(ACCEPTANCE),
            type,
            status,
            priority: rand(["LOW","MEDIUM","MEDIUM","HIGH","HIGHEST"]) as Priority,
            storyPoints: points,
            assigneeId: assignee.userId,
            reporterId: reporter.userId,
            completedAt,
            rank: i,
          },
        });

        // Comments
        if (Math.random() < 0.5) {
          const commenter = rand(memberships);
          await prisma.comment.create({
            data: {
              ticketId: ticket.id,
              userId: commenter.userId,
              body: rand([
                "Verifiquei e parece OK do meu lado.",
                "Preciso de mais contexto sobre esse comportamento.",
                "Posso pegar essa task amanhã.",
                "Critério de aceitação 2 ainda não está claro.",
              ]),
            },
          });
        }
      }

      // Retro for completed sprints
      if (cfg.status === "COMPLETED") {
        const retro = await prisma.retrospective.create({
          data: { projectId: project.id, sprintId: sprint.id, title: `Retrospectiva ${sprint.name}` },
        });
        const items = [
          ...RETRO_WENT_WELL.slice(0, 3).map(b => ({ column: "WENT_WELL" as const, body: b })),
          ...RETRO_TO_IMPROVE.slice(0, 3).map(b => ({ column: "TO_IMPROVE" as const, body: b })),
          ...RETRO_ACTIONS.slice(0, 2).map(b => ({ column: "ACTION_ITEM" as const, body: b })),
        ];
        for (const it of items) {
          await prisma.retroItem.create({
            data: { retrospectiveId: retro.id, column: it.column, body: it.body, authorId: rand(memberships).userId },
          });
        }
      }
    }

    // Backlog tickets (no sprint)
    for (let i = 0; i < 8; i++) {
      const ticketsCount = await prisma.ticket.count({ where: { projectId: project.id } });
      await prisma.ticket.create({
        data: {
          projectId: project.id,
          key: `${projDef.key}-${ticketsCount + 1}`,
          title: rand(STORY_TITLES),
          description: "Item ainda no backlog, aguardando refinamento.",
          type: rand(["STORY","TASK","TECH_DEBT"]) as TicketType,
          status: "BACKLOG",
          priority: rand(["LOW","MEDIUM","HIGH"]) as Priority,
          storyPoints: rand([null,null,1,2,3,5,8]),
          rank: i,
        },
      });
    }

    // Impediments
    for (const imp of IMPEDIMENTS) {
      await prisma.impediment.create({
        data: {
          projectId: project.id,
          title: imp.title,
          description: imp.description,
          status: rand(["OPEN","IN_PROGRESS","RESOLVED"]) as ImpedimentStatus,
          reporterId: rand(memberships.filter(m => m.role === "SCRUM_MASTER")).userId,
        },
      });
    }

    // Roadmap
    for (const r of ROADMAP_ITEMS) {
      await prisma.roadmapItem.create({
        data: {
          projectId: project.id,
          title: r.title,
          description: `Item de roadmap planejado para ${r.quarter}.`,
          quarter: r.quarter,
          status: r.status as RoadmapStatus,
          riceScore: r.riceScore,
        },
      });
    }

    // OKRs
    const okr = await prisma.oKR.create({
      data: {
        projectId: project.id,
        objective: `Melhorar experiência de uso do ${projDef.name} no Q2`,
        quarter: "2026-Q2",
        keyResults: {
          create: [
            { text: "Aumentar NPS de 40 para 60", target: 60, current: 48 },
            { text: "Reduzir tempo médio de checkout para <30s", target: 30, current: 42 },
            { text: "Atingir 95% de cobertura de testes nos fluxos críticos", target: 95, current: 78 },
          ],
        },
      },
    });

    // Personas
    for (const p of PERSONAS) {
      await prisma.persona.create({ data: { ...p, projectId: project.id } });
    }

    // Test Plan
    const plan = await prisma.testPlan.create({
      data: { projectId: project.id, name: `Plano de testes - ${projDef.name}`, scope: "Fluxos críticos." },
    });
    await prisma.testCase.createMany({
      data: [
        { testPlanId: plan.id, title: "Login com sucesso", steps: "1. Abrir tela\n2. Inserir credenciais\n3. Submeter", expected: "Redirecionado para dashboard", status: "PASSED" },
        { testPlanId: plan.id, title: "Login com senha errada", steps: "1. Inserir senha errada", expected: "Mostrar mensagem de erro", status: "PASSED" },
        { testPlanId: plan.id, title: "Cadastro de novo usuário", steps: "1. Preencher form\n2. Submeter", expected: "Conta criada", status: "NOT_RUN" },
      ],
    });

    // Chat room: apenas TEAM por projeto (compartilhada). Salas AI são individuais e
    // criadas sob demanda pelo backend (rota /chat/rooms) por usuário.
    await prisma.chatRoom.create({
      data: { organizationId: org.id, projectId: project.id, name: `# geral - ${projDef.name}`, kind: "TEAM" },
    });

    console.log(`[seed] populated project ${projDef.name}`);
  }

  // Sala AI individual para cada membro (auto-provisionada também via GET /chat/rooms)
  for (const m of memberships) {
    await prisma.chatRoom.create({
      data: {
        organizationId: org.id,
        ownerId: m.userId,
        kind: "AI_ASSISTANT",
        name: "IA - Minha conversa",
      },
    });
  }

  console.log("\n[seed] DONE!");
  console.log("==============================================");
  console.log("  Login: admin@ajex.dev / ajex123");
  console.log("  Organization: AjeX Demo Corp");
  console.log("==============================================");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
