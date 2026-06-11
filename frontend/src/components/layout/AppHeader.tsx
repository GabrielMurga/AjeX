import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Search, Bell, LogOut, Settings as SettingsIcon, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/store/auth";
import { useProject } from "@/store/project";
import { api } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { Logo } from "@/components/ui/Logo";

function useClickOutside<T extends HTMLElement>(ref: React.RefObject<T>, onClose: () => void) {
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [onClose]);
}

/** Barra 1 do chrome navy: logo + seletores de org/projeto + busca + perfil */
export function AppHeader() {
  const navigate = useNavigate();
  const { user, organizations, currentOrgId, setOrg, logout } = useAuth();
  const { currentProjectId, setProject } = useProject();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setMenu(false));

  const { data: projects } = useQuery({
    queryKey: ["projects", currentOrgId],
    enabled: !!currentOrgId,
    queryFn: async () => (await api.get("/api/projects")).data as { id: string; name: string; key: string }[],
  });

  useEffect(() => {
    if (projects?.length && !projects.find(p => p.id === currentProjectId)) setProject(projects[0].id);
  }, [projects, currentProjectId, setProject]);

  const role = organizations.find(o => o.id === currentOrgId)?.role.replace(/_/g, " ");

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 bg-ink-800 px-5">
      <button onClick={() => navigate("/")}><Logo size={24} /></button>

      {/* Seletor de organização */}
      <div className="relative ml-1">
        <select
          value={currentOrgId || ""}
          onChange={(e) => setOrg(e.target.value)}
          className="appearance-none rounded-lg border border-white/15 bg-white/5 py-1.5 pl-3 pr-8 text-sm font-medium text-white/90 outline-none hover:bg-white/10"
        >
          {organizations.map(o => <option key={o.id} value={o.id} className="text-ink-900">{o.name}</option>)}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/50" />
      </div>

      {/* Seletor de projeto */}
      {projects && projects.length > 0 && (
        <div className="relative">
          <select
            value={currentProjectId || ""}
            onChange={(e) => setProject(e.target.value)}
            className="appearance-none rounded-lg border border-white/15 bg-white/5 py-1.5 pl-3 pr-8 text-sm text-white/90 outline-none hover:bg-white/10"
          >
            {projects.map(p => <option key={p.id} value={p.id} className="text-ink-900">{p.key} · {p.name}</option>)}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/50" />
        </div>
      )}

      {/* Busca */}
      <div className="relative ml-auto hidden lg:block">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          placeholder="Buscar tickets, sprints, pessoas…"
          className="w-72 rounded-lg border border-white/10 bg-white/5 py-1.5 pl-9 pr-3 text-sm text-white placeholder-white/40 outline-none focus:border-brand-500/60 focus:bg-white/10"
        />
      </div>

      <button className="relative rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white">
        <Bell size={18} />
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-ink-800" />
      </button>

      <div className="h-6 w-px bg-white/10" />

      {/* Perfil */}
      <div className="relative" ref={menuRef}>
        <button onClick={() => setMenu(m => !m)} className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-1.5 transition hover:bg-white/10">
          {user && <Avatar name={user.name} size={30} />}
          <div className="hidden text-left leading-tight md:block">
            <div className="text-[13px] font-semibold text-white">{user?.name}</div>
            <div className="text-[11px] capitalize text-white/50">{role?.toLowerCase()}</div>
          </div>
          <ChevronDown size={14} className="text-white/50" />
        </button>
        {menu && (
          <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl">
            <div className="flex items-center gap-3 px-3 py-2.5">
              {user && <Avatar name={user.name} size={38} />}
              <div className="leading-tight">
                <div className="text-sm font-bold text-ink-900">{user?.name}</div>
                <div className="text-xs text-slate-500">{organizations.find(o => o.id === currentOrgId)?.name}</div>
              </div>
            </div>
            <div className="my-1 h-px bg-slate-100" />
            <button onClick={() => { setMenu(false); navigate("/settings"); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink-700 hover:bg-slate-50"><SettingsIcon size={15} className="text-slate-400" /> Account settings</button>
            <button className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink-700 hover:bg-slate-50"><FileText size={15} className="text-slate-400" /> Terms of usage</button>
            <div className="my-1 h-px bg-slate-100" />
            <button onClick={logout} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"><LogOut size={15} /> Sair</button>
          </div>
        )}
      </div>
    </header>
  );
}
