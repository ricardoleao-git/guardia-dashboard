# GuardIA Dashboard — Banco de Dados e Supabase

**Versão:** 1.0.0 | **Última atualização:** 22 Jul 2026

## Visão Geral

O GuardIA Dashboard usa o Supabase como backend completo, incluindo PostgreSQL, Auth, Storage e Realtime. Quando o Supabase não está configurado (variáveis de ambiente ausentes), o sistema opera em **modo demo** com dados mockados e persistência em localStorage.

## Configuração de Ambiente

### Variáveis Necessárias

```env
# Frontend (Vite)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

### Verificação Automática

O arquivo `client/src/lib/supabase.ts` verifica se as variáveis existem:

```typescript
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;
```

Quando `isSupabaseConfigured` é `false`, todos os hooks e funções usam dados mockados e localStorage como fallback.

## Schema do Banco de Dados

### Tabela: `camera_events` (criada pelo Connector)

Tabela principal de eventos de câmera, populada pelo Connector on-prem.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `event_id` | TEXT PK | ID único do evento |
| `camera_serial` | TEXT | Serial da câmera |
| `operator` | TEXT | Tipo de operador (FaceReco, VehicleReco, etc.) |
| `timestamp` | TIMESTAMPTZ | Momento do evento |
| `created_at` | TIMESTAMPTZ | Inserção no banco |
| `payload` | JSONB | Payload completo do evento |
| `image_url` | TEXT | URL da imagem no Storage |
| `annotations` | JSONB | Anotações dos operadores (adicionado por migration) |

**Migration adicional:** `db/add_annotations_column.sql`

```sql
ALTER TABLE camera_events
ADD COLUMN IF NOT EXISTS annotations JSONB DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_camera_events_has_annotations
ON camera_events (event_id)
WHERE annotations IS NOT NULL;
```

### Tabela: `profiles` (criada por migration)

Tabela de perfis de operadores vinculada ao Supabase Auth.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK | ID do usuário no Supabase Auth |
| `email` | TEXT UNIQUE | Email do operador |
| `full_name` | TEXT | Nome completo |
| `role` | TEXT DEFAULT 'viewer' | Role: admin, operator, viewer |
| `status` | TEXT DEFAULT 'active' | Status: active, invited, disabled |
| `last_sign_in_at` | TIMESTAMPTZ | Último login |
| `created_at` | TIMESTAMPTZ DEFAULT NOW() | Data de criação |

**Migration:** `db/add_auth_profiles.sql`

Características:
- RLS habilitada: leitura para autenticados, escrita apenas para admins
- Trigger para criar profile automaticamente no `auth.users` INSERT
- Função `is_admin()` para verificar role admin

### Tabela: `audit_logs` (criada por migration)

Registro de auditoria de todas as ações dos operadores.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID PK DEFAULT gen_random_uuid() | ID único |
| `user_id` | TEXT | ID do usuário (ou 'demo-user') |
| `user_name` | TEXT | Nome do operador |
| `user_email` | TEXT | Email do operador |
| `action` | TEXT NOT NULL | Tipo de ação (ex: annotation_create) |
| `resource_type` | TEXT | Tipo de recurso afetado |
| `resource_id` | TEXT | ID do recurso |
| `details` | JSONB | Detalhes adicionais em JSON |
| `created_at` | TIMESTAMPTZ DEFAULT NOW() | Momento da ação |

**Migration:** `db/add_audit_logs.sql`

Características:
- RLS habilitada: leitura para autenticados, escrita para autenticados
- Index em `created_at` (desc), `user_id`, `action`
- View `audit_logs_with_profiles` para join com profiles

### Tabela: `search_presets` (criada por migration)

Presets de busca compartilhados entre operadores.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | TEXT PK | ID único do preset |
| `name` | TEXT NOT NULL | Nome do preset |
| `filters` | JSONB NOT NULL | Filtros salvos em JSON |
| `created_by` | TEXT DEFAULT 'anonymous' | Criador |
| `created_at` | TIMESTAMPTZ DEFAULT NOW() | Data de criação |
| `updated_at` | TIMESTAMPTZ DEFAULT NOW() | Última atualização |

**Migration:** `db/add_search_presets.sql`

Características:
- RLS habilitada: leitura e escrita para todos (MVP interno)
- Trigger `update_updated_at()` para manter `updated_at` atualizado

### Tabela: `connector_status` (criada pelo Connector)

Status do Connector on-prem, atualizado periodicamente.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | INT PK | ID do registro (sempre 1) |
| `status` | TEXT | online, offline, syncing |
| `last_sync` | TIMESTAMPTZ | Última sincronização |
| `events_count` | INT | Total de eventos sincronizados |
| `pending_events` | INT | Eventos pendentes de sync |

## Storage

### Bucket: `events_media`

Bucket público para armazenamento de imagens de eventos. O Connector faz upload das imagens capturadas pelas câmeras e o Dashboard recupera via URL pública.

## Realtime

### Subscription: `camera_events_changes`

```typescript
const channel = supabase.channel("camera_events_changes");
channel.on(
  "postgres_changes",
  { event: "INSERT", table: "camera_events" },
  (payload) => {
    callback(payload.new);
  }
);
channel.subscribe();
```

Quando um novo evento é inserido pelo Connector, o Dashboard recebe em tempo real via WebSocket e atualiza a interface instantaneamente.

## Ordem de Execução das Migrations

Execute no SQL Editor do Supabase na seguinte ordem:

1. `db/supabase_schema.sql` (do Connector) — cria `camera_events` + bucket `events_media`
2. `db/add_auth_profiles.sql` — cria tabela `profiles` + RLS + triggers
3. `db/add_annotations_column.sql` — adiciona coluna `annotations` em `camera_events`
4. `db/add_search_presets.sql` — cria tabela `search_presets`
5. `db/add_audit_logs.sql` — cria tabela `audit_logs` + view

## Funções do Cliente Supabase

O arquivo `client/src/lib/supabase.ts` expõe as seguintes funções:

| Função | Descrição |
|--------|-----------|
| `fetchEventsFromSupabase(filters)` | Busca eventos com filtros (câmera, operador, data, busca) |
| `fetchConnectorStatus()` | Busca status do connector |
| `saveAnnotations(eventId, annotations)` | Salva anotações de um evento |
| `loadAnnotations(eventId)` | Carrega anotações de um evento |
| `subscribeToNewEvents(callback)` | Inscreve para receber novos eventos em tempo real |
