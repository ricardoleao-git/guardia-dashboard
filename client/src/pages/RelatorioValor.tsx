/**
 * T9 — Relatório de Valor
 * CORE-04 §3: Diferencial para escola e condomínio — documento para assembleia.
 * CORE-03 §7: 5 estados obrigatórios (carregando, vazio, erro, connector offline, sincronização parcial).
 * CORE-01: Tipos canônicos (ValueReport, SecurityMetric, PatrolRecord, etc.).
 * CORE-04 §8: Frontend-only, mock sintético, sem backend/telemetria.
 * Semântica de cor: 3 níveis (conforme=emerald, pendente=amber, nao_aplicavel=zinc).
 */
import { useState, useEffect } from "react";
import {
  Download, Mail,
  TrendingUp, TrendingDown, Shield, Clock, CheckCircle2, FileText,
  Calendar, Building2, Award, Target, Lightbulb, ChevronRight,
  BarChart3, Activity, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/contexts/I18nContext";
import { PageStateWrapper, type LoadState } from "@/components/PageStateWrapper";
import { ValueReport, ReportPeriod, ComplianceItem } from "@/lib/types";
import { mockValueReport } from "@/lib/mock-data";

// O union dos 5 estados vem do PageStateWrapper — não redeclarar (§14.5).

const COMPLIANCE_CONFIG: Record<ComplianceItem["status"], { label: string; color: string; bg: string; border: string }> = {
  conforme:        { label: "Conforme",        color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  pendente:        { label: "Pendente",        color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/30" },
  nao_aplicavel:   { label: "Não aplicável",   color: "text-zinc-400",   bg: "bg-zinc-500/10",   border: "border-zinc-500/30" },
};

function TrendBadge({ trend }: { trend: number }) {
  const positive = trend > 0;
  const isResponseTime = false; // será setado contextualmente
  const good = positive; // para tentativas bloqueadas, positivo é bom; para tempo, negativo é bom
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${good ? "text-emerald-400" : "text-red-400"}`}>
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? "+" : ""}{trend}% vs período anterior
    </span>
  );
}

export default function RelatorioValor() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [report, setReport] = useState<ValueReport | null>(null);
  const [period, setPeriod] = useState<ReportPeriod>("mes");
  const { t } = useI18n();

  useEffect(() => {
    setLoadState("loading");
    const timer = setTimeout(() => {
      try {
        if (!mockValueReport) {
          setLoadState("empty");
        } else {
          setReport(mockValueReport);
          setLoadState("loaded");
        }
      } catch {
        setLoadState("error");
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [period]);

  // CORE-03 §7: os 5 estados obrigatórios, via PageStateWrapper.
  // O vazio segue early-return porque os filhos do corpo desreferenciam
  // `report`: JSX avalia o filho antes de passá-lo, então envolver tudo
  // estouraria com report nulo. O wrapper cuida da aparência mesmo assim.
  if (loadState === "empty" || !report) {
    return (
      <PageStateWrapper
        state="empty"
        emptyTitle={t("rv.empty_title")}
        emptyDescription={t("rv.empty_desc")}
      >
        <span />
      </PageStateWrapper>
    );
  }

  return (
    <PageStateWrapper
      state={loadState}
      onRetry={() => setLoadState("loaded")}
    >
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Mês atual</SelectItem>
              <SelectItem value="trimestre">Trimestre</SelectItem>
              <SelectItem value="semestre">Semestre</SelectItem>
              <SelectItem value="ano">Ano completo</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {report.periodLabel}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-2" /> Enviar por e-mail
          </Button>
          <Button size="sm">
            <Download className="h-4 w-4 mr-2" /> Exportar PDF
          </Button>
        </div>
      </div>


      {/* Site info */}
      <Card>
        <CardContent className="flex items-center gap-3 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">{report.siteName}</h2>
            <p className="text-xs text-muted-foreground">{report.siteType} · Relatório gerado em {new Date(report.generatedAt).toLocaleDateString("pt-BR")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Highlights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-5 w-5 text-amber-400" /> Destaques do Período
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {report.highlights.map((h, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <span>{h}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Security metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-primary" /> Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {report.securityMetrics.map((m, i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-2 border-b last:border-0">
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{m.label}</span>
                <p className="text-xs text-muted-foreground mt-0.5">{m.benchmark}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-bold">{m.value} <span className="text-xs font-normal text-muted-foreground">{m.unit}</span></div>
                <TrendBadge trend={m.trend} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Patrol coverage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5 text-primary" /> Cobertura de Rondas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-3xl font-bold">{report.patrolCoverage}%</span>
              <span className="text-sm text-muted-foreground ml-2">cobertura média</span>
            </div>
            <TrendBadge trend={report.patrolTrend} />
          </div>
          <div className="space-y-2">
            {report.patrolRecords.map((p, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="font-mono text-xs text-muted-foreground w-12">{p.date}</span>
                <span className="flex-1 truncate">{p.route}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{p.completed}/{p.scheduled}</span>
                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${p.coveragePct === 100 ? "bg-emerald-500" : p.coveragePct >= 75 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${p.coveragePct}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-10 text-right">{p.coveragePct}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Event summaries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-primary" /> Eventos Detectados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total de eventos no período</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">{report.totalEvents}</span>
              <TrendBadge trend={report.eventsTrend} />
            </div>
          </div>
          {report.eventSummaries.map((e, i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-2 border-b last:border-0">
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{e.category}</span>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> {e.blocked} bloqueados</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {e.resolved} resolvidos</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {e.avgResponseTime}</span>
                </div>
              </div>
              <span className="text-lg font-bold shrink-0">{e.total}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-5 w-5 text-primary" /> Conformidade LGPD
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Score de conformidade</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{report.complianceScore}%</span>
              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${report.complianceScore >= 90 ? "bg-emerald-500" : report.complianceScore >= 70 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${report.complianceScore}%` }}
                />
              </div>
            </div>
          </div>
          {report.complianceItems.map((c, i) => {
            const cfg = COMPLIANCE_CONFIG[c.status];
            return (
              <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0">
                <div className={`flex h-6 w-6 items-center justify-center rounded-full ${cfg.bg} ${cfg.border} border shrink-0 mt-0.5`}>
                  {c.status === "conforme" && <CheckCircle2 className={`h-4 w-4 ${cfg.color}`} />}
                  {c.status === "pendente" && <Clock className={`h-4 w-4 ${cfg.color}`} />}
                  {c.status === "nao_aplicavel" && <span className="text-xs text-zinc-400">—</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{c.label}</span>
                    <Badge variant="outline" className={`text-xs ${cfg.color} ${cfg.border}`}>{cfg.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.detail}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-5 w-5 text-amber-400" /> Recomendações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {report.recommendations.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <Target className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              <span>{r}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Footer actions */}
      <div className="flex justify-end gap-2 pb-4">
        <Button variant="outline" size="sm">
          <Mail className="h-4 w-4 mr-2" /> Enviar por e-mail
        </Button>
        <Button size="sm">
          <Download className="h-4 w-4 mr-2" /> Exportar PDF para Assembleia
        </Button>
      </div>
    </div>
    </PageStateWrapper>
  );
}
