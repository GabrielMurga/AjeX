import { Outlet } from "react-router-dom";
import { AppHeader } from "./AppHeader";
import { NavTabs } from "./NavTabs";

/**
 * Layout principal AjeX — chrome navy no topo (duas barras) + conteúdo claro.
 * Substitui o antigo layout com Sidebar à esquerda.
 * Os arquivos Sidebar.tsx e Topbar.tsx podem ser removidos.
 */
export function AppLayout() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#FAFAFA]">
      <AppHeader />
      <NavTabs />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-[1400px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
