# CORE-08 — Registro de decisões

O que o `CLAUDE.md` §14 **não** consegue guardar: quem decidiu o quê, quando, e o raciocínio que levou lá.

O §14 registra **estado medido** ("0 `USING (true)`", "20 páginas usam o wrapper"). Este arquivo registra **escolha** — inclusive a alternativa recusada e o custo de reverter. Sem isso, cada decisão volta a ser rediscutida do zero por quem chega depois, e as que foram tomadas por medição voltam a ser tomadas por inferência.

## Como usar

- **Identificador `DR-nn`**, sequencial, nunca reaproveitado. Não colide com `D-nn` (decisões da base V4, ver `CORE-00`) nem com `PND-nn` (pendências, `05_Roadmap-e-Fases.md` §6).
- Decisão registrada aqui **não se desfaz por comentário em código**. Revogar é entrada nova apontando para a antiga.
- **Ausência de entrada não é decisão.** O que está aberto está no §Aberto, com número de PND.
- Quem decidiu importa. `Ricardo` = coordenador de produto, decisão de negócio/escopo. `medição` = a alternativa foi eliminada por evidência, não por preferência — e o comando que mediu está citado.

---

## Decisões tomadas

### DR-01 — O catálogo canônico v0 tem 13 tipos, com `plate.recognized` e `vehicle.bike_in_elevator` dentro

**Quem/quando:** Ricardo, 28/07/2026.

Os dois não constavam da lista do `CLAUDE.md` §6. Vinham, respectivamente, de "a família `plate.*`" sem enumeração e da automação de fábrica do `CORE-02` §9 — existiam no texto, não no enum.

**Por quê:** LPR é table stake de condomínio (`CORE-04`), e a automação de bike em elevador já está especificada. Deixar fora do v0 obrigaria a versionar o catálogo antes do primeiro cliente.

**Consequência:** `contracts/events/canonical-event.v0.schema.json` é a fonte executável; `connector/tests/test_canonical_contract.py` falha se o schema e o enum Python divergirem. Acrescentar tipo é bump de versão do contrato, não edição no lugar.

### DR-02 — `unmapped` é emitido ao core, não descartado

**Quem/quando:** Ricardo, 28/07/2026, corrigindo análise minha que havia parado no meio.

**O erro que a decisão corrige:** eu tinha juntado duas perguntas que são independentes — *"onde registrar a pendência de mapeamento"* (depende da PND-16, porque envolve tabela) e *"emitir ou descartar o evento"* (não depende de nada). Como a primeira estava bloqueada, tratei a segunda como bloqueada também, e o tradutor seguia levantando exceção.

**Por quê:** `CORE-01` §4 e `CORE-02` §2 pedem que o evento desconhecido **chegue ao core e gere pendência**. Evento descartado no driver é evento que ninguém sabe que existiu — o oposto do que a spec quer.

**Como ficou:** `p6s_event_translator.py` emite `type: "unmapped"` com o vocabulário original em `attributes.unmapped_operator`. A classe `UnrecognizedRawEventType` foi deletada, não deprecada.

**Lição transferível:** quando uma pendência bloqueia parte de uma tarefa, separar o que ela bloqueia do que não bloqueia — antes de declarar a tarefa bloqueada.

### DR-03 — O identificador do driver é `onvif`

**Quem/quando:** Ricardo, 28/07/2026, com a fonte: `CORE-01` §4.

`onvif-fallback` aparecia em texto. Mas o DDL do `CORE-01` §4 define o valor que vai para a coluna `devices.driver`, e lá é `onvif`.

**Por quê:** "ONVIF como fallback" descreve a **estratégia** de ingestão multifabricante. Não é o nome do driver. Nome de driver entra em coluna de banco e em `if` de roteamento; adjetivo de estratégia não.

### DR-04 — A PND-01 fica parametrizada, não escolhida

O `unique_code` do safety code (`CLAUDE.md` §4.4) tem 4 hipóteses e nenhuma evidência. `connector/src/p6s_safety_code.py` implementa as quatro atrás de um enum, com `RESOLVED_UNIQUE_CODE_SOURCE = None` como ponto único de troca.

**Por quê não escolher a mais provável:** com a pendência aberta, `safety_code_for()` **levanta** em vez de devolver um código errado. Um código errado não falha na hora — falha no device, com `statusCode` diferente de 0, a dois níveis de distância da causa. Levantar transforma um bug de bancada em erro de programação.

**Custo se a hipótese escolhida estiver errada, depois da bancada:** trocar uma constante. `scripts/bancada/bancada.py` testa as quatro contra o device e diz qual retorna `statusCode 0` — 10 minutos.

### DR-05 — Na PND-16, o **nome** é parametrizável; a **cardinalidade** não é

Análise, 28/07/2026. Vale como orientação até o Tiago decidir.

A PND-16 parece uma pergunta ("`org_id` ou `tenant_id`? `events` ou `camera_events`?"). São duas, com custos de erro incomparáveis:

| | Se errar | Custo de corrigir |
|---|---|---|
| **Nome** da coluna/tabela | cosmético | `ALTER TABLE ... RENAME`. Barato em qualquer momento |
| **Cardinalidade** — um nível (`tenant_id`) ou dois (`org_id` + `site_id`) | estrutural | reescreve toda policy de RLS, todo índice composto e toda query. Não se retrofita |

**Consequência prática:** a decisão que **bloqueia** é a cardinalidade. O `CORE-01` §4 adota dois níveis e explica por quê (administradora de condomínios opera N condomínios; escola tem N unidades). Se o Tiago confirmar dois níveis, o nome pode ser decidido depois sem custo.

**Enquanto não decidir:** nenhuma `CREATE TABLE` neste repositório (`CLAUDE.md` §3 e §14.4).

### DR-06 — A camada de acesso a dados resolve o adaptador **por chamada**, não na construção

O padrão óbvio seria escolher o adaptador uma vez (`const col = isDemo ? local : supabase`) e exportar. Está errado aqui.

**Por quê:** `isGuestSession()` lê o `localStorage` e o valor **muda em runtime** — o usuário entra pelo demo e depois faz login real, sem recarregar a página (`AuthContext.tsx`, o `signIn` que limpa `guardia_guest`). Um adaptador fixado na construção deixaria a sessão real presa em mock até o próximo F5.

**Como ficou:** `lib/data/index.ts` tem um `pick()` que resolve na chamada. Custo: uma indireção por operação. Ganho: a semântica do demo não depende de ordem de import.

### DR-07 — `shouldUseMockData()` foi deletada, não corrigida

A função tinha um bug real (`||` dentro do `Boolean()` fazia o ramo "Supabase não configurado" nunca disparar) e **zero chamadores**. Corrigir e manter era a opção tentadora.

**Por quê deletar:** função órfã com nome de guarda de segurança é armadilha — o próximo leitor supõe uma proteção que ninguém invoca. A degradação para mock já existia, correta, nos 7 hooks e em `supabase.ts`.

Registro completo, incluindo a afirmação errada que este bloco substituiu, em `CLAUDE.md` §12.0.

### DR-08 — O payload bruto fica 7 dias, e essa janela **não** serve para reprocessar catálogo

`CORE-05` §2 dá 7 dias ao payload bruto, com finalidade declarada de **depurar integração**.

**Tensão registrada, não resolvida:** se o objetivo passar a ser reprocessar eventos quando o catálogo canônico mudar, 7 dias não serve — mudança de catálogo leva meses. Mas estender a janela é decisão de **base legal** (PND-11), não de código: dado de evento facial é dado sensível, e prazo de retenção maior precisa de finalidade que o sustente.

**Quem quiser reprocessamento:** abrir na PND-11, não aumentar a constante.

### DR-09 — `ingest_store.py` é estado local do connector, não tabela do produto

Ele cria tabelas SQLite (dedupe, fila, dead-letter, payload bruto) num arquivo em `connector/state/`, fora do tracking.

**Por que isso não viola a proibição de `CREATE TABLE` (DR-05):** a proibição protege o schema multi-tenant do produto — o que vai para `db/` e para o PostgreSQL/HostDime, onde a escolha de tenancy é irreversível. Estado operacional de um processo, num arquivo local, sem coluna de tenancy e descartável, não participa dessa decisão.

**Teste para distinguir:** se apagar o arquivo perde dado do cliente, é tabela do produto. Se apagar só custa reprocessar, é estado local.

### DR-10 — i18n dos 5 estados resolve **dentro** do `PageStateWrapper`

**Quem/quando:** Ricardo, 28/07/2026 — *"as ~8 strings passam por `t()` DENTRO do wrapper, com as chaves nos três idiomas; não deixe i18n para um segundo passe"*.

**Por quê:** a alternativa (migrar 20 páginas agora, traduzir depois) deixaria 20 páginas com português cravado num app que declara PT/EN/ZH. Segundo passe de i18n é o passe que não acontece.

**Ganho lateral medido:** um dos testes do wrapper renderiza em **inglês**. Se alguém recolar string literal, o teste falha — a regressão que reabriria o §14.5 tem alarme.

### DR-11 — Code-splitting adiado

**Quem/quando:** Ricardo, 28/07/2026. Bundle em 1,35 MB; o `vite build` avisa a cada execução. Consciente, não esquecido — fila em `CLAUDE.md` §14.3.1.

### DR-12 — `.embedded-page` é load-bearing; o refactor correto é o inverso do documentado

**Quem/quando:** medição, 28/07/2026, corrigindo afirmação que estava no próprio `CLAUDE.md`.

O §14.3 dizia que a classe era morta e que o caminho era remover o CSS. **Medido: a regra `.embedded-page > div.min-h-screen { display: contents }` está ativa em 5 páginas** (`AIConfig`, `AbsenceAlerts`, `Automations`, `DeviceManagement`, `FaceLibrary`) cujo elemento raiz é `<div className="min-h-screen bg-background">`. Remover o CSS quebraria as cinco.

**Caminho correto:** tirar `min-h-screen` da raiz dessas 5 — elas não são mais páginas de topo — e **só então** o CSS fica morto. Refactor visual com risco: uma por vez, screenshot antes e depois.

⚠️ **Ao re-medir, o grep devolve 6, não 5.** `grep -rl 'className="min-h-screen bg-background"' client/src/pages` inclui o `Dashboard.tsx`, que **é** página de topo — ali o `min-h-screen` está correto e não deve sair. As 5 do refactor são as outras. Divergência de contagem não é erro do documento.

**Por que a entrada existe:** a afirmação errada estava num documento que se lê como fonte de verdade. Se ela não for marcada como corrigida, alguém executa a remoção com a bênção do §14.

### DR-13 — `RelatorioValor` mantém `early-return` no vazio (JSX avalia filhos antes de passá-los)

O padrão de todas as outras páginas é envolver o conteúdo no wrapper e deixar ele decidir o que renderizar. Em `RelatorioValor` isso estoura.

**Por quê:** a condição de vazio é `loadState === "empty" || !report`, e os filhos desreferenciam `report`. **JSX avalia o filho antes de passá-lo ao componente** — então `<Wrapper state="empty">{report.total}</Wrapper>` lança em `report.total` mesmo que o wrapper fosse descartar o filho. Não é peculiaridade do wrapper; é como JSX funciona.

**Como ficou:** o vazio segue `early-return`, com o wrapper cuidando só da aparência. Documentado na docstring de `PageStateWrapper.tsx` com exemplo errado e certo, porque a armadilha reaparece a cada página nova.

### DR-14 — O repositório segue **público** por ora, com risco aceito

**Quem/quando:** Ricardo, 28/07/2026 — *"pode liberar se estiver público, eu vou mudar depois e ninguém está usando esse meu git"*, revertendo o hold de 27/07 que pausava a subida de especificação até o repo virar privado.

**O que a decisão aceita, explicitamente:**

- A chave `anon` JWT legada continua extraível de 5 commits públicos, com a RLS como única barreira (`CLAUDE.md` §14.4). Fechada nos arquivos e no banco — 0 permissivas, 28 policies ativas —, mas sem margem de erro.
- `P6S-09` e `P6S-10` documentam que os dispositivos da bancada usam `admin` com **senha vazia** na `192.168.254.0/24`. Rede de laboratório; ainda assim é documentação pública de que aqueles devices não têm senha.
- `CORE-06` §A.6 descreve, com caminho de arquivo, onde estavam segredos versionados.

**O que a decisão NÃO autoriza:** segredo novo em commit (`CLAUDE.md` §10.5), credencial em mensagem de commit (§10.13) e dado pessoal real em qualquer lugar (§10.6) continuam proibidos — a visibilidade do repo não é o que sustenta essas regras.

**Reversão:** trocar a visibilidade no GitHub não remove nada do histórico já clonado. Se a rotação da chave legada e o `git filter-repo` do §14.3 forem feitos, esta entrada perde a maior parte do peso.

### DR-15 — Nenhum dos dois connectors se reescreve antes da bancada

Reafirmado em 28/07/2026. `p6s_client.py` usa `HTTPDigestAuth` e caminhos `/cgi-bin/*.cgi` — os dois padrões que o §4.1 declara inexistentes no protocolo. É tentador consertar: a lista de defeitos está pronta e a documentação está disponível.

**Por quê não:** reescrever contra documentação, sem device respondendo, troca um chute por outro. O `P6S-09_ROTEIRO-DE-BANCADA.md` custa uma tarde e produz `statusCode 0` — evidência, não interpretação.

**O que foi construído em volta, sem tocar nele:** camada de transporte nova (`push_receiver`, `mqtt_receiver`, `ingest_store`, `strategy`, tradutor), `p6s_safety_code.py` e `scripts/bancada/bancada.py`. Quando a bancada responder, o cliente antigo é substituído — não remendado.

---

## Aberto — ausência de entrada aqui não é decisão

| Pendência | Quem decide | Bloqueia |
|---|---|---|
| **PND-01** — `unique_code` do safety code | bancada, 10 min | a Fase 2 inteira. Maior retorno por minuto do projeto |
| **PND-02** — `FaceUUID` / `GroupID2` como chaves de correlação | Tiago | migration 001 |
| **PND-16** — cardinalidade e nomes da tenancy | Tiago | toda `CREATE TABLE`. Ver DR-05 |
| **PND-17** — qual front é o canônico | Tiago + Ricardo | porte de telas. Custo cresce a cada checkpoint do Manus: 10 telas em 26/07, **20** em 28/07 (`CLAUDE.md` §16.1) |
| **PND-18** — pass-through de vídeo (portas 80 / 6060 / 6066) | bancada | item de pass-through da Fase 3 |
| **PND-10 / PND-11** — base legal e retenção | jurídico | janela do payload bruto (DR-08), carga real em tabela de biometria |
| Idioma default: navegador vs PT-BR fixo | Ricardo | nada. `I18nContext.tsx:1478` contra `CORE-03` §1 — os dois documentos discordam |
| `camera_events` exige `service_role` no insert | Tiago | o connector, quando religar (`CLAUDE.md` §14.3) |

---

## Método — por que este projeto mede antes de afirmar

Não é preferência de estilo. Em 26/07/2026 uma auditoria automatizada leu as obrigações do `CLAUDE.md` como se descrevessem o código, concluiu "RLS restritiva, sem credenciais vazadas" e liberou como seguro um repositório com a anon key em texto claro e 16 policies abertas.

Quatro vezes, desde então, medir derrubou uma afirmação que já estava escrita:

| Afirmação | Medição |
|---|---|
| "`.embedded-page` é código morto" (§14.3) | ativa em 5 páginas — DR-12 |
| "13 páginas declaram union local" (§14.5) | **20**. Havia três nomes diferentes (`PageState`, `LoadState`, `LoadingState`) e o grep só procurava um |
| "corrigir `shouldUseMockData()` antes de rotacionar a chave, senão as telas quebram" | a função não tinha chamador nenhum — DR-07 |
| "o `CLAUDE.md` já registra o estado atual" | §9 item 3 seguia 🔴 para defeito fechado, e o carimbo do §14 estava dois checkpoints atrás |

Os comandos estão no `CLAUDE.md` §14.1. **Antes de escrever "está fechado", rodar o comando e colar o número.**
