# P6S-09 — Roteiro de bancada (executável)

Comandos prontos para fechar as pendências que travam duas fases inteiras. **Meio dia de trabalho.**

Este arquivo é a expansão executável do plano de `P6S-06_SPEC-Fase2-Cadastro-Facial-CGI.md` §6 e do backlog de sniffing de `P6S-03_BANCADA` §8 — não os substitui. Onde divergir de qualquer um deles, valem eles: aqui só se acrescenta o *como*.

Pré-requisito: máquina na rede `192.168.254.0/24`. Autenticação de bancada: HTTP **Basic**, `admin` com senha vazia (`-u admin:`, header `YWRtaW46`). **Só na LAN.**

## Neste documento

1. Regras de segurança do roteiro
2. Preparação
3. Probe do NVR — PND-03, PND-08, PND-13, PND-14, PND-15
4. Safety code — PND-01 🔴
5. Cadastro facial completo — PND-05
6. Push de eventos
7. Controle de acesso e túnel MQTT
8. Se travar: capturar a UI local
9. Checklist de saída

---

## 1. Regras de segurança do roteiro

1. **Fase de descoberta é GET-only.** Nenhum `PUT` antes de o backup do §3.6 existir.
2. **Jamais rodar contra equipamento de cliente.** Só a bancada.
3. Registrar por endpoint: status HTTP, corpo (ou o primeiro KB) e se a resposta **difere** entre `.116` (NVR), `.227` (T5AI) e `.207` (F4C-T). O resultado é a **matriz real de suporte device × endpoint** — o artefato mais valioso que sai daqui.
4. Intervalo de **3 a 5 s** entre escritas de rede. Configuração de rede do device é assíncrona; rajada corrompe estado.
5. Resposta de sucesso é `<ResponseStatus><statusCode>0`. Erros em `99_ErrorCodes.md`.
6. Tags XML são em inglês e não se traduzem. Booleanos são `true`/`false` minúsculos.

## 2. Preparação

```bash
AUTH='-u admin:'
NVR=192.168.254.116      # RS-436MLJ-L2/S8, 36ch, 100.000 faces
T5A=192.168.254.227      # T5AI  — canal D4
T5B=192.168.254.209      # T5AI  — canal D6
F4C=192.168.254.207      # F4C-T — canal D5 (COPA)
mkdir -p bancada && cd bancada
```

> ⚠️ **Canal D1 tem conflito aberto** (PND-08): `.115`/H5AI-50 numa fonte, `.106`/CAM01 na outra; offline nas duas. Não escolher um por conta própria — o §3.3 abaixo resolve por evidência.

## 3. Probe do NVR ⏱ 40 min

Fecha ou avança **PND-03**, **PND-08**, **PND-13**, **PND-14** e **PND-15**.

```bash
# 3.1 O NVR fala CGI? Quem ele diz que é?
curl -s $AUTH "http://$NVR/System/DeviceCap"   -o nvr-devicecap.xml
curl -s $AUTH "http://$NVR/System/AICap"       -o nvr-aicap.xml
curl -s $AUTH "http://$NVR/System/DeviceInfo"  -o nvr-info.xml
grep -o '<ProductType>[^<]*' nvr-devicecap.xml

# Repetir nas câmeras — a matriz device × endpoint nasce aqui
for H in $T5A $T5B $F4C; do
  echo "== $H"; curl -s -o /dev/null -w '%{http_code}\n' $AUTH "http://$H/System/DeviceCap"
done

# 3.2 Disco — função exclusiva de gravador. Se responder, o NVR expõe CGI de verdade.
curl -s $AUTH "http://$NVR/Disk" -o nvr-disk.xml

# 3.3 Status multicanal — resolve PND-08 (identidade real de D1 e tipo de D4)
curl -s $AUTH "http://$NVR/System/DeviceStatus" -o nvr-status.xml
# Procurar VideoLostState por canal e o IP/modelo que o NVR reporta para D1 e D4.
# O que o NVR reporta vence a config do protótipo.

# 3.4 PND-15 — registro ativo (porta 9000) como via alternativa de ingestão
curl -s $AUTH "http://$NVR/System/NVRRegisterCfg"
curl -s $AUTH "http://$NVR/System/NVRRegisterState"

# 3.5 Config por canal — LER, nunca escrever nesta fase
curl -s $AUTH "http://$NVR/Record/1/RecordSchedule"
curl -s $AUTH "http://$NVR/Pictures/1/OSD"

# 3.6 ⚠️ BACKUP OBRIGATÓRIO antes de qualquer PUT futuro
curl -s $AUTH "http://$NVR/System/DeviceConfigFile?FileType=3" -o nvr-config-backup.bin
ls -la nvr-config-backup.bin     # tem que ter tamanho > 0
```

```bash
# 3.7 ⭐ PND-03 — a pista do cadastro facial na base de 100k do NVR
#     Antes: cadastrar 1 ou 2 faces pela UI local do NVR.
#     Descobrir o índice de eTransferFileTypeFaceReco varrendo FileTypes.
for n in $(seq 0 20); do
  curl -s $AUTH "http://$NVR/System/DeviceConfigFile?FileType=$n" -o ft-$n.bin
  echo "FileType=$n -> $(stat -c%s ft-$n.bin) bytes -> $(file -b ft-$n.bin)"
done
# Inspecionar os que tiverem conteúdo: file, xxd | head, strings | head
# Na mesma varredura, identificar também o índice de eRecordSetFile
# (arquivo de consulta de histórico de gravação — enum em 30_System):
# se for baixável, vira mecanismo de reconciliação de eventos EM LOTE,
# complementar ao QueryRecordList.
```

> **Por que PND-03 vale uma hora do seu tempo:** se o arquivo `FaceReco` for baixável e aceitar `PUT`, o modelo de cadastro **inverte** — "1× na base de 100k do NVR" passa a primário e o fan-out nas T5AI (5.000 faces por câmera, uma a uma) vira fallback. Hoje são 3.000 alunos × 6 câmeras ≈ 18.000 envios, cerca de 5 h de carga inicial. O fabricante diz que o NVR "não faz cadastro por protocolo" (`NVR 不能下发`), mas a frase se refere ao repasse MQTT do NVR para as câmeras, não ao CGI — vale testar antes de aceitar como limitação. Alternativa mais pesada: sniffing do EasyVMS (`P6S-03_BANCADA` §8, item 7).

```bash
# 3.8 Fila de alarme (backlog antigo) — candidatos vistos na doc
curl -s $AUTH "http://$NVR/EventPlay"
curl -s $AUTH "http://$NVR/AISnapshot"

# 3.9 PND-14 — canais acima de 32
#     A doc declara "máximo 32 canais" em vários campos; o RS-436MLJ é 36ch.
curl -s $AUTH "http://$NVR/Record/34/RecordSchedule"
curl -s $AUTH "http://$NVR/Pictures/34/OSD"

# 3.10 PND-13 — existe endpoint para adicionar IPC a um canal (D1..D36)?
#      Não foi encontrado na extração de 796 caminhos. Adição manual pela UI funciona.
#      Sem isso, não há provisionamento zero-touch.
#      Procedimento: adicionar uma câmera pela UI local com o DevTools aberto e ler
#      a requisição real (§8). É mais rápido que adivinhar nome de endpoint.
```

**Registrar:** quais endpoints responderam por device · houve arquivo facial e em que formato · canal 34 respondeu · qual requisição a UI usa para adicionar canal.

## 4. Safety code ⏱ 10 min · 🔴 PRIORIDADE MÁXIMA (PND-01)

O teste de maior alavancagem do projeto. **Bloqueia a Fase 2 inteira.**

A fórmula é conhecida: **MD5(`unique_code` + `SystemTime`), 8 primeiros dígitos hex, invertidos** (`P6S-06_SPEC` §2). O que está em aberto é **o que é o `unique_code`**: a descrição do campo diz "dono da biblioteca" (o `Ownner` do binding), mas o exemplo Java oficial simula com o **serial do device**.

```bash
# 4.1 Vincular o GuardIA como dono da biblioteca da T5AI (1x por device)
curl -s $AUTH -X PUT "http://$T5A/FrontDeviceOwnnerInfo" \
  -H 'Content-Type: application/xml' \
  -d '<FrontDeviceOwnnerInfo><Ownner>GUARDIA-TESTE01</Ownner></FrontDeviceOwnnerInfo>'

# Pegar o serial para a hipótese B
curl -s $AUTH "http://$T5A/System/DeviceInfo" | grep -i serial
```

```python
# 4.2 Gerar os dois candidatos
import hashlib

def safety_code(unique_code, system_time):
    return hashlib.md5((unique_code + system_time).encode()).hexdigest()[:8][::-1]

ST = "2026-07-26T10:00:00"          # o MESMO valor tem que ir no XML
print("hipótese A (Ownner do binding):", safety_code("GUARDIA-TESTE01", ST))
print("hipótese B (serial do device) :", safety_code("<SERIAL-DA-T5AI>", ST))
```

```bash
# 4.3 Criar grupo com cada hipótese. A que retornar statusCode 0 vence.
curl -s $AUTH -X POST "http://$T5A/FaceGroups/Create" \
  -H 'Content-Type: application/xml' \
  -d '<FaceGroup>
        <GroupName>TESTE-A</GroupName>
        <GroupID2>guardia-teste-grupo-a</GroupID2>
        <Ownner>[HIPOTESE-A]</Ownner>
        <SystemTime>2026-07-26T10:00:00</SystemTime>
        <GroupThresholdValue>80</GroupThresholdValue>
      </FaceGroup>'
# Repetir com TESTE-B / guardia-teste-grupo-b / [HIPOTESE-B]
```

> **Se nenhuma funcionar:** terceira hipótese = `DID` do device; quarta = MAC. Testar em sequência. Persistindo, capturar a chamada real da UI local (§8) — a UI é cliente deste mesmo CGI e revela a entrada correta.

**Ao fechar:** registrar qual entrada venceu em `P6S-06_SPEC` §2 e baixar PND-01 no `05` §6. É a atualização mais importante que sai deste roteiro.

## 5. Cadastro facial completo ⏱ 1 h · depende do §4

```bash
# 5.1 Cadastrar pessoa + foto (multipart)
curl -s $AUTH -X POST "http://$T5A/FaceGroup/1/AddPersonInfoAndFaceImageV1" \
  -F "Name=Teste Sintetico" \
  -F "Sex=male" \
  -F "Ownner=[SAFETY-CODE-VALIDO]" \
  -F "FaceGroupID=guardia-teste-grupo-a" \
  -F "FaceUUID=11111111-1111-1111-1111-111111111111" \
  -F "SystemTime=2026-07-26T10:00:00" \
  -F "file=@foto3x4.jpg;type=image/jpeg"
# Conferir statusCode 0 e guardar o MD5 retornado

# 5.2 Conferir
curl -s $AUTH "http://$T5A/FaceGroups/QueryAll"
curl -s $AUTH -X POST "http://$T5A/FaceGroup/QueryPersonInfoList"

# 5.3 ⏱ MEDIR O TEMPO POR CADASTRO — é o número que dimensiona a carga inicial
time (for i in $(seq 1 20); do
        curl -s $AUTH -X POST "http://$T5A/FaceGroup/1/AddPersonInfoAndFaceImageV1" \
          -F "Name=Sintetico-$i" -F "Sex=male" \
          -F "Ownner=[SAFETY-CODE-VALIDO]" \
          -F "FaceGroupID=guardia-teste-grupo-a" \
          -F "FaceUUID=$(uuidgen)" \
          -F "SystemTime=2026-07-26T10:00:00" \
          -F "file=@foto3x4.jpg;type=image/jpeg" > /dev/null
      done)
# Extrapolar: 3.000 alunos × 6 câmeras = 18.000 envios
```

**5.4 Teste vivo:** passar na frente da câmera. O evento tem que sair **reconhecido** (nome + score), não como desconhecido.

**5.5 PND-05 — requisitos finos da foto.** Repetir 5.1 com resoluções e qualidades diferentes (320×240, 640×480, 1024×768, JPEG em várias qualidades) e descobrir empiricamente o mínimo aceitável. O que se sabe hoje: JPEG, frontal, fundo claro, **sem maquiagem**, ≤ 1 MB. Sem esse número, a validação de qualidade da UI ([CORE-03](CORE-03_UI-DESIGN-SYSTEM.md) §5) é palpite — e o modo de falha é **falso-negativo silencioso** numa escola.

> **Só foto sintética ou de pessoa da equipe com consentimento.** Nenhum dado real de aluno ou morador na bancada.

## 6. Push de eventos ⏱ 1 h

```bash
# 6.1 Subir o receptor de teste
#     ouvindo em :8080/api/v1/event/pull

# 6.2 Apontar a câmera para ele
curl -s $AUTH -X PUT "http://$T5A/System/HTTPEventServerConfigV2" \
  -H 'Content-Type: application/xml' \
  -d '<HttpEventServerCfgV2>
        <Enable>true</Enable>
        <Protocol>http</Protocol>
        <Host>192.168.254.XX</Host>
        <URLPath>/api/v1/event/pull</URLPath>
        <Port>8080</Port>
        <AuthMode>none</AuthMode>
        <DataTransfer2ServerTimeout>3</DataTransfer2ServerTimeout>
        <CacheEventEnable>true</CacheEventEnable>
      </HttpEventServerCfgV2>'

# 6.3 Testar e conferir estado
curl -s $AUTH -X POST "http://$T5A/System/HTTPEventServerTest"
curl -s $AUTH "http://$T5A/System/HTTPEventServerStatusV2"
```

**Validar:** heartbeat chega · o Ack é aceito · o evento facial chega com as três imagens · **Ack respondido em menos de 500 ms** (senão o device retransmite) · `CacheEventEnable` reentrega o que se perdeu quando o receptor volta · depois repetir com `AuthMode=OAuth` e validar a assinatura.

## 7. Controle de acesso e túnel MQTT ⏱ 1 h

```bash
# 7.1 Abrir porta — fecha o ciclo evento → ação
curl -s $AUTH -X PUT "http://$T5A/AccessGate/1/RemoteOpenDoor"   # o relé tem que atuar

# 7.2 Repetir §4 e §5 pelo túnel MQTT: operator transportCGIConfig, corpo em base64.
#     Confirma o caminho WAN/NAT sem abrir porta na rede do cliente.
#     Config canônica: /System/P6SEventMQTTConfig · broker EMQX nosso.
```

Registrar se o túnel existe **nas duas** T5AI e se o NVR também o expõe — o NVR é considerado LAN-only até prova em contrário.

## 8. Se travar: capturar a UI local

A própria UI web do NVR é cliente deste CGI. Abrir o DevTools do navegador na UI do `.116`, executar a ação pela tela (cadastrar rosto, formatar disco, **adicionar câmera a um canal**) e **ler a requisição real** resolve qualquer ambiguidade de formato — inclusive PND-01 e PND-13.

Alternativa mais pesada: instalar o **EasyVMS** (PC client oficial da Ruision), conectar ao NVR e capturar com Wireshark (`tcp.port==6060 || tcp.port==6066 || tcp.port==80`) durante um cadastro e um reconhecimento. É engenharia reversa de cliente legítimo, sem depender da porta 4999 nem do contato com o fornecedor.

## 9. Checklist de saída

| # | Item | Fecha |
|---|---|---|
| [ ] | Matriz device × endpoint registrada (NVR, T5AI, F4C-T) | PND-03 parcial |
| [ ] | Identidade real de D1 e tipo de D4 pelo `DeviceStatus` do NVR | **PND-08** |
| [ ] | Backup de configuração do NVR guardado, tamanho > 0 | guardrail |
| [ ] | Arquivo `FaceReco` baixável? formato? aceita `PUT`? | **PND-03** |
| [ ] | `eRecordSetFile` baixável? formato? | reconciliação em lote |
| [ ] | Canal 34 respondeu? | PND-14 |
| [ ] | Requisição real de "adicionar câmera a canal" capturada | PND-13 |
| [ ] | `NVRRegisterCfg` responde? porta 9000 viável? | PND-15 |
| [ ] | **Safety code descoberto e documentado** | **PND-01** 🔴 |
| [ ] | Pessoa cadastrada e reconhecida ao vivo | Fase 2 |
| [ ] | Tempo por cadastro medido e extrapolado | dimensionamento |
| [ ] | Push chegando com Ack < 500 ms, depois com OAuth | Fase 1 |
| [ ] | `RemoteOpenDoor` atuou o relé | Fase 3 |
| [ ] | Cadastro repetido via `transportCGIConfig` | caminho WAN |
| [ ] | Requisitos de foto mapeados empiricamente | PND-05 |

**Ao terminar, atualizar `P6S-01_ESTADO-ATUAL` §3–§4 e o backlog de `05_Roadmap-e-Fases` §6** — baixar o que fechou e registrar o que se descobriu. A base só continua útil se esse passo for feito; roteiro executado e não documentado é trabalho que se perde na próxima sessão.

Fontes: base V4 `61_PLANO-Roteiro-de-Bancada` (23/07/2026), realinhado a `P6S-06_SPEC` §2–§3 e §6, `P6S-03_BANCADA` §1 e §8 (conflitos preservados) e à numeração de pendências de `05_Roadmap-e-Fases` §6; três probes novos (PND-13, PND-14, PND-15) que não existiam no plano anterior.
