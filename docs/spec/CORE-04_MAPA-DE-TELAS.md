# CORE-04 — Mapa de telas

Inventário do que existe, do que falta e em que ordem construir. Subordinado ao [05_Roadmap-e-Fases](05_Roadmap-e-Fases.md): onde a ordem daqui divergir das fases de lá, vale o `05`.

**Aviso que vale para o documento inteiro:** as telas existentes são casca visual com dados mock. Adicionar tela antes de ligar pelo menos uma ao circuito real aumenta a dívida, não o valor.

## Neste documento

1. O que existe hoje — **conflito aberto (PND-17)**
2. Table stakes que faltam
3. Diferenciais a reforçar
4. Vídeo: a única superfície permitida
5. Operação das automações
6. Configuração de device
7. Ordem recomendada
8. Regras fixas para gerar tela nova

---

## 1. O que existe hoje — ⚠️ dois fronts (PND-17 reformulada)

A pergunta original ("22 telas ou 4 superfícies?") foi respondida em 26/07 com o código em mãos ([CORE-07](CORE-07_INVENTARIO-DE-CODIGO.md) §1): **os dois números eram verdadeiros, de repositórios diferentes.**

| Front | Telas | Estado |
|---|---|---|
| `guardia-dashboard` (repo Manus) | **22 telas**: Dashboard · Playback · PersonTimeline · SemanticSearch · AISummary · Automations · AbsenceAlerts · FaceLibrary · Frequencia · VisitorInvite · ElevatorControl · VehicleAccess · VehicleManagement · DeviceManagement · AIBox · AIConfig · SystemConfig · UserAdmin · AuditLog · Login · Home · NotFound | Build e `tsc` limpos; no HEAD de 26/07 o coletor Manus já saiu, mas restam umami, `allowedHosts: true` (preview via Manus) e a anon key hardcoded — pendências do `CORE-06` v4 |
| monorepo `guardia/apps/dashboard` | **12 páginas** (subconjunto: sem Automations, AbsenceAlerts, PersonTimeline, SemanticSearch, AISummary, Frequencia, VisitorInvite, ElevatorControl, VehicleAccess, AIBox) | **Sem telemetria**; convive com connector, RuleEngine e migrations no mesmo repo |

Tudo continua sendo casca com mock — nenhum dos dois rodou o circuito ponta a ponta.

**PND-17 agora é uma decisão de consolidação, não uma contagem:** qual front é o canônico. Critério sugerido em `CORE-07` §5: o monorepo como casa (limpo, com o backend ao lado), portando as 10 telas que só existem no repo Manus. Decidir antes da onda 1.

Os três diferenciais principais (automação, ausência, elevador) têm casca no repo Manus — a espinha do produto está de pé, no repositório errado.

## 2. Table stakes que faltam

Todo concorrente brasileiro de condomínio tem estas seis (`06_Benchmark-Concorrentes.md`). A ausência mata o negócio *antes* de você mostrar o diferencial.

| # | Tela | Por que é obrigatória |
|---|---|---|
| T1 | **Encomendas** | Registro com foto + retirada por QR Code. É a feature mais usada no dia a dia do porteiro |
| T2 | **Reservas de áreas comuns** | Salão, churrasqueira, academia, quadra. Universal |
| T3 | **Comunicados / avisos** | Mural digital + notificação em massa |
| T4 | **Painel da administradora** (multi-tenant) | Gerenciar N unidades num painel. Crítico para vender a administradoras e habilitar white label. Depende de `orgs`/`sites`/`memberships` ([CORE-01](CORE-01_MODELO-DE-DADOS-CORE.md) §4) |
| T5 | **Portaria remota** | Um operador atende N portarias. É o modelo de negócio que mais cresce no setor |
| T6 | **Livro de ocorrências** | Registro de incidente com foto e anexo |

## 3. Diferenciais a reforçar

| # | Tela | Por quê |
|---|---|---|
| T7 | **Retirada de aluno (custódia)** | Quem pode buscar a criança, com foto do autorizado. Altíssimo valor percebido, quase ninguém no Brasil faz |
| T8 | **Consentimento e retenção** | Titulares, status de consentimento, direitos do titular, auditoria de acesso a dado sensível. Vira argumento de venda. Spec em [CORE-05](CORE-05_RETENCAO-E-CONSENTIMENTO.md) §3 |
| T9 | **Relatório de valor** | O documento que o síndico leva para a assembleia: tentativas bloqueadas, tempo de resposta, % de rondas, frequência média. É o que garante a **renovação** |
| T10 | **White label** | Marca, cores, logo, domínio por cliente (`orgs.branding`). Habilita revenda |

## 4. Vídeo: a única superfície permitida

**Uma tela, não cinco.**

| # | Tela | O que é |
|---|---|---|
| P1 | **Ao Vivo / Reprodução (pass-through)** | Proxy autenticado que abre o stream do NVR no navegador, e deep-link de evento → playback no timestamp. O GuardIA **aponta** para o vídeo; o NVR grava e serve |

Fora de escopo por decisão fixa (nº 1 do projeto e `CLAUDE.md` §2), e explicitamente descartadas do lote V4: muro de vídeo com grade 1–36, playback multi-câmera sincronizado, live view avançado com PTZ tour e áudio bidirecional, mapas/planta baixa com submapa por andar, central de eventos no formato PSIM.

> Se o cliente quer gerenciar 500 câmeras de gravação, ele quer um VMS — e a decisão é não clonar VMS (`01_BRIEFING` §4, `02_Posicionamento` §1). Uma fila de tratamento de alertas **sem** vídeo é legítima e útil; um PSIM com muro de vídeo não é este produto.

P1 depende de **PND-18** — portas 80 / 6060 / 6066 e SDK nunca testados.

## 5. Operação das automações

O editor de regras sozinho não basta. Falta o que torna a regra operável — as três telas do [CORE-02](CORE-02_MOTOR-DE-REGRAS.md):

| # | Tela | O que é |
|---|---|---|
| A1 | **Log de disparos** | Qual regra, qual evento, quais ações, sucesso/falha, tempo. Lê `automation_runs`. Essencial para depurar e auditar |
| A2 | **Agendas** | Biblioteca reutilizável: "horário letivo", "expediente", "madrugada", feriados. As regras apontam para a agenda em vez de repetir horário |
| A3 | **Ações e integrações** | Cadastro dos destinos (webhook, WhatsApp, e-mail, relé, TTS, preset), cada um com **"Testar agora"** gravando em `integrations.last_test_ok` |
| A4 | **Simulador de regra** | Dispara evento fictício e mostra quais regras casariam. Não encontrado em nenhum concorrente do benchmark |

## 6. Configuração de device

É o CGI já mapeado virando tela — tudo que hoje só se faz na tela local do NVR. É o bloco que mais diferencia, e o que mais depende do connector.

| # | Tela | Conteúdo |
|---|---|---|
| C1 | **Parâmetros de câmera** (por canal) | OSD · imagem/ISP · iluminação · codificação (main/sub) · máscara de privacidade · áudio · PTZ. Com "copiar para outras câmeras" |
| C2 | **Armazenamento** | Discos (capacidade, status, formatar) + agenda de gravação 7×24 por canal e por tipo |
| C3 | **Rede do dispositivo** | TCP/IP, portas, DDNS, SMTP com teste, registro ativo (porta 9000 — PND-15), P2P/DID |
| C4 | **Alarmes do dispositivo** | Evento comum (agenda + ligação + PTZ linkage) · anomalia de sistema · alarme de voz TTS |
| C5 | **Sistema do dispositivo** | Geral, hora/NTP/DST, usuários do device |
| C6 | **Manutenção** | Info, logs exportáveis, upgrade local e nuvem, import/export de configuração, auto-manutenção |
| C7 | **Provisionamento em lote** | Template para N câmeras, senha em lote, IP em lote, upgrade em lote |

Guardrails obrigatórios nestas telas, sem exceção:

- **Backup antes de escrever:** nenhum `PUT` em device sem antes exportar `GET /System/DeviceConfigFile?FileType=3`.
- **Rate-limit de 3–5 s entre escritas de rede** — a configuração de rede do device é assíncrona; escrita em rajada corrompe estado.
- **Nunca contra device de cliente sem janela e aprovação.**

> Tela de "parâmetros de câmera" que não escreve no device é maquete. O valor está no CGI (já mapeado na camada 4) e no connector (a construir). Construir a tela sabendo que o passo seguinte é ligá-la.

## 7. Ordem recomendada

Alinhada às fases do [05](05_Roadmap-e-Fases.md) e às verticais de largada **condomínio e escolas**.

| Onda | Telas | Racional |
|---|---|---|
| **0 — Provar o circuito** | *nenhuma tela nova*: ligar o Dashboard e a biblioteca facial ao banco real e à bancada | Uma tela conectada vale mais que dez mockadas. É a Fase 1 do `05` |
| **1 — Destrava a venda** | T1 · T2 · T4 | Sem isso não há proposta de condomínio |
| **2 — Escola** | T7 · T8 · T9 | Segunda vertical de largada. T8 é também entrega do gate de conformidade |
| **3 — Modelo de negócio** | T5 · T10 | Habilita escala, revenda e white label |
| **4 — Diferencia** | A1 · A3 · C1 · C2 · C4 | O que nenhum concorrente tem |
| **5 — Completude** | T3 · T6 · A2 · A4 · C3 · C5 · C6 · C7 · P1 | Importantes; ninguém compra por elas |

O `P1` (pass-through) fica na última onda por dependência técnica (PND-18), não por baixa prioridade — se o teste de bancada resolver antes, sobe.

## 8. Regras fixas para gerar tela nova

Colar antes de qualquer pedido ao Manus ou ao Claude Code:

```
REGRAS FIXAS
1) Somente front-end, dados mock em JSON no código. NÃO criar backend,
   banco, auth real nem infra.
2) Nenhum dado real de pessoa. Nunca. Só dado sintético claramente fictício.
3) Stack existente (React + Vite + TS + Tailwind + shadcn/ui + lucide-react
   + recharts). Não instalar libs novas sem justificativa.
4) NÃO adicionar telemetria, analytics ou coletor de qualquer tipo. Nunca.
5) Mexer APENAS nesta tela; não recriar outras.
6) Registrar a view no viewConfig e o item na Sidebar.
7) Componentes canônicos e semântica de cor de CORE-03. Não inventar
   quarta cor de severidade.
8) Toda tela tem os cinco estados de CORE-03 §7 (carregando, vazio, erro,
   connector offline, sincronização parcial).
9) Ao terminar, rodar o build, exportar ao Git e PARAR.

BANCADA PARA MOCK (P6S-03 §1 — conflitos preservados, não escolher por conta):
NVR  192.168.254.116  RS-436MLJ-L2/S8  36ch  100.000 faces
D1  CONFLITO ABERTO (.115/H5AI-50 vs .106/CAM01)  offline
D2  Corredor   192.168.254.206  F4C-T  facial
D3  Recepção   192.168.254.208  F4C-T  facial
D4  AI IPC     192.168.254.227  T5AI   (conflito de nome de modelo)
D5  COPA       192.168.254.207  F4C-T  facial, gravando
D6  AI IPC     192.168.254.209  T5AI
```

Fontes: base V4 `11_PRODUTO-Mapa-de-Telas` (23/07/2026), com o bloco de camada VMS descartado por conflito de escopo, a ordem das ondas realinhada às verticais de largada de 26/07 e o inventário de telas rebaixado a conflito aberto contra `07_Mapa-Repo-guardia-dashboard`; `06_Benchmark-Concorrentes.md`; `CLAUDE.md` §2 e §10.
