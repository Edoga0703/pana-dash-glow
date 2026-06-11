import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Bot,
  CircleDot,
  MessageCircle,
  Pin,
  PinOff,
  Search,
  UserRoundCheck,
  X,
} from "lucide-react";
import type { Chat, Message } from "../types";
import { changeState, fetchChat } from "../services/api";

interface ChatSidebarProps {
  chats: Chat[];
  selectedId: string | null;
  onSelect: (chat: Chat) => void;
  loading: boolean;
  onRefresh?: () => void;
}

function initials(name: string): string {
  if (!name || name === "Sin nombre") return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function avatarColor(seed: string): string {
  const palette = [
    "bg-emerald-600",
    "bg-sky-600",
    "bg-violet-600",
    "bg-amber-600",
    "bg-rose-600",
    "bg-teal-600",
    "bg-fuchsia-600",
    "bg-indigo-600",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const ts = typeof dateStr === "number" ? dateStr : Number(dateStr);
  const date = ts > 1e12 ? new Date(ts) : ts > 1e9 ? new Date(ts * 1000) : new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `${days} d`;
}

function snippetAround(text: string, q: string, radius = 28): { before: string; match: string; after: string } {
  if (!text) return { before: "", match: q, after: "" };
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return { before: text.slice(0, 80), match: "", after: "" };
  const start = Math.max(0, i - radius);
  const end = Math.min(text.length, i + q.length + radius);
  return {
    before: (start > 0 ? "…" : "") + text.slice(start, i),
    match: text.slice(i, i + q.length),
    after: text.slice(i + q.length, end) + (end < text.length ? "…" : ""),
  };
}

type TabFilter = "todos" | "no_leidos" | "bot" | "humano" | "archivados";

const TABS: { id: TabFilter; label: string; icon: typeof Bot }[] = [
  { id: "todos", label: "Todos", icon: MessageCircle },
  { id: "no_leidos", label: "No leídos", icon: CircleDot },
  { id: "bot", label: "Bot", icon: Bot },
  { id: "humano", label: "Humanos", icon: UserRoundCheck },
  { id: "archivados", label: "Archivados", icon: Archive },
];

interface SearchHit {
  chat: Chat;
  message: Message;
}

export default function ChatSidebar({
  chats,
  selectedId,
  onSelect,
  loading,
  onRefresh,
}: ChatSidebarProps) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabFilter>("todos");
  const [deepHits, setDeepHits] = useState<SearchHit[]>([]);
  const [deepSearching, setDeepSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<"mensajes" | "contactos">("mensajes");
  const [showModeMenu, setShowModeMenu] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const cacheRef = useRef<Map<string, Message[]>>(new Map());

  const q = search.trim();
  const isSearching = q.length >= 1;

  // Cerrar menú al click fuera
  useEffect(() => {
    if (!showModeMenu) return;
    function onClick(e: MouseEvent) {
      if (!searchBoxRef.current?.contains(e.target as Node)) setShowModeMenu(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showModeMenu]);

  const counts = useMemo(() => {
    const active = chats.filter((c) => !c.archived);
    return {
      todos: active.length,
      no_leidos: active.filter((c) => (c.unreadCount || 0) > 0).length,
      bot: active.filter((c) => c.status === "bot").length,
      humano: active.filter((c) => c.status === "humano" || c.status === "pausado").length,
      archivados: chats.filter((c) => c.archived).length,
    } as Record<TabFilter, number>;
  }, [chats]);

  // Deep search en mensajes de TODAS las conversaciones (estilo WhatsApp)
  useEffect(() => {
    if (!isSearching || q.length < 2) {
      setDeepHits([]);
      setDeepSearching(false);
      return;
    }
    let cancelled = false;
    setDeepSearching(true);
    const ql = q.toLowerCase();

    const targets = chats.filter((c) => !c.archived || tab === "archivados");

    // Lanzar fetch con concurrencia limitada
    const CONCURRENCY = 5;
    let index = 0;
    const cache = cacheRef.current;

    async function worker() {
      while (!cancelled && index < targets.length) {
        const i = index++;
        const c = targets[i];
        if (!cache.has(c.contactId)) {
          try {
            const msgs = await fetchChat(c.contactId, 1);
            cache.set(c.contactId, msgs);
          } catch {
            cache.set(c.contactId, []);
          }
        }
      }
    }

    const debounce = window.setTimeout(async () => {
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
      if (cancelled) return;

      const hits: SearchHit[] = [];
      for (const c of targets) {
        const msgs = cache.get(c.contactId) || [];
        // último mensaje (más reciente) que matchea
        let best: Message | null = null;
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i].text && msgs[i].text.toLowerCase().includes(ql)) {
            best = msgs[i];
            break;
          }
        }
        if (best) hits.push({ chat: c, message: best });
      }
      hits.sort(
        (a, b) =>
          new Date(b.message.createdAt).getTime() - new Date(a.message.createdAt).getTime(),
      );
      setDeepHits(hits);
      setDeepSearching(false);
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(debounce);
    };
  }, [q, isSearching, chats, tab]);

  // Resultados rápidos: nombre / teléfono / último mensaje
  const quickFiltered = chats.filter((c) => {
    const ql = q.toLowerCase();
    const matchSearch =
      !isSearching ||
      c.name.toLowerCase().includes(ql) ||
      (c.phone || "").toLowerCase().includes(ql) ||
      (c.lastMessage || "").toLowerCase().includes(ql);
    if (!matchSearch) return false;
    if (isSearching) return true; // en búsqueda no aplicamos tabs
    if (tab === "archivados") return c.archived;
    if (c.archived) return false;
    if (tab === "no_leidos") return (c.unreadCount || 0) > 0;
    if (tab === "bot") return c.status === "bot";
    if (tab === "humano") return c.status === "humano" || c.status === "pausado";
    return true;
  });

  const pinned = quickFiltered.filter((c) => c.pinned);
  const unpinned = quickFiltered.filter((c) => !c.pinned);
  const sorted = isSearching ? quickFiltered : [...pinned, ...unpinned];

  // Combinar resultados profundos con los rápidos en modo búsqueda
  const deepOnly = isSearching
    ? deepHits.filter((h) => !sorted.some((c) => c.contactId === h.chat.contactId))
    : [];

  async function handlePin(e: React.MouseEvent, chat: Chat) {
    e.stopPropagation();
    try {
      await changeState({
        contactId: chat.contactId,
        state: chat.pinned ? "unpin" : "pin",
        userName: "Administrador",
      });
      onRefresh?.();
    } catch {}
  }

  async function handleArchive(e: React.MouseEvent, chat: Chat) {
    e.stopPropagation();
    try {
      await changeState({
        contactId: chat.contactId,
        state: chat.archived ? "unarchive" : "archive",
        userName: "Administrador",
      });
      onRefresh?.();
    } catch {}
  }

  function renderChatRow(chat: Chat, opts?: { matchedMessage?: Message }) {
    const unread = (chat.unreadCount || 0) > 0;
    const selected = selectedId === chat.contactId;
    const preview = opts?.matchedMessage?.text || chat.lastMessage || chat.phone;
    const showSnippet = !!opts?.matchedMessage && isSearching;
    const snip = showSnippet ? snippetAround(preview, q) : null;
    const ts = opts?.matchedMessage?.createdAt || chat.lastMessageTs;

    return (
      <button
        key={chat.contactId + (opts?.matchedMessage?.id ?? "")}
        onClick={() => onSelect(chat)}
        className={`group relative w-full text-left px-3 py-3 transition-colors flex items-start gap-3 ${
          selected
            ? "bg-[#2a3942]"
            : unread
              ? "bg-white/[0.02] hover:bg-white/5"
              : "hover:bg-white/5"
        }`}
      >
        <div
          className={`relative grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold text-white ${avatarColor(
            chat.contactId || chat.name,
          )}`}
        >
          {initials(chat.name)}
          {chat.status === "bot" && (
            <span
              title="Bot activo"
              className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-emerald-500 ring-2 ring-[#0b141a]"
            >
              <Bot size={9} className="text-emerald-950" />
            </span>
          )}
          {chat.status === "humano" && (
            <span
              title="Atención humana"
              className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-amber-400 ring-2 ring-[#0b141a]"
            >
              <UserRoundCheck size={9} className="text-amber-950" />
            </span>
          )}
          {chat.status === "pausado" && (
            <span
              title="Pausado"
              className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-rose-500 ring-2 ring-[#0b141a]"
            />
          )}
        </div>

        <div className="min-w-0 flex-1 border-b border-white/5 pb-3">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className={`truncate text-[14px] ${
                unread ? "font-semibold text-white" : "font-medium text-slate-200"
              }`}
            >
              {chat.pinned && <Pin size={11} className="mr-1 inline text-emerald-400" />}
              {chat.name}
            </span>
            <span
              className={`shrink-0 text-[11px] ${
                unread ? "text-emerald-400 font-medium" : "text-slate-500"
              }`}
            >
              {timeAgo(ts)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p
              className={`truncate text-[13px] ${
                unread ? "text-slate-200" : "text-slate-400"
              }`}
            >
              {snip ? (
                <>
                  {snip.before}
                  <mark className="bg-emerald-400/30 text-emerald-100 rounded px-0.5">
                    {snip.match}
                  </mark>
                  {snip.after}
                </>
              ) : (
                preview
              )}
            </p>
            {unread && !showSnippet ? (
              <span className="ml-2 grid min-w-5 h-5 px-1.5 place-items-center rounded-full bg-emerald-500 text-[11px] font-bold text-emerald-950">
                {chat.unreadCount}
              </span>
            ) : !showSnippet ? (
              <div className="hidden group-hover:flex items-center gap-0.5">
                <button
                  onClick={(e) => handlePin(e, chat)}
                  title={chat.pinned ? "Desfijar" : "Fijar"}
                  className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-emerald-300"
                >
                  {chat.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                </button>
                <button
                  onClick={(e) => handleArchive(e, chat)}
                  title={chat.archived ? "Desarchivar" : "Archivar"}
                  className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-emerald-300"
                >
                  {chat.archived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#0b141a] border-r border-white/5">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/5 bg-[#0f1a20]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-semibold text-white tracking-tight">CuentasTupana</h2>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">CRM</span>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar nombre, teléfono o mensaje"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2 bg-[#202c33] text-slate-100 text-[13px] rounded-full border border-transparent focus:outline-none focus:border-emerald-400/30 placeholder-slate-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-500 hover:text-slate-200 hover:bg-white/5"
              title="Limpiar"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs (ocultas durante búsqueda) */}
      {!isSearching && (
        <div className="flex gap-1 overflow-x-auto px-2 py-2 border-b border-white/5 bg-[#0b141a] no-scrollbar">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            const count = counts[id];
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-full transition-colors ${
                  active
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/30"
                    : "text-slate-400 hover:text-slate-200 border border-transparent hover:bg-white/5"
                }`}
              >
                <Icon size={12} />
                {label}
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 rounded-full ${
                      active
                        ? "bg-emerald-400/20 text-emerald-200"
                        : "bg-white/8 text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {loading && chats.length === 0 ? (
          <div className="p-6 text-center text-slate-600 text-sm">Cargando chats…</div>
        ) : isSearching ? (
          <>
            {sorted.length > 0 && (
              <>
                <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wider text-slate-500">
                  Chats
                </div>
                {sorted.map((c) => renderChatRow(c))}
              </>
            )}
            {q.length >= 2 && (
              <>
                <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span>Mensajes</span>
                  {deepSearching && <span className="text-slate-600 normal-case">buscando…</span>}
                </div>
                {deepOnly.length === 0 && !deepSearching ? (
                  <div className="px-4 py-3 text-[12px] text-slate-600">
                    Sin coincidencias en mensajes
                  </div>
                ) : (
                  deepOnly.map((h) => renderChatRow(h.chat, { matchedMessage: h.message }))
                )}
              </>
            )}
            {sorted.length === 0 && q.length < 2 && (
              <div className="p-6 text-center text-slate-600 text-sm">
                Escribe 2 o más letras para buscar en mensajes
              </div>
            )}
          </>
        ) : sorted.length === 0 ? (
          <div className="p-6 text-center text-slate-600 text-sm">
            {tab === "archivados"
              ? "Sin chats archivados"
              : tab === "no_leidos"
                ? "Sin mensajes nuevos"
                : "Sin conversaciones"}
          </div>
        ) : (
          sorted.map((c) => renderChatRow(c))
        )}
      </div>
    </div>
  );
}
