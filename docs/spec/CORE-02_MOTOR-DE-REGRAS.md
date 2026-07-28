# CORE-02 — Motor de regras e automações

**Estado (corrigido em v2): o núcleo existe em código, nunca rodou contra evento real.** O monorepo tem `services/core` com o motor (gatilho→condições→ações, idempotência por regra×evento) e o **scheduler de expectativas** — o gatilho por não-evento — com 11/11 testes passando ([CORE-07](CORE-07_INVENTARIO-DE-CODIGO.md) §2.2). O que este arquivo especifica e o código ainda não tem: anti-flood (§7), simulador (§8), persistência de `automation_runs` e a tradução para o catálogo canônico. É o componente que separa painel de sistema de segurança — o que o [04_Arquitetura-Tecnica](04_Arquitetura-Tecnica.md) §2 chama de "motor de alertas" em uma linha.

Roda no **core**, não no connector. O connector entrega o evento normalizado e executa comandos quando mandado; a decisão é do core.

## Neste documento

1. O modelo
2. Gatilhos
3. Condições
4. Ações
5. Por que em código e não em n8n
6. Execução e requisitos não-funcionais
7. Anti-flood
8. Simulador (`dry-run`)
9. Automações de fábrica por vertical
10. Definição de pronto

---

## 1. O modelo

```
GATILHO   →   CONDIÇÕES   →   AÇÕES
(evento)      (contexto)      (mundo real)
```

Exemplo completo:

> **quando** chegar `face.unknown`
> **em** qualquer canal marcado como perímetro do site
> **se** estiver fora do horário letivo **e** não houve disparo igual nos últimos 300 s
> **então** notificar o supervisor no WhatsApp, acionar a sirene por 10 s e abrir item na fila de tratamento.

Tabelas em [CORE-01](CORE-01_MODELO-DE-DADOS-CORE.md) §4: `automations`, `automation_runs`, `schedules`, `integrations`.

## 2. Gatilhos

| Fonte | Exemplo |
|---|---|
| **Evento de device** | qualquer tipo do catálogo canônico ([04](04_Arquitetura-Tecnica.md) §4) |
| **Não-evento** ⭐ | "a pessoa X não foi vista até 08h" · "o canal D5 está silencioso há 2 h" |
| **Agendado** | "às 22h, verificar se todas as portas estão fechadas" |
| **Manual** | operador dispara pela UI |

> ⭐ **O gatilho por não-evento é o diferencial mais barato do produto.** Sustenta o alerta de ausência escolar e a detecção de câmera morta. Tecnicamente é um scheduler que consulta a **ausência** de linha em `events` numa janela — simples de implementar, raro no mercado brasileiro (`06_Benchmark-Concorrentes.md`).

Filtros do gatilho: tipo · canais · pessoa ou lista (branca/negra/desconhecido) · `face_group` (turma/bloco) · faixa de `match_score`.

Regra: gatilho aponta para **tipo canônico**, nunca para vocabulário de fabricante. `face_recognition` do P6SHTTP não aparece em regra — chega ao motor já como `face.recognized` ou `face.unknown`. Evento `unmapped` **não** dispara regra: gera pendência.

## 3. Condições

| Condição | Uso |
|---|---|
| **Agenda** (`schedules`) | dentro/fora de "horário letivo", "expediente", "madrugada", com feriados |
| **Cooldown** | segundos desde o último disparo da mesma regra |
| **Limiar numérico** | `match_score` < 50 · duração ≥ 300 s · contagem > N |
| **Contexto de pessoa** | vínculo, turma/unidade, **validade** (visitante com convite expirado), lista |
| **Composição** | AND/OR de eventos numa janela ("linha cruzada E movimento em 30 s") |
| **Contagem** | N ocorrências em T ("3 desconhecidos em 5 min") |
| **Estado do site** | armado/desarmado, modo férias |

**Regra de projeto:** condição aponta para agenda **por referência**, nunca repete horário inline. Mudar "horário letivo" tem que mudar todas as regras de uma vez.

Para eventos que o próprio device sabe agendar (cerca virtual em horário de aula, off-duty noturno), a preferência é resolver na **agenda nativa do NVR** e usar a condição só como sobreposição — o mesmo critério de `P6S-05_SPEC` §A.5. Menos tráfego, menos evento inútil.

## 4. Ações

| Ação | Implementação |
|---|---|
| Notificação no painel / push no app | core |
| E-mail | core |
| **WhatsApp** | via integração (canal a confirmar com a equipe — `P6S-04_ARQUITETURA` §7) |
| **Webhook** | POST assinado para URL do cliente |
| **Sirene / relé** | connector → CGI `/Alarm/AlarmOut/{ChannelID}/ControlMode` |
| **Abrir porta / catraca** | connector → `PUT /AccessGate/{ChannelID}/RemoteOpenDoor` |
| **TTS no local** | slots de alarme de voz do device |
| **Preset de PTZ** | mover câmera para preset (comando pontual — não é tour nem operação de VMS) |
| **Escalonamento** (`escalate`) | se não tratado em T, encadeia nova ação para outro alvo — é o mecanismo 3 do anti-flood (§7) |
| **Abrir item na fila de tratamento** | core |

Cada ação registra resultado individual em `automation_runs.results`: qual ação, sucesso ou falha, tempo, retorno.

> Fronteira: ação de vídeo permitida é comando pontual e deep-link para o pass-through. Nada de gravação, transcodificação ou muro de vídeo — decisão fixa nº 1 e `CLAUDE.md` §2.

## 5. Por que em código e não em n8n

| Critério | Código | n8n |
|---|---|---|
| Versionamento e revisão | git | estado no banco da ferramenta |
| Teste automatizado | sim | não |
| Rollback | sim | difícil |
| Multi-tenant com RLS | sim | frágil |
| Latência | ms | overhead de fluxo |
| Auditoria | nativa | parcial |

**O n8n permanece no desenho — como destino, não como motor.** O motor decide e chama o n8n para entregar o WhatsApp. Decidir é do produto; entregar pode ser terceirizado.

Regra de segurança que dispara às 3h da manhã precisa de teste automatizado. Fluxo visual sem teste é risco que ninguém percebe até falhar.

## 6. Execução e requisitos não-funcionais

```
evento gravado em events
   → carrega automações ativas de (org_id, site_id) — cache com invalidação
   → casa gatilho (índice por type)
   → avalia condições (curto-circuito)
   → checa cooldown por (regra × group_key)
   → cria automation_run
   → despacha ações em paralelo, com timeout individual
   → grava resultado por ação
```

- **Avaliação não bloqueia a ingestão.** Grava o evento primeiro; a regra roda depois. O Ack ao device tem orçamento de **menos de 500 ms** (`P6S-05_SPEC`) — não cabe motor de regra dentro dele.
- Timeout por ação: integração lenta não segura as outras.
- Falha de ação **não** reverte o evento. Registra e segue.
- Idempotência por `(automation_id, event_id)`.

## 7. Anti-flood

Sistema que dispara 400 notificações numa hora é desligado pelo cliente na semana seguinte. Três mecanismos, os três obrigatórios:

1. **Cooldown por regra** — não repetir a mesma regra em N segundos.
2. **Agrupamento** — "12 eventos de movimento em D5 nos últimos 5 min" vira **uma** notificação com contador (`automations.group_key`).
3. **Escalonamento** — se ninguém tratou em X minutos, sobe de nível. Melhor que repetir.

O front do protótipo já tem dedupe e anti-flood na camada visual (`useCriticalAlerts`). O motor precisa do equivalente na camada de **ação** — e ali é mais crítico, porque ação custa dinheiro e paciência.

## 8. Simulador (`dry-run`)

Dispara evento fictício e mostra **quais regras casariam e quais ações rodariam** — sem esperar acontecer e sem acionar sirene.

Implementação: percorre o motor inteiro, cria `automation_run` com `dry_run = true` e `status = 'simulated'`, **não despacha ação**.

É o que torna regra complexa confiável, e é a forma de treinar operador sem provocar incidente real. Não encontrado em nenhum concorrente do `06_Benchmark-Concorrentes.md`.

## 9. Automações de fábrica por vertical

Nascem com o site, conforme o perfil. Tipos do catálogo canônico ([04](04_Arquitetura-Tecnica.md) §4).

**Perfil Condomínio:**

| Nome | Gatilho | Condição | Ação |
|---|---|---|---|
| Veículo não autorizado | `plate.unknown` | — | push portaria + foto |
| Desconhecido em área comum | `face.unknown` | fora de 06h–22h | push + registro |
| Bike/patinete em elevador | `vehicle.bike_in_elevator` | — | alerta + TTS no local |
| Vaga indevida | `fence.intrusion` na vaga (ground lock) | — | push síndico |

**Perfil Escolar:**

| Nome | Gatilho | Condição | Ação |
|---|---|---|---|
| Desconhecido fora de horário | `face.unknown` | fora do horário letivo | push + WhatsApp supervisor |
| Saída não autorizada | `face.recognized` de aluno no canal de saída | dentro do horário letivo | alerta crítico + item na fila |
| Aluno não chegou | **não-evento** | até 08h, turma X | WhatsApp responsável |
| Queda detectada | `person.fall` | — | alerta crítico + sirene |
| Fumaça | `smoke.detected` | — | alerta crítico + TTS |

> ⚠️ As regras escolares de cerca virtual (`fence.intrusion`/`line.crossed`) e contagem (`flow.count`) **existem no produto**, mas não vão para proposta antes do parecer jurídico do gate da Fase 0 ([05](05_Roadmap-e-Fases.md) §1). O motor não precisa saber disso; o comercial precisa.

**Perfil Câmaras Frias** — lacuna parcial: esboço com `door.held_open`, `post.abandoned` e presença fora de horário ([04](04_Arquitetura-Tecnica.md) §4). Não montar automação de fábrica antes de fechar o catálogo com device homologado (PND-09).

Nascer com regras prontas é o que faz o cliente ver valor no primeiro dia, em vez de encarar um editor vazio.

## 10. Definição de pronto

- [ ] Uma regra real dispara a partir de um evento real da bancada.
- [ ] Uma ação física (`RemoteOpenDoor` ou sirene) executa e é auditada em `audit_log`.
- [ ] Log de disparos mostra regra, evento e resultado de cada ação.
- [ ] Cooldown comprovado: 20 eventos iguais → 1 notificação.
- [ ] Agrupamento comprovado: notificação única com contador.
- [ ] Simulador roda a regra inteira sem acionar nada.
- [ ] Gatilho por não-evento dispara (ausência de aluno até 08h).
- [ ] Evento `unmapped` não dispara regra e gera pendência.

Fontes: base V4 `43_ARQ-RuleEngine-Automacoes` (23/07/2026); código `services/core` do monorepo e spec 10 (`CORE-07` §2.2), com os tipos de evento traduzidos para o catálogo canônico de `04_Arquitetura-Tecnica` §4 e as ações de vídeo removidas por conflito com a fronteira de escopo; `P6S-05_SPEC` §A.5; `06_Benchmark-Concorrentes.md`.
