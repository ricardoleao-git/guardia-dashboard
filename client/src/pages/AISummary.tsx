/**
 * AISummary — Resumo Automático de Eventos por IA.
 *
 * Fase 4.2 do roadmap: Resumo LLM.
 * - Gera resumo executivo do dia/período em linguagem natural
 * - Destaca anomalias, padrões e eventos críticos
 * - Métricas-chave com tendências
 * - Exportação em PDF para envio por email
 */
import { useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import {
  FileText, Sparkles, Calendar, Download, Send, RefreshCw,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Users,
  Camera, Clock, Activity, Shield, ArrowRight, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SummarySection {
  title: string;
  icon: typeof Activity;
  color: string;
  content: string;
  bullets: string[];
}

const mockSummary: SummarySection[] = [
  {
    title: "Visão Geral",
    icon: Activity,
    color: "text-primary",
    content: "O dia de 23 de julho de 2026 teve 47 eventos registrados pelas 6 câmeras ativas. 13 pessoas foram reconhecidas na lista branca, 1 estranho detectado e 1 alerta de lista negra disparado. A taxa de reconhecimento facial foi de 91.5%, acima da média histórica de 87%.",
    bullets: [
      "47 eventos totais (12% acima da média diária)",
      "13 reconhecimentos na lista branca",
      "1 estranho detectado na recepção às 09:15",
      "1 alerta de lista negra negado na entrada do estacionamento às 14:22",
    ],
  },
  {
    title: "Anomalias e Alertas",
    icon: AlertTriangle,
    color: "text-amber-400",
    content: "Foram identificadas 2 anomalias no período. O alerta de lista negra (MNO-7890) foi disparado e a cancela permaneceu fechada. O estranho detectado na recepção permaneceu pendente por 18 minutos antes de autorização manual.",
    bullets: [
      "Lista negra: MNO-7890 (VW Gol azul) negado às 14:22 — câmera D5",
      "Estranho pendente: autorização manual após 18min — câmera D3",
      "Nenhum evento de invasão ou cerca eletrônica disparado",
    ],
  },
  {
    title: "Padrões de Movimento",
    icon: TrendingUp,
    color: "text-green-400",
    content: "O pico de movimento ocorreu entre 07:30 e 08:15, com 23 eventos (49% do total). O corredor (D2) foi a câmera mais ativa com 18 eventos. O estacionamento (D5) registrou 5 entradas e 3 saídas de veículos.",
    bullets: [
      "Pico: 07:30-08:15 (23 eventos, 49% do dia)",
      "Câmera mais ativa: D2 Corredor (18 eventos)",
      "Veículos: 5 entradas, 3 saídas, 2 permanências > 8h",
      "Período de baixa atividade: 12:00-13:30 (apenas 2 eventos)",
    ],
  },
  {
    title: "Frequência e Presença",
    icon: Users,
    color: "text-blue-400",
    content: "8 pessoas presentes no período. 1 atraso matutino registrado (Carlos Eduardo Lima, entrada às 08:10, tolerância até 08:00). Nenhuma saída antecipada detectada. Taxa de presença de 87.5%.",
    bullets: [
      "8 presentes, 1 ausente (justificado)",
      "1 atraso: Carlos Eduardo Lima (+10min)",
      "Permanência média: 9h 42min",
      "Primeira entrada: 07:32 (João Pedro Silva)",
    ],
  },
];

const mockMetrics = [
  { label: "Eventos Totais", value: "47", trend: "up", change: "+12%", icon: Activity, color: "text-primary" },
  { label: "Reconhecimentos", value: "13", trend: "up", change: "+8%", icon: CheckCircle2, color: "text-green-400" },
  { label: "Alertas Críticos", value: "1", trend: "down", change: "-50%", icon: AlertTriangle, color: "text-amber-400" },
  { label: "Câmeras Online", value: "5/6", trend: "stable", change: "0%", icon: Camera, color: "text-blue-400" },
];

export default function AISummary() {
  const [period, setPeriod] = useState("today");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(true);
  const [expandedSection, setExpandedSection] = useState<number | null>(0);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setHasGenerated(true);
    }, 1500);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeView="ai-summary" onNavigate={() => {}} mobileOpen={false} onMobileClose={() => {}} />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-60">
        <MobileHeader onMenuClick={() => {}} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">Resumo IA</h1>
              <p className="text-sm text-muted-foreground mt-1">Análise automática de eventos por inteligência artificial</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-2 text-xs text-foreground"
              >
                <option value="today">Hoje</option>
                <option value="yesterday">Ontem</option>
                <option value="week">Esta semana</option>
                <option value="month">Este mês</option>
              </select>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isGenerating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {isGenerating ? "Gerando..." : "Gerar Resumo"}
              </button>
            </div>
          </div>

          {isGenerating && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                <Sparkles className="h-6 w-6 text-primary animate-pulse" />
              </div>
              <p className="text-sm font-medium">Analisando eventos...</p>
              <p className="text-xs text-muted-foreground mt-1">Processando 47 eventos de 6 câmeras</p>
            </div>
          )}

          {hasGenerated && !isGenerating && (
            <>
              {/* Metrics */}
              <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
                {mockMetrics.map((m) => {
                  const Icon = m.icon;
                  const TrendIcon = m.trend === "up" ? TrendingUp : m.trend === "down" ? TrendingDown : Activity;
                  return (
                    <div key={m.label} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Icon className={cn("h-4 w-4", m.color)} />
                        <span className={cn(
                          "flex items-center gap-0.5 text-[10px] font-medium",
                          m.trend === "up" ? "text-green-400" : m.trend === "down" ? "text-red-400" : "text-muted-foreground"
                        )}>
                          <TrendIcon className="h-3 w-3" /> {m.change}
                        </span>
                      </div>
                      <p className="font-display text-xl font-bold">{m.value}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{m.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* Summary sections */}
              <div className="space-y-3 mb-6">
                {mockSummary.map((section, idx) => {
                  const Icon = section.icon;
                  const isExpanded = expandedSection === idx;
                  return (
                    <div key={idx} className="rounded-xl border border-border bg-card overflow-hidden">
                      <button
                        onClick={() => setExpandedSection(isExpanded ? null : idx)}
                        className="flex w-full items-center gap-3 p-4 hover:bg-accent/30 transition-colors"
                      >
                        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-muted", section.color)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <h3 className="text-sm font-semibold flex-1 text-left">{section.title}</h3>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4">
                          <p className="text-sm text-muted-foreground leading-relaxed mb-3">{section.content}</p>
                          <div className="space-y-1.5">
                            {section.bullets.map((b, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <div className={cn("h-1.5 w-1.5 rounded-full mt-1.5 shrink-0", section.color.replace("text-", "bg-"))} />
                                <span className="text-xs text-foreground/80">{b}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Executive summary box */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Síntese Executiva</h3>
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed">
                  O dia transcorreu com normalidade operacional. 91.5% de taxa de reconhecimento facial, acima da média histórica. O alerta de lista negra foi tratado corretamente (cancela fechada). O estranho pendente na recepção demorou 18 minutos para autorização manual — recomenda-se definir fluxo de aprovação automática para visitantes esperados via convite prévio. Nenhum incidente de segurança crítico.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                    <Download className="h-3.5 w-3.5" /> Exportar PDF
                  </button>
                  <button className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                    <Send className="h-3.5 w-3.5" /> Enviar por Email
                  </button>
                </div>
              </div>

              {/* Recommendations */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-semibold">Recomendações</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-xs text-foreground/80">Configurar aprovação automática para visitantes com convite prévio (reduzir tempo de espera na portaria)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-xs text-foreground/80">Câmera D1 (Portão) offline — verificar conectividade 192.168.254.115</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-xs text-foreground/80">Considerar automação para alertar ausência de movimento no estacionamento fora de horário comercial</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
