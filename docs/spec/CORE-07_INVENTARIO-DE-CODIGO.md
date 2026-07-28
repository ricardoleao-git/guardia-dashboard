# CORE-07 — Inventário de código: os dois repositórios

Fato que a base não registrava e que muda o planejamento: **existem dois repositórios**, não um. A auditoria do `07_Mapa-Repo` e a faxina do `CORE-06` falam do primeiro; boa parte do que o `CORE-01` e o `CORE-02` especificam **já existe em rascunho no segundo**.

Inventariado em 26/07/2026 a partir dos zips `guardia-monorepo`, `connector-p6s` e `guardia-db` (código de 21–23/07/2026).

## Neste documento

1. Os dois repositórios
2. Monorepo `guardia` — o que existe e em que estado
3. O que isso muda em cada arquivo CORE
4. O que continua valendo
5. Pendências e decisão de consolidação

---

## 1. Os repositórios

> **Nota (26/07, ~22h):** além dos dois abaixo, a auditoria do GitHub encontrou **`cool-freeze-guard`** (público, Lovable + Supabase, 98 commits em julho): protótipo da vertical **Câmaras Frias** — 33 páginas, incluindo `ColdAreas` (regras de exposição por ambiente, temperatura média), `ThermalBreaks`, `Kiosk` (ponto por totem) e uma página `GuardiaIntegration.tsx`. É insumo direto da **PND-09** (catálogo da vertical) e deve ser minerado antes de fechá-lo. Mesma checagem de segurança do dashboard se aplica (Supabase em repo público). O repo `camara-fria` (02/07) está **vazio** — candidato a exclusão. O monorepo `guardia` **não existe no GitHub** (confirmado no perfil, incluindo privados): o push é obrigatório.

## 1. Os dois repositórios principais

| | `guardia-dashboard` | monorepo `guardia` |
|---|---|---|
| Origem | Manus ("vibe-coded") | Claude Code, guiado pelas specs 01–11 |
| Analisado por | `07_Mapa-Repo` (de fora, pastas bloqueadas) + validação de build de ~21/07 | este inventário (código completo) |
| Front | **22 telas** (auditoria remota do HEAD `64290b4`, 26/07 20:40) | cópia do dashboard com **12 páginas** (AIConfig, AuditLog, Dashboard, DeviceManagement, FaceLibrary, Home, Login, NotFound, Playback, SystemConfig, UserAdmin, VehicleManagement) |
| Telemetria Manus | **coletor, plugins e deps removidos no HEAD** ✓ — mas restam: script **umami** no `index.html`, `allowedHosts: true` (o commit de 26/07 diz "para permitir preview via proxy Manus" — desenvolvimento segue no Manus), `@types/google.maps`, e 🔴 **anon key do Supabase hardcoded** em `supabase.ts` num repo **público** (também no histórico do git) | **ausente** (zero referências no `vite.config.ts`) |
| Backend | Supabase direto do cliente + um **connector Python próprio** (`connector/` com `p6s_client.py`, receptor HTTP) — rascunho do Manus, nunca validado contra hardware; o `07_Mapa-Repo` não pôde inspecioná-lo à época | `services/connector` (Node) + `services/core` |
| Schema | `db/00_setup_complete.sql` + `01_extended_tables.sql` single-tenant (zero `org_id`), **+4 SQLs novos no HEAD de 26/07**: annotations, audit_logs, auth_profiles, search_presets | `db/migrations/001→007` **multi-tenant com `org_id` e RLS** |
| Docs | README + NVR_ANALYSIS | `docs/specs/01–11` (inclui a spec das 56 telas → `P6S-10`) + `docs/protocolo/` + `docs/legado/` |

A relação entre os dois ficou provada no lote v6: existe um `guardia-dashboard-limpo.zip` + `FAXINA-realizada.md` — a faxina de telemetria foi **executada** sobre um snapshot de **12 páginas** (build limpo, 1.748 módulos), e é esse snapshot que virou o `apps/dashboard` do monorepo. As 10 telas extras (Automations, AbsenceAlerts, PersonTimeline, SemanticSearch, AISummary, Frequencia, VisitorInvite, ElevatorControl, VehicleAccess, AIBox) foram adicionadas **depois** no repo Manus (build de 22 páginas, 1.762 módulos) e nunca passaram pela faxina. As 22 telas estão no repo Manus; o esqueleto de backend está no monorepo. **PND-17 reformulada:** a pergunta não é mais "quantas telas existem", é **qual front é o canônico** — e a resposta exige diff dos dois no clone.

## 2. Monorepo `guardia` — o que existe e em que estado

### 2.1 `services/connector` (Node)

Recebe P6SHTTP na LAN, valida assinatura, responde Ack, normaliza, enfileira, sobe para a nuvem. O `CLAUDE.md` do repo declara: **"TESTADO: recebe evento e responde Ack"** — teste com evento simulado (`npm run test:event`), não com câmera real.

| Módulo | O que faz | Observação |
|---|---|---|
| `server.js` | POST de eventos + heartbeat-Ack com strategy; Ack imediato (<500 ms) | contrato certo |
| `signature.js` | OAuth 1.0a-like: 6 headers, SHA1 sobre string canônica, secret = serial | implementa a convenção do P6SHTTP |
| `queue.js` | fila local durável em SQLite (`better-sqlite3`, WAL) | sobrevive a queda de link |
| `normalize.js` | `OPERATOR_MAP` de 10 operadores → tipos internos; extrai as 3 imagens | ⚠️ mapeia para o enum **do driver** (`face_recognition`, `off_duty`…), não para o catálogo canônico do Percebe (`face.recognized`…). Falta a segunda tradução (`04` §4) |
| `uploader.js` / `config.js` | subida para a nuvem + configuração | destino atual: Supabase |

**O que falta para o contrato de `P6S-04`/`P6S-05`:** dedupe persistente por `dedupe_key`, retry com backoff, estado por device, job de reconciliação (`QueryRecordList`), e o lado CGI (o connector só *recebe*; não configura device nem cadastra face).

### 2.2 `services/core` — RuleEngine + scheduler de expectativas

**Existe, com 11/11 testes passando.** Corrige a linha de status do `CORE-02` ("não existe" → "núcleo existe em código, nunca rodou contra evento real").

- `engine.js` — avaliação síncrona em memória, ações assíncronas enfileiradas, multi-tenant por org, **idempotência por (rule_id, event.dedupe)**, dependências injetadas (testável sem banco). Bate com `CORE-02` §6.
- `trigger.js` / `conditions.js` / `actions.js` — o modelo gatilho→condições→ações da spec 10.
- `expectations.js` ⭐ — **o gatilho por não-evento já está implementado**: scheduler que numa hora T verifica se o evento esperado ocorreu e dispara a ausência ("todo aluno da turma-6A deve ter `face_recognition` até 08:00"). Injetável e testado.

**O que falta:** cooldown/agrupamento/escalonamento (o anti-flood do `CORE-02` §7 não está no código), simulador `dry-run`, persistência real de `automation_runs`, e a tradução para o catálogo canônico.

### 2.3 `db/migrations/001→007`

Precursor direto do `CORE-01` — mesma linhagem (orgs, sites, memberships, `current_org_ids()`, RLS desde a 001). Diferenças relevantes:

| Migrations do repo | `CORE-01` |
|---|---|
| `auth.users` do Supabase referenciado em `memberships` | neutro (`current_setting('app.user_id')`) — compatível com PostgreSQL/HostDime |
| roles `owner/admin/operator/viewer` | `admin/operator/viewer` |
| sem `person_device_sync`, `schedules`, `integrations`, consentimento, `purge_after` | presentes |
| `007_seed_bancada.sql` com os dados reais da bancada | equivalente aos dados de exemplo do `CORE-03` §9 |

Tratamento: as migrations do repo são **levantamento validado de sintaxe**, não o schema final — o `CORE-01` prevalece (PND-16 continua mandando decidir nomes antes da 001 definitiva). O acoplamento a `auth.users` é o único ponto Supabase e sai com uma linha.

### 2.4 Frequência facial (spec 10 §4) — lacuna do CORE

A spec 10 especifica a **Entrega 3** que nenhum arquivo CORE cobria: presença automática por `FaceReco` em canal marcado como ponto de frequência (`channel.role = attendance`), dedupe de 1 presença por período, tabela `attendance`, e exceções (não-chegada, saída fora de horário, frequência baixa por turma). O `CORE-01` foi atualizado com a tabela e a coluna de papel do canal (v2). Dependência honesta registrada na spec: **frequência de quem já está cadastrado funciona hoje** (a câmera reconhece quem está na base local); cadastro remoto em massa espera a PND-01.

## 3. O que isso muda em cada arquivo CORE

| Arquivo | Mudança |
|---|---|
| `CORE-01` | v2: tabela `attendance` + `channels.role`; nota de que as migrations 001–007 do repo são o rascunho validado |
| `CORE-02` | v2: status corrigido — o motor e o scheduler de não-evento existem em código com testes; o que falta é anti-flood, simulador e ligação ao banco |
| `CORE-04` | v2: §1 reescrito — dois fronts (22 telas no repo Manus, 12 no monorepo); PND-17 vira decisão de consolidação |
| `CORE-06` | v2: a faxina de telemetria aplica-se ao repo Manus; o monorepo já está limpo. A consolidação dos fronts (PND-17) decide **onde** a faxina acontece |

## 4. O que continua valendo

- A ordem de trabalho do `CLAUDE.md` §12 (`segurança → guardrails → bancada → schema → connector`) — o código existente não pula nenhuma etapa, só encurta a última.
- Nenhum dos serviços rodou contra **hardware real**. "11/11 testes" e "responde Ack" são com evento simulado. O `P6S-09` continua sendo o gate.
- A pendência 6 do `CLAUDE.md` do monorepo ("datasheet não confirma AX650/100k") está **superada**: o datasheet 53 confirma 100k faces e o `P6S-03` §1 reconcilia chip 23AP20 + módulo AX650; as fotos da bancada (`P6S-10` §1) mostram o AX650 rodando.

## 5. Pendências e decisão de consolidação

1. **PND-17 (reformulada):** consolidar os dois fronts. Diff `guardia-dashboard` × `apps/dashboard` no clone; decidir o canônico; portar o que faltar; aplicar a faxina (`CORE-06`) no resultado. O critério sugerido: o monorepo como casa (já é limpo e tem o backend ao lado), portando as 10 telas que só existem no repo Manus.
2. **Confirmar que o monorepo está no Git remoto** antes de apagar qualquer projeto ou chat — os zips daqui são a prova de existência, não o backup. Auditoria de 26/07 (sem autenticação): `ricardoleao-git/guardia`, `guardia-monorepo` e `guardia-percebe` → **404 público**; se não existir como privado, o push é obrigatório.
3. Ligar `normalize.js` ao catálogo canônico (a dupla tradução operador→enum do driver→tipo canônico) é a primeira tarefa de código da Fase 1.
4. **Regra dos dois connectors:** existem dois receptores (Python no repo Manus, Node no monorepo). Nenhum dos dois se reescreve antes do `P6S-09` com o device respondendo `statusCode 0` — qualquer agente que receber a lista de defeitos do `CLAUDE.md` §9 vai tentar "consertar" o `p6s_client.py`; dizer explicitamente na tarefa que não (nota de método do `DELTA`).

Fontes: zips `guardia-monorepo`, `connector-p6s`, `guardia-db` (21–23/07/2026); `CLAUDE.md` do monorepo; specs 07 e 10 do repo; `07_Mapa-Repo`; validação de build de ~21/07 (conversa arquivada).
