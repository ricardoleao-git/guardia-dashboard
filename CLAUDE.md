# GuardIA Dashboard — Guardrails do Projeto

> Documento de referência para IA agents e desenvolvedores trabalhando neste repositório.
> Leia este arquivo antes de fazer qualquer alteração no código.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + TypeScript + Vite 7 + Tailwind CSS 4 + shadcn/ui |
| Roteamento | Wouter 3 (client-side) |
| Backend | Supabase (Postgres + Auth + Storage + Realtime) |
| Connector | Python 3 (requests + supabase-py + pyyaml + pillow) |
| Hosting | Manus WebDev (Autoscale) — guardia-vms.zenitetech.com |

## Regras Críticas

### Segurança

1. **Nunca commite credenciais reais** — senhas de câmeras, JWT keys, tokens de WhatsApp devem ficar apenas no `config.yaml` (que está no `.gitignore`) ou em environment variables
2. **Use apenas a anon key no frontend** — a service_role key nunca deve estar no código client-side
3. **RLS é obrigatória** — todas as tabelas devem ter Row Level Security ativada com policies restritivas (authenticated only)
4. **Modo visitante (guest) não toca no banco** — visitantes em modo demonstração veem apenas mock data. O arquivo `client/src/lib/guest-mode.ts` controla isso. Todos os hooks devem verificar `isGuestSession()` antes de fazer qualquer chamada ao Supabase
5. **audit_logs é append-only** — ninguém pode UPDATE ou DELETE registros de auditoria, apenas INSERT

### Padrões de Código

1. **TypeScript estrito** — `tsc --noEmit` deve passar sem erros antes de qualquer commit
2. **Hooks reutilizáveis** — toda lógica de acesso a dados deve estar em hooks (`client/src/hooks/use*.ts`), não inline em páginas
3. **Mapeamento de dados** — o banco usa `snake_case` (ex: `event_time`, `camera_serial`), o frontend usa `camelCase` via mapeamento no hook ou no `supabase.ts`
4. **Navegação** — todas as páginas renderizam dentro do `Dashboard.tsx` via `activeView` sincronizado com a URL. Páginas standalone devem ter sua sidebar/header ocultos pela classe CSS `.embedded-page`
5. **Mock data** — `client/src/lib/mock-data.ts` contém dados de exemplo para modo demo e fallback. Nunca remover — é usado por visitantes e quando o Supabase está indisponível

### Estrutura de Arquivos

```
client/src/
  pages/          ← Páginas da aplicação (renderizadas dentro de Dashboard)
  components/     ← Componentes reutilizáveis + shadcn/ui
  hooks/          ← Hooks de acesso a dados (useEvents, useFaceLists, etc)
  contexts/       ← React contexts (Auth, Theme, I18n)
  lib/            ← Utilities (supabase.ts, types.ts, mock-data.ts, guest-mode.ts)
connector/
  src/            ← Código Python do connector
  config/         ← config.yaml (gitignored) e config.example.yaml
db/               ← Scripts SQL de migration
scripts/          ← Scripts de manutenção (backup, etc)
docs/             ← Documentação técnica
```

### Supabase

- **Projeto:** `ycqrgrczrunvyivxfnch` (ricardoleao-git)
- **URL:** `https://ycqrgrczrunvyivxfnch.supabase.co`
- **Tabelas:** `camera_events`, `profiles`, `audit_logs`, `search_presets`, `face_lists`, `automation_rules`, `attendance`, `devices`, `vehicles`, `visitor_invites`, `system_config`, `connector_status`
- **Storage buckets:** `event-images` (público), `backups` (privado)
- **Realtime:** habilitado em `camera_events`, `face_lists`, `automation_rules`, `attendance`, `devices`

### Connector Python

- **Config:** `connector/config/config.yaml` (gitignored) — copie de `config.example.yaml`
- **Chave:** usar `anon_key` (não `service_role_key`) — a RLS permite insert com anon key
- **Câmeras:** D1-D6, IPs 192.168.254.x, modelos H5AI-50, F4C-T, T5AI
- **Deploy:** `./install.sh` + `systemd service` no Raspberry Pi ou PC da bancada
- **WhatsApp:** módulo `whatsapp_alerts.py` integrado, desativado por padrão (`enabled: false`)

### Antes de Commitar

1. Rodar `npx tsc --noEmit` — deve passar sem erros
2. Verificar que `config.yaml` não está sendo commitado (deve estar no `.gitignore`)
3. Verificar que nenhuma credencial real está no código
4. Verificar que o modo guest ainda funciona (login como visitante → dados mock, sem chamadas ao Supabase)

## Atualizações Pós-Base (26/07 22h)

> Bloco com fatos novos que ocorreram após o último corte da base de conhecimento.
> Validado por auditoria remota + correção de bug no Manus.

1. **DEPLOY PÚBLICO ATIVO:** `guardia-vms.zenitetech.com` está no ar servindo bundle com anon key embutida. Rotação da chave é a ação mais urgente.
2. **CHAVE ERA ANON (não service_role):** não houve bypass de RLS. Renomear campo para `anon_key` no `config.example.yaml`.
3. **ALLOWEDHOSTS TRUE:** setado pelo Manus em 26/07 para preview via proxy. Intencional e temporário.
4. **FAXINA ALCANÇOU 22 PÁGINAS:** coletor, plugins e deps Manus removidos do HEAD. Pendentes: anon key, umami, `@types/google.maps`, `ManusDialog.tsx`, `/manus-storage/*`, `Map.tsx`.
5. **BUCKETS SUPABASE STORAGE:** `event-images` + `backups`. Verificar visibilidade e fechar insert anônimo em `storage.objects`.
6. **DOMÍNIO VMS ATIVO:** contradiz posicionamento (não é VMS). Trocar antes de demo a cliente.
7. **REACT ERROR #310 CORRIGIDO:** checkpoint `64290b45` — memoize `t`/context em `I18nContext`, estabilizar `addNotification` e `actionConfig` em `RealtimeNotifications`.
8. **CONNECTOR:** NÃO reescrever `p6s_client.py` antes do `P6S-09_ROTEIRO-DE-BANCADA` com device respondendo `statusCode 0`.

## Estado do Protótipo (27/07)

- **32 telas implementadas** no Manus (todas as table stakes T1-T6, diferenciais T7-T10, e telas operacionais)
- **5 estados obrigatórios** do CORE-03 §7 aplicados em todas as páginas (carregando, vazio, erro, connector offline, sincronização parcial)
- **Tipos canônicos** alinhados ao CORE-01 (FaceUUID, GroupID2)
- **i18n PT/EN/ZH** em todas as telas
- **Logo GuardIA Percebe** integrado no sidebar, header mobile e favicon
- **Mock data sintético** — nenhum dado de pessoa real
- **Pendência PND-17:** portar os 32 componentes para o monorepo, removendo resíduos Manus (`ManusDialog.tsx`, `Map.tsx`, `/manus-storage/*`, `umami`, `@types/google.maps`)
- **Pendência PND-01:** safety code da bancada (10 min, NVR 192.168.254.116) — bloqueia Fase 2 inteira
