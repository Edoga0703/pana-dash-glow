import { useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Bot,
  Inbox,
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

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; label: string }> = {
    bot: { bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", label: "Bot" },
    humano: { bg: "bg-amber-500/20 text-amber-300 border-amber-500/30", label: "Humano" },
    pausado: { bg: "bg-red-500/20 text-red-300 border-red-500/30", label: "Pausado" },
  };
  const c = config[status] || { bg: "bg-gray-500/20 text-gray-300 border-gray-500/30", label: status };
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${c.bg}`}>
      {c.label}
    </span>
  );
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const ts = typeof dateStr === "number" ? dateStr : Number(dateStr);
  const date = ts > 1e12 ? new Date(ts) : ts > 1e9 ? new Date(ts * 1000) : new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

type TabFilter = "activos" | "archivados";

export default function ChatSidebar({ chats, selectedId, onSelect, loading, onRefresh }: ChatSidebarProps) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabFilter>("activos");

  const filtered = chats.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = c.name.toLowerCase().includes(q) || (c.phone || "").includes(q);
    const matchTab = tab === "archivados" ? c.archived : !c.archived;
    return matchSearch && matchTab;
  });

  // Separar fijados arriba
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
    <div className="flex h-full flex-col bg-[#0d1015] border-r border-white/8">
      {/* Header */}
      <div className="p-3 border-b border-white/8">
        <h2 className="text-base font-bold text-white mb-2">CuentasTupana</h2>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar chat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-black/30 text-slate-200 text-sm rounded-md border border-white/10 focus:outline-none focus:border-cyan-500/40 placeholder-slate-600"
          />
        </div>
        {/* Tabs */}
        <div className="flex mt-2 gap-1">
          <button
            onClick={() => setTab("activos")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
              tab === "activos"
                ? "bg-cyan-500/15 text-cyan-300 border border-cyan-400/30"
                : "text-slate-500 hover:text-slate-300 border border-transparent"
            }`}
          >
            <Inbox size={13} /> Activos
          </button>
          <button
            onClick={() => setTab("archivados")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
              tab === "archivados"
                ? "bg-cyan-500/15 text-cyan-300 border border-cyan-400/30"
                : "text-slate-500 hover:text-slate-300 border border-transparent"
            }`}
          >
            <Archive size={13} /> Archivados
          </button>
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {loading && chats.length === 0 ? (
          <div className="p-4 text-center text-slate-600 text-sm">Cargando chats...</div>
        ) : sorted.length === 0 ? (
          <div className="p-4 text-center text-slate-600 text-sm">
            {tab === "archivados" ? "Sin chats archivados" : "Sin conversaciones"}
          </div>
        ) : (
          sorted.map((chat) => (
            <button
              key={chat.contactId}
              onClick={() => onSelect(chat)}
              className={`group w-full text-left px-3 py-3 border-b border-white/5 transition-colors ${
                selectedId === chat.contactId
                  ? "bg-cyan-500/10 border-l-2 border-l-cyan-400"
                  : "hover:bg-white/5 border-l-2 border-l-transparent"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {chat.pinned && <Pin size={11} className="text-cyan-400 shrink-0" />}
                    <span className="text-sm font-medium text-white truncate">{chat.name}</span>
                    <StatusBadge status={chat.status} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{chat.phone}</p>
                  <p className="text-xs text-slate-600 mt-1 truncate">{chat.lastMessage}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] text-slate-600">{timeAgo(chat.lastMessageTs)}</span>
                  {chat.unreadCount > 0 && (
                    <span className="bg-cyan-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {chat.unreadCount}
                    </span>
                  )}
                  {/* Acciones hover */}
                  <div className="hidden group-hover:flex items-center gap-1 mt-1">
                    <button
                      onClick={(e) => handlePin(e, chat)}
                      title={chat.pinned ? "Desfijar" : "Fijar"}
                      className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-cyan-300"
                    >
                      {chat.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                    </button>
                    <button
                      onClick={(e) => handleArchive(e, chat)}
                      title={chat.archived ? "Desarchivar" : "Archivar"}
                      className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-cyan-300"
                    >
                      {chat.archived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
                    </button>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
