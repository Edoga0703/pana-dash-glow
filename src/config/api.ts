// ══════════════════════════════════════════════════════════
// CONFIGURACION API — CuentasTupana CRM
// Cambia estos valores segun tu entorno
// ══════════════════════════════════════════════════════════

export const API_CONFIG = {
  // URL base de tu n8n (sin /webhook al final)
  baseUrl: import.meta.env.VITE_N8N_BASE_URL || 'http://167.233.33.158:5678',

  // Header de autenticacion para los webhooks
  authHeaderName: import.meta.env.VITE_AUTH_HEADER_NAME || 'X-Pana-Key',
  authHeaderValue: import.meta.env.VITE_AUTH_HEADER_VALUE || 'CAMBIAR_POR_TU_KEY',

  // Endpoints del CRM (paths relativos)
  endpoints: {
    inbox: '/webhook/pana-crm-inbox-v1',
    chat: '/webhook/pana-crm-chat-v1', // + /:contactId
    sync: '/webhook/pana-crm-sync-v1',
    send: '/webhook/pana-crm-send-v1',
    state: '/webhook/pana-crm-state-v1',
  },

  // Intervalo de polling en ms (cada cuanto refresca la bandeja)
  pollingInterval: 8000,
};
