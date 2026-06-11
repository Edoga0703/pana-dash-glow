import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  CircleUserRound,
  Copy,
  Image,
  LoaderCircle,
  MessageSquareOff,
  Paperclip,
  Pause,
  Pencil,
  Search,
  Send,
  UserPlus,
  UserRoundCheck,
  X,
  Zap,
} from "lucide-react";
import type { Chat, Message } from "../types";
import { changeState, fetchChat, sendMessage } from "../services/api";
import { API_CONFIG } from "../config/api";
import QuickReplies from "./QuickReplies";

function PhoneCopy({ phone, className = "" }: { phone: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(phone || "");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {}
  }
  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? "Copiado" : "Copiar número"}
      className={`group inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 -mx-1.5 text-xs text-slate-400 hover:text-emerald-300 hover:bg-white/5 transition-colors ${className}`}
    >
      <span className="text-slate-500">Tel:</span>
      <span className="tabular-nums">{phone}</span>
      {copied ? (
        <Check size={11} className="text-emerald-400" />
      ) : (
        <Copy size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
}

interface ChatViewProps {
  chat: Chat;
  userName: string;
  onStateChanged?: () => void;
}

function formatTime(value: string): string {
  return value
    ? new Date(value).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })
    : "";
}

function isAudioUrl(url: string): boolean {
  if (!url) return false;
  return /\.(ogg|mp3|m4a|wav|opus|mp4)(\?|$)/i.test(url) ||
    url.includes("audio") || url.includes("ptt") || url.includes("voice");
}

function isImageUrl(url: string): boolean {
  if (!url) return false;
  return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const ql = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let i = 0;
  const lower = text.toLowerCase();
  while (i < text.length) {
    const idx = lower.indexOf(ql, i);
    if (idx === -1) {
      parts.push(text.slice(i));
      break;
    }
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark key={idx} className="rounded-sm bg-emerald-400/40 text-white px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>,
    );
    i = idx + query.length;
  }
  return parts;
}

function MessageBubble({ message, highlight }: { message: Message; highlight?: string }) {
  const incoming = message.role === "user";
  const human = message.senderType === "human";

  return (
    <div className={`flex ${incoming ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[78%] rounded-md border px-3 py-2 shadow-sm ${
          incoming
            ? "border-white/8 bg-[#222731] text-slate-100"
            : human
              ? "border-cyan-300/20 bg-cyan-500/15 text-cyan-50"
              : "border-emerald-300/15 bg-emerald-500/15 text-emerald-50"
        }`}
      >
        {!incoming && (
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide opacity-65">
            {human ? <CircleUserRound size={11} /> : <Bot size={11} />}
            {human ? "Administrador" : "Pana Bot"}
          </div>
        )}
        {message.text && (
          <p className="whitespace-pre-wrap break-words text-sm leading-5">
            {highlight ? highlightText(message.text, highlight) : message.text}
          </p>
        )}
        {message.mediaUrl && (
          isAudioUrl(message.mediaUrl) ? (
            <div className="mt-2 rounded-md bg-black/20 p-2">
              <audio controls preload="metadata" className="h-8 w-full" style={{ minWidth: "200px", maxWidth: "300px" }}>
                <source src={message.mediaUrl} />
                Tu navegador no soporta audio
              </audio>
            </div>
          ) : isImageUrl(message.mediaUrl) ? (
            <a href={message.mediaUrl} target="_blank" rel="noreferrer" className="mt-2 block">
              <img
                src={message.mediaUrl}
                alt="adjunto"
                className="max-w-full rounded-md border border-white/10"
                style={{ maxHeight: 220 }}
                loading="lazy"
              />
            </a>
          ) : (
            <a href={message.mediaUrl} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1.5 text-xs text-cyan-300 underline">
              <Paperclip size={12} /> Abrir archivo adjunto
            </a>
          )
        )}
        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-50">
          {formatTime(message.createdAt)}
          {!incoming && <Check size={11} />}
        </div>
      </div>
    </div>
  );
}

interface RegisterModalProps {
  chat: Chat;
  onClose: () => void;
  onSuccess: (nombreNuevo: string) => void;
}

function RegisterModal({ chat, onClose, onSuccess }: RegisterModalProps) {
  const [nombre, setNombre] = useState(chat.name === "Sin nombre" ? "" : chat.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!nombre.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API_CONFIG.baseUrl}/webhook/pana-crm-register-v1`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [API_CONFIG.authHeaderName]: API_CONFIG.authHeaderValue,
        },
        body: JSON.stringify({
          contactId: chat.contactId,
          name: nombre.trim(),
        }),
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || "Error al registrar");
      onSuccess(nombre.trim());
      onClose();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Error al registrar contacto");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-lg border border-white/10 bg-[#181d25] p-5 text-center">
        <h3 className="mb-3 text-sm font-semibold text-white">
          {chat.name && chat.name !== "Sin nombre" ? "Editar contacto" : "Registrar contacto"}
        </h3>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del cliente"
          className="mb-3 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white text-center outline-none placeholder:text-slate-500 focus:border-emerald-400/40"
        />
        <div className="mb-3 flex justify-center">
          <PhoneCopy phone={chat.phone} />
        </div>
        {error && <p className="mb-3 text-xs text-rose-300">{error}</p>}
        <div className="flex justify-center gap-2">
          <button onClick={onClose} className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:bg-white/5">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!nombre.trim() || saving}
            className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {saving ? "Guardando..." : chat.name && chat.name !== "Sin nombre" ? "Guardar" : "Registrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatView({ chat, userName, onStateChanged }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [changingState, setChangingState] = useState(false);
  const [error, setError] = useState("");
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [nombreMostrado, setNombreMostrado] = useState(chat.name);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const copyPhone = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(chat.phone || "");
      setCopiedPhone(true);
      window.setTimeout(() => setCopiedPhone(false), 1400);
    } catch {}
  }, [chat.phone]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const chatIdRef = useRef(chat.contactId);
  const initialUnreadRef = useRef(chat.unreadCount || 0);
  const didInitialScrollRef = useRef(false);

  const initialUnread = initialUnreadRef.current;
  let firstUnreadId: string | null = null;
  if (initialUnread > 0) {
    const incoming = messages.filter((m) => m.role === "user");
    const target = incoming[incoming.length - initialUnread];
    firstUnreadId = target?.id || null;
  }

  const trimmedQuery = searchQuery.trim();
  const matches = trimmedQuery
    ? messages.filter((m) => m.text?.toLowerCase().includes(trimmedQuery.toLowerCase()))
    : [];

  useEffect(() => {
    setMatchIndex(0);
  }, [trimmedQuery, chat.contactId]);

  useEffect(() => {
    if (!showSearch || !trimmedQuery || matches.length === 0) return;
    const safeIdx = Math.min(matchIndex, matches.length - 1);
    const msg = matches[safeIdx];
    const el = messageRefs.current.get(msg.id);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [matchIndex, matches, showSearch, trimmedQuery]);

  useEffect(() => {
    if (showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
    }
  }, [showSearch]);

  // Reset search al cambiar de chat
  useEffect(() => {
    setShowSearch(false);
    setSearchQuery("");
  }, [chat.contactId]);

  const isRegistered = !!(chat.name && chat.name !== "Sin nombre");

  const adjustTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "44px";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, []);

  useEffect(() => { adjustTextarea(); }, [text, adjustTextarea]);

  useEffect(() => {
    setNombreMostrado(chat.name);
  }, [chat.name]);

  useEffect(() => {
    let active = true;
    chatIdRef.current = chat.contactId;
    initialUnreadRef.current = chat.unreadCount || 0;
    didInitialScrollRef.current = false;
    setMessages([]);
    setText("");
    setLoading(true);
    setError("");
    setShowQuickReplies(false);
    fetchChat(chat.contactId)
      .then((result) => active && setMessages(result))
      .catch((reason) => active && setError(reason.message || "No se pudo cargar el historial"))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [chat.contactId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (chatIdRef.current !== chat.contactId) return;
      fetchChat(chat.contactId)
        .then((newMsgs) => {
          if (chatIdRef.current !== chat.contactId) return;
          setMessages((prev) => {
            if (newMsgs.length !== prev.length) return newMsgs;
            const lastNew = newMsgs[newMsgs.length - 1];
            const lastOld = prev[prev.length - 1];
            if (lastNew && lastOld && lastNew.id !== lastOld.id) return newMsgs;
            return prev;
          });
        })
        .catch(() => {});
    }, API_CONFIG.pollingInterval);
    return () => clearInterval(interval);
  }, [chat.contactId]);

  useEffect(() => {
    if (messages.length === 0) return;
    if (!didInitialScrollRef.current) {
      // Siempre iniciar desde abajo, incluso si hay mensajes sin leer
      // (el separador "no leídos" queda visible al hacer scroll hacia arriba)
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
      });
      didInitialScrollRef.current = true;
    } else {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  async function handleSend() {
    const message = text.trim();
    if (!message || sending) return;
    setSending(true);
    setError("");
    try {
      const contactId = chat.contactId;
      await sendMessage({ contactId, text: message, userName });
      const updated = await fetchChat(contactId);
      if (chat.contactId === contactId) setMessages(updated);
      setText("");
      onStateChanged?.();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "No se pudo enviar el mensaje");
    } finally {
      setSending(false);
    }
  }

  async function uploadFile(file: File) {
    if (!file) return;
    setUploadingImage(true);
    setError("");
    try {
      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = () => reject(new Error("Error al leer el archivo"));
        reader.readAsDataURL(file);
      });
      const response = await fetch(`${API_CONFIG.baseUrl}/webhook/pana-crm-media-v1`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [API_CONFIG.authHeaderName]: API_CONFIG.authHeaderValue,
        },
        body: JSON.stringify({
          contactId: chat.contactId,
          fileName: file.name || `pegado-${Date.now()}`,
          mimeType: file.type,
          base64,
          userName,
        }),
      });
      if (!response.ok) throw new Error("Error al subir el archivo");
      const updated = await fetchChat(chat.contactId);
      setMessages(updated);
      onStateChanged?.();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "No se pudo enviar el archivo");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) await uploadFile(file);
    event.target.value = "";
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          void uploadFile(file);
          return;
        }
      }
    }
  }

  function handleDrop(e: React.DragEvent<HTMLTextAreaElement>) {
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      e.preventDefault();
      void uploadFile(file);
    }
  }

  async function handleState(state: "bot" | "humano" | "pausado") {
    setChangingState(true);
    setError("");
    try {
      await changeState({ contactId: chat.contactId, state, userName });
      onStateChanged?.();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "No se pudo cambiar el estado");
    } finally {
      setChangingState(false);
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-[#0d1015]">
      {showRegister && (
        <RegisterModal
          chat={chat}
          onClose={() => setShowRegister(false)}
          onSuccess={(nombreNuevo) => {
            setNombreMostrado(nombreNuevo);
            onStateChanged?.();
          }}
        />
      )}

      <header className="flex min-h-16 items-center justify-between gap-4 border-b border-white/8 bg-[#141820] px-4">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-white">{nombreMostrado}</h2>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
            <button
              type="button"
              onClick={copyPhone}
              title={copiedPhone ? "Copiado" : "Copiar número"}
              className="group inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 -mx-1.5 text-slate-400 hover:text-emerald-300 hover:bg-white/5 transition-colors"
            >
              <span className="tabular-nums">{chat.phone}</span>
              {copiedPhone ? (
                <Check size={11} className="text-emerald-400" />
              ) : (
                <Copy size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
            <span>·</span>
            <span className={chat.status === "bot" ? "text-emerald-300" : "text-amber-200"}>
              {chat.status === "bot"
                ? "IA habilitada"
                : chat.status === "humano"
                  ? "Atención humana"
                  : "Chat pausado"}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setShowSearch((v) => !v)}
            title="Buscar en este chat"
            className={`grid size-9 place-items-center rounded-md border transition-colors ${
              showSearch
                ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-300"
                : "border-white/10 text-slate-400 hover:bg-white/5 hover:text-emerald-300"
            }`}
          >
            <Search size={15} />
          </button>
          <button
            onClick={() => setShowRegister(true)}
            title={isRegistered ? "Editar contacto" : "Registrar contacto"}
            className="grid size-9 place-items-center rounded-md border border-white/10 text-slate-400 hover:bg-white/5 hover:text-cyan-300"
          >
            {isRegistered ? <Pencil size={15} /> : <UserPlus size={15} />}
          </button>
          {chat.status !== "humano" && (
            <button
              disabled={changingState}
              onClick={() => handleState("humano")}
              className="flex h-9 items-center gap-2 rounded-md border border-amber-300/20 bg-amber-400/10 px-3 text-xs font-semibold text-amber-100 hover:bg-amber-400/15 disabled:opacity-50"
            >
              <UserRoundCheck size={15} /> <span className="hidden sm:inline">Tomar chat</span>
            </button>
          )}
          {chat.status !== "pausado" && (
            <button
              disabled={changingState}
              onClick={() => handleState("pausado")}
              title="Pausar chat"
              className="grid size-9 place-items-center rounded-md border border-white/10 text-slate-400 hover:bg-white/5 disabled:opacity-50"
            >
              <Pause size={15} />
            </button>
          )}
          {chat.status !== "bot" && (
            <button
              disabled={changingState}
              onClick={() => handleState("bot")}
              className="flex h-9 items-center gap-2 rounded-md bg-emerald-500 px-3 text-xs font-bold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
            >
              <Bot size={15} /> <span className="hidden sm:inline">Reactivar IA</span>
            </button>
          )}
        </div>
      </header>

      {showSearch && (
        <div className="flex items-center gap-2 border-b border-white/8 bg-[#10141b] px-4 py-2">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar en este chat…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && matches.length > 0) {
                  e.preventDefault();
                  setMatchIndex((i) => (e.shiftKey ? (i - 1 + matches.length) % matches.length : (i + 1) % matches.length));
                } else if (e.key === "Escape") {
                  setShowSearch(false);
                }
              }}
              className="w-full rounded-full bg-[#202c33] py-1.5 pl-9 pr-3 text-[13px] text-slate-100 placeholder-slate-500 outline-none focus:ring-1 focus:ring-emerald-400/40"
            />
          </div>
          {trimmedQuery && (
            <span className="shrink-0 text-[11px] text-slate-400 tabular-nums">
              {matches.length === 0 ? "0" : `${Math.min(matchIndex + 1, matches.length)} / ${matches.length}`}
            </span>
          )}
          <button
            disabled={matches.length === 0}
            onClick={() => setMatchIndex((i) => (i - 1 + matches.length) % matches.length)}
            className="grid size-7 place-items-center rounded-md text-slate-400 hover:bg-white/5 hover:text-emerald-300 disabled:opacity-30"
            title="Anterior"
          >
            <ChevronUp size={14} />
          </button>
          <button
            disabled={matches.length === 0}
            onClick={() => setMatchIndex((i) => (i + 1) % matches.length)}
            className="grid size-7 place-items-center rounded-md text-slate-400 hover:bg-white/5 hover:text-emerald-300 disabled:opacity-30"
            title="Siguiente"
          >
            <ChevronDown size={14} />
          </button>
          <button
            onClick={() => setShowSearch(false)}
            className="grid size-7 place-items-center rounded-md text-slate-400 hover:bg-white/5 hover:text-slate-100"
            title="Cerrar"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7">
        {loading ? (
          <div className="grid h-full place-items-center text-slate-500">
            <LoaderCircle className="animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="grid h-full place-items-center text-center text-slate-600">
            <div>
              <MessageSquareOff className="mx-auto mb-3" />
              <p className="text-sm">Todavía no hay mensajes guardados.</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-4xl flex-col gap-2">
            {messages.map((message) => {
              const isActiveMatch =
                trimmedQuery && matches[matchIndex]?.id === message.id;
              const showUnreadDivider = message.id === firstUnreadId;
              return (
                <div key={message.id}>
                  {showUnreadDivider && (
                    <div className="my-2 flex items-center gap-2">
                      <div className="h-px flex-1 bg-emerald-400/30" />
                      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                        {initialUnread} {initialUnread === 1 ? "mensaje no leído" : "mensajes no leídos"}
                      </span>
                      <div className="h-px flex-1 bg-emerald-400/30" />
                    </div>
                  )}
                  <div
                    ref={(el) => {
                      if (el) messageRefs.current.set(message.id, el);
                      else messageRefs.current.delete(message.id);
                    }}
                    className={isActiveMatch ? "rounded-md ring-2 ring-emerald-400/60 transition-shadow" : ""}
                  >
                    <MessageBubble message={message} highlight={trimmedQuery || undefined} />
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>


      {error && (
        <div className="border-t border-rose-400/20 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
          {error}
        </div>
      )}

      <footer className="relative border-t border-white/8 bg-[#141820] p-3">
        {showQuickReplies && (
          <QuickReplies
            onSelect={(t) => setText(t)}
            onClose={() => setShowQuickReplies(false)}
          />
        )}
        <div className="mx-auto flex max-w-4xl items-end gap-2">
          <button
            onClick={() => setShowQuickReplies((v) => !v)}
            title="Respuestas rápidas"
            className={`grid size-11 shrink-0 place-items-center rounded-md border transition-colors ${
              showQuickReplies
                ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-300"
                : "border-white/10 text-slate-400 hover:bg-white/5 hover:text-cyan-300"
            }`}
          >
            <Zap size={18} />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Enviar imagen o archivo"
            disabled={uploadingImage}
            className="grid size-11 shrink-0 place-items-center rounded-md border border-white/10 text-slate-400 hover:bg-white/5 hover:text-cyan-300 disabled:opacity-50"
          >
            {uploadingImage ? <LoaderCircle size={18} className="animate-spin" /> : <Image size={18} />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,.pdf,.doc,.docx"
            className="hidden"
            onChange={handleImageUpload}
          />
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            placeholder="Escribe una respuesta..."
            className="flex-1 resize-none rounded-md border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-slate-100 outline-none overflow-y-auto placeholder:text-slate-600 focus:border-cyan-400/35"
            style={{ minHeight: "44px", maxHeight: "160px" }}
          />
          <button
            disabled={!text.trim() || sending}
            onClick={handleSend}
            title="Enviar mensaje"
            className="grid size-11 shrink-0 place-items-center rounded-md bg-cyan-400 text-slate-950 hover:bg-cyan-300 disabled:bg-slate-800 disabled:text-slate-600"
          >
            {sending ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </footer>
    </section>
  );
}
