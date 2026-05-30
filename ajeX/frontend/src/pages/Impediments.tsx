import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useProject } from "@/store/project";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { Plus, AlertCircle, Clock, CheckCircle2 } from "lucide-react";

const STATUS_CONFIG = {
  OPEN:        { label: "Aberto",       tone: "red"    as const, icon: AlertCircle  },
  IN_PROGRESS: { label: "Em andamento", tone: "yellow" as const, icon: Clock        },
  RESOLVED:    { label: "Resolvido",    tone: "green"  as const, icon: CheckCircle2 },
};

const STATUS_CYCLE: Record<string, string> = {
  OPEN: "IN_PROGRESS",
  IN_PROGRESS: "RESOLVED",
  RESOLVED: "OPEN",
};

export function ImpedimentsPage() {
  const projId = useProject(s => s.currentProjectId);
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });

  const { data: items = [] } = useQuery<any[]>({
    queryKey: ["impediments", projId],
    enabled: !!projId,
    queryFn: async () => (await api.get("/api/impediments", { params: { projectId: projId } })).data,
  });

  const createMut = useMutation({
    mutationFn: async () => api.post("/api/impediments", { ...form, projectId: projId }),
    onSuccess: () => {
      setCreating(false);
      setForm({ title: "", description: "" });
      qc.invalidateQueries({ queryKey: ["impediments"] });
    },
  });

  const updMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/impediments/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["impediments"] }),
  });

  if (!projId) return <div className="p-6 text-slate-500">Selecione um projeto.</div>;

  const grouped = {
    OPEN:        items.filter(i => i.status === "OPEN"),
    IN_PROGRESS: items.filter(i => i.status === "IN_PROGRESS"),
    RESOLVED:    items.filter(i => i.status === "RESOLVED"),
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Impedimentos"
        subtitle="Bloqueios identificados pelo Scrum Master / time"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus size={14} /> Reportar
          </Button>
        }
      />

      <div className="space-y-6">
        {(["OPEN", "IN_PROGRESS", "RESOLVED"] as const).map(status => {
          const cfg = STATUS_CONFIG[status];
          const Icon = cfg.icon;
          const group = grouped[status];
          if (group.length === 0) return null;

          return (
            <section key={status}>
              <div className="mb-2 flex items-center gap-2">
                <Icon size={15} className={
                  status === "OPEN"        ? "text-red-500"    :
                  status === "IN_PROGRESS" ? "text-yellow-500" :
                  "text-green-500"
                } />
                <span className="text-sm font-semibold text-slate-700">{cfg.label}</span>
                <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  {group.length}
                </span>
              </div>

              <div className="space-y-2">
                {group.map(item => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900">{item.title}</span>
                        <Badge tone={cfg.tone}>{cfg.label}</Badge>
                      </div>
                      {item.description && (
                        <p className="mt-1 text-sm text-slate-500 leading-snug">{item.description}</p>
                      )}
                      {item.reporter?.name && (
                        <p className="mt-1.5 text-xs text-slate-400">Reportado por {item.reporter.name}</p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1 pt-0.5">
                      <select
                        value={item.status}
                        onChange={e => updMut.mutate({ id: item.id, status: e.target.value })}
                        className="rounded-md border border-slate-200 bg-slate-50 py-1 pl-2 pr-7 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      >
                        <option value="OPEN">Aberto</option>
                        <option value="IN_PROGRESS">Em andamento</option>
                        <option value="RESOLVED">Resolvido</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}

        {items.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white py-12 text-center">
            <AlertCircle className="mx-auto mb-2 text-slate-300" size={32} />
            <p className="text-sm text-slate-400">Nenhum impedimento registrado.</p>
          </div>
        )}
      </div>

      {creating && (
        <Modal
          open
          onClose={() => setCreating(false)}
          title="Reportar impedimento"
          footer={
            <>
              <Button variant="outline" onClick={() => setCreating(false)}>Cancelar</Button>
              <Button onClick={() => createMut.mutate()}>Salvar</Button>
            </>
          }
        >
          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Descreva o impedimento brevemente"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Detalhes adicionais (opcional)"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
