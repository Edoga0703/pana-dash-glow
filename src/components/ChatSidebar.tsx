import { useState } from 'react';
import type { Chat } from '../types';

interface ChatSidebarProps {
  chats: Chat[];
  selectedId: string | null;
  onSelect: (chat: Chat) => void;
  loading: boolean;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    bot: 'bg-emerald-500',
    humano: 'bg-amber-500',
    pausado: 'bg-red-500',
  };
  const labels: Record<string, string> = {
    bot: 'Bot',
    humano: 'Humano',
    pausado: 'Pausado',
  };
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${colors[status] || 'bg-gray-500'} text-white`}>
      {labels[status] || status}
    </span>
  );
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default function ChatSidebar({ chats, selectedId, onSelect, loading }: ChatSidebarProps) {
  const [search, setSearch] = useState('');

  const filtered = chats.filter((c) => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.phone || '').includes(q);
  });

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800">
      {/* Header */}
      <div className="p-3 border-b border-gray-800">
        <h2 className="text-lg font-bold text-white mb-2">CuentasTupana</h2>
        <input
          type="text"
          placeholder="Buscar chat..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 text-gray-200 text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-emerald-500 placeholder-gray-500"
        />
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {loading && chats.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">Cargando chats...</div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">Sin conversaciones</div>
        ) : (
          filtered.map((chat) => (
            <button
              key={chat.contactId}
              onClick={() => onSelect(chat)}
              className={`w-full text-left px-3 py-3 border-b border-gray-800/50 transition-colors ${
                selectedId === chat.contactId
                  ? 'bg-gray-800'
                  : 'hover:bg-gray-800/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">{chat.name}</span>
                    <StatusBadge status={chat.status} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{chat.phone}</p>
                  <p className="text-xs text-gray-500 mt-1 truncate">{chat.lastMessage}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] text-gray-500">{timeAgo(chat.lastMessageTs)}</span>
                  {chat.unreadCount > 0 && (
                    <span className="bg-emerald-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
