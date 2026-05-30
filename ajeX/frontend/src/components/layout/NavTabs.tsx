import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, KanbanSquare, ListTodo, Calendar, RotateCcw, Bug,
  Map, Users, FlaskConical, Eye, MessageSquare, Settings,
} from "lucide-react";
import { cn } from "@/lib/cn";

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
  { to: "/stakeholder", icon: Eye, label: "Stakeholder" },
  { to: "/chat", icon: MessageSquare, label: "Chat & IA" },
];

/** Barra 2 do chrome navy: abas de seção com sublinhado laranja no item ativo */
export function NavTabs() {
  const { pathname } = useLocation();
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <nav className="flex h-12 shrink-0 items-stretch border-b border-black/20 bg-ink-900 px-3">
      <div className="no-scrollbar flex flex-1 items-stretch gap-0.5 overflow-x-auto">
        {NAV.map(item => {
          const active = isActive(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "relative flex shrink-0 items-center gap-1.5 px-3 text-[13px] font-medium transition-colors",
                active ? "text-white" : "text-white/55 hover:text-white/90"
              )}
            >
              <item.icon size={15} />
              <span>{item.label}</span>
              {active && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t bg-brand-500" />}
            </NavLink>
          );
        })}
      </div>
      <NavLink
        to="/settings"
        className={({ isActive: a }) => cn(
          "relative flex shrink-0 items-center gap-1.5 border-l border-white/10 pl-3 pr-1 text-[13px] font-medium transition-colors",
          a ? "text-white" : "text-white/55 hover:text-white/90"
        )}
      >
        {({ isActive: a }) => (
          <>
            <Settings size={15} />
            <span className="hidden sm:inline">Configurações</span>
            {a && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t bg-brand-500" />}
          </>
        )}
      </NavLink>
    </nav>
  );
}
