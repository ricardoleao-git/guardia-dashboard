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

## 11. Equipe e fluxo

**Ricardo** — coordenador de projeto e produto: especifica, prototipa no Manus, direciona. **Tiago** — dev senior. **João** — dev junior.

Fluxo: Ricardo especifica e prototipa → Tiago e João + Claude Code implementam.

**Duas ferramentas escrevem neste repo** (Manus e Claude Code) e o Git é a ponte única — nada de copiar e colar código entre elas. Antes de qualquer trabalho: `git fetch && git log --oneline -5`. O HEAD do Manus avança várias vezes por dia e toca sempre os mesmos arquivos (`App.tsx`, `Sidebar.tsx`, `Dashboard.tsx`, `types.ts`, `mock-data.ts`, `I18nContext.tsx`). Branch cortada de HEAD antigo conflita nesses seis.

## 12. Ordem de trabalho vigente

`segurança → guardrails → bancada → schema → connector`

### 12.0 Passo zero — antes da rotação da chave

> 🔴 **Ler antes de rotacionar a anon key.** `client/src/lib/guest-mode.ts` tem o operador `||` **dentro** do `Boolean()`:
>
> ```js
> return isGuestSession() || !Boolean(
>   import.meta.env.VITE_SUPABASE_URL || "https://ycqrgrczrunvyivxfnch.supabase.co"
> );
> ```
>
> String não-vazia é sempre truthy, então `!Boolean(...)` é **sempre `false`**. `shouldUseMockData()` hoje equivale a `isGuestSession()`, e o ramo "ou o Supabase não está configurado" é **código morto que nunca dispara**.
>
> **Consequência:** rotacionar a chave sem corrigir isto **não** degrada o app para mock — quebra todas as telas ligadas com erro de auth. Corrigir primeiro, mover o fallback para fora do `Boolean()`, e só então rotacionar.

1. **Fase A′ — segurança do repo:** runbook completo em `CORE-06_FAXINA-DO-PROTOTIPO.md` — rotação de senhas, expurgo de segredos do histórico do git, telemetria removida, RLS fechada, auditoria append-only. Cobre os 11 itens do §9. Sequência mínima, nesta ordem (a ordem importa — ver §14.3):
   1. corrigir `shouldUseMockData()` (§12.0);
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

# §14. Estado real medido — HEAD `7c16728`, 27/07/2026 10:54

Medido no clone limpo, não declarado. 54 commits, 32 páginas em `client/src/pages/`.

## 14.1 Comandos de verificação

Rodar antes de afirmar qualquer coisa sobre conformidade:

```bash
grep -c 'eyJhbGci' client/src/lib/supabase.ts        # anon key hardcoded → esperado 0
grep -rc 'USING (true)' db/*.sql                     # RLS aberta → esperado 0
grep -c 'isGuestSession' client/src/hooks/*.ts       # nenhum hook com 0
grep -rlc 'manus-storage' client/src client/index.html
grep -c umami client/index.html                      # esperado 0
grep -n allowedHosts vite.config.ts                  # esperado ausente
grep -rln 'type PageState' client/src/pages | wc -l  # duplicação dos 5 estados
git log --oneline -S'eyJhbGci' | wc -l               # commits com a chave no histórico
```

## 14.2 🔴 Bloqueantes abertos

| Item | Onde | Medida |
|---|---|---|
| Anon key em texto claro | `client/src/lib/supabase.ts:7` | 1 literal; URL repetida em `guest-mode.ts:19`; presente em 6 commits do histórico |
| Fallback para mock quebrado | `client/src/lib/guest-mode.ts` | §12.0 — armadilha da rotação |
| RLS aberta | `db/*.sql` | **16** `USING (true)` — `00_setup_complete` 4, `01_extended_tables` 8, `add_auth_profiles` 1, `add_search_presets` 3 |
| Hooks sem guarda de guest | `useSearchPresets`, `useAuditLog` | 0 chamadas a `isGuestSession()`. `useSearchPresets` faz `insert` e `delete` em tabela com as 4 operações abertas — **write anônimo disponível hoje** |
| Deploy público ativo | `guardia-vms.zenitetech.com` | Manus WebDev autoscale; **não cai quando o crédito acaba**; publica a cada checkpoint; serve o bundle com a chave |
| Telemetria e resíduos de terceiro | `index.html`, `vite.config.ts`, `client/src/components/` | umami 1; `allowedHosts: true` (linha 25); `ManusDialog.tsx`; `Map.tsx` → `forge.butterfly-effect.dev` |

**Consequência operacional:** enquanto estas linhas estiverem abertas, **nenhum dado real de pessoa entra no ambiente** — nem seed, nem fixture, nem foto de bancada, nem demo (§10.6). Hoje o que segura o dano é o mock ser sintético.

## 14.3 🟠 Build e integridade

- **`/manus-storage/` — 18 referências** em `mock-data.ts` (14), `CameraMosaic.tsx` (5), `Sidebar.tsx` (1), `MobileHeader.tsx` (1), `index.html` (1). O plugin `manus-storage-proxy` **já foi removido** do `vite.config.ts` e `client/public/` está vazio: **fora do preview Manus, logo, favicon e as imagens de câmera quebram.** As referências do logo e do favicon foram adicionadas *depois* da faxina.
- **Build quebra em clone limpo:** o alias `@shared` aponta para `shared/`, que está no `.gitignore` e ausente; `client/src/const.ts` importa `@shared/const` (arquivo órfão, ninguém o importa, mas `tsc --noEmit` e `vite build` o incluem). `@assets` → `attached_assets/` também ausente.
- **Deps órfãs:** `express`, `esbuild`, `@types/express` (sem `server/`), `@types/google.maps`.
- **Sem CI, sem `.github/`, zero teste de front.** Único teste do repo: `connector/tests/test_event_mapper.py`.

## 14.4 🟠 Decisões tomadas por código, sem passar pela pendência

- **`GroupID2` não está implementado.** Aparece **uma vez** no repositório, como comentário em `client/src/lib/types.ts:65` — `turma: string; // GroupID2 do GuardIA`. A tela de Custódia filtra por `turma` como string livre. **Comentário não decide PND-02** (§5).
- **`connector_status` é referenciada sem existir.** Usada em `client/src/lib/supabase.ts`, `connector/src/main.py` e `connector/src/supabase_sink.py`; **nenhuma migration em `db/` a cria**. Não criar avulsa — entra no levantamento de requisitos do §12.4.
- **`camera_events` carrega vocabulário de fabricante** em cinco colunas: `face_list`, `person_name`, `face_score`, `recognize_image`, `capture_image` (§6).
- **`audit_logs` tem policy de `DELETE`** (`audit_logs_delete_admin`), contra §7.

## 14.5 🟡 UI — 5 estados obrigatórios (`CORE-03` §7)

Existe `client/src/components/PageStateWrapper.tsx` (94 linhas), correto e reutilizável, exportando `LoadState` e os 5 estados com callback de retry.

**Ele tem zero importações de página.** Em vez de usá-lo, **13 das 32 páginas** declararam um `type PageState` local e recolaram os blocos de JSX à mão. Contagem de strings duplicadas: `"Connector offline"` 22×, `"Tentar novamente"` 21×, `"Carregando..."` 17×, `"Sincronização parcial"` 12×.

**Nenhuma dessas strings passa por `t()`** — o app declara i18n PT/EN/ZH e os 5 estados obrigatórios estão em português cravado nos 13 arquivos. As chaves de i18n adicionadas nos últimos checkpoints são todas `nav.*`.

Correção pendente, mecânica: importar `PageStateWrapper`/`LoadState` nas 13, apagar o union local e os blocos, e passar as ~8 strings do componente por `t()` com as chaves nos três idiomas. **Fazer antes da próxima tela** — o padrão colado já é o default.

## 14.6 🔵 Connector — não tocar antes da bancada

`connector/src/main.py` é um **loop de polling** (`schedule`, `poll_interval_seconds: 30`): não há receptor HTTP, Ack, buffer, dedupe nem retry. `p6s_client.py` usa `HTTPDigestAuth` e caminhos `/cgi-bin/*.cgi` — os dois padrões que o §4.1 declara inexistentes.

> 🚫 **Regra dos dois connectors:** nenhum dos dois se reescreve antes do `P6S-09_ROTEIRO-DE-BANCADA` com o device respondendo `statusCode 0`. Qualquer agente que receba esta lista de defeitos vai querer "consertar" o `p6s_client.py`. **Não consertar.** Registrar e esperar a bancada — reescrever contra documentação sem device é trocar um chute por outro.

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
