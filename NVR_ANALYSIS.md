# Análise do NVR P6S — Referência para GuardIA Dashboard

## Telas Identificadas nos Screenshots (IMG_4884 a IMG_4929)

### 1. Pré-Visualizar (Preview) — IMG_4884
- Grid de câmeras com feeds ao vivo e placeholders "NVR 5.0" para canais inativos
- Sidebar esquerda com "Lista de Canais" e "Evento inteligente" (tabs)
- Lista de eventos inteligentes com cards mostrando: foto do rosto cropada, thumbnail corpo inteiro, atributos detectados (camisola, calças), score de match (ex: "89% balbino - Lista Branca"), localização e timestamp
- Modal "Adicione o rosto" com: upload de imagem, nome, gênero, número de contato, tipo de certificado, número do certificado, biblioteca de rosto
- Top bar: tabs de navegação, ícones de sistema, relógio, badge de notificações (99+)

### 2. Reproduzir (Playback) — IMG_4885
- Calendário na sidebar para seleção de data
- Lista de canais de câmera (D1-D17) com nomes: Corredor, Recepcao, AI IPC, COPA
- Filtros de tipo de gravação: Inteligência (azul), Comum (verde), Alarme (vermelho), Movimento (amarelo)
- Timeline 24h com blocos coloridos indicando tipo de gravação
- Controles de playback: skip, play/pause, stop, velocidade, captura de tela, zoom, recorte

### 3. Inteligência (Intelligence) — IMG_4886
- Configuração de função inteligente
- Cards de toggle para 8 funções AI:
  1. Movimento (IPC AI)
  2. Cerca eletrônica (IPC AI)
  3. Detecção transfronteiras (IPC AI)
  4. Detecção fora do serviço (IPC AI)
  5. Contando Pessoas (IPC AI)
  6. Capta de rosto (NVR AI)
  7. Comparação de rosto (NVR AI)
  8. Análise de Modelo Grande (NVR AI)
- Sidebar: Configuração de função, Gerenciamento da biblioteca, Gestão de veículos, Busca inteligente
- Interruptores: Reconhecimento facial IPC, NVR AI
- Canais habilitados: D02, D03, D05

### 4. Gerenciamento (Management) — IMG_4887, IMG_4888, IMG_4889
- Lista de dispositivos adicionados (6 câmeras)
- Status: Rede inacessível (vermelho) ou online (play icon azul)
- Métricas: número de dispositivos, largura de banda total (80Mbps), largura atual (13.9-16.8Mbps)
- Tabela com: canal IP, status, senha, IP, editar, atualizar, nome, protocolo (P6S), tipo, info, avançado
- Modal "Adicionar canal IP personalizado": IP, protocolo (P6S), canal, portas (HTTP 80, Comando 6060, Vídeo 6066), usuário, senha
- Botões sidebar: Adicionar personalizado, Eliminação em lote, Edição de senhas em lote, Atualização em lote, Restauração, Modificar IP em lote, Rede, Detecção de rede
- Modal de confirmação para excluir canal IP

### 5. Configuração (Configuration) — Screenshots posteriores
- Configurações de rede, sistema, armazenamento, etc.

## Padrões Visuais do NVR
- **Tema:** Dark mode (fundo #0B1A30 a #162A45)
- **Accent:** Azul brilhante (#1E6BE6) para tabs ativas, botões, seleções
- **Texto:** Branco primário, verde para status positivo, vermelho para alertas
- **Layout:** Top bar + sidebar esquerda + área principal
- **Grid de câmeras:** Mosaico com canais ativos e placeholders para inativos
- **Eventos inteligentes:** Cards com foto + atributos + score de match
- **Timeline:** Régua 24h com blocos coloridos por tipo de gravação

## O que replicar no GuardIA Dashboard
1. **Mosaico de câmeras ao vivo** (grid com feeds e placeholders)
2. **Timeline de eventos 24h** com cores por tipo (igual playback)
3. **Cards de evento inteligente** com foto cropada + atributos + score
4. **Configuração de funções AI** com toggles por câmera
5. **Gerenciamento de dispositivos** com status, IP, protocolo, largura de banda
6. **Biblioteca de rostos** (cadastrar, editar, listar)
7. **Busca inteligente** com filtros por data, canal, tipo de evento
8. **Calendário** para navegação temporal
