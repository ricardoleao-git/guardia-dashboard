# GuardIA Dashboard

Dashboard web de segurança e monitoramento escolar/predial, com integração de câmeras P6S (reconhecimento facial, LPR/veículos, controle de acesso), backend Supabase e connector Python on-prem.

> Consulte o [`CLAUDE.md`](./CLAUDE.md) para as diretrizes completas de segurança e padrões de código do projeto antes de contribuir.

## Stack

- **React 19** + **TypeScript** + **Vite 7** + **Tailwind CSS 4** + **shadcn/ui**
- **Wouter** para roteamento client-side
- **Supabase** (Postgres + Auth + Storage + Realtime) — sem backend Node próprio, o frontend fala direto com o Supabase via `anon key`
- **Connector Python** on-prem que lê as câmeras e sincroniza eventos com o Supabase
- Hospedagem: Manus WebDev (Autoscale) — guardia-vms.zenitetech.com

## Funcionalidades

O dashboard é uma SPA cujas telas renderizam dentro de `Dashboard.tsx` (view controlada por rota via Wouter):

- **Eventos e busca** — grid de eventos de câmera, busca semântica (`SemanticSearch`), linha do tempo por pessoa (`PersonTimeline`), reprodução de gravações (`Playback`)
- **Reconhecimento facial** — biblioteca de rostos (`FaceLibrary`), configuração de IA (`AIConfig`, `AIBox`, `AISummary`)
- **Frequência e custódia** — controle de presença (`Frequencia`), alertas de ausência (`AbsenceAlerts`), custódia de aluno (`Custodia`)
- **Veículos e acesso** — gestão de veículos (`VehicleManagement`), clausura veicular (`VehicleAccess`), controle de elevador (`ElevatorControl`)
- **Visitantes** — convites com QR code (`VisitorInvite`)
- **Automações** — regras de gatilho/condição/ação (`Automations`), incluindo alertas via WhatsApp
- **Administração** — gestão de dispositivos (`DeviceManagement`), usuários (`UserAdmin`), configurações de sistema (`SystemConfig`), log de auditoria (`AuditLog`), consentimento LGPD (`Consentimento`)
- **Autenticação** (`Login`) com modo visitante (guest) que usa apenas dados mock, sem tocar no Supabase
- **i18n** (PT/EN/ZH) via `I18nContext`

### Modo Demo (guest) vs Produção

- **Modo Demo / visitante:** login como visitante ativa `isGuestSession()` (ver `client/src/lib/guest-mode.ts`). Todos os hooks verificam essa flag e retornam apenas dados mockados (`client/src/lib/mock-data.ts`), sem nenhuma chamada ao Supabase.
- **Modo Produção:** usuários autenticados consomem dados reais via hooks dedicados (`client/src/hooks/use*.ts`), com Realtime subscriptions do Supabase.

## Configuração

### Variáveis de ambiente do frontend

Crie um `.env` na raiz com:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

> Use sempre a **anon key**, nunca a `service_role` key no frontend — a RLS do banco é o que garante o isolamento de dados.

### Schema do Supabase

Execute os scripts de `db/` no SQL Editor do Supabase, na ordem:

1. `00_setup_complete.sql` — `camera_events`, `profiles`, `search_presets`, `audit_logs`
2. `01_extended_tables.sql` — `automation_rules`, `face_lists`, `attendance`, `vehicles`, `vehicle_access`, `visitor_invites`, `devices`, `system_config`
3. `add_connector_status.sql` — `connector_status` (heartbeat do connector)
4. Demais `add_*.sql` conforme necessário (anotações, colunas extras)

Todas as tabelas têm RLS habilitada. `audit_logs` é append-only (sem UPDATE/DELETE).

### Desenvolvimento

```bash
pnpm install
pnpm dev
```

### Build e verificação

```bash
pnpm build          # build de produção (Vite)
pnpm check          # tsc --noEmit
pnpm test           # vitest (testes unitários do frontend)
```

## Estrutura de arquivos

```
client/src/
  pages/          # páginas da aplicação (renderizadas dentro de Dashboard.tsx)
  components/     # componentes reutilizáveis + shadcn/ui
  hooks/          # hooks de acesso a dados (useEvents, useFaceLists, useVehicles, ...)
  contexts/       # React contexts (Auth, Theme, I18n)
  lib/            # supabase.ts, types.ts, mock-data.ts, guest-mode.ts, format.ts
connector/
  src/            # código Python do connector (P6S client, mapeamento de eventos, sync)
  config/         # config.yaml (gitignored) e config.example.yaml
  tests/          # testes unitários (pytest)
db/               # scripts SQL de setup e migrations incrementais
scripts/          # scripts de manutenção (ex: backup_supabase.py)
docs/             # documentação técnica detalhada
```

## Connector Python (on-prem)

O connector roda próximo às câmeras (Raspberry Pi ou PC de bancada) e faz a ponte com o Supabase:

1. **Câmera P6S** envia evento via HTTP para o connector
2. Connector mapeia o payload (`event_mapper.py`) e envia imagens ao Storage (`image_uploader.py`)
3. Connector grava o evento no Supabase (`supabase_sink.py`), usando a **anon key** (a RLS permite insert)
4. Dashboard recebe o evento em tempo real via Supabase Realtime

Câmeras suportadas: D1–D6, modelos H5AI-50, F4C-T e T5AI. Alertas via WhatsApp (`whatsapp_alerts.py`) existem mas ficam desativados por padrão (`enabled: false`).

Deploy: `connector/install.sh` + `guardia-connector.service` (systemd). Veja `connector/DEPLOY.md`.

## Testes

- **Frontend:** `vitest`, configurado em `vitest.config.ts`. Rode com `pnpm test`.
- **Connector (Python):** `pytest` em `connector/tests/`.

## Segurança

Veja o [`CLAUDE.md`](./CLAUDE.md) para as regras completas. Resumo:

- Nunca commitar credenciais reais (`config.yaml` do connector é gitignored)
- Apenas `anon key` no frontend e no connector — `service_role` nunca em código client-side
- RLS obrigatória em todas as tabelas
- Modo visitante nunca acessa o Supabase
- `audit_logs` é append-only
