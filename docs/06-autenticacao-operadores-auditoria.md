# GuardIA Dashboard — Autenticação, Operadores e Auditoria

**Versão:** 1.0.0 | **Última atualização:** 22 Jul 2026

## Visão Geral

O GuardIA Dashboard implementa um sistema completo de autenticação, gestão de operadores e auditoria de ações. O sistema usa Supabase Auth como provedor de identidade, com tabela `profiles` para dados adicionais e `audit_logs` para rastreabilidade.

## Autenticação

### AuthContext

O `AuthContext` (`client/src/contexts/AuthContext.tsx`) gerencia o estado de autenticação da aplicação:

| Propriedade | Tipo | Descrição |
|-------------|------|-----------|
| `user` | `User \| null` | Usuário autenticado do Supabase Auth |
| `profile` | `Profile \| null` | Profile do usuário (nome, role, status) |
| `loading` | `boolean` | Carregando estado inicial |
| `isDemoMode` | `boolean` | True quando Supabase não configurado |
| `isAdmin` | `boolean` | True quando role === 'admin' |
| `signIn(email, password)` | `function` | Login via Supabase Auth |
| `signOut()` | `function` | Logout |

### Fluxo de Autenticação

```
App.tsx
  └── AuthProvider
      └── ProtectedRoute
          ├── loading? → Spinner
          ├── isDemoMode || user? → Component
          └── sem user? → Redirect /login
```

### Modo Demo

Quando `isDemoMode` é `true` (Supabase não configurado):
- Login é opcional — dashboard acessível diretamente
- Usuário demo: "Demo Admin" com role admin
- Tela de login mostra aviso "Modo Demo — Dados mockados"
- Botão "Entrar em modo demo" disponível

### Tela de Login

A página `Login.tsx` oferece:
- Campos email + senha
- Botão "Entrar"
- Botão "Entrar em modo demo" (quando aplicável)
- Aviso visual de modo demo vs produção
- Validação de campos obrigatórios

## Gestão de Operadores

### Página: UserAdmin (`user-admin`)

A página de administração de operadores permite gerenciar todos os usuários do sistema.

### Modelo de Dados

```typescript
type UserRole = 'admin' | 'operator' | 'viewer';
type UserStatus = 'active' | 'invited' | 'disabled';

interface OperatorUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  last_sign_in_at: string | null;
  created_at: string;
}
```

### Roles e Permissões

| Role | Badge Visual | Permissões |
|------|-------------|-----------|
| **Admin** | Coroa dourada | Gerencia operadores (convite, editar, desativar, revogar), altera configurações do sistema, acessa auditoria, exporta relatórios, gerencia dispositivos e câmeras |
| **Operator** | Escudo azul | Opera eventos (visualiza, anota), usa bibliotecas de rostos e veículos, cria e aplica presets de busca, visualiza câmeras ao vivo |
| **Viewer** | Olho cinza | Somente visualização: eventos, câmeras, timeline. Não pode editar, anotar ou exportar |

### Funcionalidades da Página

**Tabela de Operadores:**
- Avatar com iniciais, nome, email
- Badge de role com ícone e cor
- Badge de status (Ativo=verde, Convidado=ambar, Desativado=cinza)
- Último acesso (relativo: "há 2 min", "nunca")
- Data de criação
- Indicador "Você" no próprio registro
- Menu de ações por linha (editar, desativar/reativar, revogar)

**Modal de Convite:**
- Campos: email, nome completo, role (select)
- Validação de email obrigatório
- Em produção: invoca Supabase Auth para enviar convite por email
- Em demo: adiciona à lista mock com status "invited"

**Modal de Edição:**
- Editar nome completo
- Editar role (select com 3 opções)
- Salvar aplica mudanças no Supabase ou na lista mock

**Desativar/Reativar:**
- Toggle de status entre active e disabled
- Desativado não pode fazer login
- Confirmação antes da ação

**Revogar Acesso:**
- Remove o operador do sistema
- Dialog de confirmação com aviso de irreversibilidade
- Em produção: remove profile e desabilita user no Auth

**Filtros e Busca:**
- Busca por nome ou email
- Filtro por role (todos, admin, operator, viewer)

**Stats Cards:**
- Total de operadores
- Administradores
- Operadores ativos
- Visualizadores

### Persistência

| Modo | Origem | Escrita |
|------|--------|---------|
| Demo | Lista mock em memória | Mutação local (não persiste após reload) |
| Produção | Tabela `profiles` no Supabase | UPDATE/INSERT/DELETE via Supabase client |

## Auditoria de Operadores

### Hook: useAuditLog

O hook `useAuditLog` (`client/src/hooks/useAuditLog.ts`) gerencia o registro e consulta de ações de auditoria.

### Modelo de Dados

```typescript
interface AuditLogEntry {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  action: string;          // ex: 'annotation_create'
  resource_type: string;   // ex: 'event'
  resource_id: string;
  details: Record<string, any>;
  created_at: string;      // ISO timestamp
}
```

### Taxonomia de Ações

| Categoria | Ação | Ícone | Cor |
|-----------|------|-------|-----|
| Anotações | `annotation_create` | Pencil | Azul |
| Anotações | `annotation_update` | Pencil | Azul |
| Anotações | `annotation_clear` | Eraser | Ambar |
| Presets | `preset_save` | Bookmark | Verde |
| Presets | `preset_delete` | Trash | Vermelho |
| Presets | `preset_apply` | Filter | Azul |
| Relatórios | `report_export` | Download | Verde |
| Dispositivos | `device_add` | Plus | Verde |
| Dispositivos | `device_delete` | Trash | Vermelho |
| Dispositivos | `device_update` | Settings | Azul |
| Dispositivos | `batch_action` | Layers | Ambar |
| Usuários | `user_invite` | UserPlus | Verde |
| Usuários | `user_update` | Edit | Azul |
| Usuários | `user_delete` | Trash | Vermelho |
| Usuários | `user_role_change` | Shield | Ambar |
| Sistema | `config_change` | Settings | Ambar |
| Auth | `auth_login` | LogIn | Verde |
| Auth | `auth_logout` | LogOut | Cinza |
| Visualização | `camera_view` | Camera | Azul |
| Visualização | `event_view` | Eye | Azul |
| Visualização | `stream_connect` | Video | Verde |

### Página: AuditLog (`audit-log`)

**Funcionalidades:**
- Timeline vertical com ícones coloridos por tipo de ação
- Cada entrada mostra: avatar do operador, nome, ação, recurso, timestamp relativo
- Expandir entrada revela detalhes JSON completos
- Filtros: por operador (select), por tipo de ação (select), busca textual
- Stats cards: total de registros, operadores ativos, últimas 24h, ações críticas
- Exportação CSV da auditoria filtrada
- Scroll automático para carregar mais registros

### Persistência

| Modo | Origem | Escrita | Limite |
|------|--------|---------|--------|
| Demo | localStorage + mock seed | localStorage (últimos 50) | 50 registros |
| Produção | Tabela `audit_logs` no Supabase | INSERT via Supabase client | Ilimitado |

### Como Registrar uma Ação

```typescript
import { useAuditLog } from '@/hooks/useAuditLog';

function MyComponent() {
  const { logAction } = useAuditLog();

  const handleSaveAnnotation = async (eventId, annotations) => {
    await saveAnnotations(eventId, annotations);
    logAction({
      action: 'annotation_create',
      resource_type: 'event',
      resource_id: eventId,
      details: { count: annotations.length, types: annotations.map(a => a.type) },
    });
  };
}
```

## SQL Migrations

### `db/add_auth_profiles.sql`

Cria tabela `profiles` com:
- RLS: leitura para autenticados, escrita apenas para admins
- Trigger: cria profile automaticamente quando novo usuário se cadastra no Auth
- Função `is_admin()`: verifica se usuário atual é admin

### `db/add_audit_logs.sql`

Cria tabela `audit_logs` com:
- RLS: leitura e escrita para autenticados
- Index em `created_at` (desc), `user_id`, `action`
- View `audit_logs_with_profiles` para join com tabela profiles

### Ordem de Execução

1. `add_auth_profiles.sql` — profiles + RLS + triggers
2. `add_audit_logs.sql` — audit_logs + view
