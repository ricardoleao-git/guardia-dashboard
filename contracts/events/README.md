# contracts/events — catálogo canônico de eventos

`canonical-event.v0.schema.json` é o contrato entre um driver e o GuardIA core, exigido pelo `CLAUDE.md` §12.4 ("catálogo canônico v0 como JSON Schema"). É JSON Schema, e não um tipo TypeScript ou uma dataclass Python, porque os dois lados da fronteira falam linguagens diferentes: o connector é Python, o front é TS, e o `services/connector` do monorepo é Node (`CORE-07` §2.1).

## A fronteira que este arquivo defende

`CLAUDE.md` §6: *vocabulário de fabricante nunca chega ao core nem ao schema*. O §9 item 4 registra o que acontece quando essa fronteira não é imposta por código — cinco colunas de `camera_events` (`face_list`, `person_name`, `face_score`, `recognize_image`, `capture_image`) carregam vocabulário P6S até hoje.

Por isso o `$defs.attributes` tem `propertyNames.not.enum`: um evento que tente atravessar com qualquer uma dessas chaves **falha na validação**, em vez de passar e virar coluna.

## Ratificados × pendentes

O `type` é um `oneOf` de duas listas, e a divisão é proposital.

**Ratificados (11)** — atestados no `CLAUDE.md` §6, mais `unmapped`:

`face.recognized` · `face.unknown` · `fence.intrusion` · `line.crossed` · `flow.count` · `person.fall` · `smoke.detected` · `door.held_open` · `post.abandoned` · `plate.unknown` · `unmapped`

`unmapped` não está na lista do §6, mas é exigido por dois documentos: `CORE-01` §4 (`type text not null -- 'unmapped' quando sem correspondente`) e `CORE-02` §2 (*"Evento `unmapped` não dispara regra: gera pendência"*). Não é inferência — é requisito escrito.

**Pendentes de ratificação (2)** — aceitos para não quebrar código existente, mas **não confirmados**:

| Tipo | Onde aparece | Pergunta aberta |
|---|---|---|
| `plate.recognized` | Em nenhum documento. O `CLAUDE.md` §6 escreve *"a família `plate.*` (LPR)"* sem enumerar; só `plate.unknown` aparece literalmente (`CORE-02` §9, regra "Veículo não autorizado"). `P6S-10` §2.6 fala em evento *"Car License Snapshot"* | A família `plate.*` tem quantos membros, e quais? |
| `vehicle.bike_in_elevator` | `CORE-02` §9, perfil Condomínio — automação de fábrica "Bike/patinete em elevador" | Está fora da lista v0 do §6. Ou o catálogo v0 tem 12 tipos, ou a automação de fábrica cita um tipo que não existe |

Nenhuma das duas foi preenchida por inferência (`CLAUDE.md` §10.2). Estão no schema, marcadas, para que o código atual valide — e visíveis o bastante para que a decisão aconteça.

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
