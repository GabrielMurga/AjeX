import { useQuery } from "@tanstack/react-query";
import { LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/store/auth";
import { useProject } from "@/store/project";
import { api } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { useEffect } from "react";

export function Topbar() {
  const { user, organizations, currentOrgId, setOrg, logout } = useAuth();
  const { currentProjectId, setProject } = useProject();

  const { data: projects } = useQuery({
    queryKey: ["projects", currentOrgId],
    enabled: !!currentOrgId,
    queryFn: async () => (await api.get("/api/projects")).data as { id: string; name: string; key: string }[],
  });

  useEffect(() => {
    if (projects?.length && !projects.find(p => p.id === currentProjectId)) {
      setProject(projects[0].id);
    }
  }, [projects, currentProjectId, setProject]);

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <div className="relative">
          <select
            value={currentOrgId || ""}
            onChange={(e) => setOrg(e.target.value)}
            className="appearance-none rounded-md border border-slate-300 bg-white py-1.5 pl-3 pr-8 text-sm font-medium"
          >
            {organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        {projects && projects.length > 0 && (
          <div className="relative">
            <select
              value={currentProjectId || ""}
              onChange={(e) => setProject(e.target.value)}
              className="appearance-none rounded-md border border-slate-300 bg-white py-1.5 pl-3 pr-8 text-sm"
            >
              {projects.map(p => <option key={p.id} value={p.id}>{p.key} · {p.name}</option>)}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-medium text-slate-800">{user?.name}</div>
          <div className="text-xs text-slate-500">{organizations.find(o => o.id === currentOrgId)?.role.replace(/_/g," ")}</div>
        </div>
        {user && <Avatar name={user.name} />}
        <button onClick={logout} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" title="Sair">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
