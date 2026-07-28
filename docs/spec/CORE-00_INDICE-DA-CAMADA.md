# CORE — Índice da camada de especificação do produto

Camada 5 da base do **GuardIA Percebe**. Reúne as especificações do **core do GuardIA e da sua interface** que a base não tinha: modelo de dados multi-tenant, motor de regras, design system, mapa de telas, retenção/consentimento e faxina do protótipo.

Prefixo `CORE-` pelo mesmo motivo do prefixo `P6S-`: a faixa numérica `09`–`91` já é da biblioteca do fabricante e a faixa `00`–`08`/`97`–`98` já está fechada. Nenhum número novo colide.

## Procedência

Incorporada em **26/07/2026** a partir da base **GuardIA V4 (gerada em 23/07/2026)**, um consolidado anterior ao módulo Percebe. A conferência arquivo por arquivo mostrou que:

- Os 24 arquivos de biblioteca de protocolo da V4 (`90_REF_*`, ~4,5 MB) são **integralmente redundantes** com a camada 4 desta base. Conferência: 827 caminhos de endpoint em cada lado, com os únicos exclusivos do lado **desta** base (`/System/AIEventCfg`, `/api/v1/event/pull`, `/sessionId/messageId`); ~1.050 títulos de seção da V4 conferidos, todos presentes aqui. Esta base é superset — tem `30_System-parte3` e um `24_Eventos-Inteligentes-Config` 2,5× maior. **A V4 foi descartada sem perda de informação de protocolo.**
- Sobraram seis documentos autorais com conteúdo inédito, que se tornaram os arquivos `CORE-01` a `CORE-06` e o `P6S-09`.

Rastreabilidade completa em `CHANGELOG-Incorporacao-CORE-2026-07-26.md`.

## Documentos

| Arquivo | Conteúdo | Origem V4 |
|---|---|---|
| `CORE-00_INDICE-DA-CAMADA.md` | Este índice, procedência e o que foi descartado | `00_LEIA-PRIMEIRO`, `02_DECISOES` |
| `CORE-01_MODELO-DE-DADOS-CORE.md` ⭐ | DDL PostgreSQL multi-tenant, RLS, storage de mídia, expurgo, ordem das migrations | `42_ARQ-Core-Banco-PostgreSQL` |
| `CORE-02_MOTOR-DE-REGRAS.md` ⭐ | Gatilho → condições → ações; gatilho por não-evento; cooldown e anti-flood; simulador; automações de fábrica | `43_ARQ-RuleEngine-Automacoes` |
| `CORE-03_UI-DESIGN-SYSTEM.md` | Tema, shell, componentes canônicos, estados obrigatórios, contrato de dados da UI | `50_UI-Design-System` |
| `CORE-04_MAPA-DE-TELAS.md` | Inventário de telas existentes e faltantes, priorizado; regras fixas para gerar tela nova | `11_PRODUTO-Mapa-de-Telas` |
| `CORE-05_RETENCAO-E-CONSENTIMENTO.md` | Prazos de retenção por artefato e spec da tela de consentimento — instrumenta o gate da Fase 0 | `12_PRODUTO-LGPD` §4 e §6 |
| `CORE-06_FAXINA-DO-PROTOTIPO.md` | Runbook dos 11 problemas conhecidos do código atual, incluindo a remoção da telemetria | `62_PLANO-Saida-do-Manus` + `CLAUDE.md` §9 |
| `CORE-07_INVENTARIO-DE-CODIGO.md` | O que já existe em código nos dois repositórios | — (posterior ao lote de 26/07) |
| `CORE-08_REGISTRO-DE-DECISOES.md` | `DR-nn`: quem decidiu o quê, quando, alternativa recusada e custo de reverter | — (aberto em 28/07) |

⭐ = leitura obrigatória antes de mexer em backend.

`CORE-07` e `CORE-08` não vêm da V4 — foram abertos depois da incorporação. O `CORE-08` existe porque este índice registra **procedência** e o `CLAUDE.md` §14 registra **estado medido**, mas nenhum dos dois registrava **escolha**: decisão tomada em conversa não sobrevive à conversa.

Fora desta camada, o mesmo lote entregou `P6S-09_ROTEIRO-DE-BANCADA.md`, que pertence ao acervo do driver p6s (camada 3).

## Precedência

Esta camada é **subordinada à camada 1**. Em conflito:

1. Decisão de produto, fronteira de escopo, marca e roadmap → `01`–`05`. Sempre.
2. Detalhe de protocolo ou dado de bancada → `P6S-*` e biblioteca `09`–`91`.
3. Modelo de dados, motor de regras e UI → esta camada, **e o código que está no Git**. Onde o código rodando divergir da spec, o código é o fato e a spec se corrige (ou o código é bug — mas a divergência não se resolve por leitura).

Esta camada **não** cria decisão de negócio. Onde ela precisou de uma resposta que a base não dá, abriu pendência numerada em `05_Roadmap-e-Fases.md` §6.

## O que foi descartado da V4 e por quê

Registro explícito, para que ninguém reintroduza por engano ao encontrar a V4 em outro lugar:

| Item da V4 | Motivo do descarte |
|---|---|
| Os 24 arquivos `90_REF_*` (~4,5 MB) | Redundantes — ver §Procedência |
| Decisão **D-07**: "o GuardIA ganha uma camada de VMS operacional" (mosaico ao vivo, muro de vídeo, playback multi-câmera sincronizado, PTZ com tour, áudio bidirecional) e as telas **V1–V5** | Colide de frente com a decisão fixa nº 1 do projeto e com `CLAUDE.md` §2. A única superfície de vídeo permitida é o **pass-through autenticado no navegador** (`05` §4) |
| Decisão **D-09**: "vertical de largada = Condomínio" (só ela) | Superada em 26/07: largada é **condomínio e escolas** (`01_BRIEFING` §6) |
| `12_PRODUTO-LGPD` §5: "não habilitar cerca virtual nem contagem em pátio de escola" | Decisão revertida em 26/07. Os recursos são permitidos; o que existe é a **ressalva operacional** de parecer jurídico antes da primeira proposta escolar (gate da Fase 0) |
| **P-08**: "hospedagem do Core: Supabase gerenciado ou PostgreSQL próprio?" | Não é pendência: a stack é **PostgreSQL no datacenter HostDime**. Supabase existe só no protótipo `guardia-dashboard` |
| "559 endpoints" (em 3 arquivos da V4) | Número morto — contagem parcial da V3. Os números válidos são **936 páginas CGI, 796 caminhos de endpoint, 28 eventos HTTP** |
| Os blocos de mock que declaram `D1 = 192.168.254.115 / H5AI-50` como "dado real, usar exatamente este e nenhum outro" | A V4 fechou por decreto o que esta base mantém como **⚠️ CONFLITO aberto** (`.115`/H5AI-50 vs `.106`/CAM01) — `P6S-03_BANCADA` §1. Os dados de exemplo em `CORE-03` e `CORE-04` reproduzem a bancada **com a marcação de conflito preservada** |
| Argumento comercial "ação civil pública de R$ 15 milhões contra o Paraná por biometria de menores" | Não consta em nenhuma fonte desta base e não foi verificado. Não usar em proposta sem checagem. O argumento de venda de conformidade que **está** verificado é a ANPD NT nº 5/2025 (`01_BRIEFING` §6) |
| Todo o vocabulário de marca da V4 | A V4 é **pré-naming** — "Percebe" aparece uma vez, por acidente. Marca e vocabulário comercial vêm de `02` e `03` |

## Divergências que a incorporação abriu (não resolver por inferência)

Três, todas registradas como pendência em `05` §6:

- **PND-16** — nome canônico da tabela de eventos e da coluna de tenancy. A V4 decreta `events` + `org_id`; o repo usa `camera_events`; `P6S-05_SPEC` §A.4 usa `p6s_events`; `CLAUDE.md` §3 manda `tenant_id`. `CORE-01` adota `events` + `org_id` e explica por quê, mas **a palavra final é do Tiago** — junto com PND-02.
- **PND-17** — inventário real de telas. A V4 nomeia 22 telas existentes; o `07_Mapa-Repo` (análise externa, com pastas bloqueadas por robots) descreve quatro superfícies. Um dos dois está errado sobre o mesmo repositório. Resolve-se em minutos com o Claude Code no clone local.
- **PND-18** — pass-through de vídeo: portas 80 / 6060 / 6066 e SDK nunca foram testados. O item de pass-through da Fase 3 depende disso.

## Fontes

- Base GuardIA V4 de 23/07/2026 (44 arquivos), conferida integralmente contra esta base em 26/07/2026.
- Decisões de 26/07/2026 registradas em `01_BRIEFING-GuardIA-Percebe.md`, `04_Arquitetura-Tecnica.md`, `05_Roadmap-e-Fases.md` e `CHANGELOG-Coerencia-2026-07-26.md`.
- `CLAUDE.md` §9 (erros conhecidos do código atual) para o `CORE-06`.
