/**
 * AbsenceAlerts — Alertas de ausência com configuração de notificações.
 *
 * Funcionalidades:
 * - Lista de alertas ativos e historico
 * - Configuração de regras de ausência (por pessoa, turno, horário limite)
 * - Canais de notificação: WhatsApp, Push, Email
 * - Destinatários configuráveis
 * - Status de envio por canal
 *
 * Dados mock da bancada (spec 05): pessoas cadastradas + eventos faciais.
 */
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import {
  AlertTriangle, Bell, MessageSquare, Mail, Smartphone,
  Clock, UserX, Plus, Trash2, Edit2, CheckCircle2, XCircle,
  Settings2, ChevronDown, ChevronRight, Send
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AbsenceAlert {
  id: string;
  pessoa: string;
  turno: "Manhã" | "Tarde" | "Integral";
  horarioLimite: string;
  status: "pendente" | "enviado" | "resolvido" | "ignorado";
  disparadoEm: string | null;
  canais: {
    whatsapp: boolean;
    push: boolean;
    email: boolean;
  };
  destinatarios: string[];
  resolvedEm: string | null;
}

interface AlertRule {
  id: string;
  nome: string;
  turno: "Manhã" | "Tarde" | "Integral";
  horarioLimite: string;
  canais: { whatsapp: boolean; push: boolean; email: boolean };
  destinatarios: string[];
  ativa: boolean;
}

const mockAlerts: AbsenceAlert[] = [
  {
    id: "al1",
    pessoa: "Felipe Alves",
    turno: "Integral",
    horarioLimite: "08:00",
    status: "enviado",
    disparadoEm: "08:05",
    canais: { whatsapp: true, push: true, email: true },
    destinatarios: ["supervisor@escola.com", "+55 11 99999-0001"],
    resolvedEm: null,
  },
  {
    id: "al2",
    pessoa: "Heitor Paz",
    turno: "Manhã",
    horarioLimite: "07:30",
    status: "enviado",
    disparadoEm: "07:32",
    canais: { whatsapp: true, push: false, email: true },
    destinatarios: ["responsavel.heitor@email.com", "+55 11 98888-0002"],
    resolvedEm: null,
  },
  {
    id: "al3",
    pessoa: "Felipe Alves",
    turno: "Integral",
    horarioLimite: "08:00",
    status: "resolvido",
    disparadoEm: "08:05",
    canais: { whatsapp: true, push: true, email: false },
    destinatarios: ["supervisor@escola.com"],
    resolvedEm: "08:45",
  },
];

const mockRules: AlertRule[] = [
  {
    id: "r1",
    nome: "Atraso matutino",
    turno: "Manhã",
    horarioLimite: "07:30",
    canais: { whatsapp: true, push: true, email: true },
    destinatarios: ["supervisor@escola.com", "rjll70@gmail.com"],
    ativa: true,
  },
  {
    id: "r2",
    nome: "Atraso integral",
    turno: "Integral",
    horarioLimite: "08:00",
    canais: { whatsapp: true, push: false, email: true },
    destinatarios: ["atendimento@zenite.tech", "supervisor@escola.com"],
    ativa: true,
  },
  {
    id: "r3",
    nome: "Falta tarde",
    turno: "Tarde",
    horarioLimite: "13:15",
    canais: { whatsapp: false, push: true, email: true },
    destinatarios: ["supervisor@escola.com"],
    ativa: false,
  },
];

const statusConfig = {
  pendente:  { bg: "bg-amber-500/15",  text: "text-amber-400",  label: "Pendente",  dot: "bg-amber-400",  icon: Clock },
  enviado:   { bg: "bg-blue-500/15",   text: "text-blue-400",   label: "Enviado",   dot: "bg-blue-400",   icon: Send },
  resolvido: { bg: "bg-green-500/15",  text: "text-green-400",  label: "Resolvido", dot: "bg-green-400",  icon: CheckCircle2 },
  ignorado:  { bg: "bg-muted",         text: "text-muted-foreground", label: "Ignorado", dot: "bg-muted-foreground", icon: XCircle },
};

const channelConfig = {
  whatsapp: { icon: MessageSquare, label: "WhatsApp", color: "text-green-400", bg: "bg-green-500/10" },
  push:     { icon: Smartphone,    label: "Push",      color: "text-blue-400",  bg: "bg-blue-500/10" },
  email:    { icon: Mail,          label: "Email",     color: "text-amber-400", bg: "bg-amber-500/10" },
};

export default function AbsenceAlerts() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [alerts, setAlerts] = useState(mockAlerts);
  const [rules, setRules] = useState(mockRules);
  const [activeTab, setActiveTab] = useState<"alertas" | "regras" | "destinatarios">("alertas");
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [showNewRule, setShowNewRule] = useState(false);
  const [emails, setEmails] = useState("atendimento@zenite.tech, rjll70@gmail.com");
  const [whatsappNumbers, setWhatsappNumbers] = useState("+55 11 99999-0001, +55 11 98888-0002");

  const toggleRule = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, ativa: !r.ativa } : r));
  };

  const resolveAlert = (id: string) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, status: "resolvido", resolvedEm: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) } : a));
  };

  const ignoreAlert = (id: string) => {
    setAlerts(alerts.map(a => a.id === id ? { ...a, status: "ignorado" } : a));
  };

  const activeAlerts = alerts.filter(a => a.status === "enviado" || a.status === "pendente");
  const resolvedAlerts = alerts.filter(a => a.status === "resolvido" || a.status === "ignorado");

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        activeView="alerts"
        onNavigate={() => {}}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className="lg:ml-60">
        <MobileHeader onMenuClick={() => setMobileSidebarOpen(true)} />

        {/* Page header */}
        <div className="border-b border-border bg-card/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                Alertas de Ausência
              </h2>
              <p className="text-xs text-muted-foreground">Notificações automáticas de falta e atraso</p>
            </div>
            <button
              onClick={() => setShowNewRule(true)}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Nova Regra
            </button>
          </div>
        </div>

        <main className="p-6 space-y-6">
          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-border">
            {([
              { id: "alertas", label: `Alertas Ativos (${activeAlerts.length})` },
              { id: "regras", label: `Regras (${rules.length})` },
              { id: "destinatarios", label: "Destinatários" },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Alertas Ativos */}
          {activeTab === "alertas" && (
            <div className="space-y-3">
              {activeAlerts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 mb-3">
                    <CheckCircle2 className="h-7 w-7 text-green-400" />
                  </div>
                  <h3 className="font-display text-sm font-semibold mb-1">Nenhum alerta ativo</h3>
                  <p className="text-xs text-muted-foreground">Todos presentes ou alertas já resolvidos.</p>
                </div>
              )}

              {activeAlerts.map((alert) => {
                const sc = statusConfig[alert.status];
                const StatusIcon = sc.icon;
                const isExpanded = expandedAlert === alert.id;
                return (
                  <div
                    key={alert.id}
                    className="rounded-xl border border-border bg-card overflow-hidden transition-all"
                  >
                    {/* Alert header */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/20 transition-colors"
                      onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                          <UserX className="h-5 w-5 text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-display text-sm font-semibold truncate">{alert.pessoa}</span>
                            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", sc.bg, sc.text)}>
                              <div className={cn("h-1.5 w-1.5 rounded-full", sc.dot)} />
                              {sc.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                            <span>Turno: {alert.turno}</span>
                            <span>Limite: {alert.horarioLimite}</span>
                            {alert.disparadoEm && <span>Disparo: {alert.disparadoEm}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Channel badges */}
                        <div className="flex items-center gap-1">
                          {alert.canais.whatsapp && (
                            <span className={cn("flex h-6 w-6 items-center justify-center rounded", channelConfig.whatsapp.bg)}>
                              <MessageSquare className={cn("h-3 w-3", channelConfig.whatsapp.color)} />
                            </span>
                          )}
                          {alert.canais.push && (
                            <span className={cn("flex h-6 w-6 items-center justify-center rounded", channelConfig.push.bg)}>
                              <Smartphone className={cn("h-3 w-3", channelConfig.push.color)} />
                            </span>
                          )}
                          {alert.canais.email && (
                            <span className={cn("flex h-6 w-6 items-center justify-center rounded", channelConfig.email.bg)}>
                              <Mail className={cn("h-3 w-3", channelConfig.email.color)} />
                            </span>
                          )}
                        </div>
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/30 p-4 space-y-3">
                        {/* Destinatários */}
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Destinatários</p>
                          <div className="flex flex-wrap gap-1.5">
                            {alert.destinatarios.map((d, i) => (
                              <span key={i} className="rounded-md bg-muted px-2 py-1 text-[11px] font-mono-tech text-muted-foreground">
                                {d}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Channel status */}
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Status por canal</p>
                          <div className="grid grid-cols-3 gap-2">
                            {(["whatsapp", "push", "email"] as const).map((ch) => {
                              const cfg = channelConfig[ch];
                              const Icon = cfg.icon;
                              const active = alert.canais[ch];
                              return (
                                <div key={ch} className={cn(
                                  "flex items-center gap-2 rounded-lg border p-2",
                                  active ? "border-border bg-card" : "border-border/30 opacity-40"
                                )}>
                                  <Icon className={cn("h-4 w-4", active ? cfg.color : "text-muted-foreground")} />
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-medium">{cfg.label}</span>
                                    {active ? (
                                      <span className="text-[9px] text-green-400">Entregue</span>
                                    ) : (
                                      <span className="text-[9px] text-muted-foreground">Inativo</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => resolveAlert(alert.id)}
                            className="flex items-center gap-1.5 rounded-md bg-green-500/15 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/25 transition-colors"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Marcar resolvido
                          </button>
                          <button
                            onClick={() => ignoreAlert(alert.id)}
                            className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Ignorar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Histórico */}
              {resolvedAlerts.length > 0 && (
                <div className="space-y-2 pt-4">
                  <h3 className="font-display text-sm font-semibold text-muted-foreground">Histórico</h3>
                  {resolvedAlerts.map((alert) => {
                    const sc = statusConfig[alert.status];
                    return (
                      <div key={alert.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                            <UserX className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <span className="text-xs font-medium">{alert.pessoa}</span>
                            <span className="text-[11px] text-muted-foreground ml-2">{alert.turno} - {alert.horarioLimite}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {alert.resolvedEm && <span className="text-[11px] text-muted-foreground">Resolvido: {alert.resolvedEm}</span>}
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", sc.bg, sc.text)}>
                            {sc.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab: Regras */}
          {activeTab === "regras" && (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={cn(
                    "rounded-xl border bg-card p-4 transition-all",
                    rule.ativa ? "border-border" : "border-border/50 opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Name + toggle */}
                      <div className="flex items-center gap-3">
                        <h4 className="font-display text-sm font-semibold">{rule.nome}</h4>
                        <button
                          onClick={() => toggleRule(rule.id)}
                          className={cn(
                            "relative h-5 w-9 rounded-full transition-colors",
                            rule.ativa ? "bg-green-500" : "bg-muted"
                          )}
                        >
                          <div className={cn(
                            "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                            rule.ativa ? "translate-x-4" : "translate-x-0.5"
                          )} />
                        </button>
                        {rule.ativa && (
                          <span className="rounded bg-green-500/15 px-1.5 py-0.5 text-[9px] font-bold text-green-400">ATIVA</span>
                        )}
                      </div>

                      {/* Rule details */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5">
                          <Clock className="h-3.5 w-3.5 text-amber-400" />
                          <span className="text-xs font-medium text-amber-200">{rule.turno} - até {rule.horarioLimite}</span>
                        </div>

                        {/* Channels */}
                        <div className="flex items-center gap-1">
                          {(["whatsapp", "push", "email"] as const).map((ch) => {
                            const cfg = channelConfig[ch];
                            const Icon = cfg.icon;
                            const active = rule.canais[ch];
                            return active ? (
                              <span key={ch} className={cn("flex h-7 w-7 items-center justify-center rounded-lg", cfg.bg)} title={cfg.label}>
                                <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>

                      {/* Destinatários */}
                      <div className="flex flex-wrap gap-1.5">
                        {rule.destinatarios.map((d, i) => (
                          <span key={i} className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono-tech text-muted-foreground">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button className="rounded p-1.5 hover:bg-accent text-muted-foreground hover:text-primary transition-colors" title="Editar">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button className="rounded p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Excluir">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab: Destinatários */}
          {activeTab === "destinatarios" && (
            <div className="space-y-4 max-w-2xl">
              {/* Emails */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                    <Mail className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-display text-sm font-semibold">Emails de notificação</h4>
                    <p className="text-[11px] text-muted-foreground">Separe por vírgula ou ponto e vírgula</p>
                  </div>
                </div>
                <textarea
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono-tech resize-none"
                  placeholder="email1@exemplo.com, email2@exemplo.com"
                />
                <div className="flex items-center gap-2 mt-2">
                  <button className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Salvar
                  </button>
                  <span className="text-[11px] text-muted-foreground">
                    {emails.split(/[,;]/).filter(e => e.trim()).length} destinatário(s)
                  </span>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                    <MessageSquare className="h-4 w-4 text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-display text-sm font-semibold">Números de WhatsApp</h4>
                    <p className="text-[11px] text-muted-foreground">Formato: +55 DD NNNNN-NNNN</p>
                  </div>
                </div>
                <textarea
                  value={whatsappNumbers}
                  onChange={(e) => setWhatsappNumbers(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono-tech resize-none"
                  placeholder="+55 11 99999-0001, +55 11 98888-0002"
                />
                <div className="flex items-center gap-2 mt-2">
                  <button className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Salvar
                  </button>
                  <span className="text-[11px] text-muted-foreground">
                    {whatsappNumbers.split(/[,;]/).filter(e => e.trim()).length} número(s)
                  </span>
                </div>
              </div>

              {/* Push info */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                    <Smartphone className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-display text-sm font-semibold">Notificações Push</h4>
                    <p className="text-[11px] text-muted-foreground">Enviadas para o app móvel do operador logado</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                  <Smartphone className="h-4 w-4 text-blue-400" />
                  <span className="text-xs text-muted-foreground">Push automático para todos os operadores ativos com app instalado</span>
                </div>
              </div>
            </div>
          )}

          {/* New rule modal */}
          {showNewRule && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              onClick={() => setShowNewRule(false)}
            >
              <div
                className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-base font-semibold">Nova Regra de Ausência</h3>
                  <button onClick={() => setShowNewRule(false)} className="text-muted-foreground hover:text-foreground">
                    ✕
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Nome da regra</label>
                    <input type="text" placeholder="Ex: Atraso matutino turma 6A" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Turno</label>
                      <select className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                        <option>Manhã</option>
                        <option>Tarde</option>
                        <option>Integral</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Horário limite</label>
                      <input type="time" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Canais de notificação</label>
                    <div className="flex items-center gap-3">
                      {(["whatsapp", "push", "email"] as const).map((ch) => {
                        const cfg = channelConfig[ch];
                        const Icon = cfg.icon;
                        return (
                          <label key={ch} className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" defaultChecked={ch !== "push"} className="rounded border-border" />
                            <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                            <span className="text-xs">{cfg.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowNewRule(false)}
                    className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Criar Regra
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
