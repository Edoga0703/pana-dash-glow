# CuentasTupana CRM — Panel de Atención

Panel de atención al cliente para CuentasTupana, conectado a n8n via API webhooks.

## Funcionalidades

- **Bandeja de chats** — Lista de conversaciones con estado (bot/humano/pausado), no leídos, último mensaje
- **Vista de conversación** — Historial completo con burbujas diferenciadas (cliente/bot/admin)
- **Enviar mensajes** — Responder como humano desde el CRM
- **Tomar/Reactivar chat** — Cambiar entre modo bot y modo humano
- **Polling automático** — Actualización cada 8 segundos

## Configuración

Copia `.env.example` a `.env` y ajusta:

```
VITE_N8N_BASE_URL=http://167.233.33.158:5678
VITE_AUTH_HEADER_NAME=X-Pana-Key
VITE_AUTH_HEADER_VALUE=tu_clave_secreta
```

## Endpoints de n8n requeridos

| Endpoint | Método | Función |
|---|---|---|
| `/webhook/pana-crm-inbox-v1` | GET | Lista de conversaciones |
| `/webhook/pana-crm-chat-v1/:id` | GET | Historial de un contacto |
| `/webhook/pana-crm-sync-v1` | GET | Mensajes nuevos (incremental) |
| `/webhook/pana-crm-send-v1` | POST | Enviar mensaje como humano |
| `/webhook/pana-crm-state-v1` | POST | Cambiar estado del chat |

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- Lovable compatible
