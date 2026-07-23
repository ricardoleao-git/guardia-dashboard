# GuardIA Dashboard — Arquitetura Técnica

**Versão:** 1.0.0 | **Última atualização:** 22 Jul 2026

## Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        AMBIENTE ON-PREM                         │
│                                                                 │
│  ┌──────────┐     HTTP      ┌──────────────┐    Sync    ┌─────┐ │
│  │ Câmeras  │ ──────────► │  Connector   │ ─────────► │ DB  │ │
│  │ IP P6S   │              │  (Python)    │            │SQL  │ │
│  │ D2-D17   │              │              │            │ite  │ │
│  └──────────┘              └──────┬───────┘            └─────┘ │
│                                    │                           │
└────────────────────────────────────┼───────────────────────────┘
                                     │
                                     │ Sync (Storage + DB)
                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE (CLOUD)                           │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐    │
│  │  PostgreSQL │  │   Storage    │  │     Realtime        │    │
│  │             │  │  (Imagens)   │  │   (WebSocket)       │    │
│  │ camera_events│ │  events_media│  │  INSERT events      │    │
│  │ profiles    │  │              │  │                     │    │
│  │ audit_logs  │  │              │  │                     │    │
│  │ search_presets│ │             │  │                     │    │
│  └─────────────┘  └──────────────┘  └─────────────────────┘    │
│         │                                      │                │
└─────────┼──────────────────────────────────────┼────────────────┘
          │                                      │
          │         Realtime WS                  │
          ▼                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GUARDIA DASHBOARD (WEB)                      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    React 19 + TypeScript                  │  │
│  │                                                          │  │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐ │  │
│  │  │ Router  │  │ Contexts │  │  Hooks   │  │   Pages   │ │  │
│  │  │ (Wouter)│  │ (Auth,   │  │ (Events, │  │ (Dashboard│ │  │
│  │  │         │  │  Theme)  │  │  Audit,  │  │  Events,  │ │  │
│  │  │         │  │          │  │  Presets)│  │  Admin...)│ │  │
│  │  └─────────┘  └──────────┘  └──────────┘  └───────────┘ │  │
│  │                                                          │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │              Componentes (shadcn/ui)                 │ │  │
│  │  │  Sidebar | Header | LiveStream | ImageViewer |       │ │  │
│  │  │  CameraMosaic | EventCard | Timeline24h | ...        │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Deploy: Manus WebDev (Autoscale Serverless)                   │
│  Build: Vite 7.1 → estático                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Estrutura de Diretórios

```
guardia-dashboard/
├── client/                     # Frontend (React SPA)
│   ├── public/                 # Config files apenas (favicon, robots.txt)
│   └── src/
│       ├── App.tsx             # Roteamento raiz + providers
│       ├── main.tsx            # Entry point
│       ├── index.css           # Design tokens + tema global
│       ├── const.ts            # Constantes compartilhadas
│       ├── components/         # Componentes reutilizáveis
│       │   ├── ui/             # shadcn/ui (50+ componentes)
│       │   ├── Sidebar.tsx     # Navegação lateral
│       │   ├── Header.tsx      # Header com filtros, busca, user menu
│       │   ├── LiveStream.tsx  # Streaming WebRTC/HLS/MJPEG/Snapshot
│       │   ├── CameraMosaic.tsx# Grid de câmeras ao vivo
│       │   ├── ImageViewer.tsx # Modal de visualização + anotações
│       │   ├── AnnotationOverlay.tsx # Canvas de drawing de anotações
│       │   ├── EventCard.tsx   # Card individual de evento
│       │   ├── StatsBar.tsx    # Cards de métricas
│       │   ├── Timeline24h.tsx # Timeline colorida 24h
│       │   ├── SmartSearch.tsx # Busca inteligente com filtros
│       │   ├── SearchPresets.tsx # Presets de busca salvos
│       │   ├── ExportReports.tsx # Exportação CSV/PDF
│       │   ├── CategoryTabs.tsx# Tabs de categoria de eventos
│       │   ├── CameraGrid.tsx  # Grid de câmeras (lista)
│       │   ├── CameraSnapshot.tsx # Snapshot de câmera
│       │   ├── MobileHeader.tsx# Header mobile
│       │   ├── Map.tsx         # Google Maps integration
│       │   ├── ErrorBoundary.tsx
│       │   └── ManusDialog.tsx
│       ├── contexts/
│       │   ├── AuthContext.tsx # Auth + profile + role + isAdmin
│       │   └── ThemeContext.tsx# Dark/light theme
│       ├── hooks/
│       │   ├── useEvents.ts        # Eventos + connector status
│       │   ├── useAuditLog.ts      # Auditoria de operadores
│       │   ├── useSearchPresets.ts # Presets de busca
│       │   ├── useCriticalAlerts.ts# Alertas críticos
│       │   ├── useMobile.tsx       # Detecção mobile
│       │   ├── useComposition.ts   # Composição de handlers
│       │   └── usePersistFn.ts     # Persistência de funções
│       ├── lib/
│       │   ├── types.ts        # Interfaces TypeScript
│       │   ├── mock-data.ts    # Dados mockados (demo mode)
│       │   ├── supabase.ts     # Cliente Supabase + funções
│       │   ├── format.ts       # Formatação de data/tempo
│       │   ├── critical-events.ts # Lógica de alertas
│       │   └── utils.ts        # Utilities (cn, etc.)
│       └── pages/
│           ├── Dashboard.tsx       # Shell principal + view routing
│           ├── Login.tsx           # Tela de login
│           ├── DeviceManagement.tsx# Gestão de dispositivos
│           ├── AIConfig.tsx        # Configuração de funções AI
│           ├── FaceLibrary.tsx     # Biblioteca de rostos
│           ├── VehicleManagement.tsx# Biblioteca de veículos
│           ├── Playback.tsx        # Reprodução de gravações
│           ├── SystemConfig.tsx    # Config. sistema/rede/NVR
│           ├── UserAdmin.tsx       # Administração de operadores
│           ├── AuditLog.tsx        # Auditoria de ações
│           ├── Home.tsx            # Landing page
│           └── NotFound.tsx        # 404
├── server/                    # Placeholder (static project)
│   └── index.ts
├── shared/                    # Constantes compartilhadas
│   └── const.ts
├── db/                        # Migrations SQL Supabase
│   ├── add_auth_profiles.sql  # Tabela profiles + RLS + triggers
│   ├── add_audit_logs.sql     # Tabela audit_logs + RLS + indexes
│   ├── add_annotations_column.sql # Coluna annotations em camera_events
│   └── add_search_presets.sql # Tabela search_presets + RLS
├── docs/                      # Documentação do projeto
├── package.json
├── vite.config.ts
├── tsconfig.json
├── components.json            # Config shadcn/ui
└── ideas.md                   # Brainstorm de design
```

## Padrões Arquiteturais

### Roteamento de Views Internas

O `Dashboard.tsx` atua como shell principal e roteia entre views internas via estado `activeView` (não via URL). Isso permite navegação instantânea sem reload. As rotas URL (`/`, `/devices`, etc.) no `App.tsx` são usadas para acesso direto e deep linking, mas internamente o Dashboard controla qual módulo exibir.

### Context Providers

```
App.tsx
└── ErrorBoundary
    └── ThemeProvider (dark default)
        └── AuthProvider (user, profile, role, isDemoMode, isAdmin)
            └── TooltipProvider
                └── Router (Wouter)
                    └── Dashboard / Login / 404
```

### Fluxo de Dados

| Hook | Origem dos Dados | Demo Mode | Produção |
|------|-----------------|-----------|----------|
| `useEvents` | Eventos + connector status | Mock + polling 5s | Supabase Realtime INSERT |
| `useAuditLog` | Logs de auditoria | localStorage + mock | Tabela `audit_logs` |
| `useSearchPresets` | Presets de busca | localStorage | Tabela `search_presets` |
| `useCriticalAlerts` | Alertas prioritários | Derivado de mock events | Derivado de eventos reais |
| `useConnectorStatus` | Status do connector | Mock com refresh | Supabase `connector_status` |

### Design System

O projeto usa **OKLCH** como formato de cor (Tailwind CSS 4 nativo). Os design tokens estão em `client/src/index.css`:

- **Background:** `oklch(0.14 0.02 260)` — azul-escuro profundo
- **Card:** `oklch(0.18 0.025 260)` — levemente mais claro que bg
- **Primary:** `oklch(0.55 0.22 255)` — azul Zênite brilhante
- **Destructive:** `oklch(0.65 0.22 25)` — vermelho de alerta
- **Border:** `oklch(0.28 0.02 260)` — sutil azul-cinza

Fontes: **Plus Jakarta Sans** (display), **Inter** (body), **JetBrains Mono** (dados técnicos).

### Tratamento de Erros

- `ErrorBoundary` envolve toda a aplicação
- Fallback automático de stream (WebRTC → HLS → MJPEG → Snapshot)
- Supabase opcional — app funciona em modo demo sem backend
- Toast notifications via Sonner para feedback de ações
