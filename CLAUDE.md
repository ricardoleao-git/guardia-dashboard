# CLAUDE.md — GuardIA Percebe

Contexto obrigatório para qualquer agente que escreva código neste repositório. **Ler antes de gerar qualquer linha.** Em conflito entre este arquivo e o código existente, vale este arquivo — o código atual é protótipo gerado por IA e contém erros conhecidos, listados no §9.

> ### ⚠️ Como ler este arquivo
>
> **§1 a §13 são obrigações, não descrições da realidade.** Onde se lê "toda tabela tem RLS restritiva", leia-se "toda tabela **deve ter**". O estado real deste repositório está medido no **§14** e a maioria dessas obrigações **ainda não é cumprida**.
>
> Isto não é formalidade. Em 26/07 uma auditoria automatizada leu as regras deste arquivo como se descrevessem o código, concluiu "RLS restritiva, sem credenciais vazadas" e liberou como seguro um repositório com a anon key em texto claro e 16 policies abertas. **Antes de afirmar que algo está em conformidade, medir.** Os comandos de verificação estão no §14.
>
> Ordem de leitura para quem chega agora: este bloco → **§14** (estado real) → **§12** (o que fazer primeiro) → §1 a §11 conforme a tarefa.

---

## 1. O que é o produto

**GuardIA** = software de controle de acesso e gestão da **Zênite Tecnologia**.
**GuardIA Percebe** = camada transversal de visão computacional **de borda**: conecta o GuardIA a câmeras/NVRs inteligentes de múltiplos fabricantes, recebe eventos de IA **já processados no dispositivo**, correlaciona com o contexto de negócio e dispara alertas (painel, app, WhatsApp).

Tagline: *"Suas câmeras deixam de gravar e passam a perceber."*

Verticais de largada: **condomínio** e **escolas**. Roadmap: câmaras frias, construção civil, restaurantes, lojas.

## 2. Fronteiras — o que este produto NÃO é

- ❌ **Não é VMS.** Sem gravação, sem streaming pesado, sem video wall, sem re-encode.
- ❌ **Não decodifica stream no servidor.** Não há GPU, por decisão de produto — a IA roda na borda.
- ❌ **Não treina modelo.**
- ✅ Visualização de NVR existe **apenas como pass-through autenticado no navegador** (proxy). Nunca implementar MediaMTX, go2rtc, transcodificação ou mosaico servido pelo backend.
- ✅ A única mídia que o módulo persiste é o **snapshot de evento** — com política de retenção e expurgo.

> Se uma tarefa parecer pedir re-streaming ou gravação, pare e pergunte. É provável violação de decisão estruturante.

## 3. Stack

| Camada | Produção | Observação |
|---|---|---|
| Banco | **PostgreSQL** em datacenter **HostDime** (servidor 1TB) | **Supabase NÃO é a stack do produto** — existe só neste protótipo. Todo código que fale Supabase é temporário e deve ficar isolado atrás de uma camada de acesso a dados |
| Broker | **EMQX** (nosso) — 1883 / 8883 SSL / 8083 WS / 8080 API / 18083 dashboard | A provisionar |
| Ingestão | Endpoint **HTTPS público fixo** | A provisionar |
| Front | React + TS + Vite + Tailwind + shadcn/ui | Prototipação em Manus |

**Multi-tenant é requisito de schema, não de roadmap.** Toda tabela nasce com a coluna de tenancy + RLS. Retrofit depois é caríssimo — e o schema atual não tem nenhuma.

Schema completo, RLS e ordem das migrations: `CORE-01_MODELO-DE-DADOS-CORE.md`. O nome da coluna (`org_id` + `site_id`, como está no DDL, ou `tenant_id`) e o nome da tabela de eventos (`events` × `camera_events` × `p6s_events`) são **PND-16** — decidir com o Tiago **antes da migration 001**, junto com PND-02 (chaves `FaceUUID`/`GroupID2`).

> 🚫 **Não criar tabela nova neste repositório até PND-16 e PND-02 estarem decididas.** Ver §14.5.

## 4. Protocolo P6S (driver `p6s`) — contratos exatos

Três camadas **complementares**, não concorrentes: CGI configura e consulta; push HTTP entrega eventos; MQTT tunela CGI atrás de NAT.

### 4.1 CGI (`P6SCGI`)

- **Auth:** `Authorization: Basic` (usuário `admin` + senha do device). **Nunca Digest.**
- **Formato:** corpo **XML**; `multipart/form-data` quando envolve foto.
- **Caminhos reais:** `/System/...`, `/Face/{ChannelID}/...`, `/FaceGroup/...`, `/AccessGate/{ChannelID}/RemoteOpenDoor`, `/LicensePlateGroup/*`, `/AI/...`, `/Wiegand/{ch}/...`
- **Resposta:** `<ResponseStatus>` com `<statusCode>0</statusCode>` = sucesso. Server: `CGI/2.0.5`.
- **Versionamento:** 18 famílias têm sufixo de versão — usar **sempre a de número mais alto** (ex.: `HTTPEventServerConfigV2`, não V1). 12 URLs aparecem duplicadas na doc: implementar uma vez.

> 🚫 **`/cgi-bin/*.cgi` NÃO EXISTE neste protocolo.** `face_reco_search.cgi`, `snapshot.cgi`, `get_face_image.cgi` são **invenções** do código atual (§9.1). Zero ocorrências em 936 páginas / 796 caminhos da documentação oficial. Qualquer endpoint fora dos padrões acima é bug, não improviso.

### 4.2 Push de eventos (`P6SHTTP`) — canal primário

- Config canônica: **`PUT /System/HTTPEventServerConfigV2`**. Health: `HTTPEventServerStatusV2`, `HTTPEventServerTest`.
- Auth do push: assinatura estilo **OAuth 1.0a**, `user_secret` = **serial do device**.
- **`Heartbeat-Ack` é obrigatório.** O Ack carrega a `strategy` (flags `is...Enable`) que liga/desliga cada tipo de evento e o intervalo. **Sem Ack, o device para de enviar eventos.**
- `CacheEventEnable` faz o device retransmitir após queda de rede/energia.
- `https` aparece na doc como *"not currently supported"* — TLS termina no nosso proxy.

> 🚫 **Polling de eventos por CGI é proibido.** `/FaceRecognition/QueryRecordList` roda **apenas** como job de reconciliação de eventos perdidos — nunca como loop de ingestão.

### 4.3 MQTT

- Config canônica: `PUT /System/P6SEventMQTTConfig`.
- Túnel CGI: `operator: "transportCGIConfig"`, com `info.request` (ex.: `"GET /System/DeviceCap"`) ou `info.body` em **base64**. Toda operação CGI vale por este caminho.
- Payload de evento `[HTTP]` ≡ `[MQTT]`: mesmo corpo, envelope diferente.

### 4.4 Biblioteca facial

- **`Ownner`** — grafia oficial com **dois N**. Manter no código. Binding: `PUT /.../FrontDeviceOwnnerInfo` com `<Ownner>GUARDIA-<id></Ownner>` (máx 64).
- **Safety code** por operação de write: `MD5(unique_code + SystemTime)`, **8 primeiros hex, invertidos**, no campo `Ownner`.
  - ⚠️ **[LACUNA]** — a entrada `unique_code` (é o Ownner do binding ou o serial do device?) **não está resolvida**. Teste de bancada pendente (**PND-01**). Não escolher por conta própria: implementar as duas hipóteses atrás de um flag e registrar qual retorna `statusCode 0`.
- **Capacidades:** T5AI = **5.000 faces/câmera**, cadastro **1 a 1 (sem batch)**, foto **≤1 MB**. NVR RS-436MLJ = 100.000 faces.
- **Fan-out** é consequência: a biblioteca é por dispositivo. Fila com estado por device, retry exponencial, validação de qualidade da foto antes do envio, reconciliação periódica.
  - ⚠️ Pendência de alto impacto: se o NVR aceitar cadastro na base própria de 100k, o fan-out cai. Hoje: 3.000 alunos × 6 câmeras ≈ 18.000 envios (~5 h de carga inicial).

## 5. Chaves de correlação — zero tabela de-para

| Campo do protocolo | O que colocamos nele |
|---|---|
| `FaceUUID` | **ID da pessoa no GuardIA** (aluno, morador) |
| `GroupID2` | **ID da turma** (escola) ou bloco/unidade (condomínio) |
| `FaceGroupID` | recebe o valor de `GroupID2` |
| `Ownner` (binding) | `GUARDIA-<id-do-cliente>` |

As chaves são **nossas dos dois lados**: o evento volta da câmera já com o identificador do GuardIA. **Nunca correlacionar por nome de pessoa** — `person_name` como chave é erro conhecido do código atual (§9.5).

*Status: `FaceUUID` e `GroupID2` são chaves **candidatas** — validar com Tiago antes de fixar (**PND-02**). Não fixar sozinho, e **não fixar por comentário em código** (ver §14.4).*

## 6. Catálogo canônico de eventos

O driver traduz o vocabulário do fabricante para o **catálogo canônico**; **vocabulário de fabricante nunca chega ao core nem ao schema**.

Tipos v0: `face.recognized`, `face.unknown` ("estranho"), `fence.intrusion`, `line.crossed`, `flow.count`, `person.fall`, `smoke.detected`, `door.held_open`, `post.abandoned`, e a família `plate.*` (LPR).

> 🚫 Nomes como `face_list`, `face_score`, `recognize_image`, `capture_image`, `BlackList`, `WhiteList` são vocabulário P6S. Não podem aparecer em tabela, API interna ou tipo compartilhado. Ficam confinados ao driver.
>
> **Hoje a tabela `camera_events` viola isto em cinco colunas** — ver §14.4.

Perfis por vertical ligam/desligam eventos por device via `strategy` do heartbeat:
- **Escolar:** facial (estranho), queda, fumaça, cerca virtual, contagem em pátio — cerca e contagem **bloqueadas até o parecer jurídico** (§7).
- **Condomínio:** LPR, veículo fora da whitelist, trava de vaga (Ground Lock), Key2Call, bike elétrica, estranho.

## 7. Conformidade é requisito funcional

Não é aviso jurídico no rodapé: é código.

**No GuardIA core:** consentimento registrado e **revogável**; **alternativa não-biométrica** sempre disponível (TAG/QR/senha); RIPD; template criptografado.

**No Percebe:** exclusão propagada com **comprovante** por device; **log de acesso a dado biométrico** (quem consultou face/foto/evento facial e quando); **retenção e expurgo** de snapshot e payload bruto; expurgo automático por fim de vínculo.

Regras duras:
- Dado biométrico é **dado sensível** (LGPD Art. 5º, II). O rol de bases legais do Art. 11 é **taxativo** e **não** inclui legítimo interesse.
- **Log de auditoria é append-only.** `DELETE` em tabela de auditoria, mesmo por admin, é bug. *(Violado hoje — §14.4.)*
- **Nenhuma tabela de biometria ou de presença escolar recebe carga real** antes de: base legal por vertical definida, política de retenção do snapshot documentada e **parecer jurídico do enquadramento escolar** (cerca virtual + contagem em pátio). Escola trata dado de menor — foco explícito de fiscalização da ANPD (NT nº 5/2025).
- RLS `USING (true)` em tabela com dado pessoal é bug de segurança, não conveniência de desenvolvimento. *(16 ocorrências hoje — §14.2.)*

## 8. Bancada (referência, com conflitos abertos)

NVR **RS-436MLJ-L2/S8** em `192.168.254.116`. Câmeras **T5AI** (as do projeto) em `.227` (D4) e `.209` (D6). **F4C-T** em `.206`, `.207`, `.208`.

⚠️ Conflitos abertos — **não citar a bancada como referência fechada**: identidade do canal D1 (config do protótipo indica `.115` / H5AI-50 / offline), banda 480 Mbps no datasheet vs 80 Mbps na UI, tipo exato de D4.

## 9. Erros conhecidos do código atual — não repetir, não imitar

Este repositório foi gerado em grande parte por IA (Manus) sem acesso à documentação do protocolo. Bugs estruturais confirmados por auditoria (26/07/2026), **com status remedido em 27/07 no HEAD `7c16728`**:

| # | Defeito | Status |
|---|---|---|
| 1 | `connector/src/p6s_client.py` chama `/cgi-bin/...` com `HTTPDigestAuth` — **endpoints inexistentes**. O connector nunca funcionou contra hardware (só `--dry-run`) | 🔴 **aberto** — 2 usos de `HTTPDigestAuth`, 3 caminhos `/cgi-bin/*.cgi`. **Não reescrever antes da bancada** (§14.6) |
| 2 | `connector/src/main.py` faz **polling de 30 s** — proibido (§4.2) | 🔴 **aberto** — `poll_interval_seconds: 30` |
| 3 | Não há buffer, ACK, dedupe, retry nem fila no connector | 🔴 **aberto** |
| 4 | `camera_events` carrega vocabulário de fabricante (§6) | 🔴 **aberto** — `face_list`, `person_name`, `face_score`, `recognize_image`, `capture_image` |
| 5 | Correlação por `person_name`; `face_lists.face_id` guarda o ID **da câmera** em vez do `FaceUUID`; turma virou texto livre em vez de `GroupID2` | 🔴 **aberto** |
| 6 | **Zero coluna de tenancy** nas tabelas existentes | 🔴 **aberto** — 0 ocorrências de `org_id`/`tenant_id` em `db/` |
| 7 | RLS permissiva: `_read USING (true)`, incluindo `face_lists` e `attendance`; `camera_events` aceita insert anônimo | 🔴 **aberto** — 16 policies |
| 8 | `audit_logs` permite `DELETE` a admin | 🔴 **aberto** — policy `audit_logs_delete_admin FOR DELETE` |
| 9 | Segredos e dados versionados: `connector/config/config.yaml` (senhas de câmera em texto claro), pasta `backups/` | 🟡 **fora do tracking, presentes no histórico** dos 54 commits públicos. Expurgo do histórico + rotação seguem obrigatórios |
| 10 | Telemetria Manus: `client/public/__manus__/debug-collector.js` (821 linhas) + 3 plugins no `vite.config.ts` | 🟡 **parcial** — coletor e plugins removidos. **Restam:** umami no `index.html`, `allowedHosts: true`, `ManusDialog.tsx`, `Map.tsx` (Forge), 18 refs a `/manus-storage/`, `@types/google.maps` |
| 11 | Domínio de deploy usa "vms" — contra o posicionamento (§2) | 🔴 **aberto e no ar** |

## 10. Regras para o agente

1. **Endpoint inventado é bug.** Se não estiver na documentação do protocolo, não existe. Não deduzir por analogia com outro fabricante.
2. **Marcar `[LACUNA]`** quando a informação não existir, em vez de inferir. Drivers `isapi`, `intelbras`, `unv`, `positivo`: [LACUNA] — nada coletado.
3. **Um driver por protocolo** (`p6s`, `isapi`, `intelbras`, `unv`, `positivo`, `onvif-fallback`), separados do core.
4. **Migrations versionadas** (Drizzle/Prisma). SQL aplicado à mão gera drift — nunca mais.
5. **Nenhum segredo no repositório.** Senha de device, token, chave de API: variável de ambiente ou cofre.
6. **Nenhum dado pessoal real** em repo, seed, fixture, foto de bancada, demo ou ambiente de terceiro (Manus, Lovable). Só dado sintético claramente fictício. **Esta regra é absoluta enquanto os itens do §14.2 estiverem abertos.**
7. Em proposta/documentação, nunca prometer "todas as marcas" nem "todas as principais marcas" — usar **"famílias homologadas + dispositivos ONVIF sujeitos a homologação"**.
8. **Naming:** "GuardIA Percebe" (comercial e interno); "Sentinela"/"Alerta" são nomes de funcionalidade de notificação; "GuardIA 360" reservado para plano futuro. Nomes eliminados por pesquisa — **não sugerir de novo**: Vision, Sentinela-como-marca, Radar, 360-como-módulo, Alerta-como-marca, Vigia, Lince, Íris, Omni.
9. **Idioma:** português brasileiro em documentação e mensagens; nomes de endpoint, chaves e limites técnicos preservados **exatamente** como documentados.
10. **Fornecedor Ruision** tem risco reputacional (acionista Megvii; Entity List BIS / NS-CMIC OFAC) — qualquer material voltado a órgão público passa pelo jurídico antes.
11. **Não afirmar conformidade sem medir.** Antes de escrever "RLS está fechada", "sem credenciais no código" ou "todas as telas têm X", rodar o comando correspondente do §14.1 e colar o número.
12. **RLS na mesma transação da tabela.** Nenhuma `CREATE TABLE` sem `ENABLE ROW LEVEL SECURITY` e policies no mesmo arquivo SQL. Toda policy nova vem precedida de `DROP POLICY IF EXISTS` — policies permissivas se combinam com **OR**, então adicionar uma restritiva ao lado de uma permissiva **não fecha nada**. Motivo: há uma chave válida do projeto em repositório público (§14.4).
13. **Nenhuma credencial em mensagem de commit**, de nenhuma classe. Referenciar por nome (`VITE_SUPABASE_ANON_KEY atualizada`), nunca por valor. O commit `7929b21` violou isto com a publishable key nova; a classe da chave perdoou, a próxima pode não perdoar.

## 11. Equipe e fluxo

**Ricardo** — coordenador de projeto e produto: especifica, prototipa no Manus, direciona. **Tiago** — dev senior. **João** — dev junior.

Fluxo: Ricardo especifica e prototipa → Tiago e João + Claude Code implementam.

**Duas ferramentas escrevem neste repo** (Manus e Claude Code) e o Git é a ponte única — nada de copiar e colar código entre elas. Antes de qualquer trabalho: `git fetch && git log --oneline -5`. O HEAD do Manus avança várias vezes por dia e toca sempre os mesmos arquivos (`App.tsx`, `Sidebar.tsx`, `Dashboard.tsx`, `types.ts`, `mock-data.ts`, `I18nContext.tsx`). Branch cortada de HEAD antigo conflita nesses seis.

## 12. Ordem de trabalho vigente

`segurança → guardrails → bancada → schema → connector`

### 12.0 Nota — `shouldUseMockData()` é código morto

`client/src/lib/guest-mode.ts` tinha o `||` dentro do `Boolean()`, o que fazia o ramo "Supabase não configurado" nunca disparar. O bug era real e foi corrigido.

**Mas a função não é chamada por ninguém** (0 callers fora da própria definição), então o bug nunca teve efeito. A degradação para mock já existia, implementada corretamente em todos os 7 hooks:

```ts
if (isSupabaseConfigured && !isGuestSession()) { /* Supabase */ } else { /* mock */ }
```

E `supabase.ts` já guardava o caso: `supabase = isSupabaseConfigured ? createClient(...) : null`. Sem env vars, as 32 telas caem em mock sozinhas.

> ⚠️ **`shouldUseMockData()` deve ser deletada, não mantida corrigida.** Função órfã com aparência de guarda de segurança é armadilha: o próximo leitor supõe uma proteção que ninguém invoca. Deletar junto com o comentário `§12.0` que está dentro dela.

*(Registro de proveniência: este bloco era, até 27/07 15:00, um "passo zero bloqueante" que afirmava que rotacionar a chave sem corrigir a função quebraria as telas ligadas. A afirmação estava errada — o caminho de dados foi inferido em vez de rastreado. Mantido aqui como nota porque a lição é a do §14.7.3: medir, não deduzir.)*

1. **Fase A′ — segurança do repo:** runbook completo em `CORE-06_FAXINA-DO-PROTOTIPO.md` — rotação de senhas, expurgo de segredos do histórico do git, telemetria removida, RLS fechada, auditoria append-only. Cobre os 11 itens do §9. Sequência mínima, nesta ordem (a ordem importa — ver §14.3):
   1. ~~corrigir `shouldUseMockData()`~~ — **feito**; ver §12.0. Pendente: **deletar** a função e limpar `signIn` do modo demo (§14.3);
   2. rotacionar a anon key e **remover os dois literais hardcoded** (`client/src/lib/supabase.ts:7` e `client/src/lib/guest-mode.ts:19`);
   3. adicionar `isGuestSession()` em `useSearchPresets` e `useAuditLog`;
   4. fechar a RLS (prioridade: `search_presets`, `face_lists`, `profiles`, insert de `camera_events`);
   5. derrubar ou proteger o deploy público, remover umami.
2. **Este arquivo** como contrato do repositório.
3. **Bancada** — comandos prontos em `P6S-09_ROTEIRO-DE-BANCADA.md`: probe do NVR, safety code (**PND-01**, 10 min, 🔴 bloqueia a Fase 2 inteira), criar grupo, cadastrar pessoa+foto, ver evento de reconhecimento, `HTTPEventServerConfigV2`, `RemoteOpenDoor`, repetir via MQTT, **medir tempo por cadastro**. Só foto sintética na bancada.
4. **Catálogo canônico v0 como JSON Schema** + contrato de driver versionado + **schema multi-tenant com migrations 001–007 de `CORE-01_MODELO-DE-DADOS-CORE.md` §8**. Usar `db/01_extended_tables.sql` como **levantamento de requisitos de campos**, nunca como schema final.
5. **Connector reescrito**: receptor de push, dedupe, fila, retry, estado por device, reconciliação.

## 13. Especificações de referência

Fora deste arquivo, os documentos abaixo são contrato para quem escreve código:

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

**Pendências têm número.** `PND-01` a `PND-20` em `05_Roadmap-e-Fases.md` §6. Se a tarefa depende de uma pendência aberta, **pare e diga qual** — não preencher por inferência. A que bloqueia mais coisa é a **PND-01** (safety code), e ela custa 10 minutos de bancada.

---

# §14. Estado real medido — HEAD `b18ed469`, 27/07/2026 17:05

Medido em clone limpo, não declarado. 63 commits, 32 páginas em `client/src/pages/`.

**A Fase A′ (§12.1) foi executada e validada.** O que resta na coluna vermelha não é do Manus: é decisão humana, bancada ou painel do Supabase.

## 14.1 Comandos de verificação

Rodar antes de afirmar qualquer coisa sobre conformidade. Os valores entre parênteses são o resultado esperado hoje.

```bash
grep -c 'eyJhbGci' client/src/lib/supabase.ts          # (0) anon key hardcoded
grep -r 'USING (true)' db/ | wc -l                     # (0) RLS permissiva
grep -r 'WITH CHECK (true)' db/ | wc -l                # (0)
grep -r 'DROP POLICY' db/ | wc -l                      # (55) idempotência dos SQLs
grep -ro 'manus-storage' client/src client/index.html vite.config.ts | wc -l   # (0)
grep -rio 'forge\|butterfly' client/src vite.config.ts | wc -l                 # (0)
grep -c umami client/index.html                        # (0)
grep -r '@shared' client/src | wc -l                   # (0) imports órfãos
grep -ri 'org_id\|tenant_id' db/ | wc -l               # (0) 🔴 tenancy ausente
grep -rln 'type PageState' client/src/pages | wc -l    # (13) duplicação dos 5 estados
git log --oneline -S'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' | wc -l  # (5) 🔴 chave no histórico
```

Build em clone limpo, verificado neste HEAD:

```
npm install     → exit 0
npx tsc --noEmit → exit 0, 0 erros
npx vite build   → exit 0, 1786 módulos, 6.41s
```

Bundle emitido em `dist/public/`: **0** ocorrências de JWT (`eyJhbGci`), **0** do ID do projeto (`ycqrgrcz`), **0** de `umami`/`manus`/`butterfly`. O `guardia-percebe-logo.png` (90 KB) é emitido corretamente. As 6 ocorrências de `supabase.co` no bundle são strings da própria lib `@supabase/supabase-js`, sem subdomínio de projeto. **Build re-medido em `b18ed469`: 1786 módulos, 6.41s.**

## 14.2 🟢 Fechados e verificados

| Item | Evidência |
|---|---|
| Anon key fora do código e fora do bundle | 0 literais em `supabase.ts` e `guest-mode.ts`; 0 no `dist/` |
| **RLS fechada nos arquivos e no banco** | 0 `USING (true)` / 0 `WITH CHECK (true)`; **55 `DROP POLICY IF EXISTS`** cobrindo as **40** policies que já existiram em qualquer revisão do histórico (cobertura total, teste de conjunto); 5 SQLs executados no Supabase; **28 policies ativas, 0 permissivas**, conferidas no painel |
| 3 policies fantasma removidas | `audit_logs_read_admin`, `profiles_read_self_or_admin`, `search_presets_rw_authenticated` — criadas à mão no dashboard, **não existiam em nenhum arquivo SQL**. Só a conferência no painel as pegou |
| `audit_logs` append-only | policy de `DELETE` removida |
| Hooks guardados | `isGuestSession()` nos 7 hooks de dados; validado em **runtime**: modo demo faz **zero** requisição a `supabase.co`, 0 erro de console |
| Telemetria e terceiros | umami, `manus-storage`, Forge/`butterfly`, `ManusDialog.tsx`, `Map.tsx` → todos em 0, sem imports pendurados |
| Logo local | `client/public/guardia-percebe-logo.png`, 7 refs trocadas, plugin de proxy removido |
| Build de clone limpo | `tsc` 0 erros, `vite build` 8.52s (antes: quebrava por `@shared` ausente) |
| `allowedHosts` | `[".manus.computer"]` em vez de `true` — resíduo de ambiente Manus, **não** vetor de exposição pública |
| **`signIn` limpa modo demo** | `localStorage.removeItem("guardia_guest")` + `setIsGuest(false)` chamados **antes** de `signInWithPassword` — usuário que vem do demo faz login real sem ficar preso em mock. Verificado em `AuthContext.tsx` linhas 129–130 |
| **Sidebar freeze corrigido** | 5 causas raiz eliminadas: (1) `LiveStream.tsx` — WebSocket sem cleanup → `wsRef` + `ws.close()` + `abortedRef`; (2) `Dashboard.tsx` — `key={viewKey}` forçava remount em toda navegação → removido; (3) `useEvents.ts` — mock interval rodava em todas as páginas → gate `shouldPoll`; (4) `App.tsx` — 35 rotas separadas faziam o wouter tratar Dashboard como componente novo a cada clique → consolidado em rota única `/*`; (5) 16 sub-páginas tinham `Sidebar`/`MobileHeader` embutidos → todos removidos. Testado: 5+ navegações sem freeze, DOM com 1 sidebar, 0 erros TypeScript |

## 14.3 🔴 Abertos — nenhum é tarefa do Manus

| Item | Onde / custo | Observação |
|---|---|---|
| **Chave `anon` JWT legada ativa** | painel do Supabase | A `sb_publishable_*` nova foi criada e configurada, mas **criar publishable não revoga a JWT legada** — são ações separadas. A chave antiga é extraível de **5 commits públicos**. Ver §14.4 |
| Credenciais no histórico do git | `git filter-repo` | `connector/config/config.yaml` (senhas de câmera em texto claro) e 24 arquivos de `backups/` nos commits até `72f1cbd`. **Limpar as mensagens de commit no mesmo passe** — o `5f31f3c` traz a publishable key nova no corpo da mensagem |
| **PND-01** — safety code | **10 min de bancada** | 🔴 Bloqueia a **Fase 2 inteira**. Maior retorno por minuto do projeto |
| **PND-16 / PND-02** | conversa com o Tiago | **0** ocorrências de `org_id`/`tenant_id` nas 12 tabelas. Bloqueia o §12.4. Nenhuma `CREATE TABLE` até decidir |
| **PND-17** | decisão + porte | 32 telas aqui × 12 no monorepo = **20 a portar**. Custo cresce a cada checkpoint. Ver §16.1 |
| Domínio "vms" | DNS + Manus | `guardia-vms.zenitetech.com` no ar, contra o §2. Trocar antes de demo a cliente (§16.2) |
| `camera_events` insert exige `service_role` | decisão de arquitetura | `WITH CHECK (auth.role() = 'service_role')`. O connector usa anon key — **quebra quando rodar**. Escolher: service_role no connector, ou o connector para de falar Supabase direto e passa pelo endpoint de ingestão (§3) |

## 14.4 ⚠️ Consequência da chave legada ainda ativa

Enquanto a JWT `anon` legada não for revogada, uma chave válida do projeto está permanentemente em repositório público e **a RLS é a única barreira entre ela e os dados**.

Isso é o modelo de segurança normal do Supabase — a chave é publishable por classe, não é vazamento de segredo. Mas elimina a margem de erro:

> 🚫 **Toda `CREATE TABLE` neste projeto nasce com RLS e policies na mesma transação.** Não "no próximo commit". Tabela sem policy = leitura pública imediata por uma chave que qualquer pessoa extrai do `git log`.

Teste para confirmar o estado da chave (não interpretar sem a guarda de tamanho):

```bash
C=$(git log -S'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' --format=%H -- client/src/lib/supabase.ts | tail -1)
K=$(git show $C:client/src/lib/supabase.ts | grep -oE 'eyJhbGci[A-Za-z0-9._-]{50,}' | head -1)
if [ ${#K} -lt 100 ]; then echo "ERRO: chave nao extraida — NAO interpretar"; else
  curl -s -w "\n→ HTTP %{http_code}\n" \
    "https://ycqrgrczrunvyivxfnch.supabase.co/rest/v1/face_lists?select=person_name,document&limit=1" \
    -H "apikey: $K"
fi
```

`401` = revogada (marcar 🟢). `200` + `[]` = ativa, RLS segurando (permanece 🔴 por este motivo). `200` + dados = ativa e RLS aberta na tabela (🔴 crítico, voltar ao painel).

Fechamento: Supabase → Settings → API Keys → chaves legadas → desabilitar a `anon` JWT.

## 14.5 🟡 UI — 5 estados obrigatórios (`CORE-03` §7)

Existe `client/src/components/PageStateWrapper.tsx` (94 linhas), correto e reutilizável, exportando `LoadState` e os 5 estados com callback de retry.

**Ele tem zero importações de página.** Em vez de usá-lo, **13 das 32 páginas** declararam um `type PageState` local e recolaram os blocos de JSX à mão: `"Connector offline"` 22×, `"Tentar novamente"` 21×, `"Carregando..."` 17×, `"Sincronização parcial"` 12×.

**Nenhuma dessas strings passa por `t()`** — o app declara i18n PT/EN/ZH e os 5 estados obrigatórios estão em português cravado nos 13 arquivos. As chaves de i18n adicionadas nos últimos checkpoints são todas `nav.*`.

Correção pendente, mecânica: importar `PageStateWrapper`/`LoadState` nas 13, apagar o union local e os blocos, passar as ~8 strings do componente por `t()` com as chaves nos três idiomas. **Fazer antes da próxima tela** — o padrão colado já é o default.

Registro: os estados são hoje **decorativos** (`retry` faz `setTimeout(..., 600)` e volta para `loaded`). Correto para efeito de especificação; "5 estados ✅" significa casca visual, não comportamento ligado a fetch.

## 14.6 🔵 Connector — não tocar antes da bancada

`connector/src/main.py` é um **loop de polling** (`schedule`, `poll_interval_seconds: 30`): não há receptor HTTP, Ack, buffer, dedupe nem retry. `p6s_client.py` usa `HTTPDigestAuth` e caminhos `/cgi-bin/*.cgi` — os dois padrões que o §4.1 declara inexistentes.

> 🚫 **Regra dos dois connectors:** nenhum dos dois se reescreve antes do `P6S-09_ROTEIRO-DE-BANCADA` com o device respondendo `statusCode 0`. Qualquer agente que receba esta lista de defeitos vai querer "consertar" o `p6s_client.py`. **Não consertar.** Registrar e esperar a bancada — reescrever contra documentação sem device é trocar um chute por outro.

Ver também o item de `camera_events`/`service_role` no §14.3: quando o connector for religado, a policy atual rejeita todo insert dele.

## 14.7 Manutenção desta seção

O §14 tem carimbo de HEAD. Ele **envelhece em silêncio** — nada no arquivo avisa quando os números deixam de valer.

1. Todo checkpoint que mexa em `db/`, `client/src/lib/`, `client/src/hooks/`, `client/src/contexts/` ou `vite.config.ts` **re-roda os comandos do §14.1** e atualiza o carimbo.
2. Item resolvido **vira 🟢 com a medida nova, não desaparece** — a tabela precisa mostrar o que já caiu.
3. Distinguir sempre **arquivo** de **banco** e de **runtime**. "0 `USING (true)` nos SQLs" não é "RLS fechada": em 27/07 os arquivos zeraram enquanto o banco seguia aberto, porque faltavam os `DROP POLICY`. Policies permissivas se combinam com **OR** — uma sobrevivente reabre a tabela inteira.

---

# §15. Fatos pós-base — 26/07/2026, 22h

Ocorreram após o último corte da base de conhecimento. Validados por auditoria remota.

1. **Deploy público ativo:** `guardia-vms.zenitetech.com` no ar servindo bundle com a anon key embutida. Rotação da chave é a ação mais urgente do repositório (§12.1).
2. **A chave era `anon`, não `service_role`** — **não houve bypass de RLS por privilégio**. ⚠️ Isto delimita a severidade, **não** dispensa a rotação: com as 16 policies `USING (true)` do §14.2, a chave `anon` lê `face_lists` (incluindo `document`, que carrega CPF/RG/matrícula), `attendance`, `profiles`, `vehicles`, `visitor_invites`, e escreve em `search_presets`. Renomear o campo para `anon_key` no `config.example.yaml`.
3. **`allowedHosts: true`** foi setado pelo Manus em 26/07 para preview via proxy. Intencional e temporário — remover ao sair do Manus.
4. **A faxina alcançou 22 páginas:** coletor `__manus__`, 3 plugins e deps Manus removidos do HEAD. Pendentes: anon key, umami, `@types/google.maps`, `ManusDialog.tsx`, `/manus-storage/*`, `Map.tsx`.
5. **Buckets no Supabase Storage:** `event-images` (público) + `backups` (privado) — além da pasta homônima do git. Verificar visibilidade e fechar insert anônimo em `storage.objects`.
6. **Domínio "vms" ativo:** contradiz o posicionamento (§2). Trocar **antes de qualquer demo a cliente** — e ver §16.2.
7. **React error #310 corrigido** no checkpoint `64290b45`: memoizar `t`/context em `I18nContext`, estabilizar `addNotification` e `actionConfig` em `RealtimeNotifications`.
8. **Connector:** não reescrever `p6s_client.py` antes do `P6S-09` com device respondendo `statusCode 0` (§14.6).

---

# §16. Duas pendências que precisam de decisão humana

## 16.1 PND-17 — qual front é o canônico

**Está aberta.** Não decidir em item de lista de tarefas, e não portar nada antes da decisão.

| A favor do monorepo `guardia` | A favor de `guardia-dashboard` |
|---|---|
| Sem telemetria; convive com connector, RuleEngine e migrations no mesmo repo (`CORE-07` §5) | É o que **está rodando** — Manus + Supabase. O monorepo dá 404 no remoto e nunca executou |
| Recomendação escrita da base | Regra de precedência da própria base: acima do CORE, vale **o código que está rodando** |
| 12 páginas, base limpa | 32 páginas, todas as table stakes T1–T6 e diferenciais T7–T10 |

**O custo cresce a cada checkpoint do Manus:** eram 10 telas a portar em 26/07 20:40; são **20** agora. Decidir com o Tiago antes do próximo lote de telas.

## 16.2 Escopo do protótipo vs. produto vendido

Confirmado por Ricardo em 27/07: o GuardIA em produção **ainda não tem** encomendas, reservas de áreas comuns, comunicados nem livro de ocorrências. As telas T1–T6 são ganho real, não reimplementação.

Duas consequências:

1. **Essas telas são especificação, não entrega.** São funcionalidades do **GuardIA core**, não do Percebe, prototipadas sobre um Supabase que será descartado. Falta extrair delas o **contrato de dados** — entidades, campos, estados, regras — no formato do `CORE-01`, para o PostgreSQL/HostDime. Os tipos de T9 (`SecurityMetric` com `trend` e `benchmark`, `PatrolRecord` com `coveragePct`, `EventSummary` com `blocked`/`avgResponseTime`, `ComplianceItem`) são o melhor insumo disponível para isso.
2. **Risco comercial no demo público.** `guardia-vms.zenitetech.com` mostra hoje Encomendas, Reservas, Painel da Administradora, Custódia e Portaria Remota funcionando com dados que parecem reais. Um prospect que abrir o link conclui, com razão, que o GuardIA já faz isso. Reforça o item 5 do §12.1 por motivo comercial, não só de segurança.
