// ══════════════════════════════════════════════════════════
// API SERVICE — Conexion con n8n CRM endpoints
// ══════════════════════════════════════════════════════════

import { API_CONFIG } from '../config/api';
import type { InboxResponse, Message, SendMessagePayload, ChangeStatePayload } from '../types';

function getHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    [API_CONFIG.authHeaderName]: API_CONFIG.authHeaderValue,
  };
}

function buildUrl(path: string): string {
  return `${API_CONFIG.baseUrl}${path}`;
}

// ── Bandeja de chats ──────────────────────────────────────
export async function fetchInbox(): Promise<InboxResponse> {
  const res = await fetch(buildUrl(API_CONFIG.endpoints.inbox), {
    method: 'GET',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Inbox error: ${res.status}`);
  return res.json();
}

// ── Historial de un chat ──────────────────────────────────
export async function fetchChat(contactId: string, page = 1): Promise<Message[]> {
  const url = `${buildUrl(API_CONFIG.endpoints.chat)}/${contactId}?page=${page}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Chat error: ${res.status}`);
  const data = await res.json();
  return data.messages || data.chats || data || [];
}

// ── Sync incremental ──────────────────────────────────────
export async function syncMessages(contactId: string, cursor: number): Promise<Message[]> {
  const url = `${buildUrl(API_CONFIG.endpoints.sync)}?contactId=${contactId}&cursor=${cursor}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Sync error: ${res.status}`);
  const data = await res.json();
  return data.messages || data || [];
}

// ── Enviar mensaje como humano ────────────────────────────
export async function sendMessage(payload: SendMessagePayload): Promise<{ messageId: string }> {
  const res = await fetch(buildUrl(API_CONFIG.endpoints.send), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Send error: ${res.status}`);
  return res.json();
}

// ── Cambiar estado del chat ───────────────────────────────
export async function changeState(payload: ChangeStatePayload): Promise<{ contactId: string; botActive: boolean }> {
  const res = await fetch(buildUrl(API_CONFIG.endpoints.state), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`State error: ${res.status}`);
  return res.json();
}
