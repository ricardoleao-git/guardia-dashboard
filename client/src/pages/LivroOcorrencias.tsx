/**
 * T6 — Livro de Ocorrências
 * CORE-04 §2: Table stakes obrigatória para condomínio.
 * CORE-03 §7: 5 estados obrigatórios (carregando, vazio, erro, connector offline, sincronização parcial).
 * CORE-01: Tipos canônicos (Occurrence, OccurrenceMetrics).
 * CORE-04 §8: Frontend-only, mock sintético, sem backend/telemetria.
 * Semântica de cor: 3 níveis de severidade conforme CORE-03 (baixa=info, media=amber, alta/critica=red).
 */
import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle, Plus, Search,
  FileText, Camera, Shield, Clock, MapPin, User, Paperclip,
  CheckCircle2, ChevronRight, Filter, Download, AlertOctagon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useI18n } from "@/contexts/I18nContext";
import { PageStateWrapper, type LoadState } from "@/components/PageStateWrapper";
import {
  Occurrence, OccurrenceStatus, OccurrenceSeverity, OccurrenceType,
} from "@/lib/types";
import { mockOccurrences, mockOccurrenceMetrics } from "@/lib/mock-data";

// O union dos 5 estados vem do PageStateWrapper — não redeclarar (§14.5).

const SEVERITY_CONFIG: Record<OccurrenceSeverity, { label: string; color: string; bg: string; border: string }> = {
  baixa:   { label: "Baixa",   color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/30" },
  media:   { label: "Média",   color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/30" },
  alta:    { label: "Alta",    color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/30" },
  critica: { label: "Crítica", color: "text-red-500",    bg: "bg-red-500/15",    border: "border-red-500/40" },
};

const STATUS_CONFIG: Record<OccurrenceStatus, { label: string; color: string; dot: string }> = {
  aberta:        { label: "Aberta",       color: "text-red-400",    dot: "bg-red-400" },
  em_andamento:  { label: "Em andamento", color: "text-amber-400",  dot: "bg-amber-400" },
  resolvida:     { label: "Resolvida",    color: "text-emerald-400", dot: "bg-emerald-400" },
  arquivada:     { label: "Arquivada",    color: "text-zinc-400",   dot: "bg-zinc-400" },
};

const TYPE_LABELS: Record<OccurrenceType, string> = {
  invasao: "Invasão", roubo: "Roubo/Furto", vandalismo: "Vandalismo",
  incendio: "Incêndio", enchente: "Enchente", acidente: "Acidente",
  conflito: "Conflito", manutencao: "Manutenção", animal_solto: "Animal Solto",
  veiculo_irregular: "Veículo Irregular", ruido: "Ruído", outro: "Outro",
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function LivroOcorrencias() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [metrics] = useState(mockOccurrenceMetrics);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Occurrence | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    setLoadState("loading");
    const timer = setTimeout(() => {
      try {
        if (mockOccurrences.length === 0) {
          setLoadState("empty");
        } else {
          setOccurrences(mockOccurrences);
          setLoadState("loaded");
        }
      } catch {
        setLoadState("error");
      }
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    return occurrences.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (severityFilter !== "all" && o.severity !== severityFilter) return false;
      if (typeFilter !== "all" && o.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!o.title.toLowerCase().includes(q) &&
            !o.protocol.toLowerCase().includes(q) &&
            !o.location.toLowerCase().includes(q) &&
            !o.reportedBy.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [occurrences, statusFilter, severityFilter, typeFilter, search]);

  // CORE-03 §7: os 5 estados obrigatórios, via PageStateWrapper.
  // A descrição do vazio muda se há filtro ativo — preservado do original.
  const hasFilters = Boolean(search || statusFilter !== "all" || severityFilter !== "all" || typeFilter !== "all");

  return (
    <PageStateWrapper
      state={loadState}
      onRetry={() => setLoadState("loaded")}
      emptyTitle={t("occ.empty_title")}
      emptyDescription={t(hasFilters ? "occ.empty_filtered" : "occ.empty_desc")}
      partialMessage={`${t("occ.partial_showing")} ${occurrences.length}/${metrics.total} ${t("occ.partial_items")}`}
    >
    <div className="space-y-6">
      {/* Metrics */}
      <MetricsCards metrics={metrics} />


      {/* Actions bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Input
            placeholder="Buscar por protocolo, título, local..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="aberta">Abertas</SelectItem>
              <SelectItem value="em_andamento">Em andamento</SelectItem>
              <SelectItem value="resolvida">Resolvidas</SelectItem>
              <SelectItem value="arquivada">Arquivadas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="sm:w-36"><SelectValue placeholder="Severidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toda severidade</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="media">Média</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="critica">Crítica</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="sm:w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" title="Exportar PDF">
            <Download className="h-4 w-4" />
          </Button>
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nova Ocorrência
          </Button>
        </div>
      </div>

      {/* Occurrences list */}
      <div className="grid gap-3">
        {filtered.map((occ) => {
          const sev = SEVERITY_CONFIG[occ.severity];
          const st = STATUS_CONFIG[occ.status];
          return (
            <Card
              key={occ.id}
              className="cursor-pointer hover:border-primary/40 hover:bg-accent/30 transition-colors"
              onClick={() => setSelected(occ)}
            >
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${sev.bg} ${sev.border} border shrink-0`}>
                    {occ.severity === "critica" || occ.severity === "alta" ? (
                      <AlertOctagon className={`h-5 w-5 ${sev.color}`} />
                    ) : (
                      <FileText className={`h-5 w-5 ${sev.color}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{occ.protocol}</span>
                      <Badge variant="outline" className={`text-xs ${sev.color} ${sev.border}`}>{sev.label}</Badge>
                      <span className={`flex items-center gap-1 text-xs ${st.color}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} /> {st.label}
                      </span>
                      {occ.policeReport && (
                        <Badge variant="outline" className="text-xs text-red-400 border-red-500/30">
                          <Shield className="h-3 w-3 mr-1" /> BO
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-medium mt-1 truncate">{occ.title}</h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {occ.location}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDateTime(occ.reportedAt)}</span>
                      <span className="flex items-center gap-1"><User className="h-3 w-3" /> {occ.reportedBy}</span>
                      {occ.attachments.length > 0 && (
                        <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" /> {occ.attachments.length} anexo(s)</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">{selected?.protocol}</span>
              {selected && (
                <Badge variant="outline" className={SEVERITY_CONFIG[selected.severity].color}>
                  {SEVERITY_CONFIG[selected.severity].label}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>{selected?.title}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Status and type */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{TYPE_LABELS[selected.type]}</Badge>
                <span className={`flex items-center gap-1 text-sm ${STATUS_CONFIG[selected.status].color}`}>
                  <span className={`h-2 w-2 rounded-full ${STATUS_CONFIG[selected.status].dot}`} />
                  {STATUS_CONFIG[selected.status].label}
                </span>
              </div>

              {/* Description */}
              <div>
                <span className="text-xs text-muted-foreground">Descrição</span>
                <p className="text-sm mt-1">{selected.description}</p>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Local" value={selected.location} icon={MapPin} />
                <Field label="Unidade" value={selected.unitNumber || "—"} icon={MapPin} />
                <Field label="Registrado por" value={selected.reportedBy} icon={User} />
                <Field label="Registrado em" value={formatDateTime(selected.reportedAt)} icon={Clock} />
                {selected.resolvedAt && (
                  <Field label="Resolvido em" value={formatDateTime(selected.resolvedAt)} icon={CheckCircle2} />
                )}
                {selected.resolvedBy && (
                  <Field label="Resolvido por" value={selected.resolvedBy} icon={User} />
                )}
              </div>

              {/* Resolution */}
              {selected.resolution && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <span className="text-xs text-emerald-400 font-medium">Resolução</span>
                  <p className="text-sm mt-1">{selected.resolution}</p>
                </div>
              )}

              {/* Police report */}
              {selected.policeReport && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm">
                  <Shield className="h-4 w-4 text-red-400" />
                  <span className="text-red-400 font-medium">Boletim de Ocorrência: </span>
                  <span>{selected.policeReportNumber}</span>
                </div>
              )}

              {/* Linked cameras and events */}
              {(selected.linkedCameras.length > 0 || selected.linkedEvents.length > 0) && (
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground">Vinculado ao GuardIA Percebe</span>
                  <div className="flex flex-wrap gap-2">
                    {selected.linkedCameras.map((c) => (
                      <Badge key={c} variant="outline" className="text-xs">
                        <Camera className="h-3 w-3 mr-1" /> Câmera {c}
                      </Badge>
                    ))}
                    {selected.linkedEvents.map((e) => (
                      <Badge key={e} variant="outline" className="text-xs">
                        <FileText className="h-3 w-3 mr-1" /> Evento {e}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {selected.attachments.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground">Anexos</span>
                  <div className="grid gap-2">
                    {selected.attachments.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <span>{a.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notified */}
              {selected.notified.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">Notificados</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selected.notified.map((n) => (
                      <Badge key={n} variant="secondary" className="text-xs">{n}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Witnesses */}
              {selected.witnesses.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">Testemunhas</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selected.witnesses.map((w) => (
                      <Badge key={w} variant="secondary" className="text-xs">{w}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                {(selected.status === "aberta" || selected.status === "em_andamento") && (
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Marcar como Resolvida
                  </Button>
                )}
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-1" /> Exportar PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New occurrence dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Ocorrência</DialogTitle>
            <DialogDescription>Novo registro no livro de ocorrências</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Tipo</label>
              <Select defaultValue="" onValueChange={setTypeFilter}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Severidade</label>
              <Select defaultValue="media">
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Título</label>
              <Input placeholder="Resumo da ocorrência..." className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Local</label>
              <Input placeholder="Ex: Estacionamento - Bloco B" className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Descrição</label>
              <Input placeholder="Descreva o que aconteceu..." className="mt-1" />
            </div>
            <Button className="w-full" onClick={() => setShowNewDialog(false)}>
              Registrar Ocorrência
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </PageStateWrapper>
  );
}

// ===== Sub-components =====

function MetricsCards({ metrics }: { metrics: typeof mockOccurrenceMetrics }) {
  const cards = [
    { label: "Abertas", value: metrics.abertas, icon: AlertOctagon, color: "text-red-400" },
    { label: "Em andamento", value: metrics.emAndamento, icon: Clock, color: "text-amber-400" },
    { label: "Resolvidas", value: metrics.resolvidas, icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Críticas", value: metrics.criticas, icon: AlertTriangle, color: "text-red-500" },
    { label: "Com boletim", value: metrics.comBoletim, icon: Shield, color: "text-red-400" },
    { label: "Tempo médio", value: metrics.tempoMedioResolucao, icon: Clock, color: "text-primary" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label}>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{c.label}</span>
                <Icon className={`h-4 w-4 ${c.color}`} />
              </div>
              <div className={`text-xl font-bold mt-1 ${c.color}`}>{c.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Field({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof MapPin }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </span>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  );
}
