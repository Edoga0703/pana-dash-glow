import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  CircleUserRound,
  LoaderCircle,
  MessageSquareOff,
  Pause,
  Send,
  UserRoundCheck,
} from "lucide-react";
import type { Chat, Message } from "../types";
import { changeState, fetchChat, sendMessage } from "../services/api";

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

function MessageBubble({ message }: { message: Message }) {
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
        <p className="whitespace-pre-wrap break-words text-sm leading-5">{message.text}</p>
        {message.mediaUrl && (
          <a
            className="mt-2 block text-xs text-cyan-300 underline"
            href={message.mediaUrl}
            target="_blank"
            rel="noreferrer"
          >
            Abrir archivo adjunto
          </a>
        )}
        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-50">
          {formatTime(message.createdAt)}
          {!incoming && <Check size={11} />}
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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setMessages([]);
    setText("");
    setLoading(true);
    setError("");
    fetchChat(chat.contactId)
      .then((result) => active && setMessages(result))
      .catch((reason) => active && setError(reason.message || "No se pudo cargar el historial"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [chat.contactId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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
      <header className="flex min-h-16 items-center justify-between gap-4 border-b border-white/8 bg-[#141820] px-4">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-white">{chat.name}</h2>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
            <span>{chat.phone}</span>
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
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {error && (
        <div className="border-t border-rose-400/20 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
          {error}
        </div>
      )}

      <footer className="border-t border-white/8 bg-[#141820] p-3">
        <div className="mx-auto flex max-w-4xl items-end gap-2">
          <textarea
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
            className="min-h-11 max-h-32 flex-1 resize-none rounded-md border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400/35"
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
