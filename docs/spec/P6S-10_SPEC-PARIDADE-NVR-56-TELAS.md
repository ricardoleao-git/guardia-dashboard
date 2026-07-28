# P6S-10 — Spec de paridade: as 56 telas do NVR → GuardIA

**Origem:** `docs/specs/05-Spec-Paridade-NVR-GuardIA.md` do monorepo (21/07/2026, Ricardo + Claude), construída sobre **3 lotes de fotos da bancada (56 telas)** + a extração integral P6SCGI. É **fonte primária**: o que está aqui foi visto na tela do equipamento real, não deduzido da documentação.

Incorporada à base em 26/07/2026 (lote v4). O original permanece no Git (`docs/specs/`); esta versão acrescenta a reconciliação com as decisões do Percebe e a numeração de pendências.

## Reconciliação com a base (ler antes de usar)

1. **Identidade do NVR.** As fotos mostram **N436M-12NGA-AI/Z02** (SN N195F194D0056A367EFB08B, DID IOTFDD-007890-BKSLN, firmware **7.0.1-20260115**); a base comercial usa **RS-436MLJ-L2/S8** (`P6S-03` §1, datasheet 53). São nomenclaturas do mesmo equipamento (interna/OEM vs comercial) — em proposta, usar a comercial; em bancada e sniffing, a que o device reporta.
2. **Evidência para PND-08.** As fotos registram **D1 = CAM01 / .115 / H5AI-50 ("Rede inacessível")** — juntando num só registro os dois lados do conflito (.115/H5AI-50 vs .106/CAM01). E confirmam **banda total 80 Mbps na UI** com ~15 Mbps em uso (o datasheet segue dizendo 480 — a divergência de banda continua aberta). Fechar PND-08 formalmente com o `DeviceStatus` do probe (`P6S-09` §3.3), mas a identidade de D1 tem agora fonte primária.
3. **Chip de IA.** As fotos mostram **AX650** rodando no NVR (FW Ax_V3.6.2, 15.93 GB RAM, NPU) — consistente com `P6S-03` §1 (chip 23AP20 + módulo IA AX650).
4. **Vocabulário de escopo.** A spec original diz "plataforma de videomonitoramento" e propõe superações que hoje violariam a fronteira do produto (decisão fixa nº 1: não é VMS). As colunas "GuardIA: supera" abaixo foram mantidas como registro do raciocínio, **mas a fronteira do `CLAUDE.md` §2 prevalece**: vídeo só como pass-through autenticado; nada de mosaico servido pelo backend, gravação ou re-encode. Onde houver conflito, o item vira comando pontual + deep-link, não feature de VMS.
5. **Fan-out vs NVR.** A "confirmação-chave" do §2.3 (campos da tela batem 1:1 com o CGI) é o melhor indício a favor da hipótese de cadastro no NVR — mas continua sendo **PND-03** até o `.116` responder ao `AddPersonInfoAndFaceImageV1`.

Convenções globais (valem para tudo): HTTP/CGI, auth **Basic** (`admin:` → `YWRtaW46` na bancada), corpo **XML**, resposta `<ResponseStatus><statusCode>0` = OK (erros em `99_ErrorCodes`). Config de rede é **assíncrona** → rate-limit 3–5 s entre PUTs. Endpoints por canal usam `/…/{ChannelID}/…` (no NVR, itera D1–D36).

Padrão de leitura por feature:
> **Tela do NVR** → *o que faz* → **Endpoint(s) CGI** (confirmado / a validar) → **GuardIA: paridade** → **GuardIA: onde supera**

---

## 1. Inventário autoritativo da bancada (confirmado nas fotos)

**NVR** `192.168.254.116` — N436M-12NGA-AI/Z02 (comercial RS-436MLJ-L2/S8), SN N195F194D0056A367EFB08B, DID IOTFDD-007890-BKSLN, firmware **7.0.1-20260115**, chip IA **AX650** (FW Ax_V3.6.2, 15.93 GB RAM, NPU), **36 canais**, 16 entradas / 8 saídas de alarme, 1 saída de áudio, 4 baias SATA, main 4K / sub D1, HDMI 1080p@60.

**Disco:** 1× TOSHIBA HDWTA80U 8 TB (7.28 TB), status "Gravando", 6.95 TB livre.
**Rede:** ETH0 `192.168.254.116/24`, GW .253, MTU 1500, MAC 5a:5a:00:f0:fd:09. ETH0 = LAN das câmeras (1000M); ETH1 = internet (100M). Banda total 80 Mbps na UI, uso ~15 Mbps com 6 câmeras (⚠️ datasheet: 480 — PND-08).

**Canais (todos P6S, HTTP 80 / comando 6060 / vídeo 6066):**

| Canal | Nome | IP | Tipo | Função |
|---|---|---|---|---|
| D1 | CAM01 | .115 | IPC H5AI-50 | 🔴 Rede inacessível |
| D2 | Corredor | .206 | **F4C-T** (facial) | Reconhecimento facial ✅ |
| D3 | Recepcao | .208 | **F4C-T** (facial) | Reconhecimento facial ✅ |
| D4 | AI IPC | .227 | T5AI/IPC | IA de borda |
| D5 | COPA | .207 | **F4C-T** (facial) | Reconhecimento facial ✅ |
| D6 | AI IPC | .209 | T5AI/IPC | IA de borda |

> Os **faciais são D2/D3/D5 (F4C-T)**; os T5AI são D4/D6. Reconhecimento facial habilitado nos canais D02, D03, D05.

---

## 2. INTELIGÊNCIA (o núcleo)

### 2.1 Divisão de processamento IPC AI vs NVR AI ⭐

**Tela:** Inteligência → Configuração de função inteligente (dois switches: "Reconhecimento facial IPC" e "NVR AI").

| Função | Processamento | Origem do evento |
|---|---|---|
| Movimento | **IPC AI** | câmera |
| Cerca eletrônica (perímetro) | **IPC AI** | câmera |
| Detecção transfronteiras (cruzamento de linha) | **IPC AI** | câmera |
| Detecção fora de serviço (off-duty) | **IPC AI** | câmera |
| Contagem de pessoas | **IPC AI** | câmera |
| Captura / comparação de rosto | **NVR AI** | NVR |
| Análise de Modelo Grande | **NVR AI** (máx. 4 canais) | recurso local, sem push equivalente |

Consequência direta na matriz de ingestão (§11): evento de IPC AI chega por P6SHTTP **da câmera**; evento facial nasce no **NVR**.

### 2.2 Reconhecimento facial — regras por canal

**Tela:** habilitação D02/D03/D05; regras (whitelist/blacklist/stranger) por câmera.
**Endpoints (confirmados):** `GET/PUT /FaceReco/{ch}/RecoRuleList` · `/FaceReco/{ch}/RecoRuleListVoiceAlarm` · `/FaceReco/{ch}/BaseConfig` · histórico em `/FaceRecognition/QueryRecordCount` + `/QueryRecordList`.
**Paridade** — expor por câmera as listas e a ação por lista. **A regra é conceito do lado NVR** (doc confirma: whitelist/blacklist "set and saved on the NVR side").
**Supera** — regra por horário/turma (aluno do 6ºA só é "esperado" em horário letivo na entrada X); o NVR tem regra fixa por canal, sem contexto temporal/organizacional.

### 2.3 Biblioteca de rostos + cadastro de pessoa ⭐

**Tela:** "Adicione o rosto". Campos: Enviar Imagem (≤1 MB), Nome, Gênero, contato, tipo de certificado, número do certificado, Biblioteca de rosto (grupo).
**Endpoints (confirmados — a UI usa exatamente estes):**
- Grupos: `PUT /FaceGroups/Create` · `/Modify` · `/Delete` · `/QueryAll` (`GroupName`, `GroupID2` = uuid 32).
- Pessoa+foto: **`POST /FaceGroup/{ch}/AddPersonInfoAndFaceImageV1`** (multipart: Name, Sex, Ownner, FaceGroupID, FaceUUID, SystemTime, file).
- Manutenção: `/FaceGroup/ModifyPersonInfo` · `/UpdatePersonInfoAndFaceImage` · `/QueryPersonInfoList(+Count)` · `/OrganizationMemberAdd`.

> **Confirmação-chave:** os campos da tela batem 1:1 com o payload CGI. Reforça a hipótese de que **o cadastro no NVR é acessível por protocolo** — validar se o `AddPersonInfoAndFaceImageV1` responde no `.116` (**PND-03**).

**Paridade** — CRUD de pessoas e grupos + upload de foto ≤1 MB, frontal, sem maquiagem, com validação de qualidade **antes** de enviar (falso-negativo silencioso é o pior modo de falha em escola).
**Supera** — cadastro em lote (a UI é 1 a 1), `FaceUUID` como chave, sincronização multi-device (fan-out para as 3 F4C-T + NVR).

### 2.4 Eventos inteligentes em tempo real

**Tela:** painel "Evento inteligente" (74 eventos no dia da foto). Por evento: foto capturada + foto cadastrada + score (ex. 89%) + nome + lista + atributos. "estranho" = não cadastrado.
**Endpoint:** payload = evento `Face Recognition` do **P6SHTTP** (POST JSON assinado OAuth-1.0a-like, `faceFeature` + `CaptureImage` base64).
**Paridade** — ingerir o POST, validar assinatura (secret = serial da câmera), responder heartbeat-Ack. **Supera** — busca por pessoa/período/lista; alerta proativo no "estranho" em área restrita.

### 2.5 Cerca, cruzamento de linha, contagem, off-duty (IPC AI)

**Tela:** toggles por câmera. **Endpoints:** geometria em `/System/{ch}/CrossBorderDetectUIDesignInfo`; famílias de perímetro/região/contagem em `21_Eventos-Secundarios`/`24_Eventos-Inteligentes-Config`. Processados na câmera → chegam por P6SHTTP.
**Paridade** — receber e classificar os 28 tipos. **Supera** — regra composta (linha cruzada + fora de horário → alerta) e análise de contagem.

### 2.6 Gestão de veículos / LPR

**Tela:** Inteligência → Gestão de veículos. **Endpoints:** `License plate library` (Create/Modify/Delete/Query de placa e dono).
**Paridade** — CRUD de placas + evento `Car License Snapshot`. **Supera** — cruzar placa↔pessoa (motorista cadastrado).

### 2.7 Busca inteligente

**Tela:** Inteligência → Busca inteligente. **Paridade** — busca facial retroativa por foto (`/FaceRecognition/QueryRecordList`). **Supera** — busca por atributos já presentes no payload; a "Análise de Modelo Grande" como fonte é **PND-20** (não se sabe se responde por CGI).

---

## 3. PRÉ-VISUALIZAÇÃO (ao vivo)

**Tela:** mosaico 36 canais + lista + painel de eventos ao vivo.
**Endpoints:** streams RTSP/SDK; status agregado `Get All Channels Status Of Device` (bitrates, RecordState, VideoLost, Motion, AlarmIn/Out por canal, ID 1–32 — ⚠️ e os canais 33–36? **PND-14**).
**No Percebe:** a paridade aqui é **saúde por canal** (o status agregado alimenta `channels.status`). A visualização em si é pass-through autenticado — o mosaico servido pelo backend está fora de escopo (reconciliação, item 4).

---

## 4. REPRODUÇÃO (playback)

**Tela:** calendário + timeline 24h; filtros Inteligência / Comum / Alarme / Manual / Movimento.
**Endpoints:** `36_Snapshot-Record-Playback` (RecordFileList paginado, playback por tempo). Gravação **tagueada por tipo**.
**No Percebe:** deep-link "abrir o clipe deste evento" via pass-through (PND-18). O player multi-câmera sincronizado está fora de escopo.

---

## 5. GERENCIAMENTO DE CANAIS ⭐ (material da PND-13)

**Tela:** Gerenciamento → Lista de dispositivos. Ações: **Adicionar (personalizado)**, **Detecção de rede** (probe/discovery), **Modificar IP em lote**, **Edição de senha em lote**, **Atualização em lote**, **Restauração de fábrica em lote**, **Eliminação em lote**. Auto-adicionar. Banda total/atual exibida.

**Add manual — contrato completo (foto):** Método (IP), IP da câmera, Protocolo (P6S), Canal destino [D1…], **Porta HTTP 80 / Comando 6060 / Vídeo 6066**, user, senha.

**Edição de senha em lote (foto):** user `admin` + nova senha aplicada a vários canais → **é o mecanismo de trocar a senha padrão vazia** no provisionamento.

**Endpoints:** a área de gestão de canal digital é **confirmada na UI**, mas o endpoint CGI exato não foi encontrado na extração — capturar no DevTools durante um add manual (**PND-13**; provável família sob Device Management + discovery na porta 5555). `eDeviceDetectListFile` (via `/System/DeviceConfigFile`) é a lista de probe.

**Paridade** — onboarding de câmeras (descobrir → vincular a canal → credenciais), senha em lote no provisionamento. **Supera** — provisionamento zero-touch com backup automático antes (D-15 do driver).

---

## 6. CONFIGURAÇÃO — Parâmetros de câmera/canal

**Tela:** por canal — OSD, ISP, iluminação, codificação (bitrate/resolução/FPS por stream), máscara de privacidade, áudio, PTZ.
**Endpoints:** OSD `/Pictures/{ch}/OSD` + `MultiOSDV2` (o NVR usa só estes); imagem em `34_Imagem` (76 endpoints/canal); A/V em `35_Audio-Video-Streams`; PTZ em `37_PTZ`.
**Paridade** — get/set por canal, capability-driven. **Supera** — perfis reutilizáveis ("padrão escola") aplicáveis em lote. É a tela C1 de `CORE-04` §6.

---

## 7. CONFIGURAÇÃO — Rede

**Tela:** TCP/IP dual-NIC, Porta, DDNS (`dynupdate.no-ip.com`), Email/SMTP (porta 25, 3 destinatários, anexo de imagem, botão Teste), **Registo ativo (Porta 9000 + domínio host)**, Acesso de plataforma/P2P (DID, "Pronto para Internet, suporte push").
**Endpoints:** `31_Network-CGI` — interfaces, DNS, DDNS, SMTP, **`/System/NVRRegisterCfg` + `/NVRRegisterState`**, P2P.

> ⭐ **Porta 9000 (registo ativo)** = o NVR **disca ativamente** para uma plataforma central. Combinado com `NVRRegisterCfg`, é potencialmente o caminho de ingestão NVR→GuardIA **sem webhook e sem NAT**: o NVR se registra no Percebe em vez de o Percebe ter que alcançá-lo. Prioridade alta de sniffing (**PND-15**).

**Paridade** — configurar rede/DNS/SMTP remotamente (tela C3). **Supera** — o Percebe como destino do registo ativo.

---

## 8. CONFIGURAÇÃO — Gestão de alarmes

**Tela:**
- **Evento comum** por câmera: **Agenda 7d×24h** + **Ligação** (sirene, email, msg APP, **interligar PTZ** — preset/trilha/rastrear de OUTRA câmera).
- **Anomalia do sistema:** Erro HD, ETH0/1 down, Acesso ilegal, Muito trânsito + checklist granular de notificação.
- **Alarme de voz do gravador (TTS):** frases pré-definidas + **5 personalizadas por texto-para-fala**, com audição/exportar. Requer alto-falante externo; áudio ≤100K, gravação ≤10 s.

**Endpoints:** I/O alarm em `32_Device-Management`; `/Alarm/AlarmOut/{ch}/ControlMode`; TTS em `30_System` (Assist-Command).
**Paridade** — tela C4 de `CORE-04`. **Supera** — a "ligação" vira ação do motor de regras (`CORE-02` §4): webhook/WhatsApp/catraca, além de sirene+email+app.

---

## 9. CONFIGURAÇÃO — Sistema

**Tela:** Geral (idioma, nome, resolução HDMI), **Hora** (fuso GMT-3, DST, **NTP** `pool.ntp.org`, sync IPC 24h), **Usuários** (admin/Default + CRUD + Autoridade), Pré-visualização (tour), Usuário Online, Info de instalação.
**Endpoints:** `30_System` + `33_User-e-Seguranca` (add/update/delete, recuperação de senha) + Date/Time/DST em `32_Device-Management`.
**Paridade** — tela C5. **Supera** — RBAC central multi-site e auditoria de quem mudou o quê (já no `audit_log` de `CORE-01`).

---

## 10. CONFIGURAÇÃO — Armazenamento e Manutenção

**Tela:** discos (capacidade, status, modelo, Formatar) + agenda de gravação por câmera; Manutenção: logs (busca + **Exportar**), upgrade local + cloud, **Importar/Exportar Parâmetro**, restaurar padrão/fábrica, auto-manutenção, Reiniciar/Desligar.
**Endpoints:** `GET/PUT /Disk` + `/Record/Format/Call`; `/Record/{ch}/RecordSchedule`; logs; upgrade em `32_Device-Management`; **`/System/DeviceConfigFile?FileType=N`** (export/import — `eDeviceConfig`; ⭐ `eTransferFileTypeFaceReco` = o arquivo facial, alvo da **PND-03**); restore factory V1/V2.
**Paridade** — telas C2 e C6. **Supera** — monitoramento proativo de disco, backup versionado de config, upgrade em frota (C7).

---

## 11. Matriz de ingestão de eventos (decisão de arquitetura)

| Evento | Origem | Transporte | Destino |
|---|---|---|---|
| Facial (captura/comparação) | **NVR AI** | P6SHTTP (câmera) / registo ativo 9000 (NVR) — validar | endpoint de eventos do Percebe |
| Cerca / linha / contagem / off-duty | **IPC AI** | P6SHTTP direto da câmera | endpoint de eventos |
| LPR (placa) | IPC/NVR | P6SHTTP | endpoint de eventos |
| Anomalia de sistema (HD/rede) | NVR | registo ativo 9000 / status agregado | health monitor |

> Nuance importante que a base ainda não tinha: **o evento facial nasce no NVR AI** (as F4C-T capturam; a comparação roda no NVR). Se o push das câmeras não carregar o resultado da comparação do NVR, o registo ativo (PND-15) deixa de ser plano B e vira caminho necessário. Validar no §6 do `P6S-09`.

---

## 12. Backlog de sniffing (crosswalk com as pendências)

| Item da spec original | Pendência da base |
|---|---|
| `AddPersonInfoAndFaceImageV1` responde no NVR `.116`? | **PND-03** |
| Protocolo da porta 9000 (registo ativo) | **PND-15** |
| `DeviceConfigFile?FileType=<FaceReco>` baixa/sobe a base facial? | **PND-03** |
| Endpoint CGI de adicionar IPC ao canal | **PND-13** |
| Safety code (`Ownner`/`unique_code`) | **PND-01** 🔴 |
| Canais 33–36 respondem nos endpoints `/{ChannelID}/`? | **PND-14** |
| Cada feature responde no firmware 7.0.1? (probe capability) | matriz device×endpoint do `P6S-09` §3 |
| "Análise de Modelo Grande" responde por CGI? | **PND-20** (nova) |

---

## 13. Princípio de produto (paridade → superação)

O NVR resolve **um site, um operador, na tela local**. Os softwares do fabricante (EasyVMS, app P2P) amarram o cliente na nuvem deles. O GuardIA iguala cada função acima e supera em três eixos que o NVR estruturalmente não alcança:

1. **Central multi-site** — uma base de pessoas, regras e eventos para N escolas/condomínios, não uma UI por gravador.
2. **Automação aberta** — evento → webhook/WhatsApp/catraca/chamada, no lugar de sirene+email+app.
3. **Contexto** — regras por horário/turma/organização e correlação pessoa↔evento↔vídeo.

Fontes: fotos de bancada (3 lotes, 56 telas, 21/07/2026); extração P6SCGI (biblioteca `09`–`91`); `P6S-03_BANCADA` §1 (reconciliação); decisões do Percebe de 26/07 (`CLAUDE.md` §2, `04` §9).
