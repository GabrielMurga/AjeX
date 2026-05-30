import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useProject } from "@/store/project";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Plus, ArrowRight } from "lucide-react";
import { TicketModal } from "@/components/TicketModal";

export function BacklogPage() {
  const projId = useProject(s => s.currentProjectId);
  const qc = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: backlog = [] } = useQuery<any[]>({
    queryKey: ["backlog", projId],
    enabled: !!projId,
    queryFn: async () => (await api.get("/api/tickets", { params: { projectId: projId, sprintId: "null" } })).data,
  });

  const { data: sprints = [] } = useQuery<any[]>({
    queryKey: ["sprints", projId],
    enabled: !!projId,
    queryFn: async () => (await api.get("/api/sprints", { params: { projectId: projId } })).data,
  });

  const moveMut = useMutation({
    mutationFn: async ({ id, sprintId }: { id: string; sprintId: string }) =>
      api.patch(`/api/tickets/${id}`, { sprintId, status: "TODO" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backlog"] });
      qc.invalidateQueries({ queryKey: ["board"] });
    },
  });

  if (!projId) return <div className="p-6 text-slate-500">Selecione um projeto.</div>;

  const totalPoints = backlog.reduce((s, t) => s + (t.storyPoints || 0), 0);
  const activeSprint = sprints.find(s => s.status === "ACTIVE");

  return (
    <div className="p-6">
      <PageHeader
        title="Product Backlog"
        subtitle={`${backlog.length} itens · ${totalPoints} story points totais`}
        actions={<Button onClick={() => setCreating(true)}><Plus size={14} /> Novo item</Button>}
      />

      <Card>
        <CardHeader><CardTitle>Itens não alocados em sprint</CardTitle></CardHeader>
        <CardBody className="p-0">
          {backlog.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">Backlog vazio.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="px-4 py-2 text-left">Key</th>
                  <th className="px-4 py-2 text-left">Título</th>
                  <th className="px-4 py-2 text-left">Tipo</th>
                  <th className="px-4 py-2 text-left">Prioridade</th>
                  <th className="px-4 py-2 text-left">Pts</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {backlog.map(t => (
                  <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono text-xs text-slate-500">{t.key}</td>
                    <td className="px-4 py-2 cursor-pointer text-slate-900" onClick={() => setOpen(t.id)}>{t.title}</td>
                    <td className="px-4 py-2"><Badge tone={t.type === "BUG" ? "red" : "blue"}>{t.type}</Badge></td>
                    <td className="px-4 py-2 text-slate-600">{t.priority}</td>
                    <td className="px-4 py-2"><Badge tone="purple">{t.storyPoints || "—"}</Badge></td>
                    <td className="px-4 py-2 text-right">
                      {activeSprint && (
                        <Button size="sm" variant="outline" onClick={() => moveMut.mutate({ id: t.id, sprintId: activeSprint.id })}>
                          <ArrowRight size={12} /> Sprint Ativa
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {open && <TicketModal ticketId={open} onClose={() => setOpen(null)} />}
      {creating && <TicketModal create onClose={() => setCreating(false)} />}
    </div>
  );
}
