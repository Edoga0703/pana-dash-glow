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
  caption: z.string().trim().max(4000).optional(),
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

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function n8nConfig() {
  const baseUrl = process.env.N8N_BASE_URL || process.env.VITE_N8N_BASE_URL;
  const secret = process.env.CRM_SECRET || process.env.VITE_AUTH_HEADER_VALUE;
  if (!baseUrl || !secret) throw new Error("Falta configurar N8N_BASE_URL y CRM_SECRET");
  return { baseUrl: baseUrl.replace(/\/$/, ""), secret };
}

async function crmRequest(path: string, init: RequestInit = {}): Promise<JsonValue> {
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
  let body: JsonValue;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { error: text || `CRM error ${response.status}` };
  }
  if (!response.ok) {
    const details = asRecord(body);
    const err = typeof details.error === "string" ? details.error : `CRM error ${response.status}`;
    throw new Error(err);
  }
  return body;
}

// ───────────── GHL helpers ─────────────
const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";
const GHL_CONVERSATIONS_VERSION = "2021-07-28";
const SILENT_MEDIA_CAPTION = "\u200B";
const GHL_DEFAULT_USER_ID = "j4c6feEhVsykrHnHKDkO";

function ghlConfig() {
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!apiKey || !locationId) throw new Error("Falta configurar GHL_API_KEY y GHL_LOCATION_ID");
  return { apiKey, locationId };
}

function ghlHeaders(version = GHL_VERSION, json = true) {
  const { apiKey } = ghlConfig();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Version: version,
    Accept: "application/json",
  };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

async function parseGhlResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  let body: unknown = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const details = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const msg = details.message || details.error || details.raw || `GHL ${res.status}`;
    throw new Error(`GHL ${res.status}: ${typeof msg === "string" ? msg : JSON.stringify(msg)}`);
  }
  return body;
}

async function ghlFetch(
  path: string,
  init: RequestInit = {},
  version = GHL_VERSION,
): Promise<unknown> {
  const res = await fetch(`${GHL_BASE}${path}`, {
    ...init,
    headers: { ...ghlHeaders(version), ...(init.headers || {}) },
  });
  return parseGhlResponse(res);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value) return value;
  }
  return null;
}

function collectHttpUrls(value: unknown, urls: string[] = []): string[] {
  if (typeof value === "string" && /^https?:\/\//i.test(value)) urls.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectHttpUrls(item, urls));
  else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectHttpUrls(item, urls));
  }
  return [...new Set(urls)];
}

async function uploadAttachmentUrlsToGhl(
  conversationId: string,
  urls: string[],
): Promise<string[]> {
  const { locationId } = ghlConfig();
  const form = new FormData();
  form.append("locationId", locationId);
  // IMPORTANT: usar conversationId (no contactId) para que GHL genere URLs
  // scoped a la conversación (.../conversations/{convId}/file.png) que Twilio
  // sí puede descargar. Las URLs scoped a "contact" no funcionan en WhatsApp.
  form.append("conversationId", conversationId);
  urls.forEach((url) => form.append("attachmentUrls[]", url));

  const res = await fetch(`${GHL_BASE}/conversations/messages/upload`, {
    method: "POST",
    headers: ghlHeaders(GHL_CONVERSATIONS_VERSION, false),
    body: form,
  });
  const body = await parseGhlResponse(res);
  const uploaded = collectHttpUrls(asRecord(body).uploadedFiles);
  return uploaded.length ? uploaded : urls;
}

async function resolveConversationId(contactId: string): Promise<string | null> {
  const { locationId } = ghlConfig();
  const res = await ghlFetch(
    `/conversations/search?locationId=${encodeURIComponent(locationId)}&contactId=${encodeURIComponent(contactId)}`,
    {},
    GHL_CONVERSATIONS_VERSION,
  ).catch(() => null);
  const body = asRecord(res);
  const list = Array.isArray(body.conversations) ? body.conversations : [];
  return firstString(asRecord(list[0]).id);
}

async function resolveContactId(opts: {
  contactId?: string;
  phone?: string;
  name?: string;
}): Promise<string> {
  if (opts.contactId) return opts.contactId;
  if (!opts.phone) throw new Error("Falta contactId o teléfono para identificar al contacto");
  const { locationId } = ghlConfig();
  // 1) Buscar contacto por teléfono
  const search = await ghlFetch(
    `/contacts/search/duplicate?locationId=${encodeURIComponent(locationId)}&number=${encodeURIComponent(opts.phone)}`,
  ).catch(() => null);
  const searchBody = asRecord(search);
  const found = firstString(
    asRecord(searchBody.contact).id,
    Array.isArray(searchBody.contacts) ? asRecord(searchBody.contacts[0]).id : null,
  );
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
  const createdBody = asRecord(created);
  const newId = firstString(asRecord(createdBody.contact).id, createdBody.id);
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
    const providerId = process.env.GHL_CONVERSATION_PROVIDER_ID;
    const payload: Record<string, unknown> = {
      type: "WhatsApp",
      contactId,
      message: data.text,
    };
    if (providerId) payload.conversationProviderId = providerId;
    const result = asRecord(
      await ghlFetch(
        "/conversations/messages",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        GHL_CONVERSATIONS_VERSION,
      ),
    );
    return { ok: true, contactId, messageId: firstString(result.messageId, result.id) };
  });

export const postMedia = createServerFn({ method: "POST" })
  .inputValidator(mediaInput)
  .handler(async ({ data }) => {
    const contactId = await resolveContactId(data);
    // NO enviamos conversationProviderId para mensajes con media: el provider
    // de Marketplace (meta.marketplace.appId) entrega el caption pero pierde
    // la imagen en WhatsApp. Sin providerId, GHL usa el canal nativo de
    // WhatsApp que sí entrega el attachment correctamente.
    const conversationId = await resolveConversationId(contactId);
    let attachmentUrl = data.mediaUrl;
    if (conversationId) {
      const uploaded = await uploadAttachmentUrlsToGhl(conversationId, [data.mediaUrl]).catch(
        () => [data.mediaUrl],
      );
      attachmentUrl = uploaded[0] || data.mediaUrl;
    }
    const payload: Record<string, unknown> = {
      type: "WhatsApp",
      contactId,
      userId: process.env.GHL_USER_ID || GHL_DEFAULT_USER_ID,
      message: data.caption && data.caption.length > 0 ? data.caption : " ",
      attachments: [attachmentUrl],
    };
    const result = asRecord(
      await ghlFetch(
        "/conversations/messages",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        GHL_CONVERSATIONS_VERSION,
      ),
    );
    return { ok: true, contactId, messageId: firstString(result.messageId, result.id) };
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
