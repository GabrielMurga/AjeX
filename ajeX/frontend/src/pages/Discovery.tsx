import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useProject } from "@/store/project";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { Plus, User, Trash2 } from "lucide-react";

export function DiscoveryPage() {
  const projId = useProject(s => s.currentProjectId);
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", goals: "", pains: "", bio: "" });

  const { data: personas = [] } = useQuery<any[]>({
    queryKey: ["personas", projId], enabled: !!projId,
    queryFn: async () => (await api.get("/api/discovery/personas", { params: { projectId: projId } })).data,
  });

  const createMut = useMutation({
    mutationFn: async () => api.post("/api/discovery/personas", { ...form, projectId: projId }),
    onSuccess: () => { setCreating(false); setForm({ name: "", role: "", goals: "", pains: "", bio: "" }); qc.invalidateQueries({ queryKey: ["personas"] }); },
  });
  const delMut = useMutation({
    mutationFn: async (id: string) => api.delete(`/api/discovery/personas/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personas"] }),
  });

  if (!projId) return <div className="p-6 text-slate-500">Selecione um projeto.</div>;

  return (
    <div className="p-6">
      <PageHeader title="Discovery" subtitle="Personas e jornadas do usuário" actions={<Button onClick={() => setCreating(true)}><Plus size={14} /> Persona</Button>} />

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {personas.map((p: any) => (
          <Card key={p.id}>
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2"><User size={16} /><CardTitle>{p.name}</CardTitle></div>
              <button onClick={() => delMut.mutate(p.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
            </CardHeader>
            <CardBody className="space-y-2 text-sm">
              {p.role && <div><span className="font-medium text-slate-700">Papel:</span> <span className="text-slate-600">{p.role}</span></div>}
              {p.goals && <div><span className="font-medium text-slate-700">Objetivos:</span> <span className="text-slate-600">{p.goals}</span></div>}
              {p.pains && <div><span className="font-medium text-slate-700">Dores:</span> <span className="text-slate-600">{p.pains}</span></div>}
              {p.bio && <div className="text-slate-500 italic">{p.bio}</div>}
            </CardBody>
          </Card>
        ))}
        {personas.length === 0 && <div className="col-span-full text-center text-sm text-slate-500">Nenhuma persona ainda.</div>}
      </div>

      {creating && (
        <Modal open onClose={() => setCreating(false)} title="Nova persona"
          footer={<><Button variant="outline" onClick={() => setCreating(false)}>Cancelar</Button><Button onClick={() => createMut.mutate()}>Criar</Button></>}>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div><Label>Papel/perfil</Label><Input value={form.role} onChange={e => setForm({...form, role: e.target.value})} /></div>
            <div><Label>Objetivos</Label><Textarea value={form.goals} onChange={e => setForm({...form, goals: e.target.value})} /></div>
            <div><Label>Dores</Label><Textarea value={form.pains} onChange={e => setForm({...form, pains: e.target.value})} /></div>
            <div><Label>Bio</Label><Textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} /></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
