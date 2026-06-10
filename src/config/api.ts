// ══════════════════════════════════════════════════════════
// CONFIGURACION API — CuentasTupana CRM
// Define los valores en .env (VITE_N8N_BASE_URL, VITE_AUTH_HEADER_NAME, VITE_AUTH_HEADER_VALUE)
// IMPORTANTE: la URL DEBE ser https:// si la app corre en https (mixed content)
// ══════════════════════════════════════════════════════════

export const API_CONFIG = {
  baseUrl:
    (import.meta.env.VITE_N8N_BASE_URL as string | undefined) ||
    'https://mac-nature-individual-sum.trycloudflare.com',

  authHeaderName:
    (import.meta.env.VITE_AUTH_HEADER_NAME as string | undefined) || 'X-CRM-SECRET',
  authHeaderValue:
    (import.meta.env.VITE_AUTH_HEADER_VALUE as string | undefined) || 'pana2025',

  endpoints: {
    inbox: '/webhook/pana-crm-inbox-v1',
    chat: '/webhook/pana-crm-chat-v1', // + /:contactId
    sync: '/webhook/pana-crm-sync-v1',
    send: '/webhook/pana-crm-send-v1',
    state: '/webhook/pana-crm-state-v1',
  },

  pollingInterval: 8000,
};
