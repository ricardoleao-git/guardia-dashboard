# GuardIA Dashboard — Guia de Desenvolvimento

**Versão:** 1.0.0 | **Última atualização:** 22 Jul 2026

## Setup Inicial

### Pré-requisitos

- Node.js 22+
- pnpm 10+
- Supabase project (opcional para modo demo)

### Instalação

```bash
# Clonar o repositório
git clone <repo-url> guardia-dashboard
cd guardia-dashboard

# Instalar dependências
pnpm install

# Configurar ambiente (opcional)
cp .env.example .env
# Editar .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

# Iniciar dev server
pnpm dev
```

### Scripts Disponíveis

| Script | Comando | Descrição |
|--------|---------|-----------|
| `dev` | `vite --host` | Servidor de desenvolvimento com HMR |
| `build` | `vite build && esbuild server/index.ts ...` | Build de produção |
| `start` | `NODE_ENV=production node dist/index.js` | Servidor de produção |
| `preview` | `vite preview --host` | Preview do build |
| `check` | `tsc --noEmit` | Verificação de tipos TypeScript |
| `format` | `prettier --write .` | Formatar código |

## Estrutura de Arquivos

### Onde Colocar Cada Tipo de Arquivo

| Tipo | Local | Exemplo |
|------|-------|---------|
| Páginas | `client/src/pages/` | `Dashboard.tsx`, `UserAdmin.tsx` |
| Componentes reutilizáveis | `client/src/components/` | `LiveStream.tsx`, `Header.tsx` |
| Componentes UI (shadcn) | `client/src/components/ui/` | `button.tsx`, `dialog.tsx` |
| Hooks customizados | `client/src/hooks/` | `useEvents.ts`, `useAuditLog.ts` |
| Contexts | `client/src/contexts/` | `AuthContext.tsx`, `ThemeContext.tsx` |
| Utilitários | `client/src/lib/` | `supabase.ts`, `format.ts`, `types.ts` |
| Migrations SQL | `db/` | `add_audit_logs.sql` |
| Assets estáticos | `/home/ubuntu/webdev-static-assets/` | Logos, imagens (via manus-upload-file) |
| Config files | `client/public/` | `favicon.ico`, `robots.txt` |

### Convenções de Nomenclatura

- **Componentes:** PascalCase (`LiveStream.tsx`, `CameraMosaic.tsx`)
- **Hooks:** camelCase com prefixo `use` (`useEvents.ts`, `useAuditLog.ts`)
- **Páginas:** PascalCase (`UserAdmin.tsx`, `AuditLog.tsx`)
- **Utils:** camelCase (`format.ts`, `mock-data.ts`)
- **Migrations:** snake_case com prefixo `add_` (`add_audit_logs.sql`)

## Padrões de Código

### Imports

```typescript
// 1. React/hooks
import { useState, useEffect, useCallback } from "react";

// 2. Third-party
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Shield, Camera } from "lucide-react";

// 3. UI components (shadcn)
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// 4. Custom components
import { LiveStream } from "@/components/LiveStream";
import { Sidebar } from "@/components/Sidebar";

// 5. Hooks
import { useEvents } from "@/hooks/useEvents";
import { useAuditLog } from "@/hooks/useAuditLog";

// 6. Lib/utils
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { CameraEvent, FilterState } from "@/lib/types";
import { cn } from "@/lib/utils";
```

### Alias `@/`

O projeto usa `@/` como alias para `client/src/`:

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./client/src/*"]
    }
  }
}
```

### Tipos TypeScript

Tipos centralizados em `client/src/lib/types.ts`:

```typescript
export interface CameraEvent {
  event_id: string;
  camera_serial: string;
  operator: string;
  timestamp: string;
  payload: EventPayload;
  image_url?: string;
  annotations?: Annotation[];
}

export interface FilterState {
  cameraSerial: string | null;
  operator: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  search: string | null;
}
```

### Padrão de Hook com Supabase + Demo

Todos os hooks seguem o mesmo padrão de dual-mode:

```typescript
export function useCustomData() {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (isSupabaseConfigured) {
      // Produção: buscar do Supabase
      fetchData().then(setData);
      // Inscrever realtime
      const unsub = subscribe(callback);
      return unsub;
    } else {
      // Demo: usar mock + polling
      setData(mockData);
      const interval = setInterval(() => {
        setData(generateMockData());
      }, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  return { data };
}
```

### Adicionando Nova Página/View

1. Criar arquivo em `client/src/pages/NovaPagina.tsx`
2. Importar em `Dashboard.tsx` e adicionar no `viewConfig`
3. Adicionar item na sidebar em `Sidebar.tsx`
4. Adicionar rota em `App.tsx` (se acesso direto por URL)

### Adicionando Nova Migration SQL

1. Criar arquivo em `db/add_nova_tabela.sql`
2. Incluir `CREATE TABLE IF NOT EXISTS`, RLS policies, indexes
3. Documentar colunas e propósito
4. Executar no SQL Editor do Supabase

## Deploy

### Manus WebDev (Autoscale)

O projeto é deployado automaticamente via Manus WebDev:

1. `webdev_save_checkpoint` cria um checkpoint
2. Auto-publish está habilitado — checkpoint = publish
3. Domínios: `guardiadash-wfhczipe.manus.space` e `guardia-vms.zenitetech.com`

### Build Manual

```bash
pnpm build
# Output: dist/ (estático + server)
```

### Variáveis de Ambiente de Produção

Configurar via Management UI (Settings > Secrets):

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `VITE_SUPABASE_URL` | Não (demo sem ela) | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Não | Anon key do Supabase |

Variáveis automáticas (injetadas pelo Manus):
- `BUILT_IN_FORGE_API_KEY`, `BUILT_IN_FORGE_API_URL`
- `JWT_SECRET`, `OAUTH_SERVER_URL`
- `VITE_APP_ID`, `VITE_APP_LOGO`, `VITE_APP_TITLE`
- `VITE_FRONTEND_FORGE_API_KEY`, `VITE_FRONTEND_FORGE_API_URL`
- `VITE_OAUTH_PORTAL_URL`
- `VITE_ANALYTICS_ENDPOINT`, `VITE_ANALYTICS_WEBSITE_ID`
- `OWNER_NAME`, `OWNER_OPEN_ID`

## Troubleshooting

### Problemas Comuns

| Problema | Causa | Solução |
|----------|-------|---------|
| Dados não carregam | Supabase não configurado | Verificar `.env` ou usar modo demo |
| Stream não conecta | URL inválida ou CORS | Verificar URLs de stream e CORS do MediaServer |
| Login não funciona | Supabase Auth não configurado | Configurar Auth no Supabase ou usar modo demo |
| Build falha | Erro de tipo TypeScript | Rodar `pnpm check` para identificar |
| Página branca | Erro de runtime | Verificar console do browser e ErrorBoundary |

### Logs

- Dev server: `.manus-logs/devserver.log`
- Console do browser: `.manus-logs/browserConsole.log`
- Network requests: `.manus-logs/networkRequests.log`
- User interactions: `.manus-logs/sessionReplay.log`

## Integração com GitHub

O projeto está conectado a um repositório GitHub via remote `user_github`:

- Sync automático: `file_write` e `webdev_save_checkpoint` fazem pull/push
- Conflitos: operação abortada com detalhes do conflito
- Resolução: merge lógico ou perguntar ao usuário qual versão manter
