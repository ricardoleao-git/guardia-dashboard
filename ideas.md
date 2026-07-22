# GuardIA Dashboard - Brainstorm de Design

## Três Abordagens de Estilo

### 1. Security Command Center
**Tema:** Estética de centro de comando de segurança, escura e tecnológica.
**Intro:** Visual de monitoring profissional com dark mode, grid de câmeras, e feed de eventos em tempo real estilo NOC (Network Operations Center).
**Probabilidade:** 0.08

### 2. Clean Enterprise Light
**Tema:** Dashboard enterprise limpo e claro, inspirado em Linear/Notion.
**Intro:** Interface leve com fundo branco, sidebar escura para contraste, cards bem espaçados, e foco em legibilidade dos dados. Ideal para uso diário prolongado.
**Probabilidade:** 0.06

### 3. Modern Security Glass
**Tema:** Glassmorphism aplicado a segurança, com blur e profundidade.
**Intro:** Camadas de glassmorphism sobre um fundo gradiente sutil, cards translúcidos, e animações fluidas. Visual premium e futurista.
**Probabilidade:** 0.04

---

## Abordagem Escolhida: Clean Enterprise Light

### Design Movement
Enterprise SaaS Clean (inspirado em Linear, Vercel Dashboard, Supabase Dashboard)

### Core Principles
1. **Legibilidade em primeiro lugar:** Dados de segurança precisam ser lidos rapidamente, sem ambiguidade.
2. **Hierarquia visual clara:** Eventos recentes em destaque, informações secundárias em tons mais suaves.
3. **Feedback em tempo real:** Indicadores visuais de status (online/offline, syncing, alertas) devem ser instantaneamente reconhecíveis.
4. **Espaçamento generoso:** Cards e listas com respiro adequado para evitar fadiga visual em uso prolongado.

### Color Philosophy
- **Fundo principal:** Branco puro (`oklch(1 0 0)`) com leves tons de cinza para seções secundárias.
- **Sidebar:** Azul-escuro profundo (`oklch(0.21 0.03 240)`) para ancorar a navegação e dar contraste.
- **Accent primário:** Azul Zênite (`#1d4ed8` / `oklch(0.52 0.2 260)`) para ações, links e indicadores ativos.
- **Status colors:** Verde (`oklch(0.6 0.15 145)`) para online, Vermelho (`oklch(0.58 0.22 25)`) para alertas/offline, Ambar (`oklch(0.7 0.15 85)`) para syncing.
- **Raciocínio:** O branco reduz fadiga visual em monitoramento 24/7. O azul-escuro na sidebar cria separação clara entre navegação e conteúdo. As cores de status seguem convenções universais de segurança.

### Layout Paradigm
- **Sidebar fixa à esquerda** (sempre visível, conforme preferência do usuário), com navegação principal.
- **Área de conteúdo principal** com header sticky contendo filtros e busca.
- **Grid de eventos** em cards responsivos (1 coluna mobile, 2 tablet, 3-4 desktop).
- **Modal de visualização de imagem** em overlay full-screen.

### Signature Elements
1. **Live Event Feed:** Cards de eventos com thumbnail da imagem, timestamp, tipo de operador e serial da câmera, com animação de entrada suave.
2. **Status Pill:** Indicador compacto de status do Connector com ponto pulsante (verde = online, vermelho = offline).
3. **Camera Grid Toggle:** Alternância entre visualização de lista e grid de mosaico de câmeras.

### Interaction Philosophy
- Cliques devem ser responsivos com feedback visual imediato (scale 0.97 no active).
- Hover em cards revela ações rápidas (ver imagem, ver detalhes).
- Filtros aplicam-se instantaneamente sem reload.
- Real-time updates entram com animação de slide-in suave.

### Animation
- Entrada de novos eventos: slide-in from top com fade, 200ms ease-out.
- Hover em cards: elevação suave com shadow, 150ms.
- Modal de imagem: scale from 0.95 + fade, 200ms ease-out.
- Status indicator: pulse animation no ponto, 2s infinite.
- Filtros: transição suave de opacity nos resultados, 150ms.

### Typography System
- **Display/Headings:** "Plus Jakarta Sans" (700/600) — moderna, geométrica, profissional.
- **Body:** "Inter" (400/500) — legibilidade impecável para dados.
- **Mono (serials, IDs):** "JetBrains Mono" (400) — para dados técnicos.
- **Hierarquia:** H1 28px/700, H2 20px/600, Body 14px/400, Caption 12px/500, Mono 13px/400.

### Brand Essence
**Posicionamento:** Plataforma de monitoramento de segurança inteligente para escolas e condomínios, com IA facial e controle de acesso.
**Personalidade:** Profissional, confiável, tecnológico, acessível.

### Brand Voice
- Headlines diretas e orientadas a ação: "Eventos em Tempo Real", "Monitoramento Ativo".
- CTAs claros: "Ver Detalhes", "Filtrar", "Exportar".
- Microcopy técnico mas acessível: "Última sincronização há 2 min" em vez de "sync_timestamp: 1721673180".

### Wordmark & Logo
- Símbolo gráfico: escudo estilizado com ponto de câmera integrado, em azul Zênite.
- Logotipo: "GuardIA" em Plus Jakarta Sans 700, com o "IA" em accent blue.

### Signature Brand Color
**Azul Zênite:** `#1d4ed8` — azul profundo e tecnológico, inconfundivelmente da marca.
