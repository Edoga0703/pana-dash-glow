// Cliente API para el backend de Pana Bot (n8n en VPS).
// Configura VITE_API_BASE_URL en tu .env apuntando a tu webhook/endpoint de n8n.
// Opcional: VITE_API_TOKEN para enviar Authorization: Bearer <token>.

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
const TOKEN = import.meta.env.VITE_API_TOKEN as string | undefined;

export interface ApiOptions extends RequestInit {
  json?: unknown;
}

export async function apiFetch<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { json, headers, ...rest } = opts;
  const url = BASE_URL ? `${BASE_URL.replace(/\/$/, "")}${path}` : path;

  const res = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      ...(headers ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text().catch(() => res.statusText)}`);
  }
  const ct = res.headers.get("content-type") ?? "";
  return (ct.includes("application/json") ? await res.json() : (await res.text() as unknown)) as T;
}

export const isApiConfigured = () => Boolean(BASE_URL);

// ===== Endpoints sugeridos (ajusta a tu n8n) =====
export const api = {
  getSettings:    () => apiFetch<{ exchangeRate: number; botActive: boolean; delayMin: number; delayMax: number; bufferMinutes: number }>("/settings"),
  saveSettings:   (data: Record<string, unknown>) => apiFetch("/settings", { method: "POST", json: data }),
  getInventory:   () => apiFetch<Record<string, boolean>>("/inventory"),
  setInventory:   (service: string, available: boolean) => apiFetch("/inventory", { method: "POST", json: { service, available } }),
  getPausedChats: () => apiFetch<Array<{ id: string; name: string; phone: string; reason: string; pausedAt: string }>>("/chats/paused"),
  resumeChat:     (id: string) => apiFetch(`/chats/${id}/resume`, { method: "POST" }),
  getLogs:        () => apiFetch<Array<{ level: "INFO" | "WARN" | "ERROR"; message: string; timestamp: string }>>("/logs"),
};
