# GuardIA Dashboard — Design System

**Versão:** 1.0.0 | **Última atualização:** 22 Jul 2026

## Filosofia de Design

O GuardIA Dashboard adota a estética **Enterprise SaaS Clean**, inspirada em Linear, Vercel Dashboard e Supabase Dashboard. O design prioriza legibilidade em monitoramento 24/7, hierarquia visual clara e feedback em tempo real.

### Princípios Core

1. **Legibilidade em primeiro lugar** — dados de segurança precisam ser lidos rapidamente, sem ambiguidade
2. **Hierarquia visual clara** — eventos recentes em destaque, informações secundárias em tons suaves
3. **Feedback em tempo real** — indicadores visuais de status instantaneamente reconhecíveis
4. **Espaçamento generoso** — cards e listas com respiro adequado para evitar fadiga visual

## Paleta de Cores (OKLCH)

O projeto usa **OKLCH** como formato de cor (Tailwind CSS 4 nativo). Todos os tokens estão em `client/src/index.css`.

### Tema Dark (Padrão)

| Token | Valor OKLCH | Hex Aprox. | Uso |
|-------|-------------|-----------|-----|
| `--background` | `oklch(0.14 0.02 260)` | `#0d111c` | Fundo principal |
| `--card` | `oklch(0.18 0.025 260)` | `#141923` | Cards e painéis |
| `--popover` | `oklch(0.18 0.025 260)` | `#141923` | Popovers e dropdowns |
| `--primary` | `oklch(0.55 0.22 255)` | `#1d4ed8` | Azul Zênite — ações, links, ativos |
| `--secondary` | `oklch(0.22 0.02 260)` | `#1c2030` | Secundário |
| `--muted` | `oklch(0.24 0.02 260)` | `#202535` | Headers de tabela, labels |
| `--accent` | `oklch(0.28 0.04 255)` | `#1e2a4a` | Hover, seleção |
| `--destructive` | `oklch(0.65 0.22 25)` | `#dc2626` | Alertas, deletar, offline |
| `--border` | `oklch(0.28 0.02 260)` | `#252a3a` | Bordas sutis |
| `--sidebar` | `oklch(0.11 0.02 260)` | `#050811` | Sidebar (mais escuro que bg) |

### Cores de Status

| Token | Cor | Uso |
|-------|-----|-----|
| `.text-status-online` | Verde `oklch(0.7 0.18 145)` | Online, ativo, sucesso |
| `.text-status-offline` | Vermelho `oklch(0.65 0.22 25)` | Offline, erro, alerta |
| `.text-status-warning` | Ambar `oklch(0.75 0.18 85)` | Syncing, pendente, warning |

### Cor de Marca

**Azul Zênite:** `#1d4ed8` / `oklch(0.55 0.22 255)` — azul profundo e tecnológico, inconfundivelmente da marca.

## Tipografia

### Fontes

| Uso | Fonte | Pesos | CDN |
|-----|-------|-------|-----|
| Display/Headings | Plus Jakarta Sans | 700, 600 | Google Fonts |
| Body | Inter | 400, 500 | Google Fonts |
| Mono (IDs, serials) | JetBrains Mono | 400 | Google Fonts |

### Hierarquia

| Nível | Tamanho | Peso | Fonte | Uso |
|-------|---------|------|-------|-----|
| H1 | 28px | 700 | Plus Jakarta Sans | Título da página |
| H2 | 20px | 600 | Plus Jakarta Sans | Título de seção |
| H3 | 16px | 600 | Plus Jakarta Sans | Subtítulo |
| Body | 14px | 400 | Inter | Texto geral |
| Caption | 12px | 500 | Inter | Labels, timestamps |
| Mono | 13px | 400 | JetBrains Mono | Serials, IDs, timestamps técnicos |

### Classes CSS

```css
.font-display { font-family: var(--font-display); }  /* Plus Jakarta Sans */
.font-mono-tech { font-family: var(--font-mono); }   /* JetBrains Mono */
```

## Layout

### Estrutura Geral

```
┌─────────────────────────────────────────────────┐
│ Sidebar (fixa, 256px)  │  Header (sticky)        │
│                        │─────────────────────────│
│  Logo                  │  Título + Filtros       │
│  Nav Monitoramento     │─────────────────────────│
│  Nav Gestão            │                         │
│                        │  Conteúdo (scrollável)  │
│  Footer Status         │                         │
└────────────────────────┴─────────────────────────┘
```

### Sidebar

- **Largura:** 256px desktop, overlay mobile
- **Sempre visível** em desktop (preferência do usuário)
- **Mobile:** overlay com botão de fechar
- **Footer:** status do Connector + modo Demo/Produção

### Header

- **Sticky** no topo da área de conteúdo
- Título e subtítulo dinâmicos por view
- Relógio em tempo real (fonte monospace)
- Notificações com badge contador
- User Menu com avatar, nome, role badge

### Grid de Eventos

- Mobile: 1 coluna
- Tablet: 2 colunas
- Desktop: 3-4 colunas
- Cards com thumbnail, badges, timestamp

### Container

```css
.container {
  width: 100%;
  margin: auto;
  padding: 0 1rem;
}
@media (min-width: 640px) { padding: 0 1.5rem; }
@media (min-width: 1024px) { padding: 0 2rem; max-width: 1600px; }
```

## Componentes Visuais

### Status Pill

Indicador compacto de status com ponto pulsante:
- Verde = online
- Vermelho = offline
- Ambar = syncing

```css
.live-dot {
  animation: live-pulse 1.5s ease-in-out infinite;
}
```

### Camera Tile

Tile de câmera no mosaico com:
- Overlay gradiente (topo e base)
- Badge LIVE vermelho pulsante
- Badge de protocolo (WebRTC/HLS/MJPEG)
- Scanline effect sutil
- Nome e serial na base
- Timestamp em tempo real

### Event Card

Card de evento com:
- Thumbnail com cantos arredondados
- Badge de tipo (azul=facial, verde=acesso, ambar=veículo)
- Badge de direção (entrada/saída)
- Nome/ID + score de match
- Timestamp relativo

### Timeline 24h

Régua horizontal 24h com blocos coloridos:
- Azul = Inteligência
- Verde = Comum
- Vermelho = Alarme
- Ambar = Movimento
- Hover expande o bloco verticalmente

## Animações

### Diretrizes

| Tipo | Duração | Easing | Quando |
|------|---------|--------|--------|
| Button press | 100-160ms | ease-out | Click |
| Tooltip | 125-200ms | ease-out | Hover |
| Dropdown | 150-250ms | ease-out | Open |
| Modal/Drawer | 200-500ms | ease-out | Open/Close |
| Event slide-in | 200ms | `cubic-bezier(0.23, 1, 0.32, 1)` | Novo evento |
| Card hover | 150ms | ease-out | Hover |
| Status pulse | 2s | ease-in-out | Infinite |
| Live indicator | 1.5s | ease-in-out | Infinite |

### Easing Custom

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
```

### Regras

- Nunca animar de `scale(0)` — usar `scale(0.95)` + `opacity: 0`
- Animar apenas `transform` e `opacity` (GPU)
- Respeitar `prefers-reduced-motion`
- Button `:active` com `transform: scale(0.97)` + 160ms ease-out

## Ícones

Biblioteca: **Lucide React** 0.453

Ícones frequentemente usados:
- `Shield` / `ShieldCheck` — segurança, admin
- `Camera` — câmeras
- `Video` — streaming
- `Bell` — notificações
- `Search` — busca
- `Download` — exportar
- `RefreshCw` — atualizar
- `CircleDot` — status online
- `AlertTriangle` — alertas
- `Crown` — role admin
- `Eye` — role viewer

## shadcn/ui

O projeto inclui 50+ componentes shadcn/ui em `client/src/components/ui/`:

| Componente | Uso |
|-----------|-----|
| `button` | Botões com variantes (default, outline, ghost, destructive) |
| `card` | Cards de conteúdo |
| `dialog` | Modais |
| `dropdown-menu` | Menus de ação |
| `select` | Dropdowns |
| `table` | Tabelas de dados |
| `tabs` | Tabs de navegação |
| `badge` | Badges de status/tipo |
| `input` | Campos de texto |
| `tooltip` | Tooltips |
| `sonner` | Toast notifications |
| `sheet` | Drawers mobile |
| `avatar` | Avatares de usuário |
| `scroll-area` | Áreas scrolláveis |
| `skeleton` | Loading states |
| `switch` | Toggles |
| `progress` | Barras de progresso |

## Logo e Branding

- **Símbolo:** Escudo estilizado com ponto de câmera integrado, em azul Zênite
- **Wordmark:** "GuardIA" em Plus Jakarta Sans 700, com "IA" em accent blue
- **Subtitle:** "NVR 5.0 AI" em cinza claro abaixo do logo
