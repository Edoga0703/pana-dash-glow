import { useState, useEffect, useCallback } from 'react';
import type { Chat } from '../types';
import { fetchInbox } from '../services/api';
import { API_CONFIG } from '../config/api';
import ChatSidebar from '../components/ChatSidebar';
import ChatView from '../components/ChatView';

const USER_NAME = 'Administrador';

export default function Dashboard() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selected, setSelected] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadInbox = useCallback(async () => {
    try {
      const data = await fetchInbox();
      if (data.ok && Array.isArray(data.chats)) {
        setChats(data.chats);
        // Actualizar el chat seleccionado si existe
        if (selected) {
          const updated = data.chats.find((c) => c.contactId === selected.contactId);
          if (updated) setSelected(updated);
        }
      }
      setError('');
    } catch (err: any) {
      setError(err.message || 'Error al cargar inbox');
    } finally {
      setLoading(false);
    }
  }, [selected]);

  // Carga inicial
  useEffect(() => {
    loadInbox();
  }, []);

  // Polling automatico
  useEffect(() => {
    const interval = setInterval(loadInbox, API_CONFIG.pollingInterval);
    return () => clearInterval(interval);
  }, [loadInbox]);

  function handleSelect(chat: Chat) {
    setSelected(chat);
  }

  function handleStateChanged() {
    loadInbox();
  }

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      {/* Sidebar */}
      <div className="w-80 shrink-0 hidden md:flex flex-col">
        <ChatSidebar
          chats={chats}
          selectedId={selected?.contactId || null}
          onSelect={handleSelect}
          loading={loading}
        />
      </div>

      {/* Mobile sidebar toggle + sidebar */}
      <div className={`md:hidden absolute inset-0 z-20 ${selected ? 'hidden' : 'flex'}`}>
        <div className="w-full">
          <ChatSidebar
            chats={chats}
            selectedId={null}
            onSelect={handleSelect}
            loading={loading}
          />
        </div>
      </div>

      {/* Chat view */}
      <div className="flex-1 flex flex-col">
        {error && !selected && (
          <div className="p-4 bg-red-900/30 text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        {selected ? (
          <>
            {/* Boton volver en mobile */}
            <button
              onClick={() => setSelected(null)}
              className="md:hidden px-3 py-2 bg-gray-900 border-b border-gray-800 text-gray-400 text-sm hover:text-white"
            >
              ← Volver a chats
            </button>
            <ChatView
              chat={selected}
              userName={USER_NAME}
              onStateChanged={handleStateChanged}
            />
          </>
        ) : (
          <div className="flex-1 hidden md:flex items-center justify-center">
            <div className="text-center text-gray-600">
              <p className="text-4xl mb-3">💬</p>
              <p className="text-lg font-medium">CuentasTupana CRM</p>
              <p className="text-sm mt-1">Selecciona una conversacion para comenzar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
