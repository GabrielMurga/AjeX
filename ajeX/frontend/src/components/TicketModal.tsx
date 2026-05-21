import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useProject } from "@/store/project";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, Label } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/store/auth";

const STATUS = ["BACKLOG","TODO","IN_PROGRESS","CODE_REVIEW","QA","DONE"];
const PRIORITIES = ["LOWEST","LOW","MEDIUM","HIGH","HIGHEST"];
const TYPES = ["STORY","BUG","TASK","SPIKE","TECH_DEBT"];

export function TicketModal({
  ticketId, create, sprintId, onClose,
}: {
  ticketId?: string; create?: boolean; sprintId?: string; onClose: () => void;
}) {
  const projId = useProject(s => s.currentProjectId)!;
  const orgId = useAuth(s => s.currentOrgId)!;
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [form, setForm] = useState<any>({
    title: "", description: "", acceptanceCriteria: "",
    type: "STORY", priority: "MEDIUM", storyPoints: null, status: "TODO",
  });

  const { data: ticket } = useQuery({
    queryKey: ["ticket", ticketId],
    enabled: !!ticketId,
    queryFn: async () => (await api.get(`/api/tickets/${ticketId}`)).data,
  });

  const { data: members } = useQuery({
    queryKey: ["members", orgId],
    queryFn: async () => (await api.get(`/api/organizations/${orgId}/members`)).data,
  });

  useEffect(() => { if (ticket) setForm({ ...ticket, storyPoints: ticket.storyPoints ?? null }); }, [ticket]);

  const updateMut = useMutation({
    mutationFn: async (changes: any) => api.patch(`/api/tickets/${ticketId}`, changes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      qc.invalidateQueries({ queryKey: ["board"] });
      qc.invalidateQueries({ queryKey: ["backlog"] });
    },
  });

  const createMut = useMutation({
    mutationFn: async () => api.post("/api/tickets", { ...form, projectId: projId, sprintId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["board"] });
      qc.invalidateQueries({ queryKey: ["backlog"] });
      onClose();
    },
  });

  const commentMut = useMutation({
    mutationFn: async () => api.post(`/api/tickets/${ticketId}/comments`, { body: comment }),
    onSuccess: () => { setComment(""); qc.invalidateQueries({ queryKey: ["ticket", ticketId] }); },
  });

  if (create) {
    return (
      <Modal open onClose={onClose} title="Novo ticket" maxWidth="max-w-2xl"
        footer={<>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => createMut.mutate()} disabled={!form.title}>Criar</Button>
        </>}>
        <div className="space-y-3">
          <div><Label>Título</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Tipo</Label><Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{TYPES.map(t=><option key={t}>{t}</option>)}</Select></div>
            <div><Label>Prioridade</Label><Select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>{PRIORITIES.map(t=><option key={t}>{t}</option>)}</Select></div>
            <div><Label>Story points</Label><Input type="number" value={form.storyPoints || ""} onChange={e => setForm({ ...form, storyPoints: e.target.value ? Number(e.target.value) : null })} /></div>
          </div>
          <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>Critérios de aceitação</Label><Textarea value={form.acceptanceCriteria} onChange={e => setForm({ ...form, acceptanceCriteria: e.target.value })} /></div>
        </div>
      </Modal>
    );
  }

  if (!ticket) return null;

  return (
    <Modal open onClose={onClose} title={`${ticket.key} — ${ticket.title}`} maxWidth="max-w-3xl">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 space-y-3">
          <div>
            <Label>Título</Label>
            <Input value={form.title || ""} onChange={e => setForm({ ...form, title: e.target.value })} onBlur={() => updateMut.mutate({ title: form.title })} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} onBlur={() => updateMut.mutate({ description: form.description })} />
          </div>
          <div>
            <Label>Critérios de aceitação</Label>
            <Textarea value={form.acceptanceCriteria || ""} onChange={e => setForm({ ...form, acceptanceCriteria: e.target.value })} onBlur={() => updateMut.mutate({ acceptanceCriteria: form.acceptanceCriteria })} />
          </div>

          <div>
            <Label>Comentários</Label>
            <div className="space-y-2">
              {ticket.comments?.map((c: any) => (
                <div key={c.id} className="flex gap-2 rounded bg-slate-50 p-2">
                  <Avatar name={c.user.name} size={28} />
                  <div className="flex-1">
                    <div className="text-xs font-medium text-slate-700">{c.user.name}</div>
                    <div className="text-sm text-slate-800">{c.body}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input value={comment} onChange={e => setComment(e.target.value)} placeholder="Adicionar comentário..." />
              <Button onClick={() => commentMut.mutate()} disabled={!comment.trim()}>Enviar</Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div><Label>Status</Label>
            <Select value={form.status} onChange={e => { setForm({ ...form, status: e.target.value }); updateMut.mutate({ status: e.target.value }); }}>
              {STATUS.map(s => <option key={s}>{s}</option>)}
            </Select>
          </div>
          <div><Label>Prioridade</Label>
            <Select value={form.priority} onChange={e => { setForm({ ...form, priority: e.target.value }); updateMut.mutate({ priority: e.target.value }); }}>
              {PRIORITIES.map(s => <option key={s}>{s}</option>)}
            </Select>
          </div>
          <div><Label>Tipo</Label>
            <div><Badge tone={ticket.type === "BUG" ? "red" : "blue"}>{ticket.type}</Badge></div>
          </div>
          <div><Label>Story points</Label>
            <Input type="number" value={form.storyPoints ?? ""} onChange={e => setForm({ ...form, storyPoints: e.target.value ? Number(e.target.value) : null })} onBlur={() => updateMut.mutate({ storyPoints: form.storyPoints })} />
          </div>
          <div><Label>Responsável</Label>
            <Select value={form.assigneeId || ""} onChange={e => { const v = e.target.value || null; setForm({ ...form, assigneeId: v }); updateMut.mutate({ assigneeId: v }); }}>
              <option value="">— Não atribuído —</option>
              {members?.map((m: any) => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}
            </Select>
          </div>
          {ticket.reporter && (
            <div><Label>Reporter</Label><div className="text-sm text-slate-700">{ticket.reporter.name}</div></div>
          )}
        </div>
      </div>
    </Modal>
  );
}
