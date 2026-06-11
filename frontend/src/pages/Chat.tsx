import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Sparkles, Send, MessageSquare } from "lucide-react";
import { cn } from "@/lib/cn";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";

export function ChatPage() {
  const token = useAuth(s => s.token)!;
  const user = useAuth(s => s.user)!;
  const qc = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [aiTyping, setAiTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: rooms = [] } = useQuery<any[]>({
    queryKey: ["chat-rooms"],
    queryFn: async () => (await api.get("/api/chat/rooms")).data,
  });

  useEffect(() => {
    const s = io(SOCKET_URL, { auth: { token } });
    setSocket(s);
    return () => { s.disconnect(); };
  }, [token]);

  useEffect(() => {
    if (!socket) return;
    const onMsg = (m: any) => setMessages(prev => [...prev, m]);
    const onTyping = ({ typing }: any) => setAiTyping(typing);
    const onCleared = ({ roomId }: { roomId: string }) => {
      setMessages(prev => (roomId === activeRoomId ? [] : prev));
      setAiTyping(false);
    };
    socket.on("message", onMsg);
    socket.on("ai:typing", onTyping);
    socket.on("room:cleared", onCleared);
    return () => {
      socket.off("message", onMsg);
      socket.off("ai:typing", onTyping);
      socket.off("room:cleared", onCleared);
    };
  }, [socket, activeRoomId]);

  useEffect(() => {
    if (!activeRoomId || !socket) return;
    socket.emit("join", { roomId: activeRoomId });
    api.get(`/api/chat/rooms/${activeRoomId}/messages`).then(r => setMessages(r.data));
    return () => { socket.emit("leave", { roomId: activeRoomId }); };
  }, [activeRoomId, socket]);

  useEffect(() => {
    if (rooms.length && !activeRoomId) setActiveRoomId(rooms[0].id);
  }, [rooms, activeRoomId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, aiTyping]);

  const activeRoom = rooms.find(r => r.id === activeRoomId);

  function send() {
    const body = input.trim();
    if (!body || !activeRoomId || !socket) return;
    socket.emit("message", { roomId: activeRoomId, body });
    setInput("");
  }

  const isAiRoom = activeRoom?.kind === "AI_ASSISTANT";

  return (
    <div className="flex h-full flex-col p-6">
      <PageHeader title="Chat & IA" subtitle="Converse com seu time ou peça insights ao AjeX Assistant" />
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
        <Card className="w-64 overflow-hidden">
          <CardBody className="p-2">
            <div className="mb-1 px-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Salas</div>
            {rooms.map(r => (
              <button
                key={r.id}
                onClick={() => setActiveRoomId(r.id)}
                className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-slate-50",
                  activeRoomId === r.id && "bg-brand-50 font-semibold text-brand-700")}
              >
                {r.kind === "AI_ASSISTANT" ? <Sparkles size={15} className="text-brand-500" /> : <MessageSquare size={15} className="text-slate-400" />}
                <span className="flex-1 truncate">{r.name}</span>
              </button>
            ))}
          </CardBody>
        </Card>

        <Card className="flex flex-1 flex-col overflow-hidden">
          {activeRoom ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                  {activeRoom.kind === "AI_ASSISTANT" ? <Sparkles size={16} className="text-brand-500" /> : <MessageSquare size={16} className="text-ink-700" />}
                  <div className="font-bold text-ink-900">{activeRoom.name}</div>
                  <Badge tone={activeRoom.kind === "AI_ASSISTANT" ? "orange" : "slate"}>{activeRoom.kind === "AI_ASSISTANT" ? "IA" : "Time"}</Badge>
                </div>
              </div>
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 scrollbar-thin">
                {messages.map((m: any) => (
                  <div key={m.id} className={cn("flex gap-2", m.userId === user.id && "flex-row-reverse")}>
                    {m.role === "ai" ? (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-800 text-brand-500">
                        <Sparkles size={15} />
                      </div>
                    ) : <Avatar name={m.user?.name || "?"} size={32} />}
                    <div className={cn("max-w-[70%] rounded-2xl px-3.5 py-2 text-sm",
                      m.role === "ai" ? "rounded-tl-sm bg-ink-800/5 text-ink-800" :
                      m.userId === user.id ? "rounded-tr-sm bg-brand-500 text-white" : "rounded-tl-sm bg-slate-100 text-ink-800"
                    )}>
                      {m.role !== "ai" && m.userId !== user.id && <div className="mb-0.5 text-xs font-semibold opacity-70">{m.user?.name}</div>}
                      <div className="whitespace-pre-wrap">{m.body}</div>
                    </div>
                  </div>
                ))}
                {aiTyping && (
                  <div className="flex gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-800 text-brand-500">
                      <Sparkles size={15} />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm bg-ink-800/5 px-3.5 py-2 text-sm italic text-slate-500">IA está pensando...</div>
                  </div>
                )}
              </div>
              <div className="border-t border-slate-100 p-3">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") send(); }}
                    placeholder={isAiRoom ? "Pergunte algo sobre o projeto..." : "Mensagem para o time..."}
                  />
                  <Button onClick={send} disabled={!input.trim()}><Send size={15} /></Button>
                </div>
                {isAiRoom && (
                  <div className="mt-2 text-xs text-slate-400">
                    Dica: o histórico é mantido entre mensagens. Digite <code className="rounded bg-slate-100 px-1 font-mono text-slate-600">/limpar</code> para apagar a conversa.
                  </div>
                )}
              </div>
            </>
          ) : <div className="flex flex-1 items-center justify-center text-slate-500">Selecione uma sala</div>}
        </Card>
      </div>
    </div>
  );
}
