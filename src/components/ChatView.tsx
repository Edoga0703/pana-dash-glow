import { useState, useEffect, useRef, useCallback } from 'react';
import type { Chat, Message } from '../types';
import { fetchChat, sendMessage, changeState } from '../services/api';
import { API_CONFIG } from '../config/api';

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

function isAudioUrl(url: string): boolean {
  if (!url) return false;
  return /\.(ogg|mp3|m4a|wav|opus|mp4)(\?|$)/i.test(url) ||
    url.includes('audio') || url.includes('ptt') || url.includes('voice');
}

function isImageUrl(url: string): boolean {
  if (!url) return false;
  return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);
}

function MediaContent({ url }: { url: string }) {
  if (!url) return null;

  if (isAudioUrl(url)) {
    return (
      <div className="mt-1.5 bg-black/20 rounded-lg p-2">
        <audio controls preload="metadata" className="w-full max-w-[280px] h-8" style={{ minWidth: '200px' }}>
          <source src={url} />
          Tu navegador no soporta audio
        </audio>
      </div>
    );
  }

  if (isImageUrl(url)) {
    return (
      <div className="mt-1.5">
        <img
          src={url}
          alt="Adjunto"
          className="max-w-[280px] max-h-[300px] rounded-lg cursor-pointer object-cover"
          onClick={() => window.open(url, '_blank')}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="text-xs underline opacity-80 mt-1 block">
      Ver adjunto
    </a>
  );
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
        {msg.mediaUrl && <MediaContent url={msg.mediaUrl} />}
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatIdRef = useRef(chat.contactId);

  // Auto-resize del textarea
  const adjustTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '40px';
    const maxH = 160; // maximo ~6 lineas
    el.style.height = Math.min(el.scrollHeight, maxH) + 'px';
  }, []);

  useEffect(() => { adjustTextarea(); }, [text, adjustTextarea]);

  // Cargar mensajes al seleccionar chat
  useEffect(() => {
    let cancelled = false;
    chatIdRef.current = chat.contactId;
    setLoading(true);
    setMessages([]);
    setError('');

    fetchChat(chat.contactId)
      .then((msgs) => {
        if (!cancelled && chatIdRef.current === chat.contactId) {
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

  // Polling: refrescar mensajes del chat abierto cada X segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (chatIdRef.current !== chat.contactId) return;
      fetchChat(chat.contactId)
        .then((msgs) => {
          if (chatIdRef.current === chat.contactId) {
            const reversed = [...msgs].reverse();
            setMessages((prev) => {
              // Solo actualizar si hay mensajes nuevos
              if (reversed.length !== prev.length) return reversed;
              const lastNew = reversed[reversed.length - 1];
              const lastOld = prev[prev.length - 1];
              if (lastNew && lastOld && lastNew.id !== lastOld.id) return reversed;
              return prev;
            });
          }
        })
        .catch(() => {}); // silenciar errores de polling
    }, API_CONFIG.pollingInterval);

    return () => clearInterval(interval);
  }, [chat.contactId]);

  // Scroll al fondo cuando llegan mensajes nuevos
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      textareaRef.current?.focus();
    } catch (err: any) {
      setError(err.message || 'Error al enviar');
    } finally {
      setSending(false);
    }
  }

  async function handleChangeState(state: 'bot' | 'humano' | 'pausado') {
    try {
      await changeState({ contactId: chat.contactId, state, userName });
      onStateChanged?.();
    } catch (err: any) {
      setError(err.message || 'Error al cambiar estado');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const grouped = groupByDate(messages);

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 bg-gray-900 flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold">{chat.name}</h3>
          <p className="text-xs text-gray-400">{chat.phone}</p>
        </div>
        <div className="flex gap-2">
          {chat.status !== 'humano' && (
            <button onClick={() => handleChangeState('humano')}
              className="text-xs px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors">
              Tomar chat
            </button>
          )}
          {chat.status !== 'bot' && (
            <button onClick={() => handleChangeState('bot')}
              className="text-xs px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors">
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

      {/* Input con auto-resize */}
      <div className="p-3 border-t border-gray-800 bg-gray-900">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            rows={1}
            className="flex-1 px-3 py-2 bg-gray-800 text-gray-200 text-sm rounded-lg border border-gray-700 focus:outline-none focus:border-emerald-500 placeholder-gray-500 resize-none overflow-y-auto"
            style={{ minHeight: '40px', maxHeight: '160px' }}
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
