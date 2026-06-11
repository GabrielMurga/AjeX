import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useProject } from "@/store/project";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Input, Label, Select } from "@/components/ui/Input";
import { ThumbsUp, Plus, Trash2 } from "lucide-react";

const COLUMNS = [
  { id: "WENT_WELL", label: "✅ O que foi bem", tone: "green" as const },
  { id: "TO_IMPROVE", label: "⚠️ A melhorar", tone: "yellow" as const },
  { id: "ACTION_ITEM", label: "🎯 Ações", tone: "blue" as const },
];

export function RetrosPage() {
  const projId = useProject(s => s.currentProjectId);
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ sprintId: "", title: "" });

  const { data: retros = [] } = useQuery<any[]>({
    queryKey: ["retros", projId],
    enabled: !!projId,
    queryFn: async () => (await api.get("/api/retros", { params: { projectId: projId } })).data,
  });

  const { data: sprints = [] } = useQuery<any[]>({
    queryKey: ["sprints", projId],
    enabled: !!projId,
    queryFn: async () => (await api.get("/api/sprints", { params: { projectId: projId } })).data,
  });

  const createMut = useMutation({
    mutationFn: async () => api.post("/api/retros", { ...form, projectId: projId }),
    onSuccess: () => { setCreating(false); qc.invalidateQueries({ queryKey: ["retros"] }); },
  });

  if (!projId) return <div className="p-6 text-slate-500">Selecione um projeto.</div>;

  return (
    <div className="p-6">
      <PageHeader
        title="Retrospectivas"
        actions={<Button onClick={() => setCreating(true)}><Plus size={14} /> Nova retro</Button>}
      />

      <div className="grid gap-3">
        {retros.map(r => (
          <Card key={r.id} className="cursor-pointer hover:border-brand-300" onClick={() => setOpenId(r.id)}>
            <CardBody className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900">{r.title}</div>
                <div className="text-xs text-slate-500">{r.sprint?.name} · {r._count?.items ?? 0} itens</div>
              </div>
              <Button size="sm" variant="outline">Abrir</Button>
            </CardBody>
          </Card>
        ))}
        {retros.length === 0 && <div className="rounded-lg bg-white p-6 text-center text-sm text-slate-500">Nenhuma retro ainda.</div>}
      </div>

      {openId && <RetroDetail id={openId} onClose={() => setOpenId(null)} />}

      {creating && (
        <Modal open onClose={() => setCreating(false)} title="Nova retrospectiva"
          footer={<><Button variant="outline" onClick={() => setCreating(false)}>Cancelar</Button>
                   <Button onClick={() => createMut.mutate()} disabled={!form.sprintId || !form.title}>Criar</Button></>}>
          <div className="space-y-3">
            <div><Label>Sprint</Label>
              <Select value={form.sprintId} onChange={e => setForm({...form, sprintId: e.target.value})}>
                <option value="">— Selecione —</option>
                {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
            <div><Label>Título</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function RetroDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [body, setBody] = useState<Record<string,string>>({ WENT_WELL: "", TO_IMPROVE: "", ACTION_ITEM: "" });

  const { data: retro } = useQuery({
    queryKey: ["retro", id],
    queryFn: async () => (await api.get(`/api/retros/${id}`)).data,
  });

  const addMut = useMutation({
    mutationFn: async ({ column, body }: { column: string; body: string }) => api.post(`/api/retros/${id}/items`, { column, body }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["retro", id] }); },
  });

  const voteMut = useMutation({
    mutationFn: async (itemId: string) => api.post(`/api/retros/items/${itemId}/vote`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["retro", id] }),
  });

  const delMut = useMutation({
    mutationFn: async (itemId: string) => api.delete(`/api/retros/items/${itemId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["retro", id] }),
  });

  if (!retro) return null;

  return (
    <Modal open onClose={onClose} title={retro.title} maxWidth="max-w-5xl">
      <div className="grid grid-cols-3 gap-3">
        {COLUMNS.map(col => {
          const items = retro.items.filter((i: any) => i.column === col.id);
          return (
            <div key={col.id} className="rounded-lg bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <Badge tone={col.tone}>{col.label}</Badge>
                <span className="text-xs text-slate-500">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((it: any) => (
                  <div key={it.id} className="rounded border border-slate-200 bg-white p-2">
                    <div className="text-sm text-slate-800">{it.body}</div>
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className="text-slate-500">{it.author?.name}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => voteMut.mutate(it.id)} className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-slate-100">
                          <ThumbsUp size={12} /> {it.votes?.length || 0}
                        </button>
                        <button onClick={() => delMut.mutate(it.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex gap-1">
                  <Input value={body[col.id]} onChange={e => setBody({ ...body, [col.id]: e.target.value })} placeholder="Adicionar..." />
                  <Button size="sm" onClick={() => { if (body[col.id].trim()) { addMut.mutate({ column: col.id, body: body[col.id] }); setBody({ ...body, [col.id]: "" }); } }}>+</Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
