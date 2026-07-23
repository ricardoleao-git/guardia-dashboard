# Análise Completa do GuardIA — Estado Atual, Gaps e Plano de Execução

**Data:** 23/07/2026 · **Autor:** Manus (análise dos 6 documentos + código do dashboard)

---

## 1. Diagnóstico Executivo

O GuardIA está em um momento de transição entre **protótipo UI validado** e **produto real conectado**. A camada visual (Fases 1-2) está ~85% pronta no Manus. O backend (guardia-core) está construído e testado (11/11 testes), mas desconectado da UI. As Fases 3-4 (diferenciação e fosso competitivo) ainda não têm UI.

### Matriz de Estado por Fase

| Fase | Componente | UI (Manus) | Backend (guardia-core) | Conexão UI↔Backend | Depende de Bancada? |
|------|-----------|------------|----------------------|-------------------|-------------------|
| **1 · Fundação** | Dashboard + mosaico + eventos | ✅ Pronto | ✅ Connector esqueletado | ❌ Pendente | Não |
| **1 · Fundação** | Dispositivos (inventário real) | ✅ Corrigido | ✅ Modelo de dados pronto | ❌ Pendente | Não |
| **1 · Fundação** | LiveStream (RTSP/WebRTC) | ✅ Pronto | N/A (frontend) | N/A | Não |
| **2 · Automação** | Editor visual de regras | ✅ Pronto (+ DnD, templates, validação, export/import, árvore) | ✅ RuleEngine pronto | ❌ Pendente | Não |
| **2 · Automação** | Histórico de disparos | 🔶 Em andamento | ✅ automation_runs previsto | ❌ Pendente | Não |
| **2 · Automação** | Simulação de fluxo | 🔶 Em andamento | N/A (teste de UI) | N/A | Não |
| **2 · Ausência** | Alertas de ausência | ✅ Pronto (3 abas) | ✅ Scheduler + expectativas | ❌ Pendente | Não |
| **2 · Frequência** | Presença/ausência escolar | ✅ Pronto | ✅ Tabela attendance | ❌ Pendente | Não (exceto cadastro em massa) |
| **2 · Inteligência** | AIConfig (toggles por câmera) | ✅ Refinado | N/A (config de borda) | N/A | Não |
| **0 · LGPD** | Auditoria de operadores | ✅ Pronto | ✅ audit_log previsto | ❌ Pendente | — |
| **0 · LGPD** | Gestão de usuários | ✅ Pronto | ✅ Supabase Auth | ❌ Pendente | — |
| **3 · Correlação** | Timeline de pessoa | ❌ Não existe | ✅ Query sobre events | — | Não |
| **3 · Veicular** | Clausura (LPR + UHF + facial) | ❌ Não existe | ✅ CarLicenseSnapshot | — | Parcial (UHF) |
| **3 · Visitante** | Convite + QR + provisionamento | ❌ Não existe | ✅ Lista visitor no P6S | — | Parcial (safety code) |
| **4 · Fosso** | Busca semântica (LLM/CLIP) | ❌ Não existe | 🔶 Validar AX650 CGI | — | Sim |
| **4 · Fosso** | Resumo automático (LLM) | ❌ Não existe | A construir | — | Não |
| **4 · Fosso** | Integração elevador | ❌ Não existe | A construir | — | Sim (fornecedor) |
| **4 · Fosso** | AI Box (parque legado) | ❌ Não existe | A construir | — | Não |

---

## 2. O Que Já Está Pronto no Manus (UI)

### 2.1 Páginas implementadas (12 páginas)

| Página | Arquivo | Estado | Dados |
|--------|---------|--------|-------|
| Dashboard | `Dashboard.tsx` | ✅ Refinado | Mock bancada D1-D6 |
| CameraMosaic | `CameraMosaic.tsx` | ✅ Refinado | Layouts 1/4/6/9/16/36 + Live |
| LiveStream | `LiveStream.tsx` | ✅ Pronto | WebRTC/HLS/MJPEG/Snapshot |
| EventCard | `EventCard.tsx` | ✅ Refinado | Dual thumbnails + match facial |
| StatsBar | `StatsBar.tsx` | ✅ Refinado | KPIs com cores dark |
| Automations | `Automations.tsx` | ✅ Avançado | Editor DnD + templates + validação + export/import + árvore |
| Frequencia | `Frequencia.tsx` | ✅ Pronto | Presentes/ausentes/atrasados |
| AbsenceAlerts | `AbsenceAlerts.tsx` | ✅ Pronto | 3 abas (alertas, regras, destinatários) |
| AIConfig | `AIConfig.tsx` | ✅ Refinado | Lista + matriz + batch ops |
| DeviceManagement | `DeviceManagement.tsx` | ✅ Corrigido | Inventário real D1-D6 |
| UserAdmin | `UserAdmin.tsx` | ✅ Pronto | Convite + roles + revogar |
| AuditLog | `AuditLog.tsx` | ✅ Pronto | Timeline + filtros + CSV |

### 2.2 Recursos avançados implementados

- **Editor visual de Automações:** drag-and-drop nativo HTML5, snap-to-grid, linhas conectoras animadas, palette DnD, 10 templates pré-configurados, validação visual em tempo real, export/import JSON, vista horizontal/árvore
- **LiveStream:** 4 protocolos com fallback automático, scanline effect, badge LIVE pulsante
- **EventCard:** dual thumbnails (captura/cadastro), barra de score colorida, badges de lista facial, atributos (gênero/idade/óculos/máscara)
- **AIConfig:** dados reais da bancada (D1-D6 com IPs, modelos, capacidades AI/FACE/REC), vista lista + matriz, operações em lote
- **Documentação:** 10 arquivos Markdown na pasta `docs/` (~1.816 linhas)

---

## 3. O Que Falta (Gaps Identificados)

### 3.1 UI — Telas que faltam (Fase 3 do roadmap)

| # | Tela | Fase | Prioridade | Estimativa crédito | Depende de bancada? |
|---|------|------|-----------|-------------------|-------------------|
| 7 | **Timeline de Pessoa** | 3.1 | Alta | ~300 | Não |
| 8 | **Clausura Veicular** | 3.2 | Alta (condomínio) | ~350 | Parcial (UHF) |
| 9 | **Convite de Visitante** | 3.3 | Média | ~300 | Parcial (safety code) |

### 3.2 UI — Recursos em andamento no Automations.tsx

| Recurso | Estado | O que falta |
|---------|--------|------------|
| **Clonar regra** | Função pronta, estado pronto | Adicionar botão "Clonar" na lista de regras |
| **Histórico de disparos** | Estado pronto, dados filtrados prontos | Adicionar modal com timeline visual + filtros |
| **Simulação de fluxo** | Função pronta, estado pronto | Adicionar botão "Testar" no editor + modal de simulação |

### 3.3 Backend — Conexão UI↔Backend (fora do Manus)

| Item | O que é | Onde se faz |
|------|---------|------------|
| Ligar dashboard ao Supabase real | Substituir mock por queries Supabase | Claude/servidor próprio |
| Ligar connector on-prem | Subir connector na LAN da bancada | Servidor próprio |
| Drivers reais (FCM, SMTP, n8n, CGI) | Ativar ações de automação | Claude/servidor próprio |
| Cadastro facial remoto (safety code) | Desbloquear cadastro em massa | Bancada (Tiago) |
| Validação large model AX650 via CGI | Busca semântica nativa | Bancada (Tiago) |

### 3.4 UI — Fase 4 (futuro)

| Tela | Fase | Quando |
|------|------|-------|
| Busca semântica (linguagem natural) | 4.1 | Após validar AX650 |
| Resumo automático (LLM) | 4.2 | Pode andar já (sobre events) |
| Integração elevador | 4.3 | Caso a caso |
| AI Box (parque legado) | 4.4 | Expansão de mercado |

---

## 4. Plano de Execução Recomendado

### 4.1 Imediato (no Manus — usar crédito restante)

**Lote A — Finalizar Automations.tsx (baixo custo, ~200 créditos):**
1. Adicionar botão "Clonar" na lista de regras
2. Adicionar modal de Histórico de Disparos com timeline visual + filtros
3. Adicionar botão "Testar" no editor + modal de Simulação de Fluxo

**Lote B — Fase 3 UI (alto valor de demonstração, ~950 créditos):**
4. Timeline de Pessoa (~300)
5. Clausura Veicular (~350)
6. Convite de Visitante (~300)

**Total Lote A+B:** ~1.150 créditos

### 4.2 Paralelo (no Claude / servidor próprio)

1. **Fechar Fase 1:** ligar dashboard ↔ Supabase ↔ connector
2. **Fechar Fase 2:** ligar drivers reais (WhatsApp, FCM, CGI) ao RuleEngine
3. **Faxina de telemetria:** conferir e remover qualquer telemetria injetada
4. **LGPD:** implementar consentimento + retenção + auditoria em cada feature biométrica

### 4.3 Bancada (Tiago — em paralelo)

1. Safety code → cadastro facial remoto
2. Endpoint add-canal → provisionamento zero-touch
3. Large model AX650 via CGI → busca semântica
4. Porta 9000 / registo ativo → ingestão robusta

---

## 5. Priorização por Valor × Esforço

| Prioridade | Item | Valor | Esforço | Fazer onde |
|-----------|------|-------|---------|------------|
| 🔴 Crítica | Finalizar Automations (clone, histórico, simulação) | Alto | Baixo | Manus |
| 🔴 Crítica | Ligar Supabase real | Crítico | Médio | Servidor |
| 🟠 Alta | Timeline de Pessoa | Alto | Médio | Manus |
| 🟠 Alta | Clausura Veicular | Alto (vende condomínio) | Médio | Manus |
| 🟡 Média | Convite de Visitante | Médio | Médio | Manus |
| 🟡 Média | Drivers reais Fase 2 | Crítico | Médio | Servidor |
| 🟢 Baixa | Busca semântica (Fase 4) | Diferencial | Alto | Após bancada |
| 🟢 Baixa | Resumo LLM | Diferencial | Médio | Servidor |

---

## 6. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Crédito Manus insuficiente para Lote B | Fase 3 UI atrasa | Priorizar Lote A (barato) + Lote B item por item |
| Telemetria Manus re-injetada | LGPD | Faxina no Claude a cada export |
| Dados mock divergentes da bancada | Demo inconsistente | Sempre usar dados do doc 12 §4 |
| Safety code não validado | Cadastro remoto bloqueado | Frequência de quem já está na base funciona sem isso |
| AX650 CGI não abrir | Busca semântica nativa | Fallback CLIP no servidor |

---

## 7. Síntese

O GuardIA tem **85% da UI das Fases 1-2 pronta** no Manus, com qualidade alta (editor visual avançado, dados reais da bancada, design system consistente). O backend (guardia-core) está construído e testado, mas **desconectado da UI** — esta é a principal lacuna. As 3 telas da Fase 3 (Timeline, Clausura, Visitante) são o próximo bloco de valor para demonstração comercial. A Fase 4 (busca semântica, LLM) é o fosso competitivo, mas depende de validação de bancada.

**Recomendação:** finalizar o Lote A (3 recursos em andamento no Automations.tsx) com custo baixo, depois avaliar crédito restante para o Lote B (Fase 3 UI). Em paralelo, no Claude/servidor, focar em ligar Supabase real + drivers Fase 2 — pois sem isso a UI é só uma casca bonita.
