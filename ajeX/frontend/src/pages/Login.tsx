import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuth(s => s.setSession);
  const [email, setEmail] = useState("admin@ajex.dev");
  const [password, setPassword] = useState("ajex123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      setSession(data);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro no login");
    } finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-lg font-bold text-white">A</div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">AjeX</h1>
            <p className="text-xs text-slate-500">Agile Hub centralizado para times Scrum</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} required type="email" />
          </div>
          <div>
            <Label>Senha</Label>
            <Input value={password} onChange={e => setPassword(e.target.value)} required type="password" />
          </div>
          {error && <div className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm text-slate-500">
          Não tem conta? <Link to="/register" className="text-brand-600 hover:underline">Cadastre-se</Link>
        </div>
        <div className="mt-4 rounded bg-slate-50 p-3 text-xs text-slate-600">
          <strong>Demo:</strong> admin@ajex.dev / ajex123
        </div>
      </div>
    </div>
  );
}
