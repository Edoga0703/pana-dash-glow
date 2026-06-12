## Objetivo

Cada agente humano inicia sesión con email/contraseña. Al "Tomar chat" se muestra su foto y nombre arriba del chat, y cada mensaje nuevo enviado queda registrado internamente con quién lo envió.

## Backend (Lovable Cloud)

**Storage**
- Bucket público `agent-avatars` para fotos de perfil.

**Tablas nuevas**
- `profiles` — `id` (FK a `auth.users`), `display_name`, `avatar_url`. Auto-creada vía trigger al registrarse. RLS: cualquier agente autenticado puede leer todos los perfiles (para mostrar avatares); solo puede editar el suyo.
- `chat_assignments` — `contact_id` (PK), `agent_id`, `taken_at`. Registra qué agente tomó cada chat. RLS: lectura/escritura para autenticados.
- `sent_messages` — `id`, `contact_id`, `agent_id`, `text`, `sent_at`. Registro local de mensajes enviados desde el CRM (solo nuevos, post-login). RLS: lectura/escritura para autenticados.

**Auth**
- Solo email + contraseña. Sin auto-confirm (los agentes confirman su email).
- Sin signups públicos: el admin crea usuarios manualmente (lo gestionas tú desde el panel de Cloud → Users).

## Frontend

**Nuevas rutas**
- `/auth` — pantalla pública de login (email + contraseña).
- `/_authenticated/` — layout protegido (auto-generado por la integración); redirige a `/auth` si no hay sesión.
- Mover `Dashboard` de `/` a `/_authenticated/` para que requiera login.

**Cambios en UI**
- **Header global**: avatar + nombre del agente logueado, con botón "Cerrar sesión".
- **Página de perfil** (`/_authenticated/perfil`): editar nombre y subir foto al bucket.
- **ChatView header**: si el chat está asignado (`chat_assignments`), muestra avatar + nombre del agente que lo tomó. Si no, muestra el botón "Tomar chat" actual.
- **Botón "Tomar chat"**: además de llamar al webhook de n8n existente, hace `upsert` en `chat_assignments` con el `agent_id` del usuario logueado.
- **Envío de mensaje**: tras enviar exitosamente vía n8n, inserta una fila en `sent_messages` con `contact_id`, `agent_id`, `text`. (No se cambia el payload a n8n — registro 100% interno.)
- **Burbujas de mensajes salientes**: si el mensaje existe en `sent_messages` (match por contact_id + texto + ventana de tiempo), muestra mini-avatar + nombre del agente debajo de la burbuja.

## Detalles técnicos

- Usar `createServerFn` con `requireSupabaseAuth` para todas las escrituras (assignments, sent_messages, profile update).
- Cliente Supabase ya está en `client.ts` (con fallback no-throw que añadimos).
- Necesitarás añadir las vars `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` al `docker-compose.yml` de tu VPS y reconstruir; sin ellas el login no funciona en producción.
- El gate `_authenticated/route.tsx` ya viene gestionado por la integración de Lovable Cloud — no se edita.

## Fuera de alcance (no se hace en este plan)

- Roles admin/agente (todos los logueados tienen los mismos permisos).
- Filtros "mis chats" vs "todos".
- Historial pasado atribuido a agentes (solo nuevos a partir del login).
- Cambiar el payload enviado a n8n/GHL.

¿Procedo?
