import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { useProject } from "@/store/project";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Plus, Trash2 } from "lucide-react";

const ROLES = ["PRODUCT_MANAGER","PRODUCT_OWNER","SCRUM_MASTER","DEVELOPER","UX_DESIGNER","QA_ENGINEER","DATA_ANALYST","TECH_LEAD","STAKEHOLDER"];

export function SettingsPage() {
  const orgId = useAuth(s => s.currentOrgId)!;
  const projId = useProject(s => s.currentProjectId);
  const setProject = useProject(s => s.setProject);
  const qc = useQueryClient();
  const [inviting, setInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", name: "", password: "ajex123", role: "DEVELOPER" });
  const [creatingProj, setCreatingProj] = useState(false);
  const [projForm, setProjForm] = useState({ name: "", key: "", description: "", vision: "" });
  const [dodText, setDodText] = useState("");

  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["members", orgId],
    queryFn: async () => (await api.get(`/api/organizations/${orgId}/members`)).data,
  });
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["projects", orgId],
    queryFn: async () => (await api.get("/api/projects")).data,
  });
  const { data: project } = useQuery<any>({
    queryKey: ["project", projId], enabled: !!projId,
    queryFn: async () => (await api.get(`/api/projects/${projId}`)).data,
  });

  const inviteMut = useMutation({
    mutationFn: async () => api.post(`/api/organizations/${orgId}/members`, inviteForm),
    onSuccess: () => { setInviting(false); qc.invalidateQueries({ queryKey: ["members"] }); },
  });
  const createProjMut = useMutation({
    mutationFn: async () => api.post("/api/projects", { ...projForm, key: projForm.key.toUpperCase() }),
    onSuccess: (r) => { setCreatingProj(false); setProject(r.data.id); qc.invalidateQueries({ queryKey: ["projects"] }); },
  });
  const dodAddMut = useMutation({
    mutationFn: async () => api.post(`/api/projects/${projId}/dod`, { text: dodText }),
    onSuccess: () => { setDodText(""); qc.invalidateQueries({ queryKey: ["project", projId] }); },
  });
  const dodDelMut = useMutation({
    mutationFn: async (itemId: string) => api.delete(`/api/projects/${projId}/dod/${itemId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project", projId] }),
  });

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Configurações" />

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Membros da organização</CardTitle>
          <Button size="sm" onClick={() => setInviting(true)}><Plus size={12} /> Convidar</Button>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr><th className="px-4 py-2 text-left">Membro</th><th className="px-4 py-2 text-left">Papel</th><th className="px-4 py-2 text-left">Email</th></tr>
            </thead>
            <tbody>
              {members.map((m: any) => (
                <tr key={m.membershipId} className="border-t border-slate-100">
                  <td className="px-4 py-2 flex items-center gap-2"><Avatar name={m.user.name} size={26} /> {m.user.name}</td>
                  <td className="px-4 py-2"><Badge tone="blue">{m.role.replace(/_/g," ")}</Badge></td>
                  <td className="px-4 py-2 text-slate-500">{m.user.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Projetos</CardTitle>
          <Button size="sm" onClick={() => setCreatingProj(true)}><Plus size={12} /> Novo projeto</Button>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr><th className="px-4 py-2 text-left">Key</th><th className="px-4 py-2 text-left">Nome</th><th className="px-4 py-2 text-left">Tickets</th><th className="px-4 py-2 text-left">Sprints</th></tr>
            </thead>
            <tbody>
              {projects.map((p: any) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-mono text-xs">{p.key}</td>
                  <td className="px-4 py-2 cursor-pointer text-brand-600 hover:underline" onClick={() => setProject(p.id)}>{p.name}</td>
                  <td className="px-4 py-2">{p._count.tickets}</td>
                  <td className="px-4 py-2">{p._count.sprints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {project && (
        <Card>
          <CardHeader><CardTitle>Definition of Done — {project.name}</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            {project.definitionOfDone.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm">
                <span className="text-slate-800">✓ {d.text}</span>
                <button onClick={() => dodDelMut.mutate(d.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input value={dodText} onChange={e => setDodText(e.target.value)} placeholder="Adicionar item ao DoD..." />
              <Button onClick={() => dodAddMut.mutate()} disabled={!dodText.trim()}>Adicionar</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {inviting && (
        <Modal open onClose={() => setInviting(false)} title="Convidar membro"
          footer={<><Button variant="outline" onClick={() => setInviting(false)}>Cancelar</Button><Button onClick={() => inviteMut.mutate()}>Convidar</Button></>}>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={inviteForm.name} onChange={e => setInviteForm({...inviteForm, name: e.target.value})} /></div>
            <div><Label>Email</Label><Input type="email" value={inviteForm.email} onChange={e => setInviteForm({...inviteForm, email: e.target.value})} /></div>
            <div><Label>Senha temporária</Label><Input value={inviteForm.password} onChange={e => setInviteForm({...inviteForm, password: e.target.value})} /></div>
            <div><Label>Papel</Label>
              <Select value={inviteForm.role} onChange={e => setInviteForm({...inviteForm, role: e.target.value})}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </Select>
            </div>
          </div>
        </Modal>
      )}

      {creatingProj && (
        <Modal open onClose={() => setCreatingProj(false)} title="Novo projeto"
          footer={<><Button variant="outline" onClick={() => setCreatingProj(false)}>Cancelar</Button><Button onClick={() => createProjMut.mutate()}>Criar</Button></>}>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={projForm.name} onChange={e => setProjForm({...projForm, name: e.target.value})} /></div>
            <div><Label>Key (ex: AJX, 2-8 letras)</Label><Input value={projForm.key} onChange={e => setProjForm({...projForm, key: e.target.value.toUpperCase()})} /></div>
            <div><Label>Descrição</Label><Input value={projForm.description} onChange={e => setProjForm({...projForm, description: e.target.value})} /></div>
            <div><Label>Visão</Label><Input value={projForm.vision} onChange={e => setProjForm({...projForm, vision: e.target.value})} /></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
