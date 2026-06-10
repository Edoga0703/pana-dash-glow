import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, MessageSquareText, RefreshCw, ServerOff } from "lucide-react";
import type { Chat } from "../types";
import { fetchInbox } from "../services/api";
import { API_CONFIG, isCrmApiConfigured } from "../config/api";
import ChatSidebar from "../components/ChatSidebar";
import ChatView from "../components/ChatView";

const USER_NAME = "Administrador";

export default function Dashboard() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selected, setSelected] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadInbox = useCallback(async (silent = false) => {
    if (!isCrmApiConfigured) {
      setError("Falta configurar la conexión con n8n.");
      setLoading(false);
      return;
    }
    if (silent) setRefreshing(true);
    try {
      const data = await fetchInbox();
      if (data.ok && Array.isArray(data.chats)) {
        setChats(data.chats);
        setSelected((current) =>
          current
            ? data.chats.find((chat) => chat.contactId === current.contactId) || current
            : current,
        );
      }
      setError("");
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "No se pudo conectar con el Mini CRM");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);
  useEffect(() => {
    const timer = window.setInterval(() => loadInbox(true), API_CONFIG.pollingInterval);
    return () => window.clearInterval(timer);
  }, [loadInbox]);

  return (
    <main className="h-dvh overflow-hidden bg-[#0d1015] text-slate-100">
      <div className="grid h-full min-h-0 md:grid-cols-[360px_minmax(0,1fr)]">
        <div className={`${selected ? "hidden md:block" : "block"} min-h-0`}>
          <ChatSidebar
            chats={chats}
            selectedId={selected?.contactId || null}
            onSelect={setSelected}
            loading={loading}
          />
        </div>

        <div className={`${selected ? "flex" : "hidden md:flex"} min-h-0 min-w-0 flex-col`}>
          {selected ? (
            <>
              <button
                onClick={() => setSelected(null)}
                className="flex h-11 items-center gap-2 border-b border-white/8 bg-[#11141a] px-4 text-xs text-slate-400 md:hidden"
              >
                <ArrowLeft size={15} /> Conversaciones
              </button>
              <div className="min-h-0 flex-1">
                <ChatView
                  chat={selected}
                  userName={USER_NAME}
                  onStateChanged={() => loadInbox(true)}
                />
              </div>
            </>
          ) : (
            <section className="relative grid h-full place-items-center overflow-hidden">
              <button
                onClick={() => loadInbox(true)}
                className="absolute right-5 top-5 grid size-9 place-items-center rounded-md border border-white/10 text-slate-500 hover:bg-white/5 hover:text-slate-300"
                title="Actualizar bandeja"
              >
                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              </button>
              <div className="max-w-sm px-6 text-center">
                <div className="mx-auto mb-4 grid size-14 place-items-center rounded-md border border-cyan-300/15 bg-cyan-400/10 text-cyan-300">
                  {error ? <ServerOff size={25} /> : <MessageSquareText size={25} />}
                </div>
                <h2 className="text-lg font-semibold text-white">
                  {error ? "Conexión pendiente" : "Centro de conversaciones"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {error ||
                    "Selecciona un chat para consultar el historial y responder desde el CRM."}
                </p>
                {error && (
                  <button
                    onClick={() => loadInbox()}
                    className="mt-5 h-9 rounded-md bg-cyan-400 px-4 text-xs font-bold text-slate-950"
                  >
                    Intentar nuevamente
                  </button>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
