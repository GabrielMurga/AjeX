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
import { Plus, Calendar, Target } from "lucide-react";

export function SprintsPage() {
  const projId = useProject(s => s.currentProjectId);
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", goal: "", startDate: "", endDate: "" });

  const { data: sprints = [] } = useQuery<any[]>({
    queryKey: ["sprints", projId],
    enabled: !!projId,
    queryFn: async () => (await api.get("/api/sprints", { params: { projectId: projId } })).data,
  });

  const createMut = useMutation({
    mutationFn: async () => api.post("/api/sprints", { ...form, projectId: projId }),
    onSuccess: () => { setCreating(false); setForm({ name: "", goal: "", startDate: "", endDate: "" }); qc.invalidateQueries({ queryKey: ["sprints"] }); },
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => api.patch(`/api/sprints/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sprints"] }),
  });

  if (!projId) return <div className="p-6 text-slate-500">Selecione um projeto.</div>;

  return (
    <div className="p-6">
      <PageHeader
        title="Sprints"
        subtitle="Planeje, execute e feche suas sprints"
        actions={<Button onClick={() => setCreating(true)}><Plus size={14} /> Nova Sprint</Button>}
      />

      <div className="grid gap-3">
        {sprints.map(s => (
          <Card key={s.id}>
            <CardBody className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-slate-900">{s.name}</span>
                  <Badge tone={s.status === "ACTIVE" ? "green" : s.status === "COMPLETED" ? "slate" : "blue"}>{s.status}</Badge>
                  <span className="text-xs text-slate-500">{s._count?.tickets ?? 0} tickets</span>
                </div>
                {s.goal && <div className="mt-1 flex items-center gap-1 text-sm text-slate-600"><Target size={14} /> {s.goal}</div>}
                <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <Calendar size={12} />
                  {new Date(s.startDate).toLocaleDateString()} → {new Date(s.endDate).toLocaleDateString()}
                </div>
              </div>
              <div className="flex gap-1">
                {s.status === "PLANNED" && <Button size="sm" onClick={() => updateMut.mutate({ id: s.id, status: "ACTIVE" })}>Iniciar</Button>}
                {s.status === "ACTIVE" && <Button size="sm" variant="secondary" onClick={() => updateMut.mutate({ id: s.id, status: "COMPLETED" })}>Encerrar</Button>}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {creating && (
        <Modal open onClose={() => setCreating(false)} title="Nova Sprint"
          footer={<>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancelar</Button>
            <Button onClick={() => createMut.mutate()} disabled={!form.name || !form.startDate || !form.endDate}>Criar</Button>
          </>}>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div><Label>Sprint Goal</Label><Textarea value={form.goal} onChange={e => setForm({...form, goal: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Início</Label><Input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} /></div>
              <div><Label>Fim</Label><Input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} /></div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
