import { useState, useEffect, useRef } from 'react';
import type { Chat, Message } from '../types';
import { fetchChat, sendMessage, changeState } from '../services/api';

interface ChatViewProps {
  chat: Chat;
  userName: string;
  onStateChanged?: () => void;
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Hoy';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function groupByDate(messages: Message[]): { date: string; messages: Message[] }[] {
  const groups: Record<string, Message[]> = {};
  for (const msg of messages) {
    const key = formatDate(msg.createdAt);
    if (!groups[key]) groups[key] = [];
    groups[key].push(msg);
  }
  return Object.entries(groups).map(([date, messages]) => ({ date, messages }));
}

function MessageBubble({ msg }: { msg: Message }) {
  const isClient = msg.role === 'user';
  const isHuman = msg.senderType === 'human';

  return (
    <div className={`flex ${isClient ? 'justify-start' : 'justify-end'} mb-2`}>
      <div
        className={`max-w-[75%] rounded-xl px-3 py-2 ${
          isClient
            ? 'bg-gray-700 text-gray-100'
            : isHuman
            ? 'bg-amber-700 text-white'
            : 'bg-emerald-700 text-white'
        }`}
      >
        {!isClient && (
          <p className="text-[10px] font-medium opacity-70 mb-0.5">
            {isHuman ? 'Admin' : 'Pana Bot'}
          </p>
        )}
        <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
        {msg.mediaUrl && (
          <a
            href={msg.mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs underline opacity-80 mt-1 block"
          >
            Ver adjunto
          </a>
        )}
        <p className={`text-[10px] mt-1 text-right ${isClient ? 'text-gray-400' : 'opacity-60'}`}>
          {formatTime(msg.createdAt)}
        </p>
      </div>
    </div>
  );
}

export default function ChatView({ chat, userName, onStateChanged }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Cargar mensajes al seleccionar chat
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    setError('');

    fetchChat(chat.contactId)
      .then((msgs) => {
        if (!cancelled) {
          // La API devuelve DESC, revertir a ASC
          setMessages([...msgs].reverse());
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [chat.contactId]);

  // Scroll al fondo cuando llegan mensajes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Enviar mensaje
  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError('');

    try {
      await sendMessage({
        contactId: chat.contactId,
        text: trimmed,
        userName,
      });

      // Agregar mensaje local inmediatamente
      const localMsg: Message = {
        id: `local-${Date.now()}`,
        role: 'assistant',
        text: trimmed,
        createdAt: new Date().toISOString(),
        senderType: 'human',
        isRead: true,
      };
      setMessages((prev) => [...prev, localMsg]);
      setText('');
      inputRef.current?.focus();
    } catch (err: any) {
      setError(err.message || 'Error al enviar');
    } finally {
      setSending(false);
    }
  }

  // Cambiar estado
  async function handleChangeState(state: 'bot' | 'humano' | 'pausado') {
    try {
      await changeState({ contactId: chat.contactId, state, userName });
      onStateChanged?.();
    } catch (err: any) {
      setError(err.message || 'Error al cambiar estado');
    }
  }

  // Enter para enviar, Shift+Enter para nueva linea
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const grouped = groupByDate(messages);

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header del chat */}
      <div className="px-4 py-3 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold">{chat.name}</h3>
          <p className="text-xs text-gray-400">{chat.phone}</p>
        </div>
        <div className="flex gap-2">
          {chat.status !== 'humano' && (
            <button
              onClick={() => handleChangeState('humano')}
              className="text-xs px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors"
            >
              Tomar chat
            </button>
          )}
          {chat.status !== 'bot' && (
            <button
              onClick={() => handleChangeState('bot')}
              className="text-xs px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
            >
              Reactivar bot
            </button>
          )}
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="text-center text-gray-500 text-sm mt-8">Cargando mensajes...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm mt-8">Sin mensajes</div>
        ) : (
          grouped.map((group) => (
            <div key={group.date}>
              <div className="flex justify-center my-3">
                <span className="text-[11px] text-gray-500 bg-gray-800/50 px-3 py-1 rounded-full">
                  {group.date}
                </span>
              </div>
              {group.messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-900/50 text-red-300 text-xs">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-gray-800 bg-gray-900">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            rows={1}
            className="flex-1 px-3 py-2 bg-gray-800 text-gray-200 text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-emerald-500 placeholder-gray-500 resize-none max-h-32"
            style={{ minHeight: '40px' }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
          >
            {sending ? '...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}
