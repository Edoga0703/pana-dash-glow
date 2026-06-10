import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, Bot, Clock, DollarSign, Film, Power, RefreshCcw, Save,
  Tv, PlayCircle, Sparkles, Crown, Zap, MessageSquareOff, Phone,
  Terminal, AlertTriangle, AlertCircle, Info,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { api, isApiConfigured } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pana Bot — Admin Dashboard" },
      { name: "description", content: "Panel premium de administración del bot de WhatsApp de CuentasTupana." },
    ],
  }),
  component: Dashboard,
});

// ---------- types ----------
type ServiceKey = "netflix" | "crunchyroll" | "prime" | "max" | "disney" | "paramount";
interface ServiceMeta { key: ServiceKey; name: string; tag: string; icon: typeof Film; accent: string; }
interface PausedChat { id: string; name: string; phone: string; reason: string; pausedAt: string; }
interface LogEntry { level: "INFO" | "WARN" | "ERROR"; message: string; timestamp: string; }

const SERVICES: ServiceMeta[] = [
  { key: "netflix",     name: "Netflix",     tag: "4K UHD",     icon: Film,       accent: "from-red-500/30 to-red-700/10" },
  { key: "crunchyroll", name: "Crunchyroll", tag: "Anime",      icon: Sparkles,   accent: "from-orange-400/30 to-amber-600/10" },
  { key: "prime",       name: "Prime Video", tag: "Amazon",     icon: PlayCircle, accent: "from-sky-400/30 to-blue-700/10" },
  { key: "max",         name: "Max",         tag: "HBO",        icon: Crown,      accent: "from-violet-500/30 to-purple-800/10" },
  { key: "disney",      name: "Disney+",     tag: "Familiar",   icon: Tv,         accent: "from-blue-400/30 to-indigo-700/10" },
  { key: "paramount",   name: "Paramount+",  tag: "Películas",  icon: Zap,        accent: "from-cyan-400/30 to-teal-700/10" },
];

// ---------- mock fallbacks (cuando no hay API configurada) ----------
const mockPaused: PausedChat[] = [
  { id: "1", name: "María González",  phone: "+58 412 555 1234", reason: "Solicitó hablar con humano",   pausedAt: "Hace 12 min" },
  { id: "2", name: "Carlos Pérez",    phone: "+58 414 555 9876", reason: "Reclamo de cuenta inactiva",   pausedAt: "Hace 47 min" },
  { id: "3", name: "Andrea Rodríguez",phone: "+58 424 555 5544", reason: "Pago pendiente verificación",  pausedAt: "Hace 1 h 20 min" },
  { id: "4", name: "Luis Hernández",  phone: "+58 416 555 2200", reason: "Cliente solicitó factura",     pausedAt: "Hace 2 h" },
];
const mockLogs: LogEntry[] = [
  { level: "INFO",  timestamp: "10:42:11", message: "Bot iniciado correctamente — sesión WhatsApp activa" },
  { level: "INFO",  timestamp: "10:42:34", message: "Webhook n8n conectado · pid 4821" },
  { level: "INFO",  timestamp: "10:43:02", message: "Nuevo mensaje recibido de +584125551234" },
  { level: "WARN",  timestamp: "10:43:18", message: "Tasa de cambio actualizada manualmente: 36.50 → 36.80" },
  { level: "INFO",  timestamp: "10:44:05", message: "Venta confirmada: Netflix 4K · Bs 1.104,00" },
  { level: "ERROR", timestamp: "10:44:51", message: "Timeout consultando inventario de Disney+ (reintento 2/3)" },
  { level: "INFO",  timestamp: "10:45:09", message: "Reintento exitoso — inventario actualizado" },
  { level: "WARN",  timestamp: "10:46:22", message: "Chat pausado: cliente solicitó humano" },
];

// ============================================================
function Dashboard() {
  return (
    <div className="min-h-screen px-4 py-6 md:px-10 md:py-10">
      <Toaster theme="dark" position="top-right" />
      <Header />
      <main className="mx-auto mt-8 max-w-7xl space-y-8">
        <ControlPanel />
        <DashboardTabs />
        <Footer />
      </main>
    </div>
  );
}

// ---------- Header ----------
function Header() {
  return (
    <header className="mx-auto flex max-w-7xl items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="relative grid h-12 w-12 place-items-center rounded-2xl glass glow-violet">
          <Bot className="h-6 w-6 text-[var(--neon-violet)]" />
          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[var(--success)] pulse-dot" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            <span className="text-gradient">Pana Bot</span>
            <span className="ml-2 text-sm font-normal text-muted-foreground">/ admin</span>
          </h1>
          <p className="text-xs text-muted-foreground">CuentasTupana · Streaming Sales WhatsApp Bot</p>
        </div>
      </div>
      <div className="hidden items-center gap-2 rounded-full glass px-4 py-2 text-xs md:flex">
        <Activity className="h-3.5 w-3.5 text-[var(--neon-cyan)]" />
        <span className="text-muted-foreground">Estado:</span>
        <span className="font-semibold text-[var(--success)]">Operativo</span>
        <span className="ml-2 text-muted-foreground">
          {isApiConfigured() ? "· API conectada" : "· modo demo"}
        </span>
      </div>
    </header>
  );
}

// ---------- Control Panel ----------
function ControlPanel() {
  const [exchangeRate, setExchangeRate] = useState<string>("36.80");
  const [botActive, setBotActive] = useState(true);
  const [delayMin, setDelayMin] = useState<string>("3");
  const [delayMax, setDelayMax] = useState<string>("8");
  const [buffer, setBuffer] = useState<string>("2");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isApiConfigured()) return;
    api.getSettings()
      .then((s) => {
        setExchangeRate(String(s.exchangeRate));
        setBotActive(s.botActive);
        setDelayMin(String(s.delayMin));
        setDelayMax(String(s.delayMax));
        setBuffer(String(s.bufferMinutes));
      })
      .catch(() => {/* silencio: usar defaults */});
  }, []);

  const saveRate = async () => {
    setSaving(true);
    try {
      if (isApiConfigured()) await api.saveSettings({ exchangeRate: Number(exchangeRate) });
      toast.success(`Tasa actualizada a Bs ${exchangeRate} / $`);
    } catch (e) {
      toast.error("No se pudo guardar la tasa");
    } finally { setSaving(false); }
  };

  const toggleBot = async (v: boolean) => {
    setBotActive(v);
    try {
      if (isApiConfigured()) await api.saveSettings({ botActive: v });
      toast(v ? "Bot activado" : "Bot silenciado", { description: v ? "Pana Bot responderá mensajes" : "Mensajes en cola sin responder" });
    } catch { toast.error("Error al cambiar estado"); }
  };

  const saveDelays = async () => {
    try {
      if (isApiConfigured()) await api.saveSettings({ delayMin: Number(delayMin), delayMax: Number(delayMax), bufferMinutes: Number(buffer) });
      toast.success("Retrasos y buffer guardados");
    } catch { toast.error("Error al guardar"); }
  };

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-12">
      {/* Tasa de cambio */}
      <div className="glass rounded-2xl p-5 md:col-span-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <DollarSign className="h-4 w-4 text-[var(--neon-cyan)]" />
          Tasa de cambio
        </div>
        <div className="mt-3 flex items-end gap-3">
          <div className="flex-1">
            <div className="text-[11px] text-muted-foreground">Bs por USD</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xl font-semibold text-muted-foreground">Bs</span>
              <Input
                type="number" step="0.01" inputMode="decimal"
                value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)}
                className="h-12 border-white/10 bg-white/5 text-2xl font-bold focus-visible:ring-[var(--neon-violet)]"
              />
              <span className="text-sm text-muted-foreground">/ $</span>
            </div>
          </div>
          <Button onClick={saveRate} disabled={saving}
            className="h-12 bg-gradient-vc font-semibold text-[oklch(0.12_0.02_270)] hover:opacity-90 glow-violet">
            <Save className="mr-2 h-4 w-4" />Guardar
          </Button>
        </div>
      </div>

      {/* Estado bot */}
      <div className="glass rounded-2xl p-5 md:col-span-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Power className="h-4 w-4 text-[var(--neon-violet)]" />
          Estado del bot
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <div className={`text-2xl font-bold ${botActive ? "text-[var(--success)]" : "text-[var(--warning)]"}`}>
              {botActive ? "Activo" : "Silenciado"}
            </div>
            <div className="text-xs text-muted-foreground">
              {botActive ? "Respondiendo en tiempo real" : "No responde mensajes"}
            </div>
          </div>
          <Switch checked={botActive} onCheckedChange={toggleBot}
            className="scale-125 data-[state=checked]:bg-[var(--neon-violet)]" />
        </div>
      </div>

      {/* Delays + buffer */}
      <div className="glass rounded-2xl p-5 md:col-span-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <Clock className="h-4 w-4 text-[var(--neon-cyan)]" />
          Retraso & Buffer
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Field label="Min (s)"     value={delayMin} onChange={setDelayMin} />
          <Field label="Max (s)"     value={delayMax} onChange={setDelayMax} />
          <Field label="Buffer (m)"  value={buffer}   onChange={setBuffer} />
        </div>
        <Button onClick={saveDelays} variant="outline"
          className="mt-3 w-full border-white/10 bg-white/5 hover:bg-white/10">
          <Save className="mr-2 h-4 w-4" />Guardar ajustes
        </Button>
      </div>
    </section>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <Input type="number" value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 border-white/10 bg-white/5 text-center font-mono text-base focus-visible:ring-[var(--neon-cyan)]" />
    </label>
  );
}

// ---------- Tabs ----------
function DashboardTabs() {
  return (
    <Tabs defaultValue="inventory" className="w-full">
      <TabsList className="glass h-12 w-full justify-start gap-1 rounded-2xl p-1.5">
        <TabTrigger value="inventory" label="Gestión de Inventario" />
        <TabTrigger value="paused"    label="Chats Pausados" />
        <TabTrigger value="logs"      label="Logs del Sistema" />
      </TabsList>

      <TabsContent value="inventory" className="mt-5 animate-[fade-in_0.35s_ease-out]">
        <InventoryTab />
      </TabsContent>
      <TabsContent value="paused" className="mt-5 animate-[fade-in_0.35s_ease-out]">
        <PausedTab />
      </TabsContent>
      <TabsContent value="logs" className="mt-5 animate-[fade-in_0.35s_ease-out]">
        <LogsTab />
      </TabsContent>
    </Tabs>
  );
}

function TabTrigger({ value, label }: { value: string; label: string }) {
  return (
    <TabsTrigger value={value}
      className="rounded-xl px-4 text-sm font-medium text-muted-foreground transition-all data-[state=active]:bg-gradient-vc data-[state=active]:text-[oklch(0.12_0.02_270)] data-[state=active]:shadow-[var(--shadow-glow-violet)]">
      {label}
    </TabsTrigger>
  );
}

// ---------- Inventory ----------
function InventoryTab() {
  const [stock, setStock] = useState<Record<ServiceKey, boolean>>({
    netflix: true, crunchyroll: true, prime: true, max: false, disney: true, paramount: false,
  });

  useEffect(() => {
    if (!isApiConfigured()) return;
    api.getInventory().then((data) => {
      setStock((prev) => ({ ...prev, ...(data as Record<ServiceKey, boolean>) }));
    }).catch(() => {});
  }, []);

  const toggle = async (key: ServiceKey, v: boolean) => {
    setStock((s) => ({ ...s, [key]: v }));
    try {
      if (isApiConfigured()) await api.setInventory(key, v);
      toast.success(`${SERVICES.find(s => s.key === key)?.name}: ${v ? "Disponible" : "Agotado"}`);
    } catch { toast.error("Error al actualizar inventario"); }
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {SERVICES.map(({ key, name, tag, icon: Icon, accent }) => {
        const available = stock[key];
        return (
          <div key={key}
            className={`group relative overflow-hidden rounded-2xl glass p-5 transition-all hover:-translate-y-0.5 hover:glow-violet`}>
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} opacity-60`} />
            <div className="relative flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/5 ring-1 ring-white/10">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-base font-semibold">{name}</div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{tag}</div>
                </div>
              </div>
              <Badge variant="outline"
                className={`border-white/10 ${available ? "bg-[var(--success)]/15 text-[var(--success)]" : "bg-[var(--warning)]/15 text-[var(--warning)]"}`}>
                {available ? "Disponible" : "Agotado"}
              </Badge>
            </div>

            <div className="relative mt-5 flex items-center justify-between rounded-xl bg-black/30 p-3 ring-1 ring-white/5">
              <span className="text-xs text-muted-foreground">Estado en bot</span>
              <Switch checked={available} onCheckedChange={(v) => toggle(key, v)}
                className="data-[state=checked]:bg-[var(--neon-cyan)]" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Paused ----------
function PausedTab() {
  const [rows, setRows] = useState<PausedChat[]>(mockPaused);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isApiConfigured()) return;
    setLoading(true);
    api.getPausedChats().then(setRows).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const resume = async (id: string) => {
    try {
      if (isApiConfigured()) await api.resumeChat(id);
      setRows((r) => r.filter((x) => x.id !== id));
      toast.success("Chat reactivado");
    } catch { toast.error("No se pudo reactivar"); }
  };

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <MessageSquareOff className="h-4 w-4 text-[var(--neon-violet)]" />
          <h3 className="text-sm font-semibold uppercase tracking-wider">Chats pausados</h3>
          <Badge className="bg-white/5 text-muted-foreground ring-1 ring-white/10">{rows.length}</Badge>
        </div>
        {loading && <span className="text-xs text-muted-foreground">Cargando…</span>}
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-muted-foreground">Cliente</TableHead>
              <TableHead className="text-muted-foreground">Motivo</TableHead>
              <TableHead className="text-muted-foreground">Teléfono</TableHead>
              <TableHead className="text-muted-foreground">Pausado</TableHead>
              <TableHead className="text-right text-muted-foreground">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                No hay chats pausados ✨
              </TableCell></TableRow>
            )}
            {rows.map((c) => (
              <TableRow key={c.id} className="border-white/5 transition-colors hover:bg-white/5">
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.reason}</TableCell>
                <TableCell className="font-mono text-xs">
                  <span className="inline-flex items-center gap-1.5"><Phone className="h-3 w-3 text-[var(--neon-cyan)]" />{c.phone}</span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{c.pausedAt}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" onClick={() => resume(c.id)}
                    className="bg-gradient-to-r from-orange-500 to-red-500 font-semibold text-white shadow-[0_0_20px_-5px_oklch(0.65_0.24_30/0.7)] hover:opacity-90">
                    Reactivar chat
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------- Logs ----------
function LogsTab() {
  const [logs, setLogs] = useState<LogEntry[]>(mockLogs);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      if (isApiConfigured()) {
        const data = await api.getLogs();
        setLogs(data);
      } else {
        // demo: añade log
        setLogs((l) => [...l, {
          level: "INFO",
          timestamp: new Date().toLocaleTimeString("es-VE", { hour12: false }),
          message: "Refresh manual ejecutado · sin API configurada (modo demo)",
        }]);
      }
      toast.success("Logs actualizados");
    } catch { toast.error("No se pudieron cargar los logs"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [logs]);

  const lvl = useMemo(() => ({
    INFO:  { color: "text-[var(--neon-cyan)]",  Icon: Info },
    WARN:  { color: "text-[var(--warning)]",    Icon: AlertTriangle },
    ERROR: { color: "text-[var(--destructive)]",Icon: AlertCircle },
  }), []);

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
          </span>
          <Terminal className="ml-2 h-4 w-4 text-[var(--neon-violet)]" />
          <span className="font-mono text-xs text-muted-foreground">panabot@cuentastupana ~ system.logs</span>
        </div>
        <Button size="sm" variant="outline" onClick={refresh} disabled={loading}
          className="border-white/10 bg-white/5 hover:bg-white/10">
          <RefreshCcw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refrescar
        </Button>
      </div>
      <div ref={scrollRef}
        className="max-h-[480px] overflow-y-auto bg-black/60 p-4 font-mono text-[12.5px] leading-relaxed">
        {logs.map((l, i) => {
          const { color, Icon } = lvl[l.level];
          return (
            <div key={i} className="flex items-start gap-3 py-1 hover:bg-white/[0.03]">
              <span className="text-muted-foreground/70">{l.timestamp}</span>
              <span className={`inline-flex w-16 items-center gap-1 font-semibold ${color}`}>
                <Icon className="h-3 w-3" />{l.level}
              </span>
              <span className="flex-1 text-zinc-200">{l.message}</span>
            </div>
          );
        })}
        <div className="mt-2 flex items-center gap-2 text-[var(--neon-cyan)]">
          <span>$</span>
          <span className="inline-block h-4 w-2 animate-pulse bg-[var(--neon-cyan)]" />
        </div>
      </div>
    </div>
  );
}

// ---------- Footer ----------
function Footer() {
  return (
    <footer className="pt-2 text-center text-xs text-muted-foreground">
      <span className="text-gradient font-semibold">Pana Bot</span> · CuentasTupana © {new Date().getFullYear()}
      {" · "}
      {isApiConfigured()
        ? <>API: <code className="font-mono">{import.meta.env.VITE_API_BASE_URL as string}</code></>
        : <>Configura <code className="font-mono">VITE_API_BASE_URL</code> para conectar a tu n8n</>}
    </footer>
  );
}
