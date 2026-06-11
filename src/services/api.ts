import type { ChangeStatePayload, InboxResponse, Message, SendMediaPayload, SendMessagePayload } from "../types";
import { getChat, getInbox, postMedia, postMessage, postState } from "./crm.functions";

export async function fetchInbox(): Promise<InboxResponse> {
  return (await getInbox()) as unknown as InboxResponse;
}

export async function fetchChat(contactId: string, page = 1): Promise<Message[]> {
  const data = (await getChat({ data: { contactId, page } })) as { messages?: Message[] };
  return Array.isArray(data.messages) ? data.messages : [];
}

export async function sendMessage(payload: SendMessagePayload): Promise<unknown> {
  return postMessage({ data: payload });
}

export async function sendMedia(payload: SendMediaPayload): Promise<unknown> {
  return postMedia({ data: payload });
}

export async function changeState(payload: ChangeStatePayload): Promise<unknown> {
  return postState({ data: payload });
}
