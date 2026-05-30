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
import { Plus } from "lucide-react";

export function QAPage() {
  const projId = useProject(s => s.currentProjectId);
  const qc = useQueryClient();
  const [createPlan, setCreatePlan] = useState(false);
  const [planForm, setPlanForm] = useState({ name: "", scope: "" });
  const [createCase, setCreateCase] = useState<string | null>(null);
  const [caseForm, setCaseForm] = useState({ title: "", steps: "", expected: "" });

  const { data: plans = [] } = useQuery<any[]>({
    queryKey: ["qa", projId], enabled: !!projId,
    queryFn: async () => (await api.get("/api/qa/plans", { params: { projectId: projId } })).data,
  });

  const createPlanMut = useMutation({
    mutationFn: async () => api.post("/api/qa/plans", { ...planForm, projectId: projId }),
    onSuccess: () => { setCreatePlan(false); setPlanForm({ name: "", scope: "" }); qc.invalidateQueries({ queryKey: ["qa"] }); },
  });
  const createCaseMut = useMutation({
    mutationFn: async () => api.post(`/api/qa/plans/${createCase}/cases`, caseForm),
    onSuccess: () => { setCreateCase(null); setCaseForm({ title: "", steps: "", expected: "" }); qc.invalidateQueries({ queryKey: ["qa"] }); },
  });
  const updCaseMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => api.patch(`/api/qa/cases/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qa"] }),
  });

  if (!projId) return <div className="p-6 text-slate-500">Selecione um projeto.</div>;

  const tone = (s: string) => s === "PASSED" ? "green" : s === "FAILED" ? "red" : s === "BLOCKED" ? "orange" : "slate";

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Qualidade (QA)" actions={<Button onClick={() => setCreatePlan(true)}><Plus size={14} /> Plano</Button>} />
      {plans.map((p: any) => (
        <Card key={p.id}>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>{p.name}</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setCreateCase(p.id)}><Plus size={12} /> Caso de teste</Button>
          </CardHeader>
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr><th className="px-4 py-2 text-left">Caso</th><th className="px-4 py-2 text-left">Esperado</th><th className="px-4 py-2 text-left">Status</th></tr>
              </thead>
              <tbody>
                {p.cases.map((c: any) => (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-800">{c.title}</td>
                    <td className="px-4 py-2 text-slate-500">{c.expected}</td>
                    <td className="px-4 py-2">
                      <Select className="w-32" value={c.status} onChange={e => updCaseMut.mutate({ id: c.id, status: e.target.value })}>
                        {["NOT_RUN","PASSED","FAILED","BLOCKED"].map(s => <option key={s}>{s}</option>)}
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ))}
      {plans.length === 0 && <div className="text-sm text-slate-500">Nenhum plano de teste.</div>}

      {createPlan && (
        <Modal open onClose={() => setCreatePlan(false)} title="Novo plano de teste"
          footer={<><Button variant="outline" onClick={() => setCreatePlan(false)}>Cancelar</Button><Button onClick={() => createPlanMut.mutate()}>Criar</Button></>}>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={planForm.name} onChange={e => setPlanForm({...planForm, name: e.target.value})} /></div>
            <div><Label>Escopo</Label><Textarea value={planForm.scope} onChange={e => setPlanForm({...planForm, scope: e.target.value})} /></div>
          </div>
        </Modal>
      )}

      {createCase && (
        <Modal open onClose={() => setCreateCase(null)} title="Novo caso de teste"
          footer={<><Button variant="outline" onClick={() => setCreateCase(null)}>Cancelar</Button><Button onClick={() => createCaseMut.mutate()}>Salvar</Button></>}>
          <div className="space-y-3">
            <div><Label>Título</Label><Input value={caseForm.title} onChange={e => setCaseForm({...caseForm, title: e.target.value})} /></div>
            <div><Label>Passos</Label><Textarea value={caseForm.steps} onChange={e => setCaseForm({...caseForm, steps: e.target.value})} /></div>
            <div><Label>Resultado esperado</Label><Textarea value={caseForm.expected} onChange={e => setCaseForm({...caseForm, expected: e.target.value})} /></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
