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

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text || !text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function fetchInbox(): Promise<InboxResponse> {
  const res = await fetch(buildUrl(API_CONFIG.endpoints.inbox), {
    method: 'GET',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Inbox error: ${res.status}`);
  return safeJson(res);
}

export async function fetchChat(contactId: string, page = 1): Promise<Message[]> {
  const url = `${buildUrl(API_CONFIG.endpoints.chat)}/${contactId}?page=${page}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Chat error: ${res.status}`);
  const data = await safeJson(res);
  if (Array.isArray(data)) return data;
  if (data.messages && Array.isArray(data.messages)) return data.messages;
  if (data.chats && Array.isArray(data.chats)) return data.chats;
  if (data.data && Array.isArray(data.data)) return data.data;
  return [];
}

export async function syncMessages(contactId: string, cursor: number): Promise<Message[]> {
  const url = `${buildUrl(API_CONFIG.endpoints.sync)}?contactId=${contactId}&cursor=${cursor}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Sync error: ${res.status}`);
  const data = await safeJson(res);
  return data.messages || data || [];
}

export async function sendMessage(payload: SendMessagePayload): Promise<any> {
  const res = await fetch(buildUrl(API_CONFIG.endpoints.send), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Send error: ${res.status}`);
  return safeJson(res);
}

export async function changeState(payload: ChangeStatePayload): Promise<any> {
  const res = await fetch(buildUrl(API_CONFIG.endpoints.state), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`State error: ${res.status}`);
  return safeJson(res);
}
