# GuardIA Connector — P6S → Supabase

Connector on-prem em Python que lê eventos das câmeras P6S via HTTP polling e envia para o Supabase em tempo real.

## Arquitetura

```
Câmeras P6S (LAN)          Connector (Raspberry Pi / PC)        Supabase (Cloud)
192.168.254.206  ─────┐
192.168.254.207  ─────┤  polling P6SHTTP (30s)  ──────────────► camera_events
192.168.254.208  ─────┤  upload imagens         ──────────────► Storage event-images
192.168.254.227  ─────┤  heartbeat (60s)        ──────────────► connector_status
192.168.254.209  ─────┘
```

## Requisitos

- Python 3.9+
- Acesso à LAN da bancada (192.168.254.x)
- Credenciais do Supabase (service_role key)

## Instalação

```bash
cd connector
pip install -r requirements.txt
cp config/config.example.yaml config/config.yaml
# Edite config/config.yaml com suas credenciais
python src/main.py
```

## Configuração

Edite `config/config.yaml`:

```yaml
supabase:
  url: https://seu-projeto.supabase.co
  service_role_key: eyJhbGciOiJIUzI1NiIsInR5cCI6...

cameras:
  - serial: "D2"
    ip: "192.168.254.206"
    model: "F4C-T"
    location: "Corredor"
    username: "admin"
    password: "sua-senha"
```

## Variáveis de Ambiente (alternativa ao config.yaml)

```bash
export SUPABASE_URL=https://seu-projeto.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=eyJ...
export P6S_DEFAULT_PASSWORD=sua-senha
```

## Estrutura

```
connector/
  src/
    main.py          ← Ponto de entrada, loop principal
    p6s_client.py    ← Cliente HTTP para câmeras P6S
    supabase_sink.py ← Envia eventos para Supabase
    image_uploader.py← Faz upload de imagens para Storage
    event_mapper.py  ← Mapeia payload P6S → schema Supabase
    config.py        ← Carrega configuração
  config/
    config.example.yaml
  logs/
  tests/
  requirements.txt
```
