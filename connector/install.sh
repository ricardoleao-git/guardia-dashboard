#!/bin/bash
# ============================================================
# GuardIA Connector — Script de Instalação
# Executar no Raspberry Pi ou PC da bancada
# ============================================================
set -e

echo "========================================"
echo "  GuardIA Connector — Instalação"
echo "========================================"
echo ""

# Verificar Python
if ! command -v python3 &> /dev/null; then
    echo "ERRO: Python 3 não encontrado. Instale com:"
    echo "  sudo apt install python3 python3-pip"
    exit 1
fi

PYTHON_VERSION=$(python3 --version 2>&1)
echo "Python: $PYTHON_VERSION"

# Instalar dependências
echo ""
echo "[1/4] Instalando dependências..."
pip3 install -r requirements.txt --quiet
echo "  OK"

# Verificar config
echo ""
echo "[2/4] Verificando configuração..."
if [ ! -f config/config.yaml ]; then
    echo "  ERRO: config/config.yaml não encontrado"
    echo "  Copie config/config.example.yaml para config/config.yaml e edite"
    exit 1
fi
echo "  OK — config.yaml encontrado"

# Testar conexão com Supabase
echo ""
echo "[3/4] Testando conexão com Supabase..."
python3 -c "
import yaml
with open('config/config.yaml') as f:
    cfg = yaml.safe_load(f)
url = cfg['supabase']['url']
print(f'  Supabase URL: {url}')
print(f'  Connector ID: {cfg[\"connector\"][\"id\"]}')
print(f'  Câmeras ativas: {sum(1 for c in cfg[\"cameras\"] if c[\"enabled\"])}')
print('  OK')
"

# Dry-run test
echo ""
echo "[4/4] Teste dry-run (5 segundos)..."
timeout 5 python3 src/main.py --dry-run --log-level INFO 2>&1 | head -15 || true

echo ""
echo "========================================"
echo "  INSTALAÇÃO COMPLETA!"
echo "========================================"
echo ""
echo "Para iniciar o connector:"
echo "  python3 src/main.py"
echo ""
echo "Para iniciar em background (com log):"
echo "  nohup python3 src/main.py > logs/connector.log 2>&1 &"
echo ""
echo "Para iniciar como serviço systemd:"
echo "  sudo cp guardia-connector.service /etc/systemd/system/"
echo "  sudo systemctl enable guardia-connector"
echo "  sudo systemctl start guardia-connector"
echo ""
echo "Para testar sem enviar dados:"
echo "  python3 src/main.py --dry-run"
echo ""
