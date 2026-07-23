# GuardIA Dashboard — Documentação Completa

**Projeto:** GuardIA Dashboard — Plataforma de Monitoramento de Segurança Inteligente  
**Empresa:** Zênite Tech  
**Versão:** 1.0.0  
**Última atualização:** 22 Jul 2026  
**Autor:** Manus AI

## Índice de Documentação

| # | Documento | Descrição |
|---|-----------|-----------|
| 01 | [Visão Geral](01-visao-geral.md) | O que é, stack, modos de operação, módulos, funcionalidades-chave |
| 02 | [Arquitetura Técnica](02-arquitetura.md) | Diagrama, estrutura de diretórios, padrões, fluxo de dados, design system |
| 03 | [Módulos e Funcionalidades](03-modulos-e-funcionalidades.md) | Detalhamento de todos os 13 módulos com features e arquivos |
| 04 | [Banco de Dados e Supabase](04-banco-de-dados-supabase.md) | Schema, migrations, RLS, realtime, storage, funções |
| 05 | [Streaming Ao Vivo](05-streaming-ao-vivo.md) | Protocolos WebRTC/HLS/MJPEG/Snapshot, fallback, configuração |
| 06 | [Autenticação, Operadores e Auditoria](06-autenticacao-operadores-auditoria.md) | Auth, roles, gestão de usuários, rastreabilidade |
| 07 | [Design System](07-design-system.md) | Paleta OKLCH, tipografia, layout, animações, componentes |
| 08 | [Guia de Desenvolvimento](08-guia-de-desenvolvimento.md) | Setup, padrões, deploy, troubleshooting |
| 09 | [Changelog e Histórico](09-changelog-e-historico.md) | Versionamento, features, decisões, roadmap |

## Como Usar Esta Documentação

### No Claude (Anthropic)

Carregue todos os arquivos `.md` da pasta `docs/` como contexto. O Claude terá visão completa do projeto para responder questões sobre arquitetura, implementação, banco de dados, design e desenvolvimento.

### No Manus

Use os arquivos como referência para continuar o desenvolvimento, adicionar features, corrigir bugs ou gerar novos módulos. O Manus pode ler os arquivos diretamente do sistema de arquivos.

### Resumo Rápido

O GuardIA Dashboard é uma SPA React 19 + TypeScript + Tailwind CSS 4 que replica e moderniza a interface de um NVR P6S. Tem 13 módulos (5 de monitoramento + 8 de gestão), streaming ao vivo com 4 protocolos, autenticação com 3 roles, auditoria completa, e integração com Supabase para dados em tempo real. Funciona em modo demo (sem backend) ou produção (com Supabase).

## Estatísticas do Projeto

| Métrica | Valor |
|---------|-------|
| Total de arquivos de código | ~70 |
| Linhas de código (src + db) | ~9.700 |
| Páginas (views) | 13 |
| Componentes customizados | 19 |
| Hooks customizados | 7 |
| Componentes UI (shadcn) | 50+ |
| Migrations SQL | 4 |
| Dependências (package.json) | 40+ |
| Domínios de produção | 2 |
