import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { api } from "@/lib/api";
import { useProject } from "@/store/project";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { useState } from "react";
import { TicketModal } from "@/components/TicketModal";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";

const COLUMNS = [
  { id: "TODO", label: "To Do", tone: "blue" as const },
  { id: "IN_PROGRESS", label: "Em Progresso", tone: "yellow" as const },
  { id: "CODE_REVIEW", label: "Code Review", tone: "purple" as const },
  { id: "QA", label: "QA", tone: "orange" as const },
  { id: "DONE", label: "Done", tone: "green" as const },
];

export function BoardPage() {
  const projId = useProject(s => s.currentProjectId);
  const qc = useQueryClient();
  const [openTicket, setOpenTicket] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: sprints } = useQuery({
    queryKey: ["sprints", projId],
    enabled: !!projId,
    queryFn: async () => (await api.get("/api/sprints", { params: { projectId: projId } })).data,
  });
  const activeSprint = sprints?.find((s: any) => s.status === "ACTIVE");

  const { data: tickets = [] } = useQuery<any[]>({
    queryKey: ["board", activeSprint?.id],
    enabled: !!activeSprint?.id,
    queryFn: async () => (await api.get("/api/tickets", { params: { projectId: projId, sprintId: activeSprint.id } })).data,
  });

  const moveMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/tickets/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["board"] }),
  });

  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId;
    if (newStatus === result.source.droppableId) return;
    moveMut.mutate({ id: result.draggableId, status: newStatus });
  }

  if (!projId) return <div className="p-6 text-slate-500">Selecione um projeto.</div>;
  if (!activeSprint) return <div className="p-6 text-slate-500">Nenhuma sprint ativa neste projeto.</div>;

  const byCol = COLUMNS.reduce<Record<string, any[]>>((a, c) => {
    a[c.id] = tickets.filter(t => t.status === c.id);
    return a;
  }, {});

  return (
    <div className="p-6">
      <PageHeader
        title="Sprint Board"
        subtitle={`${activeSprint.name} — ${activeSprint.goal || "Sem goal definido"}`}
        actions={<Button onClick={() => setCreating(true)}><Plus size={14} /> Novo ticket</Button>}
      />

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-5 gap-3">
          {COLUMNS.map(col => (
            <div key={col.id} className="rounded-lg bg-slate-100 p-2">
              <div className="mb-2 flex items-center justify-between px-1">
                <Badge tone={col.tone}>{col.label}</Badge>
                <span className="text-xs text-slate-500">{byCol[col.id].length}</span>
              </div>
              <Droppable droppableId={col.id}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-[400px] space-y-2">
                    {byCol[col.id].map((t, idx) => (
                      <Draggable key={t.id} draggableId={t.id} index={idx}>
                        {(p) => (
                          <div
                            ref={p.innerRef}
                            {...p.draggableProps}
                            {...p.dragHandleProps}
                            onClick={() => setOpenTicket(t.id)}
                            className="cursor-pointer rounded-md border border-slate-200 bg-white p-3 shadow-sm hover:border-brand-300"
                          >
                            <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                              <span className="font-mono">{t.key}</span>
                              <Badge tone={t.type === "BUG" ? "red" : t.type === "STORY" ? "blue" : "slate"}>{t.type}</Badge>
                            </div>
                            <div className="text-sm font-medium text-slate-800">{t.title}</div>
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                {t.storyPoints != null && <Badge tone="purple">{t.storyPoints} pts</Badge>}
                                {t.priority === "HIGHEST" && <Badge tone="red">↑↑</Badge>}
                                {t.priority === "HIGH" && <Badge tone="orange">↑</Badge>}
                              </div>
                              {t.assignee && <Avatar name={t.assignee.name} size={22} />}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {openTicket && <TicketModal ticketId={openTicket} onClose={() => setOpenTicket(null)} />}
      {creating && <TicketModal create onClose={() => setCreating(false)} sprintId={activeSprint.id} />}
    </div>
  );
}
