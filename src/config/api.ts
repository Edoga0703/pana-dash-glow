export const API_CONFIG = {
  baseUrl: (import.meta.env.VITE_N8N_BASE_URL as string | undefined) || '',
  authHeaderName:
    (import.meta.env.VITE_AUTH_HEADER_NAME as string | undefined) || 'X-CRM-SECRET',
  authHeaderValue:
    (import.meta.env.VITE_AUTH_HEADER_VALUE as string | undefined) || '',
  endpoints: {
    inbox: '/webhook/pana-crm-inbox-v1',
    chat: '/webhook/pana-crm-chat-v1',
    sync: '/webhook/pana-crm-sync-v1',
    send: '/webhook/pana-crm-send-v1',
    state: '/webhook/pana-crm-state-v1',
  },
  pollingInterval: 8000,
};

export const isCrmApiConfigured = Boolean(
  API_CONFIG.baseUrl && API_CONFIG.authHeaderValue,
);
