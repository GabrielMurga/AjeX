import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useProject } from "@/store/project";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { CheckCircle2, Clock, ListTodo, AlertOctagon, Users } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: "#94a3b8", TODO: "#60a5fa", IN_PROGRESS: "#facc15",
  CODE_REVIEW: "#a78bfa", QA: "#fb923c", DONE: "#22c55e",
};

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
    { label: "Tickets totais", value: c.totalTickets, icon: ListTodo, tone: "text-slate-700 bg-slate-100" },
    { label: "Concluídos", value: c.done, icon: CheckCircle2, tone: "text-green-700 bg-green-100" },
    { label: "Em andamento", value: c.inProgress, icon: Clock, tone: "text-yellow-700 bg-yellow-100" },
    { label: "Impedimentos", value: c.impediments, icon: AlertOctagon, tone: "text-red-700 bg-red-100" },
    { label: "Membros", value: c.members, icon: Users, tone: "text-blue-700 bg-blue-100" },
  ];

  const statusData = Object.entries(overview.byStatus).map(([k,v]) => ({ name: k, value: v }));
  const burndownData = burndown?.ideal?.map((x: any, i: number) => ({
    day: `D${x.day}`, ideal: Number(x.remaining.toFixed(1)), real: Number(burndown.actual[i]?.remaining ?? 0),
  })) || [];

  return (
    <div className="p-6">
      <PageHeader title="Dashboard" subtitle="Visão geral do projeto e KPIs" />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map(s => (
          <Card key={s.label}>
            <CardBody className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.tone}`}>
                <s.icon size={20} />
              </div>
              <div>
                <div className="text-xs text-slate-500">{s.label}</div>
                <div className="text-xl font-bold text-slate-900">{s.value}</div>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="ideal" stroke="#94a3b8" strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="real" stroke="#2563eb" strokeWidth={2} />
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
                <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={80} label>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="sprint" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="points" fill="#2563eb" radius={[4,4,0,0]} />
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
            <div className="flex justify-between"><span className="text-slate-600">Sprint ativa</span><span className="font-medium text-slate-900">{overview.activeSprint?.name || "—"}</span></div>
            {overview.activeSprint?.goal && (
              <div className="rounded bg-brand-50 p-3 text-xs text-brand-900">
                <strong>Goal:</strong> {overview.activeSprint.goal}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
