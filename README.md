# GuardIA Dashboard

Dashboard web responsivo para monitoramento de eventos de câmeras P6S com integração Supabase.

## Stack

- **React 19** + **TypeScript** + **Tailwind CSS 4**
- **shadcn/ui** para componentes
- **Supabase JS** para dados em tempo real
- **Wouter** para roteamento
- **Lucide Icons** + **Framer Motion**

## Funcionalidades

### Implementadas

- **Dashboard** com estatísticas em tempo real (total de eventos, reconhecimento facial, veículos, acessos, alertas)
- **Eventos** em grid responsivo com thumbnails, badges de operador e direção
- **Visualizador de Imagem** em modal com detalhes técnicos completos e payload JSON
- **Filtros** por câmera, tipo de operador e busca textual
- **Câmeras** com grid de dispositivos, status online/offline e localização
- **Alertas** (placeholder para futura implementação)
- **Configurações** com status do Connector e integração Supabase
- **Sidebar** fixa com indicador de status do Connector e modo Demo/Conectado
- **Mock data** para desenvolvimento sem Supabase configurado
- **Realtime** via Supabase subscriptions (quando configurado)

### Modo Demo vs Produção

O dashboard detecta automaticamente se o Supabase está configurado:

- **Modo Demo (sem Supabase):** Usa dados mockados que se atualizam a cada 5 segundos. Ideal para desenvolvimento e demonstrações.
- **Modo Produção (com Supabase):** Busca eventos reais da tabela `camera_events` e recebe novos eventos via realtime subscription.

## Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

### Schema do Supabase

Execute o script `db/supabase_schema.sql` (do Connector) no SQL Editor do Supabase para criar:

- Tabela `camera_events`
- Bucket `events_media` no Storage

### Desenvolvimento

```bash
pnpm install
pnpm dev
```

### Build

```bash
pnpm build
```

## Estrutura de Arquivos

```
client/src/
  components/
    Sidebar.tsx          # Navegação lateral fixa
    Header.tsx           # Header com filtros e busca
    StatsBar.tsx         # Cards de estatísticas
    EventCard.tsx        # Card individual de evento
    ImageViewer.tsx      # Modal de visualização de imagem
    CameraGrid.tsx       # Grid de câmeras
    ui/                  # Componentes shadcn/ui
  pages/
    Dashboard.tsx        # Página principal com todas as views
  hooks/
    useEvents.ts         # Hook para buscar eventos (mock ou Supabase)
  lib/
    types.ts             # Tipos TypeScript
    mock-data.ts         # Dados mockados para desenvolvimento
    supabase.ts          # Cliente Supabase e funções de fetch
    format.ts            # Funções de formatação (data, tempo)
```

## Integração com Connector On-Prem

O dashboard consome dados que o Connector on-prem sincroniza para o Supabase. O fluxo é:

1. **Câmera P6S** envia evento via HTTP para o Connector
2. **Connector** salva no SQLite local e responde ACK
3. **Connector** sincroniza com Supabase (Storage + PostgreSQL)
4. **Dashboard** recebe o evento via realtime subscription

## Próximos Passos

- [ ] Autenticação de usuários
- [ ] Exportação de relatórios em PDF
- [ ] Notificações push para alertas críticos
- [ ] Visualização ao vivo de mosaico de câmeras
- [ ] Comandos reversos (abrir porta, cadastrar rosto)
- [ ] Multi-tenancy (múltiplas organizações)
