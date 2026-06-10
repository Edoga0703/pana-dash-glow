import { createFileRoute } from "@tanstack/react-router";
import Dashboard from "@/pages/Dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CuentasTupana CRM — Pana Bot" },
      { name: "description", content: "CRM de chats de WhatsApp para CuentasTupana." },
    ],
  }),
  component: Dashboard,
});
