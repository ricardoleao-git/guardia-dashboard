# GuardIA Percebe — Roadmap e Fases

Sequência de entrega do módulo, herdando as fases já especificadas no ciclo Ruision e estendendo para o cenário multifabricante. Datas são de planejamento, não compromisso.

> 🔧 **Revisão v2 — 26/07/2026 (auditoria de coerência).** Mudou: sumário do §4 alinhado à decisão de 26/07 (escolas entrou); Fase 3 ganhou trilha própria de escolas (antes só condomínio no checklist, apesar do título); Fase 0 ganhou o gate de conformidade LGPD; Fase 2 ganhou os itens de auditoria e expurgo; Câmaras Frias reclassificada de `[LACUNA]` para **lacuna parcial**; backlog completado com quatro pendências que existiam na base e não estavam aqui. Rastreabilidade em `CHANGELOG-Coerencia-2026-07-26.md`.

> 🔧 **Revisão v5 — 26/07/2026 (lote v5: pesquisas 06C–06F).** Mudou: PND-19 ampliada com a reconciliação de datasheets da pesquisa `06D` (T5AI = Ingenic T41NQ; "N436M"/100k sem canal público — o datasheet fornecido e as fotos sustentam a base); Fase 4 ganhou bloco de **candidatos** (busca semântica, resumo LLM, AI Box) a validar com Ricardo. Rastreabilidade em `CHANGELOG-Incorporacao-Lote-v5-2026-07-26.md`.

> 🔧 **Revisão v4 — 26/07/2026 (lote v4: spec das 56 telas + inventário de código + pesquisas íntegras).** Mudou: PND-17 reformulada (dois fronts — decisão de consolidação); PND-08 ganhou evidência primária (fotos da bancada em `P6S-10` §1); PND-13 e PND-15 ganharam material novo (`P6S-10` §5 e §7); entraram **PND-19** e **PND-20**; Fase 1 aponta o código existente (`CORE-07`). Rastreabilidade em `CHANGELOG-Incorporacao-Lote-v4-2026-07-26.md`.

> 🔧 **Revisão v3 — 26/07/2026 (incorporação da camada CORE).** Mudou: o backlog do §6 passou a ter **identificadores estáveis `PND-xx`** para poder ser citado de outros arquivos; entraram **seis pendências novas** vindas da conferência da base V4 (PND-13 a PND-18); as fases ganharam ponteiros para os arquivos `CORE-*` e `P6S-09` que especificam o que antes era só item de checklist. Nenhuma decisão de negócio mudou. Rastreabilidade em `CHANGELOG-Incorporacao-CORE-2026-07-26.md`.

## Neste documento

1. Fase 0 — Fundação (marca + contratos internos + gate de conformidade)
2. Fase 1 — MVP de eventos (driver p6s)
3. Fase 2 — Biometria (driver p6s)
4. Fase 3 — Produto vendável (verticais condomínio e escolas)
5. Fase 4 — Multifabricante
6. Backlog e pendências abertas

---

## 1. Fase 0 — Fundação

Objetivo: fechar marca, contratos internos e enquadramento legal antes de escalar código.

- [ ] Checklist INPI/domínio do [02_Posicionamento-e-Marca](02_Posicionamento-e-Marca.md) §5 (inclui verificação prioritária da marca-mãe GuardIA vs guardia.app).
- [ ] Especificar o catálogo canônico de eventos v0 ([04_Arquitetura](04_Arquitetura-Tecnica.md) §4) como contrato formal (JSON Schema).
- [ ] Definir contrato mínimo de driver ([04_Arquitetura](04_Arquitetura-Tecnica.md) §3) como interface versionada.
- [ ] Provisionar infra nova: endpoint HTTPS público fixo + broker EMQX.
- [ ] **Faxina do protótipo** — telemetria removida, segredos rotacionados e expurgados do histórico, RLS fechada, auditoria append-only: `CORE-06_FAXINA-DO-PROTOTIPO.md`. É a Fase A′ de `CLAUDE.md` §12 e precede a entrada de qualquer dado real.
- [ ] **Fechar PND-16 e PND-02** (nomes de tabela/tenancy e chaves de correlação) e aplicar as migrations 001–007 de `CORE-01_MODELO-DE-DADOS-CORE.md` §8, com teste de isolamento entre orgs no CI.

**Gate de conformidade (novo em v2 — origem: `06_Benchmark-Concorrentes.md` §7 e `08_Dossie-Pesquisa-e-Spec-30dias.md` §4):**

- [ ] Definir a **base legal por vertical** e registrar no contrato: consentimento específico e destacado (LGPD Art. 11, I) e/ou prevenção à fraude e segurança na identificação (Art. 11, II, "g"). O rol do Art. 11 é taxativo e **não** inclui legítimo interesse.
- [ ] Decidir e documentar a **política de retenção do snapshot de evento** (o Percebe persiste imagem de rosto; por quanto tempo, onde, quem acessa) — é a única mídia que o módulo guarda ([04_Arquitetura](04_Arquitetura-Tecnica.md) §9).
- [ ] **Validação jurídica formal do enquadramento escolar** (cerca virtual + contagem em pátio) antes da primeira proposta — ressalva de [01_BRIEFING](01_BRIEFING-GuardIA-Percebe.md) §6. Motivo: a ANPD NT nº 5/2025 elegeu dados de crianças e adolescentes como ponto explícito de fiscalização em reconhecimento facial.
- [ ] Delimitar por escrito o que é do **core** e o que é do **Percebe**: consentimento registrado/revogável, alternativa não-biométrica (TAG/QR/senha), RIPD e template criptografado são do GuardIA core; o Percebe herda essas garantias e não pode violá-las (rastro de exclusão, log de acesso, expurgo — Fase 2).

## 2. Fase 1 — MVP de eventos (driver p6s)

Herdada de `P6S-05_SPEC-Fase1-Ingestao-Eventos.md`. Objetivo: eventos chegando ao GuardIA sem depender de ninguém externo.

- [ ] Teste de bancada (meio dia) com T5AI .227 — **comandos prontos em `P6S-09_ROTEIRO-DE-BANCADA.md`**; plano de origem em `P6S-06_SPEC-Fase2-Cadastro-Facial-CGI.md` §6: validar safety code (Ownner vs serial), criar grupo, cadastrar pessoa+foto, ver evento de reconhecimento, configurar push HTTP e receber, testar RemoteOpenDoor, repetir via MQTT, medir tempo por cadastro.
- [ ] Caminho rápido: e-mail do NVR → IMAP → ingestor (o NVR não tem webhook nativo — só e-mail/P2P/sirene; ver [04_Arquitetura](04_Arquitetura-Tecnica.md) §3).
- [ ] Caminho definitivo: push HTTP das T5AI (`HTTPEventServerConfigV2`) → endpoint do Percebe. **Ponto de partida de código:** `services/connector` do monorepo já recebe, assina, responde Ack e enfileira em SQLite (`CORE-07` §2.1); faltam dedupe persistente, retry, reconciliação e a tradução para o catálogo canônico.
- [ ] Normalização para o catálogo canônico + correlação FaceUUID→pessoa.
- [ ] Primeiro alerta fim-a-fim no WhatsApp/painel — a primeira regra sai do `CORE-02_MOTOR-DE-REGRAS.md` §9 (automações de fábrica), com cooldown ligado desde o início.

Fluxo de trabalho: Ricardo especifica e prototipa no Manus → passa para Tiago (dev senior) e João (dev junior) + Claude Code. Fontes: 00-BRIEFING-Continuidade.md §5–§6; correção de Ricardo em 26/07/2026.

## 3. Fase 2 — Biometria (driver p6s)

Herdada de `P6S-06_SPEC-Fase2-Cadastro-Facial-CGI.md`.

- [ ] Cadastro facial via CGI (LAN direto; MQTT `transportCGIConfig` para NAT).
- [ ] Fila de sincronização com fan-out por câmera, retry e estado por device.
- [ ] Validação de qualidade da foto antes do envio.
- [ ] Reconciliação periódica device × esperado.
- [ ] Exclusão propagada com log (LGPD) — mecânica em `CORE-01_MODELO-DE-DADOS-CORE.md` §7; prazos em `CORE-05_RETENCAO-E-CONSENTIMENTO.md` §2.
- [ ] **Log de acesso a dado biométrico** — quem consultou face/foto/evento facial e quando (novo em v2; `08` §4, item 5).
- [ ] **Expurgo automático por fim de vínculo** — saída de aluno/morador/funcionário remove a face em todos os devices e gera comprovante (novo em v2; `08` §4, item 6).

## 4. Fase 3 — Produto vendável (verticais condomínio e escolas)

Verticais de largada decididas (26/07/2026): condomínio (LPR + vaga + visitante) e escolas (facial no acesso + cerca virtual + contagem em pátio + queda + fumaça).

**Trilha condomínio:**

- [ ] Perfil de eventos "Condomínio" ligado por device (LPR + vaga + visitante + cerca).
- [ ] Integração LPR → `/LicensePlateGroup/*` + trava de vaga (Ground Lock).
- [ ] Piloto em 1 condomínio real; medir: latência evento→alerta, falsos positivos, uptime de devices.

**Trilha escolas (novo em v2 — o título da fase já incluía escolas, o checklist não):**

- [ ] Perfil de eventos "Escolar" ligado por device: `face.recognized`, `face.unknown` ("estranho"), `fence.intrusion`/`line.crossed`, `flow.count`, `person.fall`, `smoke.detected`.
- [ ] Agenda por perfil: cerca virtual e contagem em horário de aula, "estranho" e off-duty no período noturno — resolver preferencialmente na agenda nativa do NVR, com sobreposição no driver (`P6S-05_SPEC` §A.5).
- [ ] Correlação rica no alerta: FaceUUID→aluno, GroupID2→turma, turma→responsável.
- [ ] **Bloqueio de largada:** nenhuma proposta escolar com cerca virtual/contagem antes do parecer jurídico do gate da Fase 0.

**Comum às duas trilhas:**

- [ ] Pass-through de visualização no navegador (proxy autenticado) — **depende de PND-18** (portas 80/6060/6066 nunca testadas). É a única superfície de vídeo do produto: `CORE-04_MAPA-DE-TELAS.md` §4.
- [ ] Material comercial do [03_Descricao-Comercial](03_Descricao-Comercial.md) aplicado à proposta-piloto.
- [ ] Telas que destravam a venda, na ordem de `CORE-04_MAPA-DE-TELAS.md` §7 — **depois de PND-17**, que define o que já existe.

## 5. Fase 4 — Multifabricante

- [ ] Coletar documentação: ISAPI (Hikvision), Intelbras, UNV, Positivo (verificar rebadge) [LACUNA: nada coletado].
- [ ] Driver ONVIF genérico: validar quais eventos de IA chegam por ONVIF por família de câmera (pendência 4 de `P6S-01_ESTADO-ATUAL` §4 — se ONVIF entregar IA, vira o caminho preferido de ingestão multifabricante).
- [ ] Homologação formal por família (gera a lista "famílias homologadas" da proposta).
- [ ] Perfil "Escolar" e "Condomínio" **portados** para os novos drivers (os perfis em si nascem na Fase 3).
- [ ] **Candidatos de Fase 4 a validar com Ricardo** (origem: doc 11 do monorepo + pesquisa `06C` — não são compromisso até entrarem formalmente aqui): busca semântica por linguagem natural sobre a "Análise de Modelo Grande" do AX650 (depende de PND-20; fallback agnóstico via VLM sobre snapshots), resumo automático de eventos por LLM ("resuma as ocorrências da noite" — análogo agnóstico ao Text-Defined Alarms da Dahua), e AI Box para parque legado (câmeras comuns → eventos canônicos). A referência competitiva está em `06C` (AcuSeek/Guanlan, Xinghan).
- [ ] Perfil "Câmaras Frias" — lacuna parcial: esboço `door.held_open` + `post.abandoned` + presença fora de horário ([04_Arquitetura](04_Arquitetura-Tecnica.md) §4); falta validar com device homologado e fechar o catálogo da vertical.

## 6. Backlog e pendências abertas

Identificadores `PND-xx` são **estáveis**: outros arquivos citam por número. Ao fechar uma pendência, manter a linha e marcar o desfecho — não renumerar.

Regra: pendência aberta **não se preenche por inferência**. Documento que precise da resposta cita a `PND-xx` e para ali.

| # | Pendência | Origem | Status / como fechar |
|---|---|---|---|
| **PND-01** 🔴 | **Validar o `unique_code` do safety code (Ownner vs serial)** | `P6S-06_SPEC` §2 | Pendente bancada — **bloqueia a Fase 2 inteira**. 10 min: `P6S-09_ROTEIRO-DE-BANCADA` §4 |
| **PND-02** | Validar com Tiago as chaves `FaceUUID`/`GroupID2` | instruções do projeto | Pendente — decidir junto com PND-16, antes da migration 001 |
| **PND-03** | **Cadastro facial na base de 100k do NVR — elimina o fan-out?** | `P6S-01_ESTADO-ATUAL` §4 item 3 · `P6S-03_BANCADA` §2 | Pendente (varredura de `FileType` + sniffing do EasyVMS): `P6S-09` §3.7. Impacto: hoje 3.000 alunos × 6 câmeras ≈ 18.000 envios, ~5 h de carga inicial |
| **PND-04** | **ONVIF entrega eventos de IA?** | `P6S-01_ESTADO-ATUAL` §4 item 4 | Pendente bancada — destrava a Fase 4 |
| **PND-05** | Requisitos finos da foto (resolução, qualidade) + porta 4999 com Ben | `P6S-01_ESTADO-ATUAL` §4 | Pendente — teste empírico em `P6S-09` §5.5. Sem isso a validação de qualidade da UI é palpite |
| **PND-06** | NVR 6.0: expõe CGI P6S ou só ONVIF? | `50_NVR-5_0-vs-6_0-Comparativo.md` | Pendente |
| **PND-07** | Compatibilidade HiEasy × NVR 5.0 (para proposta) | `50_NVR-5_0-vs-6_0-Comparativo.md` | Pendente bancada |
| **PND-08** | **Conflitos de bancada abertos** (D1; banda 480 Mbps datasheet vs 80 Mbps UI; tipo exato de D4) | `P6S-03_BANCADA` §1 · `P6S-10` §1 | **Evidência primária nova:** as fotos registram D1 = CAM01/.115/H5AI-50 e banda 80 Mbps na UI. Confirmar com `GET /System/DeviceStatus` (`P6S-09` §3.3) e então fechar D1 e D4; a divergência de banda (limite de modo vs NIC) segue aberta |
| **PND-09** | Catálogo de eventos da vertical Câmaras Frias | este projeto | Lacuna parcial (esboço em `04` §4) — fechar com device homologado |
| **PND-10** | **Validação jurídica do enquadramento escolar** (cerca virtual + contagem em pátio) | `01_BRIEFING` §6 | Pendente — **gate da Fase 0**, bloqueia a primeira proposta escolar com esses recursos |
| **PND-11** | **Base legal por vertical + retenção do snapshot** | `06` §7 · `08` §4 | A definir — gate da Fase 0. Proposta técnica pronta para o jurídico opinar: `CORE-05_RETENCAO-E-CONSENTIMENTO` §2 |
| **PND-12** | GuardIA 360 (nome do plano completo) — checar colisão | `02_Posicionamento` §4 | Futuro |
| **PND-13** | **Existe endpoint para adicionar IPC a um canal do NVR (D1..D36)?** Não encontrado nos 796 caminhos extraídos | conferência da base V4 | Pendente — trava o **provisionamento zero-touch**; adição manual pela UI funciona. Capturar a requisição real da UI: `P6S-09` §3.10 e §8. Contrato da tela e pista (`eDeviceDetectListFile`, discovery porta 5555) em `P6S-10` §5 |
| **PND-14** | Canais 33–36 respondem? A documentação declara "máximo 32 canais" em vários campos, mas o RS-436MLJ é 36ch | conferência da base V4 | Pendente — só afeta instalação com mais de 32 canais. 15 min: `P6S-09` §3.9 |
| **PND-15** | Porta 9000 (registro ativo do NVR) como via de ingestão | conferência da base V4 · `P6S-10` §7 e §11 | Pendente — **subiu de prioridade**: o evento facial nasce no NVR AI; se o push das câmeras não carregar o resultado da comparação, o registro ativo deixa de ser plano B. `P6S-09` §3.4 |
| **PND-16** | **Nome canônico da tabela de eventos e da coluna de tenancy:** `events`/`camera_events`/`p6s_events` e `org_id`/`tenant_id` | `CORE-01` §2 · `CLAUDE.md` §3 · `P6S-05_SPEC` §A.4 | Pendente — decidir **antes da migration 001**, com PND-02. Adotado provisoriamente `events` + `org_id` |
| **PND-17** | **Consolidação dos dois fronts:** repo Manus tem 22 telas (com telemetria); monorepo tem 12 (limpo, com backend ao lado) | `CORE-04` §1 · `CORE-07` §1 e §5 | Reformulada em v4 — a contagem está resolvida; falta **decidir o canônico** e portar. Critério sugerido: monorepo como casa. Decidir antes da onda 1 de telas |
| **PND-18** | **Pass-through de vídeo:** portas 80 / 6060 / 6066 e SDK nunca testados | conferência da base V4 · `07_Mapa-Repo` | Pendente bancada — trava o item de pass-through da Fase 3 |

| **PND-19** | **Datasheets oficiais e citáveis da linha de NVR** — (a) capacidade facial dos modelos intermediários (só há dois pontos: 1.000 RS-N336ALJ/A1X e 100.000 RS-436MLJ/AX650); (b) a pesquisa `06D` **não localizou em canal público** o "N436M"/100k (o datasheet fornecido `53` afirma 100k e as fotos `P6S-10` §1 mostram o AX650 rodando) — pedir ao fornecedor versão publicável antes de citar em proposta pública; (c) chip da T5AI precisado como **Ingenic T41NQ**, não AX650 (`06D`) | conversa de 26/07 · `06D` | Pendente — pedir os datasheets oficiais das variantes que a Zênite revende |
| **PND-20** | **"Análise de Modelo Grande" do NVR responde por CGI?** Recurso local (máx. 4 canais), sem push equivalente — destravaria busca semântica retroativa | `P6S-10` §2.1 e §2.7 · monorepo | Pendente bancada |

Fontes: 00-BRIEFING-Continuidade.md §6; 50_NVR-5_0-vs-6_0-Comparativo.md (lacunas); P6S-01_ESTADO-ATUAL §4; P6S-03_BANCADA §1–§2; 06_Benchmark §7; 08_Dossie §4; conversa de 26/07/2026 e auditoria de coerência do mesmo dia; conferência da base GuardIA V4 (23/07/2026) contra esta base, registrada em `CHANGELOG-Incorporacao-CORE-2026-07-26.md`.
