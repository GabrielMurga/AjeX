import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useProject } from "@/store/project";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Input, Textarea, Label, Select } from "@/components/ui/Input";
import { Plus, Target } from "lucide-react";

export function RoadmapPage() {
  const projId = useProject(s => s.currentProjectId);
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", quarter: "2026-Q2", status: "IDEA", riceScore: undefined as number | undefined });
  const [okrCreating, setOkrCreating] = useState(false);
  const [okrForm, setOkrForm] = useState({ objective: "", quarter: "2026-Q2", keyResults: [{ text: "", target: 100 }] });

  const { data: roadmap = [] } = useQuery<any[]>({
    queryKey: ["roadmap", projId], enabled: !!projId,
    queryFn: async () => (await api.get("/api/roadmap", { params: { projectId: projId } })).data,
  });
  const { data: okrs = [] } = useQuery<any[]>({
    queryKey: ["okrs", projId], enabled: !!projId,
    queryFn: async () => (await api.get("/api/roadmap/okrs", { params: { projectId: projId } })).data,
  });

  const createMut = useMutation({
    mutationFn: async () => api.post("/api/roadmap", { ...form, projectId: projId }),
    onSuccess: () => { setCreating(false); qc.invalidateQueries({ queryKey: ["roadmap"] }); },
  });

  const okrMut = useMutation({
    mutationFn: async () => api.post("/api/roadmap/okrs", { ...okrForm, projectId: projId }),
    onSuccess: () => { setOkrCreating(false); qc.invalidateQueries({ queryKey: ["okrs"] }); },
  });

  const krMut = useMutation({
    mutationFn: async ({ id, current }: { id: string; current: number }) => api.patch(`/api/roadmap/okrs/kr/${id}`, { current }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["okrs"] }),
  });

  if (!projId) return <div className="p-6 text-slate-500">Selecione um projeto.</div>;

  const quarters = Array.from(new Set(roadmap.map(r => r.quarter))).sort();
  const statusTone = (s: string) => s === "SHIPPED" ? "green" : s === "IN_PROGRESS" ? "yellow" : s === "PLANNED" ? "blue" : "slate";

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Roadmap & OKRs" subtitle="Visão estratégica do produto" actions={
        <>
          <Button variant="outline" onClick={() => setOkrCreating(true)}><Plus size={14} /> OKR</Button>
          <Button onClick={() => setCreating(true)}><Plus size={14} /> Item</Button>
        </>
      } />

      <Card>
        <CardHeader><CardTitle>Roadmap por trimestre</CardTitle></CardHeader>
        <CardBody>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(quarters.length,1)}, minmax(0, 1fr))` }}>
            {quarters.map(q => (
              <div key={q} className="rounded-lg bg-slate-50 p-3">
                <div className="mb-2 text-sm font-semibold text-slate-700">{q}</div>
                {roadmap.filter(r => r.quarter === q).map(r => (
                  <div key={r.id} className="mb-2 rounded border border-slate-200 bg-white p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-900">{r.title}</span>
                      <Badge tone={statusTone(r.status) as any}>{r.status}</Badge>
                    </div>
                    {r.riceScore && <div className="mt-1 text-xs text-slate-500">RICE: {r.riceScore}</div>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>OKRs</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          {okrs.map(o => (
            <div key={o.id} className="rounded-lg border border-slate-200 p-3">
              <div className="mb-2 flex items-center gap-2"><Target size={16} className="text-brand-600" /><span className="font-semibold text-slate-900">{o.objective}</span><Badge tone="slate">{o.quarter}</Badge></div>
              <div className="space-y-1.5">
                {o.keyResults.map((kr: any) => {
                  const pct = Math.min(100, Math.round((kr.current/kr.target)*100));
                  return (
                    <div key={kr.id}>
                      <div className="mb-0.5 flex items-center justify-between text-xs">
                        <span className="text-slate-700">{kr.text}</span>
                        <span className="text-slate-500">{kr.current}/{kr.target} ({pct}%)</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded bg-slate-100">
                        <div className="h-full rounded bg-brand-500" style={{ width: `${pct}%` }} />
                      </div>
                      <input type="number" className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-xs" defaultValue={kr.current}
                        onBlur={(e) => krMut.mutate({ id: kr.id, current: Number(e.target.value) })} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {okrs.length === 0 && <div className="text-sm text-slate-500">Nenhum OKR cadastrado.</div>}
        </CardBody>
      </Card>

      {creating && (
        <Modal open onClose={() => setCreating(false)} title="Novo item de roadmap"
          footer={<><Button variant="outline" onClick={() => setCreating(false)}>Cancelar</Button><Button onClick={() => createMut.mutate()}>Criar</Button></>}>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Trimestre</Label><Input value={form.quarter} onChange={e => setForm({...form, quarter: e.target.value})} /></div>
              <div><Label>Status</Label><Select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>{["IDEA","PLANNED","IN_PROGRESS","SHIPPED"].map(s=><option key={s}>{s}</option>)}</Select></div>
              <div><Label>RICE</Label><Input type="number" step="0.1" onChange={e => setForm({...form, riceScore: Number(e.target.value)})} /></div>
            </div>
          </div>
        </Modal>
      )}

      {okrCreating && (
        <Modal open onClose={() => setOkrCreating(false)} title="Novo OKR"
          footer={<><Button variant="outline" onClick={() => setOkrCreating(false)}>Cancelar</Button><Button onClick={() => okrMut.mutate()}>Criar</Button></>}>
          <div className="space-y-3">
            <div><Label>Objetivo</Label><Input value={okrForm.objective} onChange={e => setOkrForm({...okrForm, objective: e.target.value})} /></div>
            <div><Label>Trimestre</Label><Input value={okrForm.quarter} onChange={e => setOkrForm({...okrForm, quarter: e.target.value})} /></div>
            <div>
              <Label>Key Results</Label>
              {okrForm.keyResults.map((kr, i) => (
                <div key={i} className="mb-1 flex gap-1">
                  <Input placeholder="Texto" value={kr.text} onChange={e => { const k = [...okrForm.keyResults]; k[i].text = e.target.value; setOkrForm({...okrForm, keyResults: k}); }} />
                  <Input className="w-24" type="number" value={kr.target} onChange={e => { const k = [...okrForm.keyResults]; k[i].target = Number(e.target.value); setOkrForm({...okrForm, keyResults: k}); }} />
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => setOkrForm({...okrForm, keyResults: [...okrForm.keyResults, { text: "", target: 100 }]})}>+ KR</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
