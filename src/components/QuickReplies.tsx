import { useState } from "react";
import { X, Zap, Search } from "lucide-react";

export interface QuickReply {
  id: string;
  label: string;
  text: string;
}

const DEFAULT_REPLIES: QuickReply[] = [
  { id: "1", label: "Bienvenida", text: "¡Hola! Bienvenido a CuentasTupana. ¿En qué te puedo ayudar?" },
  { id: "2", label: "Precios Crunchyroll", text: "El precio de Crunchyroll es de 750 Bs para 1 mes o 1875 Bs para 3 meses. ¿Te gustaría adquirir alguna de estas opciones?" },
  { id: "3", label: "Datos de pago", text: "Puedes realizar el pago mediante:\n• PagoMóvil BDV: 04127163760 / CI: 27837649\n• Binance: Cuentastupana@gmail.com\n\nUna vez realizado el pago, envíanos el comprobante." },
  { id: "4", label: "Comprobante inválido", text: "Lo sentimos, la imagen que enviaste no es un comprobante de pago válido. Por favor, envía una captura clara del comprobante para proceder." },
  { id: "5", label: "Activando cuenta", text: "¡Perfecto! Hemos recibido tu pago. Estamos procesando la activación de tu cuenta, en breve recibirás los datos de acceso. ⏳" },
  { id: "6", label: "Cuenta activada", text: "✅ Tu cuenta ha sido activada exitosamente. Ya puedes disfrutar del servicio. ¡Gracias por elegir CuentasTupana!" },
  { id: "7", label: "Precios Netflix", text: "El precio de Netflix es de 850 Bs para 1 mes o 2100 Bs para 3 meses. ¿Te gustaría adquirir alguna de estas opciones?" },
  { id: "8", label: "Espera un momento", text: "Perfecto, dame un momento por favor. Voy a revisar tu caso. 🙏" },
  { id: "9", label: "Reactivar IA", text: "Gracias por contactarnos. Nuestro asistente virtual continuará atendiendo tu caso. ¡Estamos aquí para ayudarte!" },
];

const STORAGE_KEY = "crm_quick_replies";

function loadReplies(): QuickReply[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_REPLIES;
  } catch {
    return DEFAULT_REPLIES;
  }
}

function saveReplies(replies: QuickReply[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(replies));
}

interface QuickRepliesProps {
  onSelect: (text: string) => void;
  onClose: () => void;
}

export default function QuickReplies({ onSelect, onClose }: QuickRepliesProps) {
  const [replies, setReplies] = useState<QuickReply[]>(loadReplies);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState("");
  const [editText, setEditText] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = replies.filter(
    (r) =>
      r.label.toLowerCase().includes(search.toLowerCase()) ||
      r.text.toLowerCase().includes(search.toLowerCase()),
  );

  function handleSave() {
    if (!editLabel.trim() || !editText.trim()) return;
    let updated: QuickReply[];
    if (editId) {
      updated = replies.map((r) =>
        r.id === editId ? { ...r, label: editLabel.trim(), text: editText.trim() } : r,
      );
    } else {
      updated = [...replies, { id: Date.now().toString(), label: editLabel.trim(), text: editText.trim() }];
    }
    setReplies(updated);
    saveReplies(updated);
    setEditing(false);
    setEditLabel("");
    setEditText("");
    setEditId(null);
  }

  function handleDelete(id: string) {
    const updated = replies.filter((r) => r.id !== id);
    setReplies(updated);
    saveReplies(updated);
  }

  function handleEdit(reply: QuickReply) {
    setEditId(reply.id);
    setEditLabel(reply.label);
    setEditText(reply.text);
    setEditing(true);
  }

  function handleNew() {
    setEditId(null);
    setEditLabel("");
    setEditText("");
    setEditing(true);
  }

  return (
    <div className="absolute bottom-full left-0 right-0 z-50 mb-2 mx-3 rounded-xl border border-white/10 bg-[#141820] shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <Zap size={15} className="text-cyan-400" />
          <span className="text-sm font-semibold text-white">Respuestas rápidas</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleNew}
            className="rounded-md bg-cyan-400/15 px-3 py-1 text-xs font-medium text-cyan-300 hover:bg-cyan-400/25"
          >
            + Nueva
          </button>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            <X size={16} />
          </button>
        </div>
      </div>

      {editing ? (
        <div className="p-4 flex flex-col gap-3">
          <input
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            placeholder="Nombre de la plantilla (ej: Bienvenida)"
            className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400/35"
          />
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="Texto del mensaje..."
            rows={4}
            className="resize-none rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400/35"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setEditing(false)}
              className="rounded-md border border-white/10 px-4 py-2 text-xs text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!editLabel.trim() || !editText.trim()}
              className="rounded-md bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-40"
            >
              Guardar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="px-4 py-2 border-b border-white/8">
            <label className="flex items-center gap-2">
              <Search size={14} className="text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar plantilla..."
                className="flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
              />
            </label>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-600">No hay plantillas.</p>
            ) : (
              filtered.map((reply) => (
                <div
                  key={reply.id}
                  className="group flex items-start gap-3 border-b border-white/[0.05] px-4 py-3 hover:bg-white/[0.03]"
                >
                  <button
                    onClick={() => { onSelect(reply.text); onClose(); }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="text-xs font-semibold text-cyan-300">{reply.label}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-400">{reply.text}</p>
                  </button>
                  <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(reply)}
                      className="rounded px-2 py-1 text-[10px] text-slate-400 hover:bg-white/10 hover:text-white"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(reply.id)}
                      className="rounded px-2 py-1 text-[10px] text-rose-400 hover:bg-rose-400/10"
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
