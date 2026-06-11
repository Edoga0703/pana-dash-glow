import type { ChangeStatePayload, InboxResponse, Message, SendMessagePayload } from "../types";
import { getChat, getInbox, postMessage, postState } from "./crm.functions";

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

export async function changeState(payload: ChangeStatePayload): Promise<unknown> {
  return postState({ data: payload });
}
