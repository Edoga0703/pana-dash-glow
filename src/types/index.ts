export interface Chat {
  contactId: string;
  conversationId: string | null;
  name: string;
  phone: string;
  lastMessage: string;
  unreadCount: number;
  status: "bot" | "humano" | "pausado";
  botActive: boolean;
  humanOverride: boolean;
  reason?: string | null;
  lastMessageTs: string | null;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: "user" | "model" | "assistant";
  text: string;
  mediaUrl?: string;
  createdAt: string;
  appId?: string;
  senderType?: "bot" | "human" | "client";
  ghlMessageId?: string;
  isRead?: boolean;
}

export interface InboxResponse {
  ok: boolean;
  chats: Chat[];
}

export interface SendMessagePayload {
  contactId: string;
  text: string;
  userName: string;
  mediaBase64?: string;
  mediaMimeType?: string;
  mediaName?: string;
}

export interface ChangeStatePayload {
  contactId: string;
  state: "bot" | "humano" | "pausado";
  userName: string;
}
