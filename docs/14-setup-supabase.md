# Guia de Setup do Supabase — GuardIA Dashboard

## Visão Geral

O GuardIA Dashboard já está codificado para funcionar com Supabase. Quando as variáveis de ambiente não estão configuradas, o sistema usa dados mock automaticamente. Ao configurar o Supabase real, todos os dados mock são substituídos por dados reais da bancada.

## Passo a Passo (5 minutos)

### Passo 1 — Criar Projeto no Supabase

1. Acesse https://supabase.com
2. Clique em **New Project**
3. Nome: `guardia-dashboard`
4. Database Password: escolha uma senha forte (anote!)
5. Region: **South America (São Paulo)** se disponível, senão **US East**
6. Plan: **Free** (suficiente para MVP)
7. Aguarde ~2 minutos (provisionamento automático)

### Passo 2 — Configurar o Banco de Dados

1. No painel do Supabase, vá em **SQL Editor** (menu lateral esquerdo)
2. Clique em **New query**
3. Abra o arquivo `db/00_setup_complete.sql` do projeto
4. Copie TODO o conteúdo e cole no SQL Editor
5. Clique em **Run** (▶)
6. Deve aparecer "Success. No rows returned"

**O que este script cria:**
- Tabela `camera_events` (eventos de reconhecimento facial)
- Tabela `profiles` (perfis de operadores, estende auth.users)
- Tabela `search_presets` (presets de busca compartilhados)
- Tabela `audit_logs` (rastreabilidade de ações)
- Bucket `event-images` no Storage (para capturas e fotos de cadastro)
- RLS (Row Level Security) em todas as tabelas
- Realtime habilitado em `camera_events` e `search_presets`
- Triggers para auto-criar profile e updated_at

### Passo 3 — Criar Usuário Admin

1. Vá em **Authentication** → **Users** (menu lateral)
2. Clique em **Add user**
3. Email: seu email (ex: `rjll70@gmail.com`)
4. Password: defina uma senha
5. Marque **Auto Confirm User** (para não precisar validar email)
6. Clique em **Create user**

**Depois de criar o usuário:**
1. Vá em **Table Editor** → `profiles`
2. Encontre seu usuário (busque pelo email)
3. Altere o campo `role` de `operator` para `admin`
4. Preencha `full_name` com seu nome

### Passo 4 — Obter Credenciais da API

1. Vá em **Settings** → **API** (menu lateral, ícone de engrenagem)
2. Copie os seguintes valores:

| Campo | Onde | Variável |
|-------|------|----------|
| Project URL | Settings → API → Project URL | `VITE_SUPABASE_URL` |
| Anon Key | Settings → API → Project API Keys → anon public | `VITE_SUPABASE_ANON_KEY` |

### Passo 5 — Configurar no Manus

No projeto do Manus (Management UI → Settings → Secrets), adicione:

```
VITE_SUPABASE_URL = https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

Depois reinicie o servidor. O dashboard detecta as variáveis automaticamente e passa a usar dados reais.

### Passo 6 — Habilitar Realtime (opcional mas recomendado)

1. Vá em **Database** → **Replication** (menu lateral)
2. Confirme que `supabase_realtime` está ativo para as tabelas:
   - `camera_events`
   - `search_presets`
3. Se não estiver, clique no toggle para ativar

## O Que Muda ao Ativar o Supabase

| Funcionalidade | Mock (atual) | Supabase Real |
|----------------|-------------|---------------|
| Eventos | 20 eventos fake | Eventos reais da bancada (via connector) |
| Anotações | localStorage | Salvas no banco, sincronizadas |
| Presets de busca | localStorage | Compartilhados entre operadores |
| Auditoria | Mock local | Rastreabilidade real por usuário |
| Notificações | Simuladas a cada 30s | Eventos realtime do banco |
| Usuários | Lista fake | Supabase Auth + profiles |
| Imagens | Placeholders | Storage do Supabase |

## Connector On-Prem (Próxima Fase)

Para que os eventos das câmeras P6S cheguem ao Supabase, é necessário um **connector** rodando na LAN da bancada. Este connector:

1. Conecta às câmeras via P6SHTTP (portas 80/6060/6066)
2. Recebe eventos de reconhecimento facial
3. Envia para o Supabase via API REST
4. Faz upload de imagens para o Storage

**Status atual:** A ser desenvolvido (spec 07). O dashboard já está pronto para receber os dados.

## Troubleshooting

| Problema | Solução |
|----------|---------|
| "Supabase not configured" | Verificar se as 2 variáveis estão definidas |
| Dados não aparecem | Rodar `00_setup_complete.sql` no SQL Editor |
| Login não funciona | Confirmar usuário em Authentication → Users |
| Realtime não atualiza | Verificar Replication → supabase_realtime |
| Imagens não carregam | Verificar bucket `event-images` no Storage |
| RLS bloqueia leitura | Confirmar que usuário está autenticado (Auth) |
