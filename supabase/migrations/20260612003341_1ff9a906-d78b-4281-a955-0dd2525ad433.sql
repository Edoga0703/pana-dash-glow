
-- Tighten chat_assignments policies
DROP POLICY "Authenticated can update assignments" ON public.chat_assignments;
DROP POLICY "Authenticated can delete assignments" ON public.chat_assignments;

CREATE POLICY "Agents update own assignments" ON public.chat_assignments
  FOR UPDATE TO authenticated
  USING (auth.uid() = agent_id)
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents delete own assignments" ON public.chat_assignments
  FOR DELETE TO authenticated
  USING (auth.uid() = agent_id);

-- Lock down SECURITY DEFINER / trigger-only functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
