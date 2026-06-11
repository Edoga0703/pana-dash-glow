function RegisterModal({ chat, onClose, onSuccess }: RegisterModalProps) {
  const [nombre, setNombre] = useState(chat.name === "Sin nombre" ? "" : chat.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function handleCopyPhone() {
    navigator.clipboard.writeText(chat.phone).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleSave() {
    if (!nombre.trim()) {
      setError("El nombre es requerido");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("https://n8n.cuentastupana.com/webhook/pana-crm-contact-v1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CRM-SECRET": "28031597Ef.",
        },
        body: JSON.stringify({
          contactId: chat.contactId,
          nombre: nombre.trim(),
          telefono: chat.phone,
        }),
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || "Error al registrar");
      onSuccess();
      onClose();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Error al registrar contacto");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#141820] p-6 shadow-2xl">
        <h3 className="mb-4 text-sm font-semibold text-white flex items-center gap-2">
          <UserPlus size={16} className="text-cyan-400" />
          Registrar contacto
        </h3>
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Nombre</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre completo"
              className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400/35"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Teléfono WhatsApp</label>
            <button
              onClick={handleCopyPhone}
              className="w-full rounded-md border border-white/10 bg-black/10 px-3 py-2 text-sm text-left transition-colors hover:border-cyan-400/30 hover:bg-cyan-400/5"
            >
              <span className="text-slate-300">{chat.phone}</span>
              <span className="float-right text-[10px] text-slate-500">
                {copied ? "✓ Copiado" : "clic para copiar"}
              </span>
            </button>
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <div className="flex gap-2 justify-end mt-2">
            <button
              onClick={onClose}
              className="rounded-md border border-white/10 px-4 py-2 text-xs text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Registrar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
