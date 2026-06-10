import { useMemo, useState } from "react";
import { Bot, CircleUserRound, MessageSquareText, Search } from "lucide-react";
import type { Chat } from "../types";

interface ChatSidebarProps {
  chats: Chat[];
  selectedId: string | null;
  onSelect: (chat: Chat) => void;
  loading: boolean;
}

type Filter = "todos" | "no_leidos" | "humano";

const statusLabel = { bot: "Bot activo", humano: "En atención", pausado: "Pausado" };
const statusClass = {
  bot: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  humano: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  pausado: "border-rose-400/25 bg-rose-400/10 text-rose-200",
};

function timeAgo(value: string | null): string {
  if (!value) return "";
  const timestamp = /^\d+$/.test(value) ? Number(value) : new Date(value).getTime();
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} h`;
  return `${Math.floor(minutes / 1440)} d`;
}

export default function ChatSidebar({ chats, selectedId, onSelect, loading }: ChatSidebarProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return chats.filter((chat) => {
      const matchesSearch =
        !query || chat.name.toLowerCase().includes(query) || chat.phone.includes(query);
      const matchesFilter =
        filter === "todos" ||
        (filter === "no_leidos" && chat.unreadCount > 0) ||
        (filter === "humano" && chat.status !== "bot");
      return matchesSearch && matchesFilter;
    });
  }, [chats, filter, search]);

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-white/8 bg-[#11141a]">
      <header className="border-b border-white/8 px-4 pb-3 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-md bg-cyan-400/12 text-cyan-300">
              <MessageSquareText size={19} />
            </div>
            <div>
              <h1 className="text-base font-semibold text-white">CuentasTupana</h1>
              <p className="text-xs text-slate-500">Centro de atención</p>
            </div>
          </div>
          <span className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-400">
            {chats.length}
          </span>
        </div>

        <label className="flex h-10 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 focus-within:border-cyan-400/40">
          <Search size={16} className="text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar nombre o teléfono"
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
          />
        </label>

        <div className="mt-3 grid grid-cols-3 gap-1 rounded-md bg-black/20 p-1">
          {(
            [
              ["todos", "Todos"],
              ["no_leidos", "No leídos"],
              ["humano", "Atención"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`h-8 rounded text-xs font-medium transition-colors ${
                filter === value ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && chats.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">Cargando conversaciones...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">No hay conversaciones aquí.</div>
        ) : (
          filtered.map((chat) => (
            <button
              key={chat.contactId}
              onClick={() => onSelect(chat)}
              className={`grid w-full grid-cols-[40px_minmax(0,1fr)_auto] gap-3 border-b border-white/[0.05] px-4 py-3 text-left transition-colors ${
                selectedId === chat.contactId ? "bg-cyan-400/[0.08]" : "hover:bg-white/[0.035]"
              }`}
            >
              <div className="grid size-10 place-items-center rounded-full bg-slate-800 text-slate-300">
                {chat.status === "bot" ? <Bot size={18} /> : <CircleUserRound size={19} />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-slate-100">{chat.name}</span>
                  <span
                    className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] ${statusClass[chat.status]}`}
                  >
                    {statusLabel[chat.status]}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {chat.lastMessage || "Sin vista previa"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-[10px] text-slate-600">{timeAgo(chat.lastMessageTs)}</span>
                {chat.unreadCount > 0 && (
                  <span className="grid min-w-5 place-items-center rounded-full bg-cyan-400 px-1.5 text-[10px] font-bold text-slate-950">
                    {chat.unreadCount}
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
