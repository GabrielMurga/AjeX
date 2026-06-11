import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { Logo } from "@/components/ui/Logo";

export function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuth(s => s.setSession);
  const [form, setForm] = useState({ name: "", email: "", password: "", organizationName: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const { data } = await api.post("/api/auth/register", form);
      setSession(data);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Erro");
    } finally { setLoading(false); }
  }

  const field =
    "w-full rounded-lg border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-brand-500 focus:bg-white/10 focus:ring-2 focus:ring-brand-500/30";
  const label = "mb-1.5 block text-sm font-medium text-white/80";

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-white p-12 lg:flex">
        <Logo size={30} light={false} />
        <div className="max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-ink-900">
            Comece a organizar<br /><span className="text-brand-500">seu time ágil.</span>
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-500">
            Crie sua organização e você se torna admin — backlog, sprints e métricas em minutos.
          </p>
        </div>
        <div aria-hidden className="pointer-events-none absolute -right-24 bottom-8 h-72 w-72 rounded-full bg-brand-500/5" />
      </div>

      <div className="flex flex-col items-center justify-center bg-ink-800 p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center lg:hidden"><Logo size={30} /></div>
          <h1 className="text-2xl font-bold text-white">Criar conta</h1>
          <p className="mt-1 text-sm text-white/50">Você se torna admin de uma nova organização.</p>
          <form onSubmit={submit} className="mt-7 space-y-4">
            <div><label className={label}>Nome</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={field} /></div>
            <div><label className={label}>Email</label><input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={field} /></div>
            <div><label className={label}>Senha</label><input required type="password" minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className={field} /></div>
            <div><label className={label}>Nome da organização</label><input required value={form.organizationName} onChange={e => setForm({ ...form, organizationName: e.target.value })} className={field} /></div>
            {error && <div className="rounded-lg bg-rose-500/15 p-2 text-sm text-rose-300">{error}</div>}
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600 disabled:opacity-60">
              {loading ? "Criando..." : "Criar conta"}
            </button>
          </form>
          <div className="mt-5 text-center text-sm text-white/60">
            Já tem conta? <Link to="/login" className="font-semibold text-brand-500 hover:text-brand-400">Entrar</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
