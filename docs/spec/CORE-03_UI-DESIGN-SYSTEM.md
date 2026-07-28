# CORE-03 — UI: design system e componentes

Fonte de verdade da UI: **o código no Git + este arquivo**. Onde divergirem, o código renderizando é o fato.

Destino prático: prototipação no **Manus** por Ricardo, implementação por Tiago/João + Claude Code.

## Neste documento

1. Princípios
2. Tema
3. Shell
4. `EventCard` — o componente central
5. `PersonForm` — validação de foto obrigatória
6. Componentes canônicos
7. Estados que toda tela precisa ter
8. Contrato de dados da UI
9. Dados de exemplo

---

## 1. Princípios

**Dark-first.** É ambiente de monitoramento, muitas vezes em sala com pouca luz e tela grande. Modo claro é opcional.

**Densidade alta.** O operador precisa ver muita informação de uma vez: cards compactos, raio 10 px, sombra sutil, números tabulares em métrica.

**Contexto sempre visível.** Seletor Organização › Unidade em toda tela; toda regra termina em ação; pessoa sempre tem contexto (turma/unidade/responsável) — é o que diferencia o produto de um NVR com painel bonito.

**Idioma:** PT-BR.

## 2. Tema

A stack atual usa paleta **OKLCH** (herdada, boa — manter). Equivalência de referência:

| Papel | Cor |
|---|---|
| Fundo | `#0B0F17` |
| Superfície | `#141A24` |
| Borda | `#1F2733` |
| Primária (ação/seleção) | `#2563EB` |
| Sucesso | `#22C55E` |
| Alerta / aviso | `#F59E0B` |
| Perigo / crítico | `#EF4444` |
| Facial / match | `#10B981` |
| Texto | `#E5E9F0` · secundário `#94A3B8` |

**Tipografia:** Inter / system-ui. **Ícones:** lucide-react. **Gráficos:** recharts. **Animação:** framer-motion (já presente).

**Semântica de severidade, consistente em todo o sistema:** `critical` = vermelho · `warning` = âmbar · `info` = azul/neutro. São os três valores da coluna `events.severity` ([CORE-01](CORE-01_MODELO-DE-DADOS-CORE.md) §4). Nunca inventar uma quarta cor.

## 3. Shell

- **Topbar:** logo · **seletor Organização › Unidade** · busca global · relógio/NTP · sino de alertas com badge · avatar.
- **Sidebar:** Dashboard · Ao Vivo (pass-through) · Inteligência · Pessoas · Dispositivos · Eventos · Automações · Relatórios · Configurações.
- **Barra de status inferior:** dispositivos online/total · disco · banda · **estado do connector**.

> A barra de status é a única coisa na tela que responde a "o sistema está mesmo funcionando?". Não é decoração — ela lê `connectors.status` e `connectors.queue_depth`.

## 4. `EventCard` — o componente central

```
┌────────────────────────────────────────┐
│ [foto capturada] [foto cadastrada]     │  2 imagens lado a lado
│ balbino                    ● 89% match │  nome + score (barra)
│ Lista Branca · D2 Corredor · 17:19:10  │  lista + canal + hora
│ ♂ ~23a · óculos · sem máscara          │  atributos
│ [Ver vídeo] [Perfil] [Marcar]          │  ações
└────────────────────────────────────────┘
```

**Estados por lista:**

| Estado | Marcador | Comportamento |
|---|---|---|
| Lista branca | ● verde | registra |
| Lista negra | ● vermelho | alerta |
| **Desconhecido** | ⚠ âmbar | sem foto cadastrada · **botão "Cadastrar agora"** |

**Dados:** `attributes` vem de `events.attributes` (originado do `faceFeature` do payload). Usar `quality` como badge de confiança — captura ruim precisa ser **visível**, não escondida.

**Imagens:** o payload traz três papéis (`capture`, `enrolled`, `background`). O card mostra dois; o modal mostra os três. A URL vem assinada e curta ([CORE-01](CORE-01_MODELO-DE-DADOS-CORE.md) §6) — o componente tem que lidar com URL expirada pedindo nova, não quebrando a imagem.

**"Ver vídeo"** → deep-link para o pass-through no timestamp do evento. É superação direta do NVR, que não linka evento a clipe. Depende de PND-18.

## 5. `PersonForm` — validação de foto obrigatória

Campos: foto · nome · sexo · contato · tipo e número de documento · **grupo/turma** · lista · vínculo · validade · **consentimento** · **credencial alternativa**.

Validação local **antes** de habilitar o salvar, com o que se sabe hoje: ≤ 1 MB · JPEG · frontal · nitidez mínima · sem maquiagem pesada. Reprovou → **bloquear com explicação**, não avisar e deixar passar.

> Por que bloquear: foto ruim é aceita pelo device e gera **falso-negativo silencioso**. A pessoa nunca é reconhecida e ninguém descobre. Numa escola isso é "o aluno passou e o sistema não viu".

Requisitos finos de resolução seguem em **PND-05** (roteiro empírico em `P6S-09_ROTEIRO-DE-BANCADA.md` §4.5). Enquanto não fecharem, validar o que já está documentado.

O campo de credencial alternativa não é opcional de produto: alternativa não-biométrica é requisito de conformidade do core ([04](04_Arquitetura-Tecnica.md) §10).

## 6. Componentes canônicos

`AppShell` · `SiteSwitcher` · `StatusBar` · `CameraTile` · `CameraGrid` · **`EventCard`** · `EventFeed` · `KpiCard` · `PersonCard` · `PersonForm` · `RuleEditor` (abas) · `AreaCanvas` (desenho de linha/polígono para cerca virtual) · `DeviceRow` · `BatchActionBar` · `AutomationBuilder` · **`ScheduleGrid`** (7×24) · **`SyncStatusBadge`** · `ConsentBadge`

- **`ScheduleGrid` aparece em quatro lugares** (agenda de gravação do device, agenda de alarme do device, agendas reutilizáveis de automação, horário de regra). Construir uma vez, bem.
- **`SyncStatusBadge`** lê `person_device_sync` e mostra "sincronizada em 5/6 câmeras". Sem ele, o operador não sabe se o cadastro chegou aos devices — e o fan-out falha em silêncio.
- **`ConsentBadge`** lê `persons.consent_status`. Pessoa com consentimento `pending` ou `revoked` aparece marcada em qualquer lista onde apareça.

## 7. Estados que toda tela precisa ter

| Estado | Tratamento |
|---|---|
| Carregando | skeleton, nunca spinner de tela cheia |
| Vazio | empty state com CTA ("Adicione o primeiro dispositivo") |
| Erro de câmera | herdar o vocabulário do NVR: **"Rede inacessível"** (offline) vs **"Senha incorreta"** (`channels.status = auth_error`) — são problemas diferentes com soluções diferentes |
| **Connector offline** | banner vermelho persistente: "Sem conexão com os dispositivos" |
| Sincronização parcial | badge com contagem, não silêncio |
| Mídia expirada | pedir URL nova; nunca imagem quebrada |

> O estado mais perigoso é "tela normal, sistema morto". Se o connector caiu, a tela tem que gritar.

## 8. Contrato de dados da UI

O front consome o **evento normalizado**, nunca payload de fabricante. Isso mantém no front a mesma fronteira da arquitetura: trocar de fabricante não pode obrigar a mexer em componente de UI.

Padrão herdado e **mantido**: flag de "backend configurado" → usa banco real se configurado, mock caso contrário. Permite desenvolver tela sem backend e ligar depois sem reescrever. No protótipo essa flag se chama `isSupabaseConfigured`; ao migrar para PostgreSQL/HostDime, renomear para algo neutro (`isBackendConfigured`) e isolar atrás da camada de acesso a dados, como manda `CLAUDE.md` §3.

## 9. Dados de exemplo

Inventário da bancada, para mock. **Reproduz `P6S-03_BANCADA` §1 com os conflitos preservados** — a base V4 fechava o canal D1 por decreto, esta não:

```json
[
 {"ch":"D1","name":"CAM01","ip":"CONFLITO","type":"H5AI-50","status":"offline"},
 {"ch":"D2","name":"Corredor","ip":"192.168.254.206","type":"F4C-T","status":"online","face":true},
 {"ch":"D3","name":"Recepção","ip":"192.168.254.208","type":"F4C-T","status":"online","face":true},
 {"ch":"D4","name":"AI IPC","ip":"192.168.254.227","type":"T5AI","status":"online"},
 {"ch":"D5","name":"COPA","ip":"192.168.254.207","type":"F4C-T","status":"online","face":true,"recording":true},
 {"ch":"D6","name":"AI IPC","ip":"192.168.254.209","type":"T5AI","status":"online"}
]
```

> ⚠️ **D1 tem conflito aberto** (`P6S-03_BANCADA` §1, PND-08): uma fonte registra `H5AI-50` em `192.168.254.115` ("rede inacessível"), outra registra `CAM01` em `192.168.254.106` ("desconectado"). O canal está offline nas duas, então não afeta teste — mas **não escolher um IP por conta própria**. Em mock, deixar explícito. **D4** também tem conflito de nome de modelo (`T5AI/IPC` vs `T5AI/IPG-5950PCS-AI`).
> NVR da bancada: **RS-436MLJ-L2/S8 em 192.168.254.116**.

Eventos de exemplo (tipos do catálogo canônico, não do vocabulário P6S):

```json
{"type":"face.recognized","channel":"D2 Corredor","occurred_at":"2026-07-20T17:19:10-03:00",
 "person":"balbino","match_list":"white","match_score":89,
 "attributes":{"age":23,"gender":"male","glasses":true,"mask":false,"quality":70}}
```

```json
{"type":"face.unknown","channel":"D2 Corredor","occurred_at":"2026-07-20T17:19:52-03:00",
 "person":null,"match_list":"unknown","match_score":null,
 "attributes":{"gender":"male","glasses":false,"mask":false}}
```

**KPIs do dashboard (exemplo):** eventos hoje 74 · reconhecidas 61 · desconhecidos 13 · câmeras 5/6 · alertas 2.

Mocks complementares para as telas de Frequência, Automações e Veicular (mesma linhagem, dados sintéticos):

```json
{"frequencia_hoje":{"turma":"6ºA","total":30,"presentes":27,"ausentes":3,
  "ausentes_lista":["Carla Dias","Pedro Alves","Lucas Melo"],
  "excecoes":[{"pessoa":"Ana Souza","tipo":"saída fora de horário","hora":"11:20"}]},
 "automacoes":[
  {"id":"a1","nome":"Desconhecido fora de horário","gatilho":"face.unknown","condicao":"fora 07h-18h","acao":"WhatsApp + snapshot","ativa":true},
  {"id":"a2","nome":"Portaria vazia","gatilho":"post.abandoned","condicao":"≥300s","acao":"avisar supervisor","ativa":true},
  {"id":"a3","nome":"Aluno não chegou","gatilho":"não-evento","condicao":"até 08h turma 6ºA","acao":"avisar responsável","ativa":true}],
 "veiculos":[
  {"placa":"ABC1D23","dono":"Ap 101","tag":"UHF-0091","tipo":"morador","status":"autorizado"},
  {"placa":"XYZ9K88","dono":"visitante","tag":null,"tipo":"visitante","status":"aguardando"}]}
```

> **Nenhum dado real de pessoa em mock, seed ou fixture.** Só dado sintético claramente fictício — `CLAUDE.md` §10, item 6. Vale em dobro enquanto a telemetria do protótipo não estiver removida ([CORE-06](CORE-06_FAXINA-DO-PROTOTIPO.md)).

Fontes: base V4 `50_UI-Design-System` (23/07/2026), com as referências a Supabase e à camada de VMS removidas e os dados de bancada realinhados a `P6S-03_BANCADA` §1; `CLAUDE.md` §3 e §10.
