import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useProject } from "@/store/project";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { CheckCircle2, Clock, ListTodo, AlertOctagon, Users } from "lucide-react";

// Cores de status alinhadas à identidade AjeX (laranja como marca/QA, verde positivo)
const STATUS_COLORS: Record<string, string> = {
  BACKLOG: "#94A3B8", TODO: "#64748B", IN_PROGRESS: "#F59E0B",
  CODE_REVIEW: "#8B5CF6", QA: "#FF5722", DONE: "#16A34A",
};

const BRAND = "#FF5722";

export function DashboardPage() {
  const projId = useProject(s => s.currentProjectId);
  const { data: overview } = useQuery({
    queryKey: ["dashboard", projId],
    enabled: !!projId,
    queryFn: async () => (await api.get("/api/dashboard/overview", { params: { projectId: projId } })).data,
  });

  const { data: burndown } = useQuery({
    queryKey: ["burndown", overview?.activeSprint?.id],
    enabled: !!overview?.activeSprint?.id,
    queryFn: async () => (await api.get(`/api/sprints/${overview.activeSprint.id}/burndown`)).data,
  });

  if (!projId) return <div className="p-6 text-slate-500">Selecione um projeto.</div>;
  if (!overview) return <div className="p-6 text-slate-500">Carregando...</div>;

  const c = overview.counts;
  const stats = [
    { label: "Tickets totais", value: c.totalTickets, icon: ListTodo, tone: "text-ink-800 bg-slate-100" },
    { label: "Concluídos", value: c.done, icon: CheckCircle2, tone: "text-emerald-700 bg-emerald-100" },
    { label: "Em andamento", value: c.inProgress, icon: Clock, tone: "text-brand-700 bg-brand-100" },
    { label: "Impedimentos", value: c.impediments, icon: AlertOctagon, tone: "text-rose-700 bg-rose-100" },
    { label: "Membros", value: c.members, icon: Users, tone: "text-sky-700 bg-sky-100" },
  ];

  const statusData = Object.entries(overview.byStatus).map(([k, v]) => ({ name: k, value: v }));
  const burndownData = burndown?.ideal?.map((x: any, i: number) => ({
    day: `D${x.day}`, ideal: Number(x.remaining.toFixed(1)), real: Number(burndown.actual[i]?.remaining ?? 0),
  })) || [];

  return (
    <div className="p-6">
      <PageHeader title="Dashboard" subtitle="Visão geral do projeto e KPIs" />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map(s => (
          <Card key={s.label}>
            <CardBody className="flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${s.tone}`}>
                <s.icon size={20} />
              </div>
              <div>
                <div className="text-xs text-slate-500">{s.label}</div>
                <div className="text-2xl font-extrabold text-ink-900">{s.value}</div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Burndown (Sprint Ativa)</CardTitle></CardHeader>
          <CardBody>
            {burndownData.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={burndownData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="ideal" stroke="#9aa3ad" strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="real" stroke={BRAND} strokeWidth={2.5} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[260px] items-center justify-center text-sm text-slate-500">Sem sprint ativa.</div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Tickets por status</CardTitle></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={80} innerRadius={48} paddingAngle={2} label>
                  {statusData.map((e: any, i: number) => <Cell key={i} fill={STATUS_COLORS[e.name] || "#cbd5e1"} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Velocity (sprints concluídas)</CardTitle></CardHeader>
          <CardBody>
            {overview.velocity?.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={overview.velocity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" />
                  <XAxis dataKey="sprint" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="points" fill={BRAND} radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[220px] items-center justify-center text-sm text-slate-500">Nenhuma sprint concluída ainda.</div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Indicadores</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-600">Lead time médio</span><Badge tone="blue">{overview.avgLeadTimeDays} dias</Badge></div>
            <div className="flex justify-between"><span className="text-slate-600">Sprint ativa</span><span className="font-semibold text-ink-900">{overview.activeSprint?.name || "—"}</span></div>
            {overview.activeSprint?.goal && (
              <div className="rounded-lg border-l-[3px] border-brand-500 bg-brand-50/60 p-3 text-xs text-ink-700">
                <strong className="font-bold text-brand-700">Goal:</strong> {overview.activeSprint.goal}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
