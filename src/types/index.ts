// ══════════════════════════════════════════════════════════
// TIPOS — CuentasTupana CRM v2
// ══════════════════════════════════════════════════════════

export interface Chat {
  contactId: string;
  conversationId: string;
  name: string;
  phone: string;
  lastMessage: string;
  unreadCount: number;
  status: 'bot' | 'humano' | 'pausado';
  botActive: boolean;
  humanOverride: boolean;
  reason?: string;
  lastMessageTs: string;
  updatedAt: string;
  pinned?: boolean;
  archived?: boolean;
  pinnedAt?: string;
  archivedAt?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'assistant';
  text: string;
  mediaUrl?: string;
  createdAt: string;
  appId?: string;
  senderType?: 'bot' | 'human' | 'client';
  ghlMessageId?: string;
  isRead: boolean;
}

export interface InboxResponse {
  ok: boolean;
  chats: Chat[];
}

export interface SendMessagePayload {
  contactId: string;
  text: string;
  userName: string;
}

export interface SendMediaPayload {
  contactId: string;
  fileName: string;
  mimeType: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'audio' | 'file';
  userName: string;
}

export interface ChangeStatePayload {
  contactId: string;
  state: 'bot' | 'humano' | 'pausado' | 'pin' | 'unpin' | 'archive' | 'unarchive';
  userName: string;
}
