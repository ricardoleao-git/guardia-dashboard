# CORE-06 — Faxina do protótipo

Runbook de saída do protótipo `guardia-dashboard`. Fecha os 11 defeitos estruturais listados em `CLAUDE.md` §9, na ordem em que eles se destravam.

> **Status (v5 — commits da noite de 26/07, autor `manus-agent`):** a Fase A′ está **em execução dentro do Manus**: "RLS restritiva" aplicada nos SQLs e itens "expurgados do git tracking". Duas precisões obrigatórias: (1) a RLS aplicada é **intermediária** — `camera_events` exige `authenticated` para ler, mas `profiles` mantém `read_all USING (true)`, o INSERT de eventos é `WITH CHECK (true)` e o schema segue **single-tenant** (zero `org_id`); não é o isolamento do `CORE-01`. (2) "Expurgado do tracking" **não remove do histórico** — a anon key e o `config.yaml` antigo continuam nos 46 commits públicos; a rotação segue sendo o item nº 1. Além disso, **5 páginas foram conectadas ao Supabase real** (hooks `useFaceLists`, `useEvents`, `useAttendance`, `useDevices`, `useAuditLog` — inclui a FaceLibrary): enquanto a chave não for rotacionada e o ambiente não estiver limpo, **só dado sintético** entra nessas telas — foto real de pessoa, nunca.

> **Status (v4 — auditoria remota de 26/07, HEAD `64290b4` das 20:40):** a faxina foi **parcialmente aplicada também no repo de 22 páginas**: coletor `__manus__`, plugins do `vite.config.ts`, deps Manus, `backups/` e o `config.yaml` com senhas estão **fora do HEAD**. O que resta nele: (1) 🔴 **anon key do Supabase hardcoded** em `client/src/lib/supabase.ts`, num repo **público** e presente no **histórico** — rotacionar a chave no painel do Supabase e remover o fallback é a ação mais urgente deste runbook; senhas do antigo `config.yaml` também vivem no histórico → rotação + expurgo (A.6) continuam obrigatórios; (2) script **umami** no `index.html`; (3) `allowedHosts: true` — **setado pelo próprio Manus em 26/07** (fix do React #310) para o preview via proxy: intencional e temporário, sai quando o desenvolvimento deixar o Manus (PND-17), não é resquício de faxina incompleta; enquanto durar, a regra "nenhum dado real de pessoa" segue em vigor; (4) `@types/google.maps`. O schema segue single-tenant, com 4 SQLs novos a incluir no levantamento de requisitos da Fase B.

> **Status (v3 — 26/07):** a Fase A já foi **executada uma vez**, sobre um snapshot de **12 páginas** do dashboard (evidência: `FAXINA-realizada.md` + `guardia-dashboard-limpo.zip`, arquivados no Git). O build limpo passou (1.748 módulos, zero referências a manus/umami/forge). Esse snapshot limpo é o ancestral do `apps/dashboard` do monorepo. **O que segue pendente:** as 10 telas adicionadas *depois* no repo Manus (build de 22 páginas, 1.762 módulos) nunca passaram pela faxina — ao portá-las (PND-17), aplicar a checagem do §7 sobre cada arquivo portado, sem trazer os artefatos de volta.

> **Escopo (v2):** este runbook aplica-se ao repo **Manus** (`guardia-dashboard`). O monorepo `guardia` já está limpo de telemetria e tem schema multi-tenant em rascunho ([CORE-07](CORE-07_INVENTARIO-DE-CODIGO.md)) — mas a cópia do dashboard dentro dele tem só 12 das 22 telas. A consolidação dos dois fronts (PND-17) decide onde esta faxina acontece: se o monorepo vira o canônico, a faxina se reduz a portar as 10 telas faltantes **sem trazer junto** os artefatos listados abaixo.

É a **Fase A′** da ordem de trabalho vigente (`CLAUDE.md` §12: `segurança → guardrails → bancada → schema → connector`). Nada da Fase 1 do [05](05_Roadmap-e-Fases.md) roda com segurança antes disto.

## Neste documento

1. A regra que vale desde já
2. Fase A — telemetria e segredos (bloqueante)
3. Fase B — banco
4. Fase C — connector
5. Fase D — resíduos e posicionamento
6. O que aproveitar do protótipo
7. Checklist de saída

---

## 1. A regra que vale desde já

> **Enquanto o coletor de telemetria existir no código, nenhum dado real de pessoa entra no ambiente. Só mock.**

`client/public/__manus__/debug-collector.js` (821 linhas) captura console, **todas as requisições de rede** e **todas as interações do usuário**, e envia para `/__manus__/logs`. Num sistema que processa biometria de menor, um coletor que espelha as interações do operador é inaceitável — juridicamente antes de tecnicamente. Não importa que a intenção seja depuração; importa que o dado sai.

Corrige também a narrativa que circulava: o motivo de sair da plataforma de geração **não é lock-in de banco**. O código gerado aponta para Supabase com fallback mock, e o risco de lock-in é baixo. O motivo é **telemetria + LGPD**. Diagnóstico errado leva a prioridade errada.

## 2. Fase A — telemetria e segredos (bloqueante)

Fecha `CLAUDE.md` §9 itens **9** e **10**.

```bash
# A.1 Artefatos de telemetria
rm -rf client/public/__manus__/ .manus-logs/ template.json

# A.2 vite.config.ts — remover os 4 plugins (a execução real achou um a mais
#     que o CLAUDE.md §9 listava) + os allowedHosts:
#     vitePluginManusDebugCollector, vitePluginManusRuntime, jsxLocPlugin,
#     vitePluginStorageProxy · allowedHosts *.manus*.computer

# A.3 Dependências
pnpm remove vite-plugin-manus-runtime @builder.io/vite-plugin-jsx-loc

# A.4 Achados da execução real que a lista original não tinha:
#     - client/index.html: script de analytics **umami** (%VITE_ANALYTICS_*%) — remover
#     - client/src/components/ManusDialog.tsx — código morto de branding, remover
#     - URLs /manus-storage/* em CameraMosaic.tsx, mock-data.ts, FaceLibrary.tsx —
#       zerar (o código já tem fallback de placeholder)

# A.5 Conferir que não sobrou referência
grep -rn "manus\|__manus__\|debug-collector\|forge\|umami" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.html" . | grep -v node_modules
```

**A.6 Segredos — não basta apagar o arquivo.** `connector/config/config.yaml` tem senha de câmera em texto claro e está **versionado**; a pasta `backups/` também. Delimitação de severidade (`DELTA` §3): a chave Supabase nesse arquivo estava num campo chamado `service_role_key`, mas o JWT decodificado é **`role: anon`** — não houve exposição de chave de serviço nem bypass de RLS; a rotação segue obrigatória, e ao reescrever o `config.example.yaml` o campo vira **`anon_key`**.

1. Rotacionar as senhas nos devices **antes** de qualquer outra coisa. Segredo que já foi ao git público é segredo queimado.
2. Mover configuração para variável de ambiente ou cofre. Nenhum segredo em repositório (`CLAUDE.md` §10, item 5).
3. Expurgar do **histórico**, não só do HEAD (`git filter-repo` ou BFG), e forçar reescrita.
4. Remover `backups/` do versionamento e adicionar ao `.gitignore`.

**A.7** Decidir sobre `server/index.ts` — é servidor estático; o deploy do front pode ser estático puro. Provável descarte.

**A.8** Remover `Map.tsx` e `ManusDialog.tsx` e `@types/google.maps`: chamada a API externa que ninguém pediu e que vaza contexto de operação.

## 3. Fase B — banco

Fecha itens **4**, **5**, **6**, **7** e **8**. O destino é [CORE-01](CORE-01_MODELO-DE-DADOS-CORE.md); esta fase é a transição.

| Defeito atual | Correção |
|---|---|
| Zero coluna de tenancy nas 12 tabelas | Schema novo com `org_id` + `site_id` desde a migration 001 (PND-16 define o nome final) |
| RLS permissiva `_read USING (true)`, inclusive em `face_lists` e `attendance`; `camera_events` aceita insert anônimo | RLS por org em toda tabela + teste de isolamento no CI ([CORE-01](CORE-01_MODELO-DE-DADOS-CORE.md) §5) |
| `audit_logs` permite `DELETE` a admin | `audit_log` append-only, sem `DELETE`/`UPDATE` para nenhum papel |
| `camera_events` carrega vocabulário de fabricante | Tabela `events` com `type` do catálogo canônico ([04](04_Arquitetura-Tecnica.md) §4); vocabulário de fabricante fica em `raw`/`raw_ref` |
| Correlação por `person_name` | Correlação por chave: `persons.id` ↔ `FaceUUID` |
| `face_lists.face_id` guarda o ID **da câmera** | Guardar o `FaceUUID` do GuardIA — a chave é nossa dos dois lados (PND-02) |
| Turma como `unit TEXT` livre | `face_groups.group_id2`, com unicidade por site |
| SQL aplicado à mão no editor | Migrations versionadas (Drizzle ou Prisma) |

`db/01_extended_tables.sql` serve como **levantamento de requisitos de campo** — quais campos o produto pediu — e nunca como schema final.

## 4. Fase C — connector

Fecha itens **1**, **2** e **3**. **Reescrever, não estender.**

`connector/src/p6s_client.py` chama `/cgi-bin/...` com `HTTPDigestAuth`: os caminhos não existem no protocolo e a autenticação está errada. O connector nunca rodou contra hardware — só `--dry-run`. Estender esse arquivo é construir sobre endpoint inventado.

O que o connector novo precisa ter, e o atual não tem:

- Auth **HTTP Basic** (na bancada, `admin` com senha vazia — só na LAN).
- **Push como canal primário** (`/System/HTTPEventServerConfigV2`). Polling de 30 s é proibido; `/FaceRecognition/QueryRecordList` só como job de reconciliação.
- **Ack em menos de 500 ms**, senão o device retransmite.
- Buffer local persistente, dedupe, retry com backoff, fila que sobreviva a queda de link.
- Estado por device e por (pessoa × device) para o fan-out.
- Backup antes de escrever (`GET /System/DeviceConfigFile?FileType=3`) e rate-limit de 3–5 s entre `PUT`s de rede.

Contratos exatos em `CLAUDE.md` §4, `P6S-04_ARQUITETURA-Connector.md` e `P6S-05_SPEC-Fase1-Ingestao-Eventos.md`. Roteiro de validação em `P6S-09_ROTEIRO-DE-BANCADA.md`.

## 5. Fase D — resíduos e posicionamento

Fecha item **11**.

- **Domínio de deploy usa "vms"** — contra o posicionamento. Trocar antes de qualquer demonstração para cliente: o produto explicitamente **não é** um VMS (`02_Posicionamento` §1), e o domínio é a primeira coisa que o comprador lê.
- Remover a pasta `patches/` (patch manual no roteador) se a dependência puder ser atualizada.
- Sem Dockerfile, sem CI, sem teste: criar o mínimo — CI que roda build + teste de isolamento de RLS.

## 6. O que aproveitar do protótipo

A faxina não é descarte. O que se mantém:

| Aproveitar | Por quê |
|---|---|
| As telas de front | São o acelerador que valeu a pena. Inventário e prioridade em [CORE-04](CORE-04_MAPA-DE-TELAS.md) — sujeito a PND-17 |
| A stack de front | React + Vite + TS + Tailwind + shadcn/ui + lucide-react + recharts. Mantida |
| O padrão "backend configurado ou mock" | Permite desenvolver tela sem backend e ligar depois sem reescrever ([CORE-03](CORE-03_UI-DESIGN-SYSTEM.md) §8) |
| Dedupe e anti-flood da camada visual (`useCriticalAlerts`) | Boa ideia; falta o equivalente na camada de ação ([CORE-02](CORE-02_MOTOR-DE-REGRAS.md) §7) |
| `db/01_extended_tables.sql` | Como levantamento de requisitos de campo |
| `NVR_ANALYSIS.md` | Insumo de design das telas de configuração de device; confirma portas HTTP 80, comando 6060, vídeo 6066 |
| **Git como ponte única** | Manus, Claude Code e servidor falam entre si pelo repositório. Nada de copiar e colar código entre ferramentas |

## 7. Checklist de saída

- [ ] `grep` por "manus" e "umami" volta vazio fora de `node_modules`.
- [ ] Senhas de device rotacionadas e nenhum segredo no histórico do git.
- [ ] `backups/` e `config.yaml` fora do versionamento.
- [ ] Build passa sem os plugins removidos.
- [ ] Migrations 001–007 aplicadas; teste de isolamento entre orgs verde no CI.
- [ ] `audit_log` sem `DELETE` para nenhum papel, comprovado por teste.
- [ ] Connector novo recebendo push real da bancada, com Ack sob 500 ms.
- [ ] Domínio de deploy sem "vms".
- [ ] **Só depois de tudo acima:** liberar entrada de dado real de pessoa no ambiente.

Fontes: base V4 `62_PLANO-Saida-do-Manus` §3–§4 (23/07/2026), reorganizado para cobrir os 11 itens de `CLAUDE.md` §9 em vez de só os artefatos de telemetria; `CLAUDE.md` §4, §10 e §12; `07_Mapa-Repo-guardia-dashboard.md`.
