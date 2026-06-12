import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ChatAssignment = {
  contact_id: string;
  agent_id: string;
  taken_at: string;
  agent_name: string;
  agent_avatar_url: string | null;
};

export function useChatAssignment(contactId: string | null) {
  const [assignment, setAssignment] = useState<ChatAssignment | null>(null);

  const reload = useCallback(async () => {
    if (!contactId) {
      setAssignment(null);
      return;
    }
    const { data: a } = await supabase
      .from("chat_assignments")
      .select("contact_id, agent_id, taken_at")
      .eq("contact_id", contactId)
      .maybeSingle();
    if (!a) {
      setAssignment(null);
      return;
    }
    const { data: p } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", a.agent_id)
      .maybeSingle();
    setAssignment({
      contact_id: a.contact_id,
      agent_id: a.agent_id,
      taken_at: a.taken_at,
      agent_name: p?.display_name ?? "Agente",
      agent_avatar_url: p?.avatar_url ?? null,
    });
  }, [contactId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function takeChat(agentId: string) {
    // Delete prior assignment (so a different agent can take over), then insert.
    await supabase.from("chat_assignments").delete().eq("contact_id", contactId!);
    const { error } = await supabase
      .from("chat_assignments")
      .insert({ contact_id: contactId!, agent_id: agentId });
    if (error) throw error;
    await reload();
  }

  async function logSentMessage(agentId: string, text: string) {
    await supabase.from("sent_messages").insert({
      contact_id: contactId!,
      agent_id: agentId,
      text: text.slice(0, 4000),
    });
  }

  return { assignment, reload, takeChat, logSentMessage };
}
