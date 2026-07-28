# CORE-01 — Modelo de dados do core (PostgreSQL)

Schema multi-tenant do GuardIA core, com isolamento no banco. Alvo: **PostgreSQL no datacenter HostDime** (servidor 1TB). Nenhuma linha depende de Supabase.

Subordinado a [04_Arquitetura-Tecnica](04_Arquitetura-Tecnica.md) — este arquivo é o detalhamento do que lá é componente; onde divergirem, vale o `04`.

## Neste documento

1. Princípios
2. Decisões de nomenclatura em aberto (PND-16)
3. Hierarquia
4. DDL
5. RLS
6. Storage de mídia
7. Retenção e expurgo
8. Ordem das migrations
9. Definição de pronto

---

## 1. Princípios

1. **Multi-tenant desde a primeira migration.** `CLAUDE.md` §3 é explícito: multi-tenant é requisito de schema, não de roadmap. Retrofit em banco com dado de cliente dentro sempre vaza algo.
2. **Isolamento no banco, não na aplicação.** RLS em toda tabela com coluna de tenancy. Um bug de `where` no código não pode virar vazamento entre clientes. O schema atual do protótipo tem RLS permissiva (`_read USING (true)`) e zero coluna de tenancy nas 12 tabelas — é exatamente o que este arquivo substitui (`CLAUDE.md` §9, itens 6 e 7).
3. **Imagem não entra em coluna.** O binário fica no storage; a tabela guarda URL, MD5 e expiração.
4. **Retenção é dado de schema, não bom senso.** Toda tabela sensível tem coluna de prazo e job de expurgo. Prazos em [CORE-05](CORE-05_RETENCAO-E-CONSENTIMENTO.md).
5. **Migrations versionadas** (Drizzle ou Prisma). SQL aplicado à mão no editor gera drift — foi o que aconteceu no protótipo (`CLAUDE.md` §10, item 4).
6. **Nenhum segredo em coluna.** `integrations.config` guarda referência a cofre, não token.

## 2. Decisões de nomenclatura em aberto — **PND-16**

Duas colisões herdadas, resolvidas **provisoriamente** aqui e pendentes de confirmação com o Tiago (junto com PND-02, as chaves `FaceUUID`/`GroupID2`):

| Questão | Opções na base | Adotado aqui | Racional |
|---|---|---|---|
| Nome da tabela de eventos | `camera_events` (repo), `p6s_events` (`P6S-05_SPEC` §A.4), `events` (V4) | **`events`** | A tabela do core recebe evento de **qualquer** driver, não só de câmera nem só do p6s. `p6s_events` continua válido como nome do **contrato do driver**, antes da normalização |
| Coluna de tenancy | `tenant_id` (`CLAUDE.md` §3), `org_id` (V4) | **`org_id`** + `site_id` | A hierarquia real é de dois níveis: a administradora contrata (org) e opera N condomínios/escolas (site). `tenant_id` sozinho não expressa isso, e o painel da administradora depende dessa distinção |

Se a decisão for outra, é troca mecânica antes da migration 001 — e **só** antes. Depois vira o retrofit que o princípio 1 existe para evitar.

## 3. Hierarquia

```
org (cliente / administradora)
 └── site (condomínio, escola, câmara fria, unidade)
      ├── connector (1 por site)
      ├── device (NVR, IPC)
      │    └── channel (D1..D36)
      ├── person ──┬── face_group (turma / bloco)
      │            └── person_device_sync (estado do fan-out)
      ├── event
      └── automation
```

## 4. DDL

```sql
-- ============ TENANCY ============
create table orgs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  vertical    text not null check (vertical in ('escola','condominio','camara_fria','misto')),
  branding    jsonb not null default '{}',   -- white label
  created_at  timestamptz not null default now()
);

create table sites (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  name        text not null,
  timezone    text not null default 'America/Fortaleza',
  address     text,
  created_at  timestamptz not null default now()
);
create index on sites(org_id);

create table memberships (
  user_id     uuid not null,
  org_id      uuid not null references orgs(id) on delete cascade,
  role        text not null check (role in ('admin','operator','viewer')),
  site_scope  uuid[],                        -- null = toda a org
  primary key (user_id, org_id)
);

-- ============ INFRA ============
create table connectors (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references orgs(id) on delete cascade,
  site_id      uuid not null references sites(id) on delete cascade,
  name         text not null,
  api_key_hash text not null,
  version      text,
  last_seen_at timestamptz,
  status       text not null default 'unknown',   -- online|degraded|offline|unknown
  queue_depth  int  not null default 0
);
create index on connectors(org_id, site_id);

create table devices (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references orgs(id) on delete cascade,
  site_id       uuid not null references sites(id) on delete cascade,
  connector_id  uuid references connectors(id) on delete set null,
  driver        text not null default 'p6s',   -- p6s|isapi|intelbras|unv|positivo|onvif
  kind          text not null check (kind in ('nvr','ipc')),
  model         text,                          -- RS-436MLJ-L2/S8, T5AI, F4C-T
  serial        text not null,
  ip            inet,
  reachable     text not null default 'lan' check (reachable in ('lan','nat')),
  capabilities  jsonb not null default '{}',   -- DeviceCap / AICap / PTZCap
  firmware      text,
  face_capacity int,                           -- 100000 (RS-436MLJ) | 5000 (T5AI) | 1000 (RS-N336ALJ)
  last_seen_at  timestamptz,
  unique (org_id, serial)
);
create index on devices(org_id, site_id);

create table channels (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references orgs(id) on delete cascade,
  device_id    uuid not null references devices(id) on delete cascade,
  channel_id   int  not null,          -- 1..36 no NVR; 1 na câmera
  label        text,                   -- "D5"
  name         text,                   -- "COPA"
  ip           inet,
  model        text,
  face_enabled boolean not null default false,
  role         text not null default 'monitor'
               check (role in ('monitor','attendance','entry','exit','perimeter')),
  status       text not null default 'unknown',  -- online|offline|auth_error|video_lost
  unique (device_id, channel_id)
);

-- ============ PESSOAS ============
create table face_groups (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  site_id     uuid not null references sites(id) on delete cascade,
  name        text not null,                    -- "6ºA" / "Bloco B"
  group_id2   text not null,                    -- chave enviada ao device (PND-02)
  threshold   int check (threshold between 0 and 100),
  unique (site_id, group_id2)
);

create table persons (
  id             uuid primary key default gen_random_uuid(),   -- vira o FaceUUID (PND-02)
  org_id         uuid not null references orgs(id) on delete cascade,
  site_id        uuid not null references sites(id) on delete cascade,
  face_group_id  uuid references face_groups(id) on delete set null,
  name           text not null,
  sex            text check (sex in ('male','female')),
  bond           text,                 -- aluno|funcionario|morador|visitante|prestador
  doc_type       text,
  doc_number     text,
  list_type      text not null default 'white' check (list_type in ('white','black','none')),
  valid_from     date,
  valid_until    date,                 -- visitante/prestador expira sozinho
  photo_url      text,
  photo_md5      text,
  consent_status text not null default 'pending'
                 check (consent_status in ('pending','granted','revoked','not_required')),
  consent_by     text,                 -- responsável legal, quando menor
  consent_at     timestamptz,
  is_minor       boolean not null default false,
  alt_credential text,                 -- alternativa não-biométrica: tag|qr|senha|none
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create index on persons(org_id, site_id);
create index on persons(face_group_id);

-- estado do fan-out: uma linha por (pessoa × device)
create table person_device_sync (
  person_id   uuid not null references persons(id) on delete cascade,
  device_id   uuid not null references devices(id) on delete cascade,
  org_id      uuid not null references orgs(id) on delete cascade,
  state       text not null default 'pending'
              check (state in ('pending','sending','ok','error','deleting','deleted','divergent')),
  device_md5  text,
  attempts    int not null default 0,
  last_error  text,
  updated_at  timestamptz not null default now(),
  primary key (person_id, device_id)
);
create index on person_device_sync(org_id, state);

-- ============ EVENTOS ============
create table events (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references orgs(id) on delete cascade,
  site_id       uuid not null references sites(id) on delete cascade,
  connector_id  uuid references connectors(id) on delete set null,
  device_id     uuid references devices(id) on delete set null,
  channel_id    uuid references channels(id) on delete set null,
  device_event_id text,               -- id do evento no device
  dedupe_key    text not null,        -- serial|deviceEventId|operator
  driver        text not null,        -- p6s|isapi|...
  source        text not null,        -- camera_http|camera_mqtt|nvr_email|reconcile
  type          text not null,        -- catálogo canônico (04 §4); 'unmapped' quando sem correspondente
  occurred_at   timestamptz not null,
  received_at   timestamptz not null default now(),
  person_id     uuid references persons(id) on delete set null,
  plate         text,
  match_list    text check (match_list in ('white','black','unknown')),
  match_score   int check (match_score between 0 and 100),
  severity      text not null default 'info' check (severity in ('critical','warning','info')),
  attributes    jsonb not null default '{}',   -- faceFeature: idade, gênero, óculos, máscara, quality
  media         jsonb not null default '[]',   -- [{role,url,md5,expires_at}] role: capture|enrolled|background
  raw_ref       text,                          -- ponteiro para o payload bruto arquivado
  raw           jsonb,                         -- payload original, sujeito a expurgo próprio
  purge_after   timestamptz,                   -- CORE-05
  unique (org_id, dedupe_key)
);
create index on events(org_id, site_id, occurred_at desc);
create index on events(org_id, type, occurred_at desc);
create index on events(person_id, occurred_at desc);
create index on events(org_id, severity) where severity <> 'info';

-- ============ FREQUÊNCIA (spec 10 §4 via CORE-07) ============
-- Presença automática: FaceReco com match em canal role='attendance'.
-- Dedupe: 1 presença por pessoa por período (dia ou turno).
create table attendance (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  site_id     uuid not null references sites(id) on delete cascade,
  person_id   uuid not null references persons(id) on delete cascade,
  channel_id  uuid references channels(id) on delete set null,
  ts          timestamptz not null,
  type        text not null default 'in' check (type in ('in','out')),
  match_score int,
  period_key  text not null,            -- '2026-07-26' ou '2026-07-26-manha'
  unique (person_id, period_key, type)
);
create index on attendance(org_id, site_id, ts desc);

-- Expectativas: o gatilho por NÃO-EVENTO (spec 10 §3.2 via CORE-07).
-- O scheduler avalia na hora due: o evento esperado ocorreu? Não → dispara.
create table expectations (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  site_id         uuid references sites(id) on delete cascade,
  name            text not null,            -- "Aluno não chegou"
  expect          jsonb not null,           -- {event_type, person_group|channel, by_time, on_days}
  on_absence      jsonb not null,           -- ações (mesmo formato de automations.actions)
  enabled         boolean not null default true,
  created_at      timestamptz not null default now()
);
create index on expectations(org_id, enabled);

-- ============ AUTOMAÇÃO (ver CORE-02) ============
create table schedules (
  id        uuid primary key default gen_random_uuid(),
  org_id    uuid not null references orgs(id) on delete cascade,
  name      text not null,           -- "Horário letivo"
  grid      jsonb not null,          -- 7 x 24
  holidays  date[] not null default '{}'
);

create table integrations (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references orgs(id) on delete cascade,
  kind         text not null,        -- webhook|whatsapp|email|push|relay|tts|ptz_preset
  name         text not null,
  config       jsonb not null default '{}',   -- referência a cofre, nunca o segredo
  last_test_at timestamptz,
  last_test_ok boolean
);

create table automations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  site_id     uuid references sites(id) on delete cascade,   -- null = toda a org
  name        text not null,
  enabled     boolean not null default true,
  trigger     jsonb not null,   -- {kind, type, filters, channels}
  conditions  jsonb not null default '[]',
  actions     jsonb not null,   -- [{integration_id, params}]
  cooldown_s  int not null default 0,
  group_key   text,             -- expressão de agrupamento p/ anti-flood
  created_at  timestamptz not null default now()
);

create table automation_runs (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references orgs(id) on delete cascade,
  automation_id uuid not null references automations(id) on delete cascade,
  event_id      uuid references events(id) on delete set null,
  started_at    timestamptz not null default now(),
  duration_ms   int,
  status        text not null,       -- ok|partial|failed|simulated
  dry_run       boolean not null default false,
  results       jsonb not null default '[]'
);
create index on automation_runs(org_id, started_at desc);

-- ============ OPERAÇÃO E AUDITORIA ============
create table jobs (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  kind        text not null,     -- face_sync|reconcile|purge|device_config|bulk_import
  payload     jsonb not null,
  state       text not null default 'queued',
  attempts    int not null default 0,
  run_after   timestamptz not null default now(),
  last_error  text
);
create index on jobs(state, run_after);

create table audit_log (
  id          bigserial primary key,
  org_id      uuid not null references orgs(id) on delete cascade,
  actor_id    uuid,
  action      text not null,          -- person.view_biometric | person.export | device.config_write | door.open | consent.revoke
  target_type text,
  target_id   text,
  sensitive   boolean not null default false,   -- acesso a dado biométrico
  meta        jsonb not null default '{}',
  at          timestamptz not null default now()
);
create index on audit_log(org_id, at desc);
create index on audit_log(org_id, sensitive, at desc) where sensitive;
```

> ⚠️ `audit_log` é **append-only**. Nenhum papel — inclusive `admin` — recebe `DELETE` ou `UPDATE`. O schema atual do protótipo permite `DELETE` a admin (`CLAUDE.md` §9, item 8); é um dos pontos que a migration 006 fecha.

## 5. RLS

```sql
alter table events  enable row level security;
alter table persons enable row level security;
-- repetir para TODA tabela com org_id

create or replace function current_org_ids() returns uuid[]
language sql stable as $$
  select coalesce(array_agg(org_id), '{}')
  from memberships
  where user_id = current_setting('app.user_id', true)::uuid
$$;

create policy org_isolation on events
  for all using (org_id = any(current_org_ids()));
```

Regras:

- Toda tabela com `org_id` tem RLS. **Sem exceção, sem `USING (true)`.**
- O connector autentica com credencial de serviço **escopada ao seu `org_id` + `site_id`**, nunca uma chave global — e nunca a chave anônima exposta no cliente, como está hoje no protótipo.
- `site_scope` no membership refina para o operador que só vê uma unidade.
- Teste automatizado de isolamento: criar duas orgs, popular as duas, consultar como usuário da org A e **esperar zero linhas** da org B. Esse teste roda no CI — RLS sem teste é RLS que ninguém sabe se está ligada.

## 6. Storage de mídia

| Regra | Detalhe |
|---|---|
| Bucket privado | nunca público, nunca "unlisted" |
| URL assinada **curta** | minutos, não dias |
| Caminho | `org/{org_id}/site/{site_id}/events/{yyyy}/{mm}/{dd}/{event_id}-{role}.jpg` |
| MD5 na tabela | conferência de integridade |
| Expurgo | job lê `purge_after`, apaga o objeto e zera `media` |

O Percebe é o único ponto da arquitetura que persiste imagem de rosto ([04](04_Arquitetura-Tecnica.md) §9). É o artefato mais sensível da base — trate o bucket como tal.

## 7. Retenção e expurgo

Job diário `purge`:

1. `events` com `purge_after < now()` → apagar mídia no storage; manter ou apagar metadado conforme a política de [CORE-05](CORE-05_RETENCAO-E-CONSENTIMENTO.md).
2. `events.raw` com prazo próprio (payload bruto vence antes do metadado) → `null`.
3. `persons` com `deleted_at` + prazo → apagar foto **e disparar a exclusão nos devices** via `person_device_sync` (no p6s: `DeletePersonList`), só marcando `deleted` quando o device confirmar.
4. Registrar cada passo em `audit_log`.

> O passo 3 é o que transforma "direito ao esquecimento" de promessa em fato. Apagar do banco e deixar a face na câmera é o pior dos mundos: você perdeu o dado e continua processando biometria. É o requisito de **exclusão propagada com comprovante** da Fase 2 do [05](05_Roadmap-e-Fases.md).

## 8. Ordem das migrations

```
001_tenancy      orgs, sites, memberships + RLS base
002_infra        connectors, devices, channels
003_people       face_groups, persons, person_device_sync
004_events       events + índices
005_automation   schedules, integrations, automations, automation_runs
006_ops          jobs, audit_log (append-only)
007_retention    colunas purge_after + funções de expurgo
```

**A migration 001 já traz RLS.** Nunca "ligar RLS depois" — o intervalo entre criar a tabela e ligar a política é exatamente onde os dados entram sem proteção.

`db/01_extended_tables.sql` do repo Manus serve como **levantamento de requisitos de campo**, nunca como schema final (`CLAUDE.md` §12, item 4). As `migrations/001→007` do monorepo ([CORE-07](CORE-07_INVENTARIO-DE-CODIGO.md) §2.3) são o rascunho mais próximo — mesma linhagem deste arquivo, com sintaxe validada — mas acopladas a `auth.users` do Supabase e sem as tabelas de conformidade; este arquivo prevalece.

## 9. Definição de pronto

- [ ] Migrations 001–007 versionadas e reversíveis, aplicadas por ferramenta (não pelo editor SQL).
- [ ] Teste de isolamento entre duas orgs passando no CI.
- [ ] `audit_log` sem `DELETE`/`UPDATE` para nenhum papel, comprovado por teste.
- [ ] Um evento real da bancada gravado em `events` com `dedupe_key` e mídia no bucket privado.
- [ ] Reenvio do mesmo evento não cria segunda linha (idempotência pelo `unique (org_id, dedupe_key)`).
- [ ] Job `purge` apagando mídia vencida e registrando em `audit_log`.
- [ ] Exclusão de uma pessoa propagada a todos os devices com comprovante em `person_device_sync`.

Fontes: base V4 `42_ARQ-Core-Banco-PostgreSQL` (23/07/2026), reescrito para a stack PostgreSQL/HostDime; `CLAUDE.md` §3, §9, §10 e §12; `04_Arquitetura-Tecnica` §4 e §9; `05_Roadmap-e-Fases` Fase 2.
