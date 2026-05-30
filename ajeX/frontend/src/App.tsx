import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/store/auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/Login";
import { RegisterPage } from "@/pages/Register";
import { DashboardPage } from "@/pages/Dashboard";
import { BoardPage } from "@/pages/Board";
import { BacklogPage } from "@/pages/Backlog";
import { SprintsPage } from "@/pages/Sprints";
import { RetrosPage } from "@/pages/Retros";
import { ImpedimentsPage } from "@/pages/Impediments";
import { RoadmapPage } from "@/pages/Roadmap";
import { DiscoveryPage } from "@/pages/Discovery";
import { QAPage } from "@/pages/QA";
import { StakeholderPage } from "@/pages/Stakeholder";
import { ChatPage } from "@/pages/Chat";
import { SettingsPage } from "@/pages/Settings";

function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuth(s => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<Protected><AppLayout /></Protected>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/board" element={<BoardPage />} />
        <Route path="/backlog" element={<BacklogPage />} />
        <Route path="/sprints" element={<SprintsPage />} />
        <Route path="/retros" element={<RetrosPage />} />
        <Route path="/impediments" element={<ImpedimentsPage />} />
        <Route path="/roadmap" element={<RoadmapPage />} />
        <Route path="/discovery" element={<DiscoveryPage />} />
        <Route path="/qa" element={<QAPage />} />
        <Route path="/stakeholder" element={<StakeholderPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
