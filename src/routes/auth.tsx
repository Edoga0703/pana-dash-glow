import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Iniciar sesión — CuentasTupana CRM" },
      { name: "description", content: "Acceso para agentes del CRM." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => setError(""), [mode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: displayName || email.split("@")[0] },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error de autenticación");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh grid place-items-center bg-[#0b141a] px-4 text-slate-100">
      <div className="w-full max-w-sm rounded-2xl border border-white/8 bg-[#11161c] p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300">
            {mode === "login" ? <LogIn size={22} /> : <UserPlus size={22} />}
          </div>
          <h1 className="text-lg font-semibold">
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta de agente"}
          </h1>
          <p className="mt-1 text-xs text-slate-500">CuentasTupana CRM</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-xs text-slate-400">Nombre visible</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej: María"
                className="w-full rounded-md bg-[#1c2026] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-400/50"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs text-slate-400">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md bg-[#1c2026] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-400/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md bg-[#1c2026] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-400/50"
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-500 text-sm font-bold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {mode === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-4 w-full text-center text-xs text-slate-400 hover:text-emerald-300"
        >
          {mode === "login"
            ? "¿No tienes cuenta? Crear cuenta"
            : "Ya tengo cuenta · Iniciar sesión"}
        </button>
      </div>
    </main>
  );
}
