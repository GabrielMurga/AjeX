import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, KanbanSquare, ListTodo, Calendar, MessageSquare, Map,
  Target, Users, Bug, FlaskConical, Sparkles, Eye, Settings, RotateCcw
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useProject } from "@/store/project";

const NAV = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/board", icon: KanbanSquare, label: "Board" },
  { to: "/backlog", icon: ListTodo, label: "Backlog" },
  { to: "/sprints", icon: Calendar, label: "Sprints" },
  { to: "/retros", icon: RotateCcw, label: "Retrospectivas" },
  { to: "/impediments", icon: Bug, label: "Impedimentos" },
  { to: "/roadmap", icon: Map, label: "Roadmap & OKRs" },
  { to: "/discovery", icon: Users, label: "Discovery" },
  { to: "/qa", icon: FlaskConical, label: "QA" },
  { to: "/stakeholder", icon: Eye, label: "Stakeholder View" },
  { to: "/chat", icon: MessageSquare, label: "Chat & IA" },
];

export function Sidebar() {
  const { pathname } = useLocation();
  const projId = useProject(s => s.currentProjectId);

  return (
    <aside className="flex h-full w-60 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-200">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 text-white font-bold">A</div>
        <div>
          <div className="font-bold text-slate-900">AjeX</div>
          <div className="text-[10px] text-slate-500">Agile Hub</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV.map(item => {
          const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "mb-0.5 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm",
                active ? "bg-brand-50 text-brand-700 font-medium" : "text-slate-700 hover:bg-slate-50"
              )}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      {!projId && (
        <div className="mx-3 mb-3 rounded-md bg-yellow-50 p-2 text-xs text-yellow-900">
          Selecione um projeto no topo para começar.
        </div>
      )}
      <NavLink to="/settings" className="flex items-center gap-2 border-t border-slate-200 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50">
        <Settings size={16} /> Configurações
      </NavLink>
    </aside>
  );
}
