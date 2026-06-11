import { useMemo, useState } from "react";
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
} from "lucide-react";
import type { Chat } from "../types";
import { changeState } from "../services/api";

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

type TabFilter = "todos" | "no_leidos" | "bot" | "humano" | "archivados";

const TABS: { id: TabFilter; label: string; icon: typeof Bot }[] = [
  { id: "todos", label: "Todos", icon: MessageCircle },
  { id: "no_leidos", label: "No leídos", icon: CircleDot },
  { id: "bot", label: "Bot", icon: Bot },
  { id: "humano", label: "Humanos", icon: UserRoundCheck },
  { id: "archivados", label: "Archivados", icon: Archive },
];

export default function ChatSidebar({
  chats,
  selectedId,
  onSelect,
  loading,
  onRefresh,
}: ChatSidebarProps) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabFilter>("todos");

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

  const filtered = chats.filter((c) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q || c.name.toLowerCase().includes(q) || (c.phone || "").toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (tab === "archivados") return c.archived;
    if (c.archived) return false;
    if (tab === "no_leidos") return (c.unreadCount || 0) > 0;
    if (tab === "bot") return c.status === "bot";
    if (tab === "humano") return c.status === "humano" || c.status === "pausado";
    return true;
  });

  const pinned = filtered.filter((c) => c.pinned);
  const unpinned = filtered.filter((c) => !c.pinned);
  const sorted = [...pinned, ...unpinned];

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
            placeholder="Buscar nombre o teléfono"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#202c33] text-slate-100 text-[13px] rounded-full border border-transparent focus:outline-none focus:border-emerald-400/30 placeholder-slate-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto px-2 py-2 border-b border-white/5 bg-[#0b141a] scrollbar-none">
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
                    active ? "bg-emerald-400/20 text-emerald-200" : "bg-white/8 text-slate-400"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {loading && chats.length === 0 ? (
          <div className="p-6 text-center text-slate-600 text-sm">Cargando chats…</div>
        ) : sorted.length === 0 ? (
          <div className="p-6 text-center text-slate-600 text-sm">
            {tab === "archivados"
              ? "Sin chats archivados"
              : tab === "no_leidos"
                ? "Sin mensajes nuevos"
                : "Sin conversaciones"}
          </div>
        ) : (
          sorted.map((chat) => {
            const unread = (chat.unreadCount || 0) > 0;
            const selected = selectedId === chat.contactId;
            return (
              <button
                key={chat.contactId}
                onClick={() => onSelect(chat)}
                className={`group relative w-full text-left px-3 py-3 transition-colors flex items-start gap-3 ${
                  selected
                    ? "bg-[#2a3942]"
                    : unread
                      ? "bg-white/[0.02] hover:bg-white/5"
                      : "hover:bg-white/5"
                }`}
              >
                {/* Avatar */}
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
                      {chat.pinned && (
                        <Pin size={11} className="mr-1 inline text-emerald-400" />
                      )}
                      {chat.name}
                    </span>
                    <span
                      className={`shrink-0 text-[11px] ${
                        unread ? "text-emerald-400 font-medium" : "text-slate-500"
                      }`}
                    >
                      {timeAgo(chat.lastMessageTs)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p
                      className={`truncate text-[13px] ${
                        unread ? "text-slate-200" : "text-slate-500"
                      }`}
                    >
                      {chat.lastMessage || chat.phone}
                    </p>
                    {unread ? (
                      <span className="ml-2 grid min-w-5 h-5 px-1.5 place-items-center rounded-full bg-emerald-500 text-[11px] font-bold text-emerald-950">
                        {chat.unreadCount}
                      </span>
                    ) : (
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
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
