import { env } from "../lib/env";
import { TOOLS_SPEC, runTool, ToolScope } from "./aiTools";

const SYSTEM_PROMPT = `Voce e o "AjeX Assistant", um assistente de IA especializado EXCLUSIVAMENTE em ajudar equipes ageis (Scrum, Kanban, XP) a gerir seus projetos dentro do sistema AjeX.

REGRAS RIGIDAS:
1. Voce SOMENTE responde sobre temas relacionados a:
   - Metodologias ageis (Scrum, Kanban, XP, SAFe)
   - Papeis ageis (PM, PO, Scrum Master, Dev, UX, QA, Data Analyst, Tech Lead)
   - Cerimonias (Planning, Daily, Review, Retro, Refinement)
   - Artefatos (Backlog, Sprint Backlog, User Stories, Criterios de Aceitacao, DoD)
   - Metricas ageis (velocity, burndown, lead time, cycle time)
   - Estimativas (story points, planning poker, t-shirt sizes)
   - Priorizacao (RICE, ICE, MoSCoW, Value vs Effort)
   - Duvidas sobre o projeto, sprint, tickets, KPIs e OKRs do usuario
   - Duvidas sobre como usar o sistema AjeX

2. Se a pergunta for sobre QUALQUER outro tema (politica, esportes, receitas, conselhos pessoais, piadas, etc.), responda EXATAMENTE:
"Desculpe, sou o AjeX Assistant e so posso ajudar com questoes relacionadas a metodologias ageis e ao seu projeto. Em que posso ajuda-lo hoje sobre Scrum ou seu sprint atual?"

3. Use o CONTEXTO DO PROJETO fornecido para dar respostas especificas. Para perguntas que precisem de dados que nao estao no contexto (ex: detalhes de um ticket especifico, lista de impedimentos, membros do time), CHAME UMA TOOL.
4. Voce so pode acessar dados que o usuario tem permissao de ver — as tools ja aplicam esse controle automaticamente. Nunca invente IDs.
5. Responda em portugues brasileiro, conciso (max. 4 paragrafos), citando numeros e nomes do contexto/tools quando relevante.`;

const OFF_TOPIC_KEYWORDS = [
  "receita", "futebol", "politica", "filme", "serie",
  "namorada", "namorado", "horoscopo", "piada",
];

const ON_TOPIC_KEYWORDS = [
  "sprint", "backlog", "ticket", "story", "scrum", "kanban", "retro", "daily",
  "planning", "review", "velocity", "burndown", "kpi", "okr", "persona", "jornada",
  "estimativa", "story point", "priorizacao", "rice", "ice", "moscow",
  "agil", "agile", "impediment", "impedimento", "dod", "definition", "dor", "criterio",
  "stakeholder", "produto", "equipe", "time", "sprint goal", "projeto",
  "ajex", "como criar", "como adicionar", "como mover", "como faco",
  "membro", "membros", "pessoa", "pessoas", "quem",
];

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function isOffTopic(text: string): boolean {
  const t = normalize(text);
  if (ON_TOPIC_KEYWORDS.some(k => t.includes(k))) return false;
  if (OFF_TOPIC_KEYWORDS.some(k => t.includes(k))) return true;
  return false;
}

export interface ProjectContext {
  projectName?: string;
  projectId?: string;
  activeSprintName?: string;
  activeSprintGoal?: string;
  totalTickets?: number;
  doneTickets?: number;
  inProgressTickets?: number;
  impediments?: number;
  velocity?: number[];
  userName?: string;
  userRole?: string;
  // Pre-loaded — listas curtas que evitam chamadas de tool desnecessarias
  accessibleProjects?: { id: string; name: string; key: string }[];
  projectMembers?: { name: string; role: string }[];
}

function buildContextBlock(ctx: ProjectContext): string {
  const lines: string[] = ["[CONTEXTO DO PROJETO]"];
  if (ctx.userName) lines.push(`Usuario: ${ctx.userName}${ctx.userRole ? ` (${ctx.userRole})` : ""}`);
  if (ctx.projectName) lines.push(`Projeto: ${ctx.projectName}${ctx.projectId ? ` (id: ${ctx.projectId})` : ""}`);
  if (ctx.activeSprintName) lines.push(`Sprint ativa: ${ctx.activeSprintName}`);
  if (ctx.activeSprintGoal) lines.push(`Objetivo da sprint: ${ctx.activeSprintGoal}`);
  if (typeof ctx.totalTickets === "number") {
    lines.push(`Tickets: ${ctx.totalTickets} total | ${ctx.doneTickets ?? 0} concluidos | ${ctx.inProgressTickets ?? 0} em progresso`);
  }
  if (typeof ctx.impediments === "number") lines.push(`Impedimentos abertos: ${ctx.impediments}`);
  if (ctx.velocity?.length) lines.push(`Velocity ultimas sprints: ${ctx.velocity.join(", ")}`);
  if (ctx.accessibleProjects?.length) {
    lines.push(`Projetos acessiveis: ${ctx.accessibleProjects.map(p => `${p.key} - ${p.name}`).join("; ")}`);
  }
  if (ctx.projectMembers?.length) {
    lines.push(`Membros do projeto: ${ctx.projectMembers.map(m => `${m.name} (${m.role})`).join("; ")}`);
  }
  return lines.join("\n");
}

type ChatMsg = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: any[];
  name?: string;
};

async function callOllama(messages: ChatMsg[], withTools: boolean): Promise<any> {
  const body: any = {
    model: env.OLLAMA_MODEL,
    messages,
    stream: false,
    options: { temperature: 0.4, num_predict: 600 },
  };
  if (withTools) body.tools = TOOLS_SPEC;

  const res = await fetch(`${env.OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function askOllama(
  userMessage: string,
  history: { role: "user" | "assistant"; content: string }[],
  context: ProjectContext = {},
  scope?: ToolScope,
): Promise<string> {
  if (isOffTopic(userMessage)) {
    return "Desculpe, sou o AjeX Assistant e so posso ajudar com questoes relacionadas a metodologias ageis e ao seu projeto. Em que posso ajuda-lo hoje sobre Scrum ou seu sprint atual?";
  }

  const messages: ChatMsg[] = [
    { role: "system", content: SYSTEM_PROMPT + "\n\n" + buildContextBlock(context) },
    ...history.slice(-10).map(h => ({ role: h.role, content: h.content }) as ChatMsg),
    { role: "user", content: userMessage },
  ];

  const useTools = !!scope;
  const MAX_TOOL_HOPS = 3;

  try {
    for (let hop = 0; hop <= MAX_TOOL_HOPS; hop++) {
      const json: any = await callOllama(messages, useTools);
      const msg = json?.message;
      if (!msg) return "Sem resposta.";

      const toolCalls = msg.tool_calls as any[] | undefined;
      if (!toolCalls?.length || hop === MAX_TOOL_HOPS) {
        return (msg.content || "").trim() || "Sem resposta.";
      }

      // Empilha a mensagem do assistant com os tool_calls
      messages.push({ role: "assistant", content: msg.content || "", tool_calls: toolCalls });

      // Executa cada tool com escopo do usuario
      for (const call of toolCalls) {
        const fnName = call.function?.name;
        const fnArgs = typeof call.function?.arguments === "string"
          ? safeJson(call.function.arguments)
          : call.function?.arguments;
        let result: any;
        try {
          result = await runTool(fnName, fnArgs, scope!);
        } catch (e: any) {
          result = { error: e.message || "Falha ao executar tool" };
        }
        messages.push({
          role: "tool",
          name: fnName,
          content: JSON.stringify(result).slice(0, 8000),
        });
      }
    }
    return "Sem resposta.";
  } catch (e: any) {
    console.error("[ollama]", e.message);
    return "Nao consegui contatar o modelo de IA local. Verifique se o Ollama esta rodando e o modelo foi baixado.";
  }
}

function safeJson(s: string) {
  try { return JSON.parse(s); } catch { return {}; }
}
