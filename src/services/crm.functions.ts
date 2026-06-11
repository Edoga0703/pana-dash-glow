import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const chatInput = z.object({
  contactId: z.string().min(1),
  page: z.number().int().positive().default(1),
});
const sendInput = z.object({
  contactId: z.string().min(1).optional(),
  phone: z.string().trim().min(5).max(32).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  text: z.string().trim().min(1).max(4000),
  userName: z.string().trim().min(1).max(120),
});
const mediaInput = z.object({
  contactId: z.string().min(1).optional(),
  phone: z.string().trim().min(5).max(32).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.string().trim().min(1).max(120),
  mediaUrl: z.string().url(),
  mediaType: z.enum(["image", "video", "audio", "file"]),
  userName: z.string().trim().min(1).max(120),
});
const stateInput = z.object({
  contactId: z.string().min(1),
  state: z.enum(["bot", "humano", "pausado", "pin", "unpin", "archive", "unarchive"]),
  userName: z.string().trim().min(1).max(120),
});
const registerInput = z.object({
  contactId: z.string().min(1),
  name: z.string().trim().min(1).max(200),
});

function n8nConfig() {
  const baseUrl = process.env.N8N_BASE_URL || process.env.VITE_N8N_BASE_URL;
  const secret = process.env.CRM_SECRET || process.env.VITE_AUTH_HEADER_VALUE;
  if (!baseUrl || !secret) throw new Error("Falta configurar N8N_BASE_URL y CRM_SECRET");
  return { baseUrl: baseUrl.replace(/\/$/, ""), secret };
}

async function crmRequest(path: string, init: RequestInit = {}): Promise<any> {
  const { baseUrl, secret } = n8nConfig();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-CRM-SECRET": secret,
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let body: any;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { error: text || `CRM error ${response.status}` };
  }
  if (!response.ok) {
    const err =
      typeof body === "object" && body != null && "error" in body
        ? String(body.error)
        : `CRM error ${response.status}`;
    throw new Error(err);
  }
  return body;
}

// ───────────── GHL helpers ─────────────
const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-04-15";

function ghlConfig() {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!apiKey || !locationId) throw new Error("Falta configurar GHL_API_KEY y GHL_LOCATION_ID");
  return { apiKey, locationId };
}

function ghlHeaders() {
  const { apiKey } = ghlConfig();
  return {
    Authorization: `Bearer ${apiKey}`,
    Version: GHL_VERSION,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function ghlFetch(path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`${GHL_BASE}${path}`, {
    ...init,
    headers: { ...ghlHeaders(), ...(init.headers || {}) },
  });
  const text = await res.text();
  let body: any = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!res.ok) {
    const msg = body?.message || body?.error || body?.raw || `GHL ${res.status}`;
    throw new Error(`GHL ${res.status}: ${typeof msg === "string" ? msg : JSON.stringify(msg)}`);
  }
  return body;
}

async function resolveContactId(opts: { contactId?: string; phone?: string; name?: string }): Promise<string> {
  if (opts.contactId) return opts.contactId;
  if (!opts.phone) throw new Error("Falta contactId o teléfono para identificar al contacto");
  const { locationId } = ghlConfig();
  // 1) Buscar contacto por teléfono
  const search = await ghlFetch(
    `/contacts/search/duplicate?locationId=${encodeURIComponent(locationId)}&number=${encodeURIComponent(opts.phone)}`,
  ).catch(() => null);
  const found = search?.contact?.id || search?.contacts?.[0]?.id;
  if (found) return found;
  // 2) Crear contacto si no existe
  const created = await ghlFetch("/contacts/", {
    method: "POST",
    body: JSON.stringify({
      locationId,
      phone: opts.phone,
      name: opts.name || opts.phone,
    }),
  });
  const newId = created?.contact?.id || created?.id;
  if (!newId) throw new Error("No se pudo crear el contacto en GHL");
  return newId;
}

export const getInbox = createServerFn({ method: "GET" }).handler(() =>
  crmRequest("/webhook/pana-crm-inbox-v1"),
);

export const getChat = createServerFn({ method: "GET" })
  .inputValidator(chatInput)
  .handler(({ data }) =>
    crmRequest(
      `/webhook/pana-crm-chat-v1?contactId=${encodeURIComponent(data.contactId)}&page=${data.page}`,
    ),
  );

export const postMessage = createServerFn({ method: "POST" })
  .inputValidator(sendInput)
  .handler(async ({ data }) => {
    const contactId = await resolveContactId(data);
    const result = await ghlFetch("/conversations/messages", {
      method: "POST",
      body: JSON.stringify({
        type: "WhatsApp",
        contactId,
        message: data.text,
      }),
    });
    return { ok: true, contactId, messageId: result?.messageId || result?.id || null };
  });

export const postMedia = createServerFn({ method: "POST" })
  .inputValidator(mediaInput)
  .handler(async ({ data }) => {
    const contactId = await resolveContactId(data);
    const result = await ghlFetch("/conversations/messages", {
      method: "POST",
      body: JSON.stringify({
        type: "WhatsApp",
        contactId,
        attachments: [data.mediaUrl],
      }),
    });
    return { ok: true, contactId, messageId: result?.messageId || result?.id || null };
  });

export const postState = createServerFn({ method: "POST" })
  .inputValidator(stateInput)
  .handler(({ data }) =>
    crmRequest("/webhook/pana-crm-state-v1", { method: "POST", body: JSON.stringify(data) }),
  );

export const postRegister = createServerFn({ method: "POST" })
  .inputValidator(registerInput)
  .handler(({ data }) =>
    crmRequest("/webhook/pana-crm-register-v1", { method: "POST", body: JSON.stringify(data) }),
  );
