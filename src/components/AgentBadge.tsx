import { useEffect, useState } from "react";
import { LogOut, User as UserIcon, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveAvatarSrc, type AgentProfile } from "@/hooks/useAgentProfile";
import ProfileDialog from "./ProfileDialog";

export default function AgentBadge({
  profile,
  onProfileUpdated,
}: {
  profile: AgentProfile | null;
  onProfileUpdated: () => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let m = true;
    resolveAvatarSrc(profile?.avatar_url ?? null).then((s) => {
      if (m) setSrc(s);
    });
    return () => {
      m = false;
    };
  }, [profile?.avatar_url]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3 text-xs text-slate-200 hover:bg-white/10"
        >
          <Avatar src={src} name={profile?.display_name ?? "?"} size={26} />
          <span className="max-w-[120px] truncate font-medium">
            {profile?.display_name ?? "Agente"}
          </span>
        </button>
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-lg border border-white/10 bg-[#161b22] shadow-xl">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setShowProfile(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-200 hover:bg-white/5"
              >
                <Pencil size={13} /> Editar mi perfil
              </button>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-300 hover:bg-white/5"
              >
                <LogOut size={13} /> Cerrar sesión
              </button>
            </div>
          </>
        )}
      </div>
      {showProfile && profile && (
        <ProfileDialog
          profile={profile}
          onClose={() => setShowProfile(false)}
          onSaved={() => {
            setShowProfile(false);
            onProfileUpdated();
          }}
        />
      )}
    </>
  );
}

export function Avatar({
  src,
  name,
  size = 32,
}: {
  src: string | null;
  name: string;
  size?: number;
}) {
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <span
      className="grid shrink-0 overflow-hidden rounded-full bg-emerald-500/25 text-emerald-200 font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.45, lineHeight: 1 }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center">
          {initial || <UserIcon size={size * 0.5} />}
        </span>
      )}
    </span>
  );
}
