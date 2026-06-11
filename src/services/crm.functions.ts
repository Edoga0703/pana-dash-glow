import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const chatInput = z.object({
  contactId: z.string().min(1),
  page: z.number().int().positive().default(1),
});
const sendInput = z.object({
  contactId: z.string().min(1),
  text: z.string().trim().min(1).max(4000),
  userName: z.string().trim().min(1).max(120),
});
const stateInput = z.object({
  contactId: z.string().min(1),
  state: z.enum(["bot", "humano", "pausado"]),
  userName: z.string().trim().min(1).max(120),
});

function config() {
  const baseUrl = process.env.N8N_BASE_URL || process.env.VITE_N8N_BASE_URL;
  const secret = process.env.CRM_SECRET || process.env.VITE_AUTH_HEADER_VALUE;
  if (!baseUrl || !secret) throw new Error("Falta configurar N8N_BASE_URL y CRM_SECRET");
  return { baseUrl: baseUrl.replace(/\/$/, ""), secret };
}

async function crmRequest(path: string, init: RequestInit = {}) {
  const { baseUrl, secret } = config();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-CRM-SECRET": secret,
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(body?.error || `CRM error ${response.status}`);
  return body;
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
  .handler(({ data }) =>
    crmRequest("/webhook/pana-crm-send-v1", { method: "POST", body: JSON.stringify(data) }),
  );

export const postState = createServerFn({ method: "POST" })
  .inputValidator(stateInput)
  .handler(({ data }) =>
    crmRequest("/webhook/pana-crm-state-v1", { method: "POST", body: JSON.stringify(data) }),
  );
