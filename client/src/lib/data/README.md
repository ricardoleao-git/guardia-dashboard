# `client/src/lib/data` — camada de acesso a dados

Exigida pelo `CLAUDE.md` §3:

> Supabase **NÃO é a stack do produto** — existe só neste protótipo. Todo código que fale Supabase é temporário e deve ficar isolado atrás de uma camada de acesso a dados.

Antes desta camada, 36 pontos do client falavam Supabase diretamente: 25 chamadas `from("tabela")`, 5 `supabase.auth.*` e 6 assinaturas de realtime, espalhados por 10 arquivos. Trocar o backend significava editar os 36.

## Como usar

```ts
import { data, auth, isLiveBackend } from "@/lib/data";

const rows   = await data.faceLists.list({ orderBy: { column: "person_name" } });
const result = await data.faceLists.insert(entry);   // { data } | { error }
const unsub  = data.faceLists.subscribe(refetch);    // realtime
```

🚫 **Não importe `@/lib/supabase` fora de `adapters/`.** Esse arquivo é só a fábrica do cliente. Importá-lo de um hook ou página recria o acoplamento que esta camada existe para evitar.

Invariante verificável:

```bash
grep -rn 'from "@/lib/supabase"' client/src --include="*.ts" --include="*.tsx" | grep -v "lib/data/"
# vazio = a fronteira está de pé
```

## Estrutura

| Arquivo | Papel |
|---|---|
| `types.ts` | O contrato: `Collection<T>`, `AuthPort`, `AuthUser`, `ListOptions`, `MutationResult` |
| `index.ts` | O seletor — escolhe o adaptador **por chamada** — e o objeto `data` |
| `adapters/supabase-collection.ts` | CRUD + realtime genérico sobre uma tabela |
| `adapters/supabase-auth.ts` | Sessão, login, logout, convite |
| `adapters/supabase-events.ts` | Eventos de câmera, anotações, status do connector |
| `adapters/local-collection.ts` | As três estratégias sem backend |

## Por que a escolha é por chamada

`isGuestSession()` lê o `localStorage` e muda em runtime: o `AuthContext` remove a flag de guest imediatamente antes do `signInWithPassword`. Resolver o adaptador uma vez na carga do módulo deixaria quem veio do demo preso em mock depois de logar de verdade — a mesma classe de bug que o §12.0 registra em `shouldUseMockData()`.

## Três estratégias locais, de propósito

O comportamento em modo demo **já era diferente por hook** antes desta camada. Uniformizar teria mudado o demo de contrabando:

| Estratégia | Coleções | Comportamento |
|---|---|---|
| `readOnlyEmpty` | `faceLists`, `devices`, `attendance`, `automationRules`, `profiles` | Lista vazia; escrita recusada com a mensagem que o usuário já via |
| `localStorageCollection` | `searchPresets` | CRUD real no navegador (chave `guardia:search-presets`) |
| `seededLocalCollection` | `auditLogs` | Seed sintético + o que o operador escreveu (chave `guardia_audit_logs`) |

As chaves de `localStorage` foram preservadas literalmente — mudá-las faria o usuário perder o que já tem salvo.

## Um bug que a camada corrigiu de passagem

`useDevices.updateDevice` e as três mutações de `useAutomationRules` **não tinham guarda de modo demo** e chamavam `supabase.from()` com o cliente nulo (`lib/supabase.ts` devolve `null` sem env vars). Em demo, editar um dispositivo ou criar uma automação estourava `TypeError: Cannot read properties of null`. Agora o adaptador local recusa com mensagem.

## O que falta

**A tradução do vocabulário de fabricante.** `adapters/supabase-events.ts` é a costura onde ela deve acontecer: a tabela `camera_events` carrega `face_list`, `person_name`, `face_score`, `recognize_image` e `capture_image` (`CLAUDE.md` §9 item 4), e hoje o adaptador as mapeia para uma forma intermediária, não para o catálogo canônico de `contracts/events/`.

Concluir isso permite trocar `camera_events` pelo schema canônico sem tocar em nenhuma das 32 telas — mas depende da **PND-16** (nome da tabela e da coluna de tenancy) e da **PND-02** (chaves de correlação). Ver `docs/spec/05_Roadmap-e-Fases.md` §6.

## Quando o backend virar PostgreSQL/HostDime

Escrever `adapters/postgres-*.ts` implementando `Collection<T>` e `AuthPort`, e trocar o seletor em `index.ts`. Hooks, páginas e componentes não mudam.
