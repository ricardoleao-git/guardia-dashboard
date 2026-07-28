# contracts/events — catálogo canônico de eventos

`canonical-event.v0.schema.json` é o contrato entre um driver e o GuardIA core, exigido pelo `CLAUDE.md` §12.4 ("catálogo canônico v0 como JSON Schema"). É JSON Schema, e não um tipo TypeScript ou uma dataclass Python, porque os dois lados da fronteira falam linguagens diferentes: o connector é Python, o front é TS, e o `services/connector` do monorepo é Node (`CORE-07` §2.1).

## A fronteira que este arquivo defende

`CLAUDE.md` §6: *vocabulário de fabricante nunca chega ao core nem ao schema*. O §9 item 4 registra o que acontece quando essa fronteira não é imposta por código — cinco colunas de `camera_events` (`face_list`, `person_name`, `face_score`, `recognize_image`, `capture_image`) carregam vocabulário P6S até hoje.

Por isso o `$defs.attributes` tem `propertyNames.not.enum`: um evento que tente atravessar com qualquer uma dessas chaves **falha na validação**, em vez de passar e virar coluna.

## Os 13 tipos e de onde cada um vem

| Tipo | Procedência |
|---|---|
| `face.recognized` · `face.unknown` · `fence.intrusion` · `line.crossed` · `flow.count` · `person.fall` · `smoke.detected` · `door.held_open` · `post.abandoned` | `CLAUDE.md` §6, lista v0 literal |
| `plate.unknown` | `CORE-02` §9, regra de fábrica "Veículo não autorizado" |
| `plate.recognized` | **Ratificado pelo Ricardo em 28/07/2026.** O `CLAUDE.md` §6 escreve *"a família `plate.*` (LPR)"* sem enumerar, e nenhum documento trazia este membro literalmente — a família v0 tem os dois |
| `vehicle.bike_in_elevator` | **Ratificado pelo Ricardo em 28/07/2026.** Vinha da automação de fábrica "Bike/patinete em elevador" (`CORE-02` §9, perfil Condomínio) sem estar na lista do §6. Entra no v0, que passa a ter 13 tipos |
| `unmapped` | `CORE-01` §4 (`type text not null -- 'unmapped' quando sem correspondente`) e `CORE-02` §2 (*"Evento `unmapped` não dispara regra: gera pendência"*) |

As duas ratificações de 28/07 fecham as lacunas que estavam marcadas aqui: nenhuma foi preenchida por inferência (`CLAUDE.md` §10.2), as duas esperaram decisão.

> Consequência para o `CLAUDE.md` §6: a lista de tipos v0 daquele parágrafo está **incompleta** em relação a este contrato — não menciona `vehicle.bike_in_elevator` nem enumera `plate.*`. Este arquivo é a fonte mais atual; o §6 deve ser alinhado no próximo checkpoint que tocar o CLAUDE.md.

## `unmapped` — resolvido em 28/07/2026

O tradutor emitia exceção (`UnrecognizedRawEventType`) para operador sem correspondente, o que **descartava o evento** — o oposto do que o `CORE-01` §4 e o `CORE-02` §2 pedem.

Corrigido: `connector/src/p6s_event_translator.py` emite `type: "unmapped"` e preserva o operador bruto em `attributes.unmapped_operator`, para que a pendência saiba o que estender no catálogo. O símbolo `UnrecognizedRawEventType` foi eliminado — deixá-lo com `except` inalcançável nos receptores seria a armadilha do `CLAUDE.md` §12.0.

Verificado de ponta a ponta: um push com operador inventado responde **202** e chega ao sink como `unmapped`, em vez de 422.

Segue pendente, e **só isto**: *onde* a pendência é registrada — tabela, fila ou log. Depende da **PND-16**. A distinção importa: emitir o evento nunca dependeu do schema; registrar a pendência depende.

## Divergência menor registrada

O enum `driver` usa `onvif`, seguindo o DDL do `CORE-01` §4. O `CLAUDE.md` §10.3 escreve `onvif-fallback` para o mesmo driver. Um dos dois precisa ceder; o schema segue o DDL porque é ele que vira coluna.

## O que este contrato não cobre

Os campos que o **core** atribui, e que por isso não pertencem ao que um driver emite: `id`, `org_id`, `site_id`, `received_at`, `person_id` (resolvido a partir de `correlation.face_uuid`) e `purge_after`. Estão no `CORE-01` §4.

A coluna de tenancy em particular depende da **PND-16** e não entra aqui até ser ratificada — ver `docs/spec/05_Roadmap-e-Fases.md` §6.

## Como validar

```bash
pip install jsonschema
python3 -c "
import json, jsonschema
s = json.load(open('contracts/events/canonical-event.v0.schema.json'))
jsonschema.Draft202012Validator.check_schema(s)
print('schema válido')
"
```

Os testes em `connector/tests/test_canonical_contract.py` validam eventos de exemplo — e, mais importante, garantem que um evento com vocabulário de fabricante **é rejeitado**.
