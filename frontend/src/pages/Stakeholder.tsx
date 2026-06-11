import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useProject } from "@/store/project";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function StakeholderPage() {
  const projId = useProject(s => s.currentProjectId);
  const { data } = useQuery({
    queryKey: ["stakeholder", projId], enabled: !!projId,
    queryFn: async () => (await api.get("/api/dashboard/stakeholder", { params: { projectId: projId } })).data,
  });

  if (!projId) return <div className="p-6 text-slate-500">Selecione um projeto.</div>;
  if (!data) return <div className="p-6 text-slate-500">Carregando...</div>;

  const sp = data.activeSprint;
  const pct = sp?.progress?.totalPoints ? Math.round(sp.progress.donePoints/sp.progress.totalPoints*100) : 0;

  return (
    <div className="p-6 space-y-4">
      <PageHeader title={`Visão Stakeholder · ${data.project.name}`} subtitle={data.project.vision || ""} />

      {sp && (
        <Card>
          <CardHeader><CardTitle>Sprint atual: {sp.name}</CardTitle></CardHeader>
          <CardBody>
            {sp.goal && <div className="mb-3 rounded bg-brand-50 p-3 text-sm text-brand-900"><strong>Goal:</strong> {sp.goal}</div>}
            <div className="mb-2 flex justify-between text-sm"><span className="text-slate-700">Progresso</span><span className="font-medium">{sp.progress.donePoints}/{sp.progress.totalPoints} pts ({pct}%)</span></div>
            <div className="h-3 overflow-hidden rounded bg-slate-100">
              <div className="h-full bg-green-500" style={{ width: `${pct}%` }} />
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Últimas entregas</CardTitle></CardHeader>
          <CardBody>
            {data.recentDelivered.map((t: any) => (
              <div key={t.id} className="flex justify-between border-b border-slate-100 py-2 last:border-0 text-sm">
                <span className="text-slate-700">{t.title}</span>
                <Badge tone="green">{t.storyPoints || "—"} pts</Badge>
              </div>
            ))}
            {!data.recentDelivered.length && <div className="text-sm text-slate-500">Nenhuma entrega recente.</div>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>OKRs do projeto</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            {data.okrs.map((o: any) => (
              <div key={o.id} className="border-b border-slate-100 pb-3 last:border-0">
                <div className="mb-1 font-medium text-slate-900">{o.objective}</div>
                {o.keyResults.map((kr: any) => {
                  const p = Math.min(100, Math.round(kr.current/kr.target*100));
                  return (
                    <div key={kr.id} className="mb-1">
                      <div className="flex justify-between text-xs"><span className="text-slate-600">{kr.text}</span><span>{p}%</span></div>
                      <div className="h-1.5 rounded bg-slate-100"><div className="h-full rounded bg-brand-500" style={{ width: `${p}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            ))}
            {!data.okrs.length && <div className="text-sm text-slate-500">Sem OKRs.</div>}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Roadmap</CardTitle></CardHeader>
          <CardBody>
            <div className="grid gap-2 md:grid-cols-4">
              {data.roadmap.map((r: any) => (
                <div key={r.id} className="rounded border border-slate-200 p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{r.quarter}</span>
                    <Badge tone={r.status === "SHIPPED" ? "green" : r.status === "IN_PROGRESS" ? "yellow" : r.status === "PLANNED" ? "blue" : "slate"}>{r.status}</Badge>
                  </div>
                  <div className="mt-1 font-medium text-slate-900">{r.title}</div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
