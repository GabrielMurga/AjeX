import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="mb-1 text-xl font-bold text-slate-900">Criar conta</h1>
        <p className="mb-5 text-xs text-slate-500">Você se torna admin de uma nova organização.</p>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Nome</Label><Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div><Label>Email</Label><Input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
          <div><Label>Senha</Label><Input required type="password" minLength={6} value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></div>
          <div><Label>Nome da organização</Label><Input required value={form.organizationName} onChange={e => setForm({...form, organizationName: e.target.value})} /></div>
          {error && <div className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Criando..." : "Criar conta"}</Button>
        </form>
        <div className="mt-4 text-center text-sm text-slate-500">
          Já tem conta? <Link to="/login" className="text-brand-600 hover:underline">Entrar</Link>
        </div>
      </div>
    </div>
  );
}
