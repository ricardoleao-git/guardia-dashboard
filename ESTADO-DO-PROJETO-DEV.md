# GuardIA Percebe — Estado do Projeto para os Devs

**Data:** 27/07/2026  
**HEAD:** `11e10140` (64 commits, 32 páginas, 1786 módulos, build 6.41s)  
**Repo:** `guardia-dashboard` — protótipo ativo em `guardia-vms.zenitetech.com`  
**Contrato do repositório:** `CLAUDE.md` (ler antes de escrever qualquer linha)

---

## 1. O que é o produto

**GuardIA** é o software de controle de acesso e gestão da Zênite Tecnologia. **GuardIA Percebe** é a camada transversal de visão computacional de borda: conecta o GuardIA a câmeras/NVRs inteligentes de múltiplos fabricantes, recebe eventos de IA já processados no dispositivo, correlaciona com o contexto de negócio e dispara alertas (painel, app, WhatsApp).

> Tagline: *"Suas câmeras deixam de gravar e passam a perceber."*

### 1.1 Por que existe

O GuardIA hoje controla acesso (TAG, QR, senha) mas não "vê" o que acontece nas câmeras. As câmeras inteligentes (T5AI, NVR RS-436) já processam IA na borda — reconhecimento facial, LPR, cerca virtual, detecção de queda, fumaça, contagem de fluxo. O Percebe é a ponte que recebe esses eventos, traduz para o vocabulário do GuardIA e dispara ações de negócio (alerta de estranho, ausência de aluno, veículo fora da whitelist, trava de vaga, etc.).

### 1.2 O que NÃO é

- **Não é VMS.** Sem gravação, sem streaming pesado, sem video wall, sem re-encode.
- **Não decodifica stream no servidor.** Não há GPU. A IA roda na borda.
- **Não treina modelo.**
- **Visualização de NVR** existe apenas como pass-through autenticado no navegador (proxy). Nunca implementar MediaMTX, go2rtc, transcodificação ou mosaico servido pelo backend.
- **A única mídia que o módulo persiste** é o snapshot de evento — com política de retenção e expurgo.

### 1.3 Verticais de largada

**Condomínio** e **Escolas**. Roadmap: câmaras frias, construção civil, restaurantes, lojas.

> Escola trata dado de menor — foco de fiscalização da ANPD (NT nº 5/2025). Cerca virtual e contagem em pátio escolar estão **bloqueadas até parecer jurídico** do enquadramento LGPD antes da primeira proposta escolar com esses recursos.

---

## 2. Stack e arquitetura

### 2.1 Stack de produção (destino)

| Camada | Tecnologia | Estado |
|---|---|---|
| Banco | PostgreSQL em datacenter HostDime (servidor 1TB) | **A provisionar** — schema em `CORE-01` |
| Broker | EMQX (nosso) — 1883/8883 SSL/8083 WS/8080 API/18083 dashboard | **A provisionar** |
| Ingestão | Endpoint HTTPS público fixo | **A provisionar** |
| Front | React + TS + Vite + Tailwind + shadcn/ui | **Prototipado** (este repo) |
| Connector | Python, um driver por protocolo | **Existe mas não funciona** (ver §6) |

> **Supabase NÃO é a stack do produto.** Existe só neste protótipo. Todo código que fala Supabase é temporário e deve ficar isolado atrás de uma camada de acesso a dados.

### 2.2 Stack do protótipo (atual)

| Camada | Tecnologia | Observação |
|---|---|---|
| Front | React 19 + Vite 7 + Tailwind 4 + shadcn/ui | 32 páginas, 20 componentes custom, 10 hooks |
| "Backend" | Supabase (PostgreSQL gerenciado) | **Será descartado** — migrar para PostgreSQL/HostDime |
| Auth | Supabase Auth + modo demo/guest | Modo demo não faz requisição ao Supabase |
| Dados | 7 hooks com fallback mock | `if (isSupabaseConfigured && !isGuestSession()) { Supabase } else { mock }` |
| Connector | Python (polling) | **Não funcional** — endpoints inexistentes, sem ACK, sem fila |

### 2.3 Arquitetura conceitual

```
┌─────────────┐     push HTTP/MQTT      ┌──────────────────┐     HTTPS     ┌──────────────┐
│  Câmera/NVR │ ────────────────────── │  Connector Percebe│ ──────────── │  GuardIA Core│
│  (borda IA) │  evento + snapshot     │  (driver p6s)     │  evento      │  (PostgreSQL)│
└─────────────┘                        └──────────────────┘              └──────────────┘
                                              │
                                              │ traduz vocabulário de fabricante → catálogo canônico
                                              │ ACK, dedupe, retry, fila, estado por device
```

**Fluxo:**
1. Câmera processa IA na borda (reconhecimento facial, LPR, etc.)
2. Câmera envia evento via push HTTP (canal primário) ou MQTT
3. Connector recebe, traduz vocabulário P6S → catálogo canônico, faz ACK
4. Connector correlaciona com chaves do GuardIA (FaceUUID, GroupID2)
5. Connector envia evento + snapshot para o GuardIA Core (PostgreSQL)
6. Motor de regras do GuardIA avalia e dispara alertas (painel, app, WhatsApp)

---

## 3. Protocolo P6S (driver p6s) — contratos exatos

O driver `p6s` conecta câmeras/NVRs da Ruision (marca Provision ISR / P6S). Três camadas complementares:

### 3.1 CGI (P6SCGI) — configuração e consulta

- **Auth:** `Authorization: Basic` (usuário `admin` + senha do device). **Nunca Digest.**
- **Formato:** corpo XML; `multipart/form-data` quando envolve foto.
- **Caminhos reais:** `/System/...`, `/Face/{ChannelID}/...`, `/FaceGroup/...`, `/AccessGate/{ChannelID}/RemoteOpenDoor`, `/LicensePlateGroup/*`, `/AI/...`, `/Wiegand/{ch}/...`
- **Resposta:** `<ResponseStatus>` com `<statusCode>0</statusCode>` = sucesso. Server: `CGI/2.0.5`.
- **Versionamento:** 18 famílias têm sufixo de versão — usar sempre a de número mais alto (ex.: `HTTPEventServerConfigV2`, não V1).

> **`/cgi-bin/*.cgi` NÃO EXISTE neste protocolo.** `face_reco_search.cgi`, `snapshot.cgi`, `get_face_image.cgi` são invenções do código atual. Zero ocorrências em 936 páginas / 796 caminhos da documentação oficial.

### 3.2 Push de eventos (P6SHTTP) — canal primário

- Config canônica: `PUT /System/HTTPEventServerConfigV2`. Health: `HTTPEventServerStatusV2`, `HTTPEventServerTest`.
- Auth do push: assinatura estilo OAuth 1.0a, `user_secret` = serial do device.
- **`Heartbeat-Ack` é obrigatório.** O Ack carrega a `strategy` (flags `is...Enable`) que liga/desliga cada tipo de evento e o intervalo. Sem Ack, o device para de enviar eventos.
- `CacheEventEnable` faz o device retransmitir após queda de rede/energia.
- `https` aparece na doc como "not currently supported" — TLS termina no nosso proxy.

> **Polling de eventos por CGI é proibido.** `/FaceRecognition/QueryRecordList` roda apenas como job de reconciliação de eventos perdidos — nunca como loop de ingestão.

### 3.3 MQTT

- Config canônica: `PUT /System/P6SEventMQTTConfig`.
- Túnel CGI: `operator: "transportCGIConfig"`, com `info.request` (ex.: `"GET /System/DeviceCap"`) ou `info.body` em base64. Toda operação CGI vale por este caminho.
- Payload de evento `[HTTP]` ≡ `[MQTT]`: mesmo corpo, envelope diferente.

### 3.4 Biblioteca facial

- **`Ownner`** — grafia oficial com dois N. Binding: `PUT /.../FrontDeviceOwnnerInfo` com `<Ownner>GUARDIA-<id></Ownner>` (máx 64).
- **Safety code** por operação de write: `MD5(unique_code + SystemTime)`, 8 primeiros hex, invertidos, no campo `Ownner`.
  - **[LACUNA]** — a entrada `unique_code` (é o Ownner do binding ou o serial do device?) não está resolvida. Teste de bancada pendente (PND-01). Implementar as duas hipóteses atrás de um flag e registrar qual retorna `statusCode 0`.
- **Capacidades:** T5AI = 5.000 faces/câmera, cadastro 1 a 1 (sem batch), foto ≤1 MB. NVR RS-436MLJ = 100.000 faces.
- **Fan-out** é consequência: a biblioteca é por dispositivo. Fila com estado por device, retry exponencial, validação de qualidade da foto antes do envio, reconciliação periódica.
  - Se o NVR aceitar cadastro na base própria de 100k, o fan-out cai. Hoje: 3.000 alunos × 6 câmeras ≈ 18.000 envios (~5 h de carga inicial).

### 3.5 Chaves de correlação — zero de-para

| Campo do protocolo | O que colocamos nele |
|---|---|
| `FaceUUID` | ID da pessoa no GuardIA (aluno, morador) |
| `GroupID2` | ID da turma (escola) ou bloco/unidade (condomínio) |
| `FaceGroupID` | recebe o valor de `GroupID2` |
| `Ownner` (binding) | `GUARDIA-<id-do-cliente>` |

As chaves são nossas dos dois lados: o evento volta da câmera já com o identificador do GuardIA. **Nunca correlacionar por nome de pessoa.**

> Status: `FaceUUID` e `GroupID2` são chaves candidatas — validar com Tiago antes de fixar (PND-02).

### 3.6 Catálogo canônico de eventos

O driver traduz o vocabulário do fabricante para o catálogo canônico; vocabulário de fabricante nunca chega ao core nem ao schema.

Tipos v0: `face.recognized`, `face.unknown` ("estranho"), `fence.intrusion`, `line.crossed`, `flow.count`, `person.fall`, `smoke.detected`, `door.held_open`, `post.abandoned`, e a família `plate.*` (LPR).

> Nomes como `face_list`, `face_score`, `recognize_image`, `capture_image`, `BlackList`, `WhiteList` são vocabulário P6S. Não podem aparecer em tabela, API interna ou tipo compartilhado. Ficam confinados ao driver.

Perfis por vertical ligam/desligam eventos por device via `strategy` do heartbeat:
- **Escolar:** facial (estranho), queda, fumaça, cerca virtual, contagem em pátio — cerca e contagem bloqueadas até o parecer jurídico.
- **Condomínio:** LPR, veículo fora da whitelist, trava de vaga (Ground Lock), Key2Call, bike elétrica, estranho.

---

## 4. O que está feito (protótipo frontend)

### 4.1 Visão geral

| Métrica | Valor |
|---|---|
| Páginas (telas) | 32 |
| Componentes custom | 20 |
| Hooks de dados | 10 (7 com fallback mock) |
| Contexts | 3 (Auth, I18n, Theme) |
| Tipos TypeScript | 478 linhas, 30+ interfaces |
| Mock data | 693 linhas (dados sintéticos da bancada) |
| SQLs de schema | 6 arquivos, 12 tabelas, 28 policies |
| Build | 1786 módulos, 6.41s, 0 erros TypeScript |
| Commits | 64 |

### 4.2 As 32 telas (agrupadas por seção do sidebar)

**Visão Geral:**
- `Dashboard` — painel principal com timeline 24h, stats bar, eventos em tempo real
- `Home` — landing/redirect

**Monitoramento:**
- `Playback` — visualização de NVR (pass-through, não gravação)
- `AbsenceAlerts` — alertas de ausência (escolar)
- `PortariaRemota` — portaria remota com intercom e portão

**IA e Automação:**
- `Automations` — motor de regras (gatilho → condição → ação, com cooldown e simulador)
- `AIConfig` — configuração de IA por device
- `SemanticSearch` — busca semântica em eventos
- `AISummary` — resumo de IA
- `AIBox` — caixa de ferramentas de IA

**Pessoas e Acesso:**
- `Frequencia` — frequência escolar
- `PersonTimeline` — timeline de pessoa (rastro de eventos por indivíduo)
- `VisitorInvite` — convite de visitante
- `VehicleAccess` — acesso de veículos (LPR)
- `ElevatorControl` — controle de elevador
- `Custodia` — custódia infantil (entrega responsável)

**Condomínio:**
- `Encomendas` — gestão de encomendas
- `Reservas` — reservas de áreas comuns
- `LivroOcorrencias` — livro de ocorrências
- `Comunicados` — comunicados

**Sistema:**
- `DeviceManagement` — gestão de dispositivos (cameras/NVRs)
- `FaceLibrary` — biblioteca facial (cadastro de pessoas)
- `VehicleManagement` — gestão de veículos
- `SystemConfig` — configuração do sistema

**Admin:**
- `UserAdmin` — administração de usuários
- `AuditLog` — log de auditoria (append-only)
- `Consentimento` — gestão de consentimento LGPD
- `PainelAdministradora` — painel da administradora
- `RelatorioValor` — relatório de valor (segurança, operação, compliance, rondas, eventos)
- `WhiteLabel` — white label (personalização de marca)

**Auth:**
- `Login` — login com modo demo/guest

### 4.3 Componentes custom

| Componente | Função |
|---|---|
| `Sidebar` | Navegação principal, 32 itens em 5 grupos |
| `MobileHeader` | Header mobile com menu hambúrguer |
| `Header` | Header desktop |
| `CameraMosaic` | Mosaico de câmeras (pass-through) |
| `CameraGrid` | Grid de câmeras |
| `CameraSnapshot` | Snapshot de câmera |
| `LiveStream` | Stream ao vivo (pass-through WebRTC) |
| `EventCard` | Card de evento com imagem e metadados |
| `Timeline24h` | Timeline 24h de eventos |
| `StatsBar` | Barra de estatísticas |
| `RealtimeNotifications` | Notificações em tempo real |
| `PageStateWrapper` | Wrapper dos 5 estados obrigatórios (loading, error, empty, partial, loaded) — **existe mas tem 0 importações** |
| `AnnotationOverlay` | Overlay de anotação em imagem |
| `ImageViewer` | Visualizador de imagem |
| `SearchPresets` | Presets de busca |
| `SmartSearch` | Busca inteligente |
| `CategoryTabs` | Tabs de categoria |
| `ExportReports` | Exportação de relatórios |
| `LanguageSwitcher` | Seletor de idioma (PT/EN/ZH) |
| `ErrorBoundary` | Boundary de erro |

### 4.4 Hooks de dados

| Hook | Fonte real | Fallback mock | Guard `isGuestSession()` |
|---|---|---|---|
| `useEvents` | Supabase `camera_events` | `mock-data.ts` | Sim |
| `useDevices` | Supabase `devices` | `mock-data.ts` | Sim |
| `useFaceLists` | Supabase `face_lists` | `mock-data.ts` | Sim |
| `useAttendance` | Supabase `attendance` | `mock-data.ts` | Sim |
| `useAuditLog` | Supabase `audit_logs` | `mock-data.ts` | Sim |
| `useSearchPresets` | Supabase `search_presets` | `mock-data.ts` | Sim |
| `useAutomationRules` | Supabase `automation_rules` | `mock-data.ts` | Sim |
| `useCriticalAlerts` | Derivado de `useEvents` | — | — |
| `useComposition` | Utilitário | — | — |
| `usePersistFn` | Utilitário | — | — |

### 4.5 Internacionalização

- 3 idiomas: PT (português), EN (inglês), ZH (chinês)
- Context: `I18nContext.tsx` com memoização de `t` (corrigiu React error #310)
- **Problema conhecido:** os 5 estados obrigatórios de tela (loading, error, empty, partial, loaded) estão em português cravado em 13 arquivos — não passam por `t()`. Correção pendente.

### 4.6 Schema do banco (protótipo Supabase)

**Tabelas base (`00_setup_complete.sql`):**

| Tabela | Função | RLS |
|---|---|---|
| `camera_events` | Eventos de câmera | read: authenticated, insert: service_role, update: authenticated |
| `profiles` | Perfis de usuário | read: authenticated, update: own, delete: admin |
| `search_presets` | Presets de busca | CRUD: authenticated |
| `audit_logs` | Log de auditoria | read: authenticated, insert: own. **DELETE removido** (append-only) |

**Tabelas estendidas (`01_extended_tables.sql`):**

| Tabela | Função |
|---|---|
| `automation_rules` | Regras de automação (gatilho, condição, ação, cooldown) |
| `face_lists` | Biblioteca facial (cadastro de pessoas com foto) |
| `attendance` | Frequência escolar |
| `vehicles` | Veículos cadastrados |
| `vehicle_access` | Acesso de veículos (LPR) |
| `visitor_invites` | Convites de visitante |
| `devices` | Dispositivos (câmeras/NVRs) |
| `system_config` | Configuração do sistema |

> **Problema crítico:** nenhuma tabela tem coluna de tenancy (`org_id`/`tenant_id`). Multi-tenant é requisito de schema, não de roadmap. PND-16 bloqueia `CREATE TABLE` até decidir o nome da coluna com o Tiago.

### 4.7 Segurança — o que já foi feito (Fase A')

| Item | Status | Evidência |
|---|---|---|
| Anon key fora do código e do bundle | Feito | 0 literais em `supabase.ts` e `guest-mode.ts`; 0 no `dist/` |
| RLS fechada | Feito | 0 `USING (true)`, 0 `WITH CHECK (true)`; 28 policies ativas, 0 permissivas |
| `audit_logs` append-only | Feito | Policy de DELETE removida |
| Hooks guardados | Feito | `isGuestSession()` nos 7 hooks; modo demo faz zero requisição ao Supabase |
| Telemetria removida | Feito | umami, ManusDialog, Map.tsx, manus-storage, Forge/butterfly: todos em 0 |
| `signIn` limpa modo demo | Feito | `removeItem("guardia_guest")` + `setIsGuest(false)` antes de `signInWithPassword` |
| Sidebar freeze corrigido | Feito (causa 1 contida) | 5 causas endereçadas; causa 1 (LiveStream) contida, não eliminada |
| `shouldUseMockData()` deletada | Feito | 0 ocorrências em `client/src/` |
| `allowedHosts` restrito | Feito | `[".manus.computer"]` em vez de `true` |

---

## 5. O que falta fazer — por parte

### PARTE 1 — Decisões bloqueantes (Tiago + Ricardo)

| Pendência | Quem | O que decidir | Impacto |
|---|---|---|---|
| **PND-16** | Tiago | Nome da coluna de tenancy: `org_id` + `site_id` (como no DDL) ou `tenant_id`? | Bloqueia toda `CREATE TABLE` e migration 001 |
| **PND-02** | Tiago | Confirmar `FaceUUID` e `GroupID2` como chaves de correlação | Bloqueia o schema de eventos e o connector |
| **PND-17** | Ricardo + Tiago | Qual front é canônico: monorepo `guardia` (12 telas, base limpa) ou `guardia-dashboard` (32 telas, rodando)? | Custo cresce a cada checkpoint: 20 telas a portar hoje |
| **PND-01** | Bancada (10 min) | Safety code: `unique_code` = Ownner do binding ou serial do device? | Bloqueia a Fase 2 inteira (cadastro facial CGI) |

### PARTE 2 — Segurança (ação humana no painel)

| Item | Onde | O que fazer |
|---|---|---|
| Revogar chave `anon` JWT legada | Painel Supabase → Settings → API Keys | A `sb_publishable_*` nova foi criada, mas criar publishable não revoga a JWT legada. A chave antiga é extraível de 5 commits públicos |
| Verificar publishable key em código | `git show 4e2efb8:client/src/lib/supabase.ts` | Commits `4e2efb8` e `ab239e6` têm `sb_publishable_` hardcoded. Conferir se a chave configurada hoje é a mesma; se for, a rotação não ocorreu |
| Expurgar histórico do git | `git filter-repo` | `connector/config/config.yaml` (senhas de câmera) e 24 arquivos de `backups/` nos commits até `72f1cbd`. Limpar mensagens de commit no mesmo passe (commit `7929b21` traz a publishable key no corpo) |
| Trocar domínio "vms" | DNS + Manus | `guardia-vms.zenitetech.com` contradiz o posicionamento (não é VMS). Trocar antes de demo a cliente |
| Buckets no Supabase Storage | Painel Supabase | `event-images` (público) + `backups` (privado). Verificar visibilidade e fechar insert anônimo em `storage.objects` |

### PARTE 3 — Bancada (validação contra hardware)

**Roteiro completo:** `P6S-09_ROTEIRO-DE-BANCADA.md`

**Bancada atual:**
- NVR RS-436MLJ-L2/S8 em `192.168.254.116`
- T5AI em `.227` (D4) e `.209` (D6)
- F4C-T em `.206`, `.207`, `.208`

**Conflitos abertos — não citar como referência fechada:** identidade do canal D1, banda 480 vs 80 Mbps, tipo exato de D4.

**Sequência de bancada:**
1. Probe do NVR (GET /System/DeviceCap)
2. Safety code (PND-01, 10 min, bloqueia Fase 2)
3. Criar grupo facial
4. Cadastrar pessoa + foto (medir tempo por cadastro)
5. Ver evento de reconhecimento (push HTTP)
6. Configurar `HTTPEventServerConfigV2`
7. `RemoteOpenDoor` (abertura remota)
8. Repetir via MQTT
9. Só foto sintética na bancada — nenhum dado pessoal real

### PARTE 4 — Schema multi-tenant (PostgreSQL/HostDime)

**Referência:** `CORE-01_MODELO-DE-DADOS-CORE.md` §8 (migrations 001–007)

**Premissas:**
- Toda tabela nasce com coluna de tenancy + RLS na mesma transação
- Usar `db/01_extended_tables.sql` como levantamento de requisitos de campos, nunca como schema final
- Migrations versionadas (Drizzle/Prisma) — SQL à mão gera drift
- `camera_events` hoje carrega vocabulário de fabricante (`face_list`, `person_name`, `face_score`, `recognize_image`, `capture_image`) — precisa traduzir para catálogo canônico
- Correlação hoje é por `person_name` (erro) — deve ser por `FaceUUID`
- `face_lists.face_id` guarda o ID da câmera em vez do FaceUUID
- Turma virou texto livre em vez de `GroupID2`

**O que fazer:**
1. Decidir PND-16 (nome da coluna de tenancy) e PND-02 (chaves)
2. Criar migrations 001–007 seguindo `CORE-01` §8
3. Traduzir `camera_events` para catálogo canônico (renomear colunas, remover vocabulário de fabricante)
4. Adicionar coluna de tenancy em todas as 12 tabelas existentes
5. Criar RLS restritiva por tenant em todas as tabelas
6. Extrair contrato de dados das telas T1–T6 (encomendas, reservas, comunicados, livro de ocorrências, custódia, portaria remota) — essas funcionalidades são do GuardIA core, não do Percebe, prototipadas sobre Supabase que será descartado

### PARTE 5 — Connector reescrito (Python)

**Estado atual:** não funcional. `connector/src/main.py` é um loop de polling (30s), `p6s_client.py` usa `HTTPDigestAuth` e caminhos `/cgi-bin/*.cgi` inexistentes. Não há receptor HTTP, ACK, buffer, dedupe, retry nem fila.

> **Regra dos dois connectors:** não reescrever antes do P6S-09 com device respondendo `statusCode 0`. Reescrever contra documentação sem device é trocar um chute por outro.

**O que fazer (após bancada):**
1. Receptor de push HTTP (canal primário) — endpoint HTTPS público fixo
2. Receptor MQTT (canal alternativo) — broker EMQX
3. Ack com `strategy` (liga/desliga eventos por device)
4. Buffer com estado por device
5. Dedupe por event_id
6. Retry exponencial
7. Fila de cadastro facial (1 a 1, sem batch, com validação de qualidade)
8. Reconciliação periódica (QueryRecordList como job, não loop)
9. Tradução de vocabulário P6S → catálogo canônico
10. Correlação por FaceUUID/GroupID2 (não por person_name)
11. Upload de snapshot com retenção e expurgo
12. WhatsApp alerts (já existe esboço em `whatsapp_alerts.py`)

**Decisão de arquitetura pendente:** `camera_events` insert exige `service_role` (`WITH CHECK (auth.role() = 'service_role')`). O connector usa anon key — quebra quando rodar. Escolher: service_role no connector, ou o connector para de falar Supabase direto e passa pelo endpoint de ingestão.

### PARTE 6 — Frontend (continuação do protótipo)

**Dívida técnica imediata:**

| Item | Esforço | Descrição |
|---|---|---|
| `PageStateWrapper` sem importações | Médio | 13 páginas recolaram os 5 estados à mão em vez de importar o componente. Importar, apagar union local, passar strings por `t()` |
| i18n dos 5 estados | Médio | "Carregando...", "Tentar novamente", etc. em PT cravado em 13 arquivos. Adicionar chaves nos 3 idiomas |
| Causa 1 do sidebar freeze | Médio | LiveStream/CameraMosaic abre 6 RTCPeerConnection+WebSocket contra hosts inexistentes em mock. Guarda de reentrada + default snapshot em mock |
| `@types/google.maps` órfão | Baixo | `pnpm remove @types/google.maps` (Map.tsx foi deletado) |
| Resíduos de layout | Baixo | `SystemConfig.tsx:78` mantém wrapper `flex h-screen`; `.embedded-page` morto em `Dashboard.tsx:464,468` + `index.css` |
| Code-splitting | Médio | Bundle de 2.2 MB. Implementar `React.lazy()` nas 32 páginas com `Suspense` fallback |

**Telas que são especificação, não entrega (T1–T6):**

As telas de Encomendas, Reservas, Painel da Administradora, Custódia, Portaria Remota e Livro de Ocorrências são funcionalidades do GuardIA core, não do Percebe. Estão prototipadas sobre Supabase que será descartado. Falta extrair delas o contrato de dados — entidades, campos, estados, regras — no formato do `CORE-01`, para o PostgreSQL/HostDime.

> Risco comercial: `guardia-vms.zenitetech.com` mostra essas telas funcionando com dados que parecem reais. Um prospect que abrir o link conclui que o GuardIA já faz isso.

### PARTE 7 — Conformidade LGPD (código, não aviso)

**No GuardIA core:**
- Consentimento registrado e revogável
- Alternativa não-biométrica sempre disponível (TAG/QR/senha)
- RIPD (Registro de Impacto)
- Template criptografado

**No Percebe:**
- Exclusão propagada com comprovante por device
- Log de acesso a dado biométrico (quem consultou face/foto/evento facial e quando)
- Retenção e expurgo de snapshot e payload bruto
- Expurgo automático por fim de vínculo

**Regras duras:**
- Dado biométrico é dado sensível (LGPD Art. 5º, II). O rol de bases legais do Art. 11 é taxativo e não inclui legítimo interesse.
- Nenhuma tabela de biometria ou de presença escolar recebe carga real antes de: base legal por vertical definida, política de retenção do snapshot documentada e parecer jurídico do enquadramento escolar.

### PARTE 8 — Catálogo canônico e motor de regras

**Catálogo canônico v0 como JSON Schema** — ainda não criado. Tipos v0: `face.recognized`, `face.unknown`, `fence.intrusion`, `line.crossed`, `flow.count`, `person.fall`, `smoke.detected`, `door.held_open`, `post.abandoned`, `plate.*`.

**Motor de regras** — referência: `CORE-02_MOTOR-DE-REGRAS.md`. A tela `Automations.tsx` já existe com esboço visual (gatilho → condição → ação, com cooldown e simulador), mas não está conectada a um backend real.

**Contrato de driver versionado** — um driver por protocolo (`p6s`, `isapi`, `intelbras`, `unv`, `positivo`, `onvif-fallback`), separados do core. Drivers `isapi`, `intelbras`, `unv`, `positivo`: **[LACUNA]** — nada coletado ainda.

---

## 6. Ordem de trabalho vigente

```
segurança → guardrails → bancada → schema → connector
```

1. **Fase A′ (segurança do repo)** — **executada e validada** (ver §4.7)
2. **Este arquivo (CLAUDE.md)** como contrato do repositório — **feito**
3. **Bancada** — roteiro pronto em `P6S-09_ROTEIRO-DE-BANCADA.md` — **pendente** (PND-01 bloqueia Fase 2)
4. **Catálogo canônico v0 + schema multi-tenant** — **pendente** (PND-16/PND-02 bloqueiam)
5. **Connector reescrito** — **pendente** (regra dos dois connectors: não tocar antes da bancada)

---

## 7. Especificações de referência

| Precisa de | Ler |
|---|---|
| Schema, RLS, storage, expurgo, migrations | `CORE-01_MODELO-DE-DADOS-CORE.md` |
| Automação: gatilho, condição, ação, cooldown, simulador | `CORE-02_MOTOR-DE-REGRAS.md` |
| Tema, componentes canônicos, estados obrigatórios de tela | `CORE-03_UI-DESIGN-SYSTEM.md` |
| Quais telas construir e em que ordem | `CORE-04_MAPA-DE-TELAS.md` |
| Prazos de retenção e tela de consentimento | `CORE-05_RETENCAO-E-CONSENTIMENTO.md` |
| Como sair do protótipo (e o que já foi feito) | `CORE-06_FAXINA-DO-PROTOTIPO.md` |
| O que já existe em código nos dois repositórios | `CORE-07_INVENTARIO-DE-CODIGO.md` |
| Validar contra hardware | `P6S-09_ROTEIRO-DE-BANCADA.md` |
| As 56 telas do NVR → endpoint (fonte primária) | `P6S-10_SPEC-PARIDADE-NVR-56-TELAS.md` |
| Estado atual do driver p6s | `P6S-01_ESTADO-ATUAL.md` |
| Fornecedor Ruision (risco reputacional) | `P6S-02_FORNECEDOR-Ruision.md` |

> **Fornecedor Ruision** tem risco reputacional (acionista Megvii; Entity List BIS / NS-CMIC OFAC) — qualquer material voltado a órgão público passa pelo jurídico antes.

---

## 8. Regras para os devs

1. **Endpoint inventado é bug.** Se não estiver na documentação do protocolo, não existe. Não deduzir por analogia com outro fabricante.
2. **Marcar `[LACUNA]`** quando a informação não existir, em vez de inferir.
3. **Um driver por protocolo**, separados do core.
4. **Migrations versionadas** (Drizzle/Prisma). SQL à mão gera drift.
5. **Nenhum segredo no repositório.** Senha de device, token, chave de API: variável de ambiente ou cofre.
6. **Nenhum dado pessoal real** em repo, seed, fixture, foto de bancada, demo ou ambiente de terceiro.
7. Em proposta/documentação, nunca prometer "todas as marcas" — usar "famílias homologadas + dispositivos ONVIF sujeitos a homologação".
8. **Naming:** "GuardIA Percebe" (comercial e interno); "Sentinela"/"Alerta" são nomes de funcionalidade de notificação; "GuardIA 360" reservado para plano futuro.
9. **Idioma:** português brasileiro; nomes de endpoint, chaves e limites técnicos preservados exatamente como documentados.
10. **Não afirmar conformidade sem medir.** Antes de escrever "RLS está fechada", rodar o comando do §14.1 do CLAUDE.md e colar o número.
11. **RLS na mesma transação da tabela.** Nenhuma `CREATE TABLE` sem `ENABLE ROW LEVEL SECURITY` e policies no mesmo arquivo SQL.
12. **Nenhuma credencial em mensagem de commit.** Referenciar por nome, nunca por valor.
13. **Duas ferramentas escrevem neste repo** (Manus e Claude Code) e o Git é a ponte única. Antes de qualquer trabalho: `git fetch && git log --oneline -5`.

---

## 9. Comandos de verificação (rodar antes de afirmar conformidade)

```bash
grep -c 'eyJhbGci' client/src/lib/supabase.ts          # (0) anon key hardcoded
grep -r 'USING (true)' db/ | wc -l                     # (0) RLS permissiva
grep -r 'WITH CHECK (true)' db/ | wc -l                # (0)
grep -r 'DROP POLICY' db/ | wc -l                      # (55) idempotência dos SQLs
grep -ro 'manus-storage' client/src client/index.html vite.config.ts | wc -l   # (0)
grep -rio 'forge\|butterfly' client/src vite.config.ts | wc -l                 # (0)
grep -c umami client/index.html                        # (0)
grep -r '@shared' client/src | wc -l                   # (0) imports órfãos
grep -ri 'org_id\|tenant_id' db/ | wc -l               # (0) tenancy ausente
grep -rln 'type PageState' client/src/pages | wc -l    # (13) duplicação dos 5 estados
git log --oneline -S'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' | wc -l  # (5) chave no histórico
```

Build em clone limpo:
```
npm install     → exit 0
npx tsc --noEmit → exit 0, 0 erros
npx vite build   → exit 0, 1786 módulos, 6.41s
```

---

## 10. Riscos e alertas

| Risco | Severidade | Ação |
|---|---|---|
| Chave `anon` JWT legada ativa no painel | Alto | Revogar no painel do Supabase |
| Credenciais no histórico do git | Alto | `git filter-repo` |
| Domínio "vms" no ar | Médio | Trocar antes de demo a cliente |
| Ruision / Megvii / Entity List | Médio | Jurídico antes de órgão público |
| Câmaras Frias: catálogo lacuna parcial | Médio | Fechar com device homologado |
| PND-17 (qual front canônico) | Médio | Decidir com Tiago antes do próximo lote de telas |
| Deploy público mostra telas que não existem no produto | Médio | Proteger ou derrubar `guardia-vms.zenitetech.com` |
