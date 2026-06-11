// Supabase eliminado - middleware sin auth
import { createMiddleware } from "@tanstack/react-start";
export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    return next({ context: { userId: "admin", claims: {} } });
  },
);
