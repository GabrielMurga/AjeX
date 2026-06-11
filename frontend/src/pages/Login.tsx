import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { Logo } from "@/components/ui/Logo";

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

  const field =
    "w-full rounded-lg border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-brand-500 focus:bg-white/10 focus:ring-2 focus:ring-brand-500/30";

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Esquerda — branco / marca */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-white p-12 lg:flex">
        <Logo size={30} light={false} />
        <div className="max-w-md">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Agile Hub para times Scrum
          </div>
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-ink-900">
            Todo o seu fluxo ágil,<br /><span className="text-brand-500">centralizado.</span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-500">
            Backlog, sprints, board, retrôs, impedimentos, roadmap e um assistente de IA — em uma plataforma só.
          </p>
        </div>
        <div className="flex items-center gap-6 text-xs text-slate-400">
          <span>Backlog</span><span>Sprint Board</span><span>Roadmap &amp; OKRs</span><span>IA</span>
        </div>
        <div aria-hidden className="pointer-events-none absolute -right-24 bottom-8 h-72 w-72 rounded-full bg-brand-500/5" />
      </div>

      {/* Direita — navy / formulário */}
      <div className="flex flex-col items-center justify-center bg-ink-800 p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center lg:hidden"><Logo size={30} /></div>
          <h1 className="text-2xl font-bold text-white">Bem-vindo de volta</h1>
          <p className="mt-1 text-sm text-white/50">Entre para acessar seu workspace.</p>
          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/80">Email:</label>
              <input value={email} onChange={e => setEmail(e.target.value)} required type="email" className={field} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/80">Senha:</label>
              <input value={password} onChange={e => setPassword(e.target.value)} required type="password" className={field} />
            </div>
            {error && <div className="rounded-lg bg-rose-500/15 p-2 text-sm text-rose-300">{error}</div>}
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600 disabled:opacity-60">
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
          <div className="mt-5 text-center text-sm text-white/60">
            Não tem conta? <Link to="/register" className="font-semibold text-brand-500 hover:text-brand-400">Inscreva-se</Link>
          </div>
          <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/50">
            <strong className="text-white/70">Demo:</strong> admin@ajex.dev / ajex123
          </div>
        </div>
      </div>
    </div>
  );
}
