# GuardIA Dashboard — Visão Geral

**Versão:** 1.0.0 | **Última atualização:** 22 Jul 2026 | **Autor:** Manus AI para Zênite Tech

## O que é o GuardIA Dashboard

O GuardIA Dashboard é uma plataforma web de monitoramento de segurança inteligente desenvolvida pela Zênite Tech. O sistema replica e moderniza a interface do NVR P6S, adicionando camada de IA, autenticação de operadores, auditoria de ações e streaming ao vivo de câmeras IP.

O produto é voltado para escolas, condomínios e empresas que necessitam de monitoramento 24/7 com reconhecimento facial, controle de acesso, reconhecimento de veículos e detecção de movimento.

## Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Frontend | React | 19.2 |
| Linguagem | TypeScript | 5.6 |
| Estilização | Tailwind CSS | 4.1 |
| Componentes UI | shadcn/ui + Radix UI | — |
| Roteamento | Wouter | 3.3 |
| Ícones | Lucide React | 0.453 |
| Animações | Framer Motion | 12.23 |
| Gráficos | Recharts | 2.15 |
| Backend/DB | Supabase (PostgreSQL + Auth + Storage + Realtime) | — |
| Build | Vite | 7.1 |
| Package Manager | pnpm | 10.4 |
| Deploy | Manus WebDev (Autoscale) | — |

## Domínios de Produção

- **guardiadash-wfhczipe.manus.space** — domínio Manus
- **guardia-vms.zenitetech.com** — domínio customizado Zênite Tech

## Modos de Operação

O sistema detecta automaticamente se o Supabase está configurado via variáveis de ambiente (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`):

| Modo | Condição | Comportamento |
|------|----------|---------------|
| **Demo** | Sem Supabase configurado | Dados mockados, atualização a cada 5s, localStorage para presets e auditoria, sem login obrigatório |
| **Produção** | Supabase configurado | Dados reais via Realtime, autenticação obrigatória, persistência em PostgreSQL, Storage para mídia |

## Arquitetura de Dados

O fluxo de dados do Connector on-prem para o Dashboard segue este caminho:

1. **Câmera IP P6S** detecta evento (rosto, veículo, acesso, movimento) e envia via HTTP para o Connector
2. **Connector on-prem** salva no SQLite local, responde ACK imediato e sincroniza com Supabase (Storage para imagens + PostgreSQL para metadados)
3. **Dashboard** recebe o evento via Supabase Realtime subscription e exibe em tempo real

## Módulos Implementados

### Monitoramento

| Módulo | Descrição | Status |
|--------|-----------|--------|
| **Dashboard** | Visão geral com métricas, mosaico de câmeras ao vivo, timeline 24h e eventos recentes | Implementado |
| **Eventos** | Grid responsivo com thumbnails, filtros por câmera/tipo/busca, categorias tabuladas | Implementado |
| **Playback** | Reprodução de gravações por canal e data com timeline colorida 24h | Implementado |
| **Câmeras** | Mosaico de câmeras com streaming ao vivo (WebRTC/HLS/MJPEG/Snapshot) | Implementado |
| **Alertas** | Alertas de segurança e anomalias detectadas com priorização | Implementado |

### Gestão

| Módulo | Descrição | Status |
|--------|-----------|--------|
| **Dispositivos** | Gerenciamento de câmeras IP com status, IP, protocolo, largura de banda | Implementado |
| **Funções AI** | Configuração de 8 funções inteligentes por canal (movimento, cerca, rosto, etc.) | Implementado |
| **Biblioteca de Rostos** | Cadastro e gestão de rostos para reconhecimento facial | Implementado |
| **Biblioteca de Veículos** | Cadastro e gestão de veículos para reconhecimento de placas | Implementado |
| **Config. Sistema** | Rede, sistema, armazenamento do NVR, portas RTSP/HTTP | Implementado |
| **Operadores** | Administração de usuários com roles (admin/operator/viewer), convite, revogação | Implementado |
| **Auditoria** | Rastreabilidade completa de ações dos operadores no sistema | Implementado |
| **Config. GuardIA** | Status do Connector, integração Supabase, modo demo/produção | Implementado |

## Funcionalidades-Chave

### Streaming Ao Vivo

O componente `LiveStream` suporta 4 protocolos de transporte com fallback automático:

1. **WebRTC** — latência ~200ms, preferencial quando backend MediaServer disponível
2. **HLS** (.m3u8) — latência ~3-5s, compatível com maioria dos browsers
3. **MJPEG** — latência ~1s, via HTTP multipart stream
4. **Snapshot HTTP** — fallback com refresh periódico configurável

### Autenticação e Roles

O sistema implementa 3 níveis de acesso:

| Role | Permissões |
|------|-----------|
| **Admin** | Acesso total: gerencia operadores, configurações, câmeras, auditoria, exportação |
| **Operator** | Operação diária: eventos ao vivo, anotações, bibliotecas, presets de busca |
| **Viewer** | Somente leitura: visualiza eventos e câmeras sem editar |

### Auditoria de Operadores

Todas as ações relevantes são rastreadas:

- Anotações criadas/editadas/limpas em eventos
- Presets de busca salvos/deletados/aplicados
- Exportação de relatórios (PDF/CSV)
- Ações em lote em dispositivos
- Convite/remoção/edição de operadores
- Alterações de configuração do sistema
- Login/logout e conexões de stream

## Próximos Passos Planejados

- Comandos reversos (abrir porta, cadastrar rosto remotamente)
- Notificações push para alertas críticos
- Multi-tenancy (múltiplas organizações)
- Integração com WhatsApp para alertas
- App mobile (React Native/Expo)
