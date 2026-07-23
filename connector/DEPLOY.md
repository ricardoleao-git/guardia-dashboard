# GuardIA Connector — Guia de Deploy na Bancada

## Pré-requisitos

- Raspberry Pi (Zero 2 W, 3B+, 4, ou 5) ou PC Linux com Python 3.9+
- Acesso à rede LAN da bancada (192.168.254.x)
- Câmeras P6S ligadas e acessíveis via IP

## Passo 1: Copiar o connector para a bancada

### Opção A: Via SCP (a partir do seu computador)

```bash
scp -r connector/ pi@RASPBERRY_IP:~/guardia-connector/
```

### Opção B: Via Git (se o projeto estiver versionado)

```bash
git clone <repo-url> ~/guardia-connector
cd ~/guardia-connector/connector
```

### Opção C: Via USB

Copie a pasta `connector/` para um pendrive e transfira para o Raspberry Pi.

## Passo 2: Instalar dependências

```bash
cd ~/guardia-connector
chmod +x install.sh
./install.sh
```

Ou manualmente:

```bash
cd ~/guardia-connector
pip3 install -r requirements.txt
```

## Passo 3: Configurar as senhas das câmeras

Edite `config/config.yaml` e substitua `SENHA_DA_CAMERA_DX` pelas senhas reais:

```bash
nano config/config.yaml
```

**Senhas necessárias:**

| Câmera | IP | Serial | Senha |
|--------|-----|--------|-------|
| Portaria | 192.168.254.115 | D1 | (offline — habilitar depois) |
| Corredor | 192.168.254.206 | D2 | `SUA_SENHA_D2` |
| Recepção | 192.168.254.208 | D3 | `SUA_SENHA_D3` |
| AI IPC | 192.168.254.227 | D4 | `SUA_SENHA_D4` |
| COPA | 192.168.254.207 | D5 | `SUA_SENHA_D5` |
| Estacionamento | 192.168.254.209 | D6 | `SUA_SENHA_D6` |

## Passo 4: Testar

```bash
# Dry-run (não envia ao Supabase, apenas testa polling das câmeras)
python3 src/main.py --dry-run

# Run real (envia eventos ao Supabase)
python3 src/main.py
```

## Passo 5: Instalar como serviço systemd (recomendado)

```bash
# Editar o caminho no arquivo de serviço se necessário
sudo cp guardia-connector.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable guardia-connector
sudo systemctl start guardia-connector

# Verificar status
sudo systemctl status guardia-connector

# Ver logs em tempo real
sudo journalctl -u guardia-connector -f
```

## Configuração Atual (pré-preenchida)

O `config.yaml` já vem com:

- **Supabase URL:** `https://ycqrgrczrunvyivxfnch.supabase.co`
- **Key:** publishable key (funciona para insert + upload)
- **Connector ID:** `connector-bancada-01`
- **Poll interval:** 30 segundos
- **Heartbeat:** 60 segundos
- **Image upload:** ativado
- **Câmeras D2-D6:** habilitadas (D1 desabilitada — offline)
- **Faltando apenas:** senhas reais das câmeras

## Troubleshooting

### Câmera não responde

```bash
# Testar conectividade
ping 192.168.254.206

# Testar HTTP
curl http://admin:SUA_SENHA@192.168.254.206/cgi-bin/event/getSearch.cgi
```

### Supabase retorna erro 401

- Verificar se a publishable key está correta no config.yaml
- Se precisar service_role key (bypass RLS), pegar em:
  `supabase.com/dashboard/project/ycqrgrczrunvyivxfnch/settings/api`

### Connector reinicia sozinho

- Verificar logs: `sudo journalctl -u guardia-connector --since "1 hour ago"`
- Pode ser falta de memória no Raspberry Pi Zero — usar modelo 3B+ ou superior

## Arquitetura

```
Câmeras P6S (LAN)          Connector (Pi/PC)           Supabase (Cloud)
192.168.254.206  ─────┐
192.168.254.207  ─────┤  HTTP polling (30s)  ──────►  camera_events
192.168.254.208  ─────┤  Image upload        ──────►  Storage event-images
192.168.254.227  ─────┤  Heartbeat (60s)     ──────►  connector_status
192.168.254.209  ─────┘
                                                    ▼
                                              GuardIA Dashboard
                                              (browser realtime)
```
