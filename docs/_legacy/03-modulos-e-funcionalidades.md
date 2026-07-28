# GuardIA Dashboard — Módulos e Funcionalidades

**Versão:** 1.0.0 | **Última atualização:** 22 Jul 2026

## Índice de Módulos

### Monitoramento

#### 1. Dashboard (`dashboard`)

Página principal com visão geral do sistema em tempo real.

**Componentes exibidos:**
- **StatsBar:** 5 cards de métricas (total de eventos, reconhecimento facial, veículos, acessos, alertas)
- **CameraMosaic:** Grid 2x2/3x3/4x4 de câmeras ao vivo com toggle Live/Snapshot
- **Timeline24h:** Régua 24h com blocos coloridos por tipo de evento
- **EventCard (recentes):** 3 cards dos eventos mais recentes com thumbnail e badges

**Arquivos:** `Dashboard.tsx`, `StatsBar.tsx`, `CameraMosaic.tsx`, `Timeline24h.tsx`, `EventCard.tsx`

---

#### 2. Eventos (`events`)

Grid responsivo de eventos com filtros avançados.

**Funcionalidades:**
- Filtros por câmera, tipo de operador e busca textual (ID, serial, nome)
- Tabs de categoria: Todos, Reconhecimento Facial, Veículos, Controle de Acesso, Movimento, Alarmes
- Cards com thumbnail, badge de operador, direção (entrada/saída), score de match
- Click abre `ImageViewer` modal com imagem em tamanho full, payload JSON, anotações
- Presets de busca salvos (compartilhados entre operadores)
- Exportação de relatórios em CSV e PDF/HTML

**Arquivos:** `Dashboard.tsx` (view events), `EventCard.tsx`, `ImageViewer.tsx`, `AnnotationOverlay.tsx`, `SmartSearch.tsx`, `SearchPresets.tsx`, `ExportReports.tsx`, `CategoryTabs.tsx`

---

#### 3. Playback (`playback`)

Reprodução de gravações por canal e data.

**Funcionalidades:**
- Calendário para seleção de data
- Lista de canais de câmera (D1-D17) com nomes
- Filtros de tipo de gravação: Inteligência (azul), Comum (verde), Alarme (vermelho), Movimento (amarelo)
- Timeline 24h com blocos coloridos indicando tipo de gravação
- Controles de playback: skip, play/pause, stop, velocidade, captura de tela

**Arquivo:** `Playback.tsx`, `Timeline24h.tsx`

---

#### 4. Câmeras (`cameras`)

Mosaico de câmeras com streaming ao vivo.

**Protocolos suportados:**

| Protocolo | Latência | Uso | Tecnologia |
|-----------|----------|-----|------------|
| WebRTC | ~200ms | Preferencial | RTCPeerConnection + WebSocket signaling |
| HLS | ~3-5s | Compatível | .m3u8 via hls.js ou nativo (Safari) |
| MJPEG | ~1s | Fallback simples | HTTP multipart stream via `<img>` |
| Snapshot | Variável | Último recurso | HTTP GET com refresh periódico |

**Funcionalidades:**
- Grid 2x2, 3x3 ou 4x4 com toggle de layout
- Toggle Live/Snapshot por tile
- Indicador LIVE vermelho pulsante + badge de protocolo
- Overlays com serial da câmera, nome, localização e timestamp
- Scanline effect para visual NVR autêntico
- Status online/offline com contadores
- Fallback automático: WebRTC falha → tenta snapshot HTTP
- Hover revela controles: expandir e trocar protocolo

**Arquivos:** `LiveStream.tsx`, `CameraMosaic.tsx`, `CameraGrid.tsx`, `CameraSnapshot.tsx`

---

#### 5. Alertas (`alerts`)

Central de alertas de segurança e anomalias detectadas.

**Funcionalidades:**
- Alertas críticos derivados de eventos (rostos não reconhecidos, match baixo, movimento fora de horário)
- Priorização por severidade (crítico, warning, info)
- Notificações no header com badge contador
- Painel dropdown de notificações recentes

**Arquivos:** `useCriticalAlerts.ts`, `critical-events.ts`, `Header.tsx` (painel de notificações)

---

### Gestão

#### 6. Dispositivos (`devices`)

Gerenciamento de câmeras IP conectadas ao NVR.

**Funcionalidades:**
- Tabela de dispositivos com canal, status, IP, protocolo, modelo
- Métricas: número de dispositivos, largura de banda total e atual
- Adicionar canal IP personalizado (IP, protocolo P6S, portas HTTP/Comando/Vídeo)
- Ações em lote: eliminação, edição de senhas, atualização, restauração, modificar IP
- Detecção de rede para auto-descoberta de câmeras

**Arquivo:** `DeviceManagement.tsx`

---

#### 7. Funções AI (`ai-config`)

Configuração de funções inteligentes por canal de câmera.

**8 funções disponíveis:**

| # | Função | Tipo | Descrição |
|---|--------|------|-----------|
| 1 | Movimento | IPC AI | Detecção de movimento em área definida |
| 2 | Cerca eletrônica | IPC AI | Virtual fence com alerta de travessia |
| 3 | Detecção transfronteiras | IPC AI | Detecção de cruzamento de linha |
| 4 | Detecção fora do serviço | IPC AI | Movimento fora de horário configurado |
| 5 | Contagem de Pessoas | IPC AI | Contagem de pessoas em área |
| 6 | Capta de rosto | NVR AI | Captura automática de rostos |
| 7 | Comparação de rosto | NVR AI | Comparação com biblioteca de rostos |
| 8 | Análise de Modelo Grande | NVR AI | Análise avançada com LLM |

**Arquivo:** `AIConfig.tsx`

---

#### 8. Biblioteca de Rostos (`face-library`)

Cadastro e gestão de rostos para reconhecimento facial.

**Funcionalidades:**
- Lista de rostos cadastrados com foto, nome, gênero, contato
- Adicionar rosto: upload de imagem + dados cadastrais
- Editar e remover rostos
- Associação com bibliotecas (lista branca, lista negra, visitantes)

**Arquivo:** `FaceLibrary.tsx`

---

#### 9. Biblioteca de Veículos (`vehicles`)

Cadastro e gestão de veículos para reconhecimento de placas.

**Funcionalidades:**
- Lista de veículos com placa, modelo, cor, proprietário
- Adicionar/editar/remover veículos
- Associação com listas (autorizado, visitante, bloqueado)

**Arquivo:** `VehicleManagement.tsx`

---

#### 10. Config. Sistema (`system-config`)

Configurações de rede, sistema e armazenamento do NVR.

**Funcionalidades:**
- Configuração de rede: IP, máscara, gateway, DNS, portas (HTTP 80, RTSP 554/8554)
- Configuração de sistema: hostname, timezone, NTP
- Armazenamento: discos, capacidade, gravação contínua vs por evento
- Informações de hardware e versão de firmware

**Arquivo:** `SystemConfig.tsx`

---

#### 11. Operadores (`user-admin`)

Administração de usuários e níveis de acesso.

**Roles disponíveis:**

| Role | Badge | Permissões |
|------|-------|-----------|
| **Administrador** | Coroa dourada | Acesso total: gerencia operadores, configurações, câmeras, auditoria, exportação |
| **Operador** | Escudo azul | Operação diária: eventos ao vivo, anotações, bibliotecas, presets |
| **Visualizador** | Olho cinza | Somente leitura: visualiza eventos e câmeras |

**Funcionalidades:**
- Tabela de operadores com avatar, nome, email, role, status, último acesso
- Convidar operador: email + nome + role (envia link de acesso via Supabase Auth)
- Editar operador: alterar nome e role
- Desativar/reativar operador
- Revogar acesso (remover do sistema com confirmação)
- Filtro por role e busca por nome/email
- Cards explicativos de cada role com lista de permissões
- Indicador "Você" no próprio registro
- Stats cards: total, admins, operadores, visualizadores

**Arquivo:** `UserAdmin.tsx`

---

#### 12. Auditoria (`audit-log`)

Rastreabilidade completa de ações dos operadores.

**Ações rastreadas:**

| Categoria | Ações |
|-----------|-------|
| Anotações | `annotation_create`, `annotation_update`, `annotation_clear` |
| Presets | `preset_save`, `preset_delete`, `preset_apply` |
| Relatórios | `report_export` |
| Dispositivos | `device_add`, `device_delete`, `device_update`, `batch_action` |
| Usuários | `user_invite`, `user_update`, `user_delete`, `user_role_change` |
| Sistema | `config_change`, `auth_login`, `auth_logout` |
| Visualização | `camera_view`, `event_view`, `stream_connect` |

**Funcionalidades:**
- Timeline vertical com ícones coloridos por tipo de ação
- Filtros por operador, tipo de ação e busca textual
- Stats cards: total de registros, operadores ativos, últimas 24h, ações críticas
- Expandir cada registro para ver detalhes JSON completos
- Exportação CSV da auditoria filtrada
- Persistência: Supabase `audit_logs` (produção) ou localStorage (demo)

**Arquivos:** `AuditLog.tsx`, `useAuditLog.ts`

---

#### 13. Config. GuardIA (`settings`)

Configuração do Connector e integrações.

**Funcionalidades:**
- Status do Connector (online/offline, última sincronização, eventos pendentes, total)
- Indicador de modo Demo vs Produção
- Configuração do Supabase (URL, ANON KEY)
- Informações sobre o fluxo Connector → Supabase → Dashboard

**Arquivo:** `Dashboard.tsx` (view `settings` / `SettingsView`)

---

## Componentes Transversais

### ImageViewer

Modal de visualização de imagem de evento com recursos avançados:

- Imagem em tamanho full com zoom e pan
- Painel de detalhes técnicos (event_id, camera_serial, operator, timestamp, payload JSON)
- Sistema de anotações: retângulos, círculos, highlights com cores e labels
- Drawing canvas via `AnnotationOverlay`
- Salvar/carregar anotações no Supabase (coluna `annotations` em `camera_events`)
- Comparação lado-a-lado para eventos de reconhecimento facial (CaptureImage vs recognizeImage)

### Header

Barra superior sticky com:
- Título e subtítulo dinâmicos por view
- Relógio em tempo real (fonte monospace)
- Painel de notificações com badge contador
- Botões Atualizar e Exportar
- User Menu com avatar, nome, role badge e logout
- Filtros: busca textual, select de câmera, select de operador
- Contador de eventos filtrados

### Sidebar

Navegação lateral fixa com:
- Logo GuardIA + "NVR 5.0 AI"
- Seção **Monitoramento:** Dashboard, Eventos, Playback, Câmeras, Alertas
- Seção **Gestão:** Dispositivos, Funções AI, Bib. de Rostos, Bib. de Veículos, Config. Sistema, Operadores, Auditoria, Config. GuardIA
- Footer: status do Connector (online/offline + sync) e modo Demo/Produção
- Versão mobile com overlay e botão de fechar
