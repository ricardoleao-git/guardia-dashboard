# docs/spec — Especificações canônicas do GuardIA Percebe

Os documentos que o `CLAUDE.md` §13 referencia como **contrato para quem escreve código**. Até 27/07/2026 eles viviam apenas na base de conhecimento do Ricardo, fora do repositório — o que deixava o §13 apontando para dez arquivos inexistentes e as pendências `PND-01` a `PND-20` sem dicionário.

## Precedência

Em conflito, a ordem é:

1. **Código que está rodando** (para questões de implementação)
2. **`CLAUDE.md`** da raiz — contrato do repositório
3. **Esta pasta** — especificação canônica
4. `docs/` (raiz) — **obsoleto**, ver aviso abaixo

## O que ler para cada tarefa

| Precisa de | Ler |
|---|---|
| Schema, RLS, storage, expurgo, migrations 001–007 | `CORE-01_MODELO-DE-DADOS-CORE.md` |
| Automação: gatilho, condição, ação, cooldown, simulador | `CORE-02_MOTOR-DE-REGRAS.md` |
| Tema, componentes canônicos, os 5 estados obrigatórios de tela | `CORE-03_UI-DESIGN-SYSTEM.md` |
| Quais telas construir e em que ordem | `CORE-04_MAPA-DE-TELAS.md` |
| Prazos de retenção e tela de consentimento | `CORE-05_RETENCAO-E-CONSENTIMENTO.md` |
| Como sair do protótipo (e o que já foi feito) | `CORE-06_FAXINA-DO-PROTOTIPO.md` |
| O que já existe em código nos dois repositórios | `CORE-07_INVENTARIO-DE-CODIGO.md` |
| **Quem decidiu o quê, quando e por quê** | `CORE-08_REGISTRO-DE-DECISOES.md` |
| **Definição das pendências PND-01 a PND-20** | `05_Roadmap-e-Fases.md` §6 |
| Validar contra hardware | `P6S-09_ROTEIRO-DE-BANCADA.md` |
| As 56 telas do NVR → endpoint (fonte primária) | `P6S-10_SPEC-PARIDADE-NVR-56-TELAS.md` |
| Índice da camada CORE | `CORE-00_INDICE-DA-CAMADA.md` |

## ⚠️ `docs/` na raiz está OBSOLETO

Os arquivos `docs/00-indice.md` a `docs/14-setup-supabase.md` e `docs/GUARDIA_MANUAL_TECNICO.*` descrevem o protótipo em estado anterior e **contradizem o contrato atual** em pontos estruturais:

- `02-arquitetura.md` e `04-banco-de-dados-supabase.md` apresentam Supabase como arquitetura do produto. **Não é** — produção é PostgreSQL em HostDime (`CLAUDE.md` §3).
- `05-streaming-ao-vivo.md` descreve streaming como funcionalidade. **Não é** — o produto não é VMS e não faz streaming pesado (`CLAUDE.md` §2).
- `14-setup-supabase.md` orienta a montar o que será descartado.

**Não usar como referência.** Mantidos apenas por valor histórico. Em caso de conflito com esta pasta ou com o `CLAUDE.md`, os dois últimos vencem.

## ⚠️ Este repositório **é** público hoje — e a decisão de manter assim está registrada

Correção de tempo verbal: a versão anterior desta seção dizia "antes de tornar público" e "se o repositório voltar a ser público", como se a visibilidade fosse privada. **Não é.** Clone anônimo sem credencial retorna exit 0, verificado em 28/07/2026.

O que está publicamente legível nesta pasta:

- `P6S-09_ROTEIRO-DE-BANCADA.md` documenta que os dispositivos da bancada usam HTTP Basic com **`admin` e senha vazia** na rede `192.168.254.0/24`, e o `P6S-10` repete a convenção. Adequado para LAN de laboratório; o problema não é revelar uma senha, é documentar publicamente que aqueles dispositivos não têm nenhuma.
- `CORE-06` §A.6 descreve, com caminho de arquivo, onde estavam segredos versionados.

**Ricardo decidiu em 28/07/2026 manter o repositório público por ora e trocar a visibilidade depois** — risco aceito, registrado em `CORE-08_REGISTRO-DE-DECISOES.md` **DR-14** com o inventário do que isso expõe.

Duas consequências que **não** mudam por causa dessa decisão:

1. **Redigir estes trechos agora não resolveria nada** — o texto já está no histórico do git (`bf94724`, `40b0a0e`), e commit de correção não remove do histórico. O que resolve é `git filter-repo`, listado no `CLAUDE.md` §14.3 junto da rotação da chave `anon` legada.
2. **As regras que proíbem segredo novo, credencial em mensagem de commit e dado pessoal real seguem valendo integralmente** (`CLAUDE.md` §10.5, §10.6, §10.13). Elas nunca dependeram de o repositório ser privado.
