import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { AgentProfile } from "@/hooks/useAgentProfile";

export default function ProfileDialog({
  profile,
  onClose,
  onSaved,
}: {
  profile: AgentProfile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(profile.display_name);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [avatarPath, setAvatarPath] = useState<string | null>(profile.avatar_url);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setError("");
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("agent-avatars")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      setAvatarPath(path);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const { error: e1 } = await supabase
        .from("profiles")
        .update({
          display_name: name.trim() || "Agente",
          avatar_url: avatarPath,
        })
        .eq("id", profile.id);
      if (e1) throw e1;
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#11161c] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Mi perfil</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Nombre visible</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md bg-[#1c2026] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-400/50"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">Foto</label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-dashed border-white/15 bg-white/5 text-xs text-slate-300 hover:bg-white/10 disabled:opacity-50"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {avatarPath ? "Cambiar foto" : "Subir foto"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
            {avatarPath && (
              <p className="mt-1 truncate text-[10px] text-slate-500">{avatarPath}</p>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-500 text-sm font-bold text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
