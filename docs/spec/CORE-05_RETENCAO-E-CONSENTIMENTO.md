# CORE-05 — Retenção e consentimento

Instrumenta dois itens do **gate de conformidade da Fase 0** ([05_Roadmap-e-Fases](05_Roadmap-e-Fases.md) §1): a política de retenção do snapshot e o desenho da tela de consentimento. Desenho conceitual em [04_Arquitetura-Tecnica](04_Arquitetura-Tecnica.md) §10; requisitos de origem em `06_Benchmark-Concorrentes.md` §7 e `08_Dossie-Pesquisa-e-Spec-30dias.md` §4.

> ⚠️ **Tudo neste arquivo é proposta técnica a validar juridicamente.** Os prazos são pontos de partida defensáveis, não parecer. A base legal por vertical e o parecer do enquadramento escolar continuam pendentes (PND-10 e PND-11) — este arquivo dá o que o jurídico precisa para opinar sobre algo concreto, em vez de opinar no vazio.

## Neste documento

1. Por que conformidade é feature
2. Política de retenção por artefato
3. A tela de consentimento (T8)
4. Princípios de engenharia obrigatórios
5. Definição de pronto

---

## 1. Por que conformidade é feature

Nenhum concorrente brasileiro de condomínio ou escola trata consentimento, retenção e direitos do titular como **tela do sistema** — todos tratam como cláusula de contrato (`06_Benchmark-Concorrentes.md`). Quem chega na escola com a resposta pronta na tela vende; quem chega com um parágrafo no contrato negocia desconto.

O comprador de escola está sensível ao tema porque a ANPD elegeu dados de crianças e adolescentes como ponto explícito de fiscalização em reconhecimento facial (**NT nº 5/2025** — `01_BRIEFING` §6). Isso é fato verificado na base e serve como argumento; qualquer outro caso concreto citado em venda precisa de checagem antes.

Escala do dado que exige mais cuidado:

| Dado | Classificação | Consequência |
|---|---|---|
| **Template ou imagem facial de menor** | dado pessoal **sensível** de criança/adolescente | O mais grave. Base legal difícil, exige consentimento do responsável e o melhor interesse da criança |
| Template ou imagem facial de adulto | dado pessoal sensível | Consentimento específico e destacado (Art. 11, I) ou a hipótese de prevenção à fraude e segurança na identificação (Art. 11, II, "g"). O rol do Art. 11 é **taxativo** e não inclui legítimo interesse |
| Placa de veículo | dado pessoal comum | Risco bem menor — parte do racional de a trilha de condomínio ser mais confortável |
| Evento sem identificação (contagem, cerca, queda) | dado comum, às vezes anônimo | Menor risco; ainda assim tem prazo |

## 2. Política de retenção por artefato

Proposta a validar. Todo prazo cai numa coluna: `events.purge_after`, `persons.deleted_at` + prazo, ou job com regra própria ([CORE-01](CORE-01_MODELO-DE-DADOS-CORE.md) §7).

| Artefato | Prazo proposto | Gatilho de expurgo |
|---|---|---|
| **Payload bruto do evento** (`events.raw`) | 7 dias | Vence antes do metadado. Serve para depurar integração, não para operar |
| **Snapshot de evento** (imagem no bucket) | 30 dias, exceto o vinculado a incidente aberto | Job diário lê `purge_after`, apaga o objeto e zera `media` |
| **Metadado do evento** (linha em `events`) | 12 meses | Preserva relatório e frequência sem preservar imagem |
| **Imagem de cadastro** (`persons.photo_url`) | Enquanto durar o vínculo + 30 dias | Fim de vínculo (aluno saiu, morador mudou, funcionário desligado) |
| **Template facial no device** | Enquanto durar o vínculo | Exclusão propagada a todos os devices com comprovante em `person_device_sync` |
| **Registro de consentimento** | 5 anos após a revogação | É prova de conformidade — vive **mais** que o dado que autorizava |
| **`audit_log`** | 5 anos, append-only | Não expurgar por conveniência; é a defesa em fiscalização |

Duas regras que valem mais que os números:

**2.1 Segregação por finalidade.** Evento de segurança e evento de frequência escolar são a mesma linha em `events` com finalidades diferentes — logo, prazos diferentes. Se a frequência precisa de 12 meses e a segurança de 30 dias, o expurgo respeita a finalidade, não a tabela.

**2.2 Revogação é operação, não e-mail.** Revogar consentimento tem que executar o mesmo caminho da exclusão: apagar foto, propagar `DeletePersonList` aos devices, emitir comprovante, registrar em `audit_log`. Se a revogação depende de alguém lembrar de fazer, ela não existe.

## 3. A tela de consentimento (T8)

Cinco blocos. Nenhum é decorativo:

1. **Titulares** — lista com status (`granted` / `pending` / `revoked` / `not_required`), quem consentiu (responsável legal, quando menor), data, e ação de **solicitar consentimento**. Lê `persons.consent_status`.
2. **Termo por finalidade** — qual finalidade foi autorizada (acesso, frequência, segurança), com o texto vigente versionado. Finalidade nova exige consentimento novo, não reaproveita o antigo.
3. **Alternativa não-biométrica** — mostra qual credencial alternativa a pessoa tem (tag, QR, senha). Pessoa sem consentimento e sem alternativa é uma falha de cadastro que a tela precisa apontar, porque significa que ela simplesmente não entra.
4. **Direitos do titular** — acesso, correção, portabilidade, eliminação; cada um gerando job rastreável e comprovante em PDF.
5. **Auditoria de acesso a dado sensível** — quem consultou face, foto ou evento facial e quando. Lê `audit_log` filtrado por `sensitive = true`. É a entrega de "log de acesso a dado biométrico" da Fase 2 do `05`.

Fronteira: consentimento revogável, alternativa não-biométrica, RIPD e template criptografado são do **GuardIA core**; o Percebe herda e não pode violar — exclusão propagada, log de acesso, expurgo de snapshot e payload bruto ([04](04_Arquitetura-Tecnica.md) §10). A tela T8 é do core e consome os dois lados.

## 4. Princípios de engenharia obrigatórios

1. **Minimização.** Não persistir o que não se usa. O payload bruto tem prazo curto por isso.
2. **URL assinada curta.** Minutos, não dias. Bucket privado sempre.
3. **Acesso a biometria é evento auditado**, não consulta comum: `audit_log` com `sensitive = true`.
4. **Segregação por finalidade** no expurgo (§2.1).
5. **Exclusão propagada** — nunca apagar do banco deixando a face no device.
6. **Zero telemetria de terceiro.** Sistema que processa biometria de menor não pode ter coletor espelhando as interações do operador. É o motivo nº 1 da faxina de [CORE-06](CORE-06_FAXINA-DO-PROTOTIPO.md) — e a regra decorrente: **enquanto o coletor existir no código, nenhum dado real de pessoa entra no ambiente.**
7. **RIPD** (relatório de impacto) redigido antes da primeira instalação escolar, não depois.

## 5. Definição de pronto

- [ ] Prazos da §2 validados juridicamente e registrados em contrato (fecha parte de PND-11).
- [ ] Cada prazo materializado em coluna ou job, com teste.
- [ ] Revogação de consentimento executando o caminho completo, com comprovante.
- [ ] Auditoria de acesso a dado sensível consultável na tela.
- [ ] RIPD redigido para a vertical escolar.
- [ ] Nenhuma pessoa ativa sem consentimento válido **ou** credencial alternativa registrada.

Fontes: base V4 `12_PRODUTO-LGPD` §4 e §6 (23/07/2026) — o §5 daquele arquivo, que vetava cerca virtual e contagem em pátio escolar, foi descartado por decisão revertida em 26/07, e o caso concreto citado como argumento comercial foi removido por falta de verificação (`CORE-00` §Descartados); `04_Arquitetura-Tecnica` §10; `05_Roadmap-e-Fases` §1 e §3; `06_Benchmark-Concorrentes.md` §7; `08_Dossie-Pesquisa-e-Spec-30dias.md` §4; `01_BRIEFING` §6.
