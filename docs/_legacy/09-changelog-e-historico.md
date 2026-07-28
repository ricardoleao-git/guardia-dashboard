# GuardIA Dashboard — Changelog e Histórico

**Versão:** 1.0.0 | **Última atualização:** 22 Jul 2026

## Versão Atual: 1.0.0 (22 Jul 2026)

### Resumo

Versão inicial do GuardIA Dashboard com 13 módulos implementados, streaming ao vivo, autenticação de operadores, auditoria completa e integração Supabase.

### Features Implementadas

#### Monitoramento

| Feature | Descrição | Arquivos |
|---------|-----------|----------|
| Dashboard principal | Métricas, mosaico, timeline, eventos recentes | `Dashboard.tsx`, `StatsBar.tsx`, `CameraMosaic.tsx`, `Timeline24h.tsx` |
| Eventos com filtros | Grid responsivo, categorias, busca, presets | `EventCard.tsx`, `SmartSearch.tsx`, `SearchPresets.tsx`, `CategoryTabs.tsx` |
| Visualizador de imagens | Modal full-screen com anotações e payload JSON | `ImageViewer.tsx`, `AnnotationOverlay.tsx` |
| Playback | Reprodução por canal e data com timeline 24h | `Playback.tsx` |
| Câmeras ao vivo | Streaming WebRTC/HLS/MJPEG/Snapshot com fallback | `LiveStream.tsx`, `CameraMosaic.tsx`, `CameraSnapshot.tsx`, `CameraGrid.tsx` |
| Alertas | Alertas críticos com notificações no header | `useCriticalAlerts.ts`, `critical-events.ts` |
| Exportação | Relatórios em CSV e PDF/HTML | `ExportReports.tsx` |

#### Gestão

| Feature | Descrição | Arquivos |
|---------|-----------|----------|
| Dispositivos | Gerenciamento de câmeras IP, status, largura de banda | `DeviceManagement.tsx` |
| Funções AI | Configuração de 8 funções inteligentes por canal | `AIConfig.tsx` |
| Biblioteca de Rostos | Cadastro e gestão de rostos | `FaceLibrary.tsx` |
| Biblioteca de Veículos | Cadastro e gestão de veículos | `VehicleManagement.tsx` |
| Config. Sistema | Rede, sistema, armazenamento do NVR | `SystemConfig.tsx` |
| Operadores | Administração de usuários com roles e convite | `UserAdmin.tsx` |
| Auditoria | Rastreabilidade de ações dos operadores | `AuditLog.tsx`, `useAuditLog.ts` |
| Config. GuardIA | Status do Connector, integração Supabase | `Dashboard.tsx` (SettingsView) |

#### Infraestrutura

| Feature | Descrição | Arquivos |
|---------|-----------|----------|
| Autenticação | Supabase Auth + modo demo + roles | `AuthContext.tsx`, `Login.tsx`, `App.tsx` |
| Tema dark/light | ThemeProvider com dark como default | `ThemeContext.tsx`, `index.css` |
| Sidebar fixa | Navegação com seções e footer de status | `Sidebar.tsx` |
| Header com user menu | Filtros, notificações, relógio, perfil | `Header.tsx`, `MobileHeader.tsx` |
| Supabase integration | Cliente, funções, realtime | `supabase.ts`, `useEvents.ts` |
| Mock data | Dados mockados para modo demo | `mock-data.ts` |
| Design system | OKLCH, Plus Jakarta Sans, animações | `index.css`, `ideas.md` |
| Google Maps | Integração com Maps API | `Map.tsx` |

#### Banco de Dados

| Migration | Descrição | Arquivo |
|-----------|-----------|---------|
| `camera_events` | Tabela principal de eventos (criada pelo Connector) | — |
| `profiles` | Tabela de perfis de operadores + RLS + triggers | `db/add_auth_profiles.sql` |
| `annotations` | Coluna de anotações em `camera_events` | `db/add_annotations_column.sql` |
| `search_presets` | Tabela de presets de busca compartilhados | `db/add_search_presets.sql` |
| `audit_logs` | Tabela de auditoria + view + indexes | `db/add_audit_logs.sql` |

### Design

- **Estilo:** Enterprise SaaS Clean (Linear/Vercel/Supabase inspired)
- **Tema:** Dark mode permanente com azul Zênite como primary
- **Fontes:** Plus Jakarta Sans (display), Inter (body), JetBrains Mono (técnico)
- **Cores:** OKLCH via Tailwind CSS 4
- **Animações:** Framer Motion + CSS transitions com easings custom

### Checkpoints

| Versão | Data | Descrição |
|--------|------|-----------|
| `10ad3c4a` | 22 Jul 2026 | Initial scaffold (webdev_init_project) |
| `81b1c3e1` | 22 Jul 2026 | Core dashboard + all modules |
| `b00febd5` | 22 Jul 2026 | Live streaming + user admin + audit log |

### Domínios

- `guardiadash-wfhczipe.manus.space` — Manus autoscale
- `guardia-vms.zenitetech.com` — Custom domain Zênite Tech

## Histórico de Decisões

### Decisão 1: Dark Mode como Default

**Contexto:** O dashboard é usado em salas de monitoramento 24/7.
**Decisão:** Dark mode permanente com fundo azul-escuro profundo.
**Razão:** Reduz fadiga visual em uso prolongado, alinha com estética de NOC/security ops.

### Decisão 2: Wouter em vez de React Router

**Contexto:** Projeto static frontend sem necessidade de SSR.
**Decisão:** Usar Wouter (3KB) em vez de React Router (20KB+).
**Razão:** Bundle menor, API simples, suficiente para as rotas necessárias.

### Decisão 3: View Routing Interno no Dashboard

**Contexto:** Navegação entre 13 módulos sem reload.
**Decisão:** Dashboard.tsx controla views via estado `activeView` em vez de rotas URL separadas.
**Razão:** Navegação instantânea, estado preservado entre views, simplicidade.

### Decisão 4: Modo Demo sem Backend

**Contexto:** Necessidade de demonstrar o produto sem infraestrutura.
**Decisão:** Detecção automática de Supabase e fallback para mock data.
**Razão:** Permite demo em qualquer ambiente, desenvolvimento sem dependências.

### Decisão 5: OKLCH em vez de HSL/HEX

**Contexto:** Tailwind CSS 4 suporta OKLCH nativamente.
**Decisão:** Usar OKLCH para todos os design tokens.
**Razão:** Melhor percepção de luminosidade, transições de cor mais naturais, padrão Tailwind 4.

### Decisão 6: 4 Protocolos de Streaming com Fallback

**Contexto:** Diferentes câmeras e infraestruturas suportam diferentes protocolos.
**Decisão:** Implementar WebRTC, HLS, MJPEG e Snapshot com fallback automático.
**Razão:** Máxima compatibilidade, sempre mostra algo mesmo se stream falha.

### Decisão 7: Auditoria com localStorage em Demo

**Contexto:** Auditoria precisa funcionar mesmo sem Supabase.
**Decisão:** Persistir últimos 50 registros em localStorage no modo demo.
**Razão:** Permite demonstrar a feature sem backend, mantém dados durante a sessão.

## Roadmap

### Próximas Features Planejadas

| Feature | Prioridade | Estimativa | Dependências |
|---------|-----------|------------|-------------|
| Comandos reversos (abrir porta) | Alta | Média | API do Connector |
| Notificações push | Alta | Baixa | Service Worker + FCM |
| Multi-tenancy | Média | Alta | Refatoração do schema |
| Integração WhatsApp | Média | Média | Meta API + Webhook |
| App mobile (Expo) | Média | Alta | React Native setup |
| Detecção de anomalias AI | Baixa | Alta | Modelo ML + pipeline |
| Dashboard analytics | Baixa | Média | Agregação de dados |
