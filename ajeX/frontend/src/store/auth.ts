import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface OrgRef { id: string; name: string; slug: string; role: string; isAdmin: boolean }
export interface UserRef { id: string; email: string; name: string; avatarUrl?: string | null }

interface AuthState {
  token: string | null;
  user: UserRef | null;
  organizations: OrgRef[];
  currentOrgId: string | null;
  setSession: (data: { token: string; user: UserRef; organizations: OrgRef[] }) => void;
  setOrg: (orgId: string) => void;
  logout: () => void;
}

// Limpa estado de outras stores que pertencem ao tenant antigo.
// Importante: zustand persist mantém currentProjectId do localStorage entre orgs,
// então sem este reset o frontend continuaria enviando projectId da org errada
// (e o backend agora retorna 404, mas pioraria UX).
function resetTenantScopedStores() {
  try {
    localStorage.removeItem("ajex-project");
    // Força recarregar para limpar caches do react-query e estado em memória de outras stores.
    if (typeof window !== "undefined") {
      setTimeout(() => window.location.reload(), 0);
    }
  } catch {}
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      organizations: [],
      currentOrgId: null,
      setSession: ({ token, user, organizations }) => {
        const prevOrgId = get().currentOrgId;
        const nextOrgId = prevOrgId && organizations.some(o => o.id === prevOrgId)
          ? prevOrgId
          : organizations[0]?.id || null;
        if (prevOrgId && prevOrgId !== nextOrgId) resetTenantScopedStores();
        set({ token, user, organizations, currentOrgId: nextOrgId });
      },
      setOrg: (orgId) => {
        if (get().currentOrgId !== orgId) resetTenantScopedStores();
        set({ currentOrgId: orgId });
      },
      logout: () => {
        resetTenantScopedStores();
        set({ token: null, user: null, organizations: [], currentOrgId: null });
      },
    }),
    { name: "ajex-auth" }
  )
);

export function currentRole(): string | null {
  const { organizations, currentOrgId } = useAuth.getState();
  return organizations.find(o => o.id === currentOrgId)?.role || null;
}
