/**
 * T2 — Reservas de Áreas Comuns
 * CORE-04 §2: Table stakes obrigatória para condomínio.
 * CORE-03 §7: 5 estados obrigatórios (carregando, vazio, erro, connector offline, sincronização parcial).
 * CORE-01: Tipos canônicos (CommonArea, Reservation, ReservationMetrics).
 * CORE-04 §8: Frontend-only, mock sintético, sem backend/telemetria.
 */
import { useState, useEffect, useMemo } from "react";
import {
  Calendar, Clock, Users, DollarSign, CheckCircle2, XCircle, Plus, MapPin,
  CalendarDays, TrendingUp, Ban, FileText, ChevronRight,
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
  CommonArea, Reservation, ReservationStatus, AreaType,
} from "@/lib/types";
import {
  mockCommonAreas, mockReservations, mockReservationMetrics,
} from "@/lib/mock-data";

// O union dos 5 estados vem do PageStateWrapper — não redeclarar (§14.5).

const STATUS_CONFIG: Record<ReservationStatus, { label: string; color: string; dot: string; icon: typeof CheckCircle2 }> = {
  pendente:   { label: "Pendente",   color: "text-amber-400",  dot: "bg-amber-400",  icon: Clock },
  aprovada:   { label: "Aprovada",   color: "text-emerald-400", dot: "bg-emerald-400", icon: CheckCircle2 },
  rejeitada:  { label: "Rejeitada",  color: "text-red-400",    dot: "bg-red-400",    icon: XCircle },
  cancelada:  { label: "Cancelada",  color: "text-zinc-400",   dot: "bg-zinc-400",   icon: Ban },
  concluida:  { label: "Concluída",  color: "text-blue-400",   dot: "bg-blue-400",   icon: CheckCircle2 },
};

const AREA_ICONS: Record<AreaType, string> = {
  salao: "🎉", churrasqueira: "🍖", academia: "💪",
  quadra: "⚽", piscina: "🏊", sauna: "🧖",
};

const AREA_LABELS: Record<AreaType, string> = {
  salao: "Salão de Festas", churrasqueira: "Churrasqueira",
  academia: "Academia", quadra: "Quadra",
  piscina: "Piscina", sauna: "Sauna",
};

export default function Reservas() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [areas] = useState<CommonArea[]>(mockCommonAreas);
  const [metrics] = useState(mockReservationMetrics);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    setLoadState("loading");
    const timer = setTimeout(() => {
      try {
        if (mockReservations.length === 0) {
          setLoadState("empty");
        } else {
          setReservations(mockReservations);
          setLoadState("loaded");
        }
      } catch {
        setLoadState("error");
      }
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (areaFilter !== "all" && r.areaType !== areaFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.residentName.toLowerCase().includes(q) &&
            !r.areaName.toLowerCase().includes(q) &&
            !r.unitNumber.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [reservations, statusFilter, areaFilter, search]);

  // CORE-03 §7: os 5 estados obrigatórios, via PageStateWrapper.
  // A descrição do vazio muda se há filtro ativo — preservado do original.
  const hasFilters = Boolean(search || statusFilter !== "all" || areaFilter !== "all");

  return (
    <PageStateWrapper
      state={loadState}
      onRetry={() => setLoadState("loaded")}
      emptyTitle={t("res.empty_title")}
      emptyDescription={t(hasFilters ? "res.empty_filtered" : "res.empty_desc")}
      partialMessage={`${t("res.partial_showing")} ${reservations.length}/${metrics.total} ${t("res.partial_items")}`}
    >
    <div className="space-y-6">
      {/* Metrics */}
      <MetricsCards metrics={metrics} />


      {/* Actions bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Buscar por morador, área ou unidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="aprovada">Aprovadas</SelectItem>
              <SelectItem value="rejeitada">Rejeitadas</SelectItem>
              <SelectItem value="cancelada">Canceladas</SelectItem>
              <SelectItem value="concluida">Concluídas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="Área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as áreas</SelectItem>
              <SelectItem value="salao">Salão de Festas</SelectItem>
              <SelectItem value="churrasqueira">Churrasqueira</SelectItem>
              <SelectItem value="academia">Academia</SelectItem>
              <SelectItem value="quadra">Quadra</SelectItem>
              <SelectItem value="piscina">Piscina</SelectItem>
              <SelectItem value="sauna">Sauna</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova Reserva
        </Button>
      </div>

      {/* Reservations list */}
      <div className="grid gap-3">
        {filtered.map((res) => {
          const cfg = STATUS_CONFIG[res.status];
          const StatusIcon = cfg.icon;
          return (
            <Card
              key={res.id}
              className="cursor-pointer hover:border-primary/40 hover:bg-accent/30 transition-colors"
              onClick={() => setSelectedRes(res)}
            >
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-2xl shrink-0">
                  {AREA_ICONS[res.areaType]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{res.areaName}</span>
                    <span className={`flex items-center gap-1 text-xs ${cfg.color}`}>
                      <StatusIcon className="h-3 w-3" /> {cfg.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {res.date}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {res.startTime}–{res.endTime}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {res.unitNumber}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {res.attendees} pessoas</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {res.fee > 0 && (
                    <div className="text-right">
                      <div className="text-sm font-medium">R$ {res.fee}</div>
                      <div className={`text-xs ${res.feePaid ? "text-emerald-400" : "text-amber-400"}`}>
                        {res.feePaid ? "Pago" : "Pendente"}
                      </div>
                    </div>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selectedRes} onOpenChange={(open) => !open && setSelectedRes(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{selectedRes && AREA_ICONS[selectedRes.areaType]}</span>
              {selectedRes?.areaName}
            </DialogTitle>
            <DialogDescription>Detalhes da reserva</DialogDescription>
          </DialogHeader>
          {selectedRes && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Morador" value={selectedRes.residentName} />
                <Field label="Unidade" value={selectedRes.unitNumber} />
                <Field label="Data" value={selectedRes.date} />
                <Field label="Horário" value={`${selectedRes.startTime} – ${selectedRes.endTime}`} />
                <Field label="Pessoas" value={`${selectedRes.attendees}`} />
                <Field label="Recorrência" value={selectedRes.recurrence === "unica" ? "Única" : selectedRes.recurrence === "semanal" ? "Semanal" : "Mensal"} />
                <Field label="Taxa" value={selectedRes.fee > 0 ? `R$ ${selectedRes.fee}` : "Gratuita"} />
                <Field label="Pagamento" value={selectedRes.fee > 0 ? (selectedRes.feePaid ? "Pago" : "Pendente") : "—"} />
              </div>
              {selectedRes.notes && (
                <div>
                  <span className="text-xs text-muted-foreground">Observações</span>
                  <p className="text-sm mt-1">{selectedRes.notes}</p>
                </div>
              )}
              {selectedRes.status === "rejeitada" && selectedRes.rejectedReason && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                  <span className="font-medium">Motivo da rejeição: </span>{selectedRes.rejectedReason}
                </div>
              )}
              {selectedRes.approvedBy && (
                <div className="text-xs text-muted-foreground">
                  Aprovado por {selectedRes.approvedBy} em {selectedRes.approvedAt?.split("T")[0] ?? "—"}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                {selectedRes.status === "pendente" && (
                  <>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar
                    </Button>
                    <Button size="sm" variant="destructive">
                      <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                    </Button>
                  </>
                )}
                {(selectedRes.status === "aprovada" || selectedRes.status === "pendente") && (
                  <Button size="sm" variant="outline">
                    <Ban className="h-4 w-4 mr-1" /> Cancelar
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New reservation dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Reserva</DialogTitle>
            <DialogDescription>Solicitar reserva de área comum</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Área comum</label>
              <Select defaultValue="">
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a área" /></SelectTrigger>
                <SelectContent>
                  {areas.filter(a => a.active).map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {AREA_ICONS[a.type]} {a.name} (cap. {a.capacity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Data</label>
                <Input type="date" className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Horário</label>
                <Input placeholder="18:00 – 23:00" className="mt-1" disabled />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Nº de pessoas</label>
              <Input type="number" placeholder="20" className="mt-1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Observações</label>
              <Input placeholder="Motivo da reserva..." className="mt-1" />
            </div>
            <Button className="w-full" onClick={() => setShowNewDialog(false)}>
              Solicitar Reserva
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </PageStateWrapper>
  );
}

// ===== Sub-components =====

function MetricsCards({ metrics }: { metrics: typeof mockReservationMetrics }) {
  const cards = [
    { label: "Pendentes", value: metrics.pendentes, icon: Clock, color: "text-amber-400" },
    { label: "Aprovadas", value: metrics.aprovadas, icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Concluídas", value: metrics.concluidas, icon: CalendarDays, color: "text-blue-400" },
    { label: "Receita do mês", value: `R$ ${metrics.receitaMes}`, icon: DollarSign, color: "text-emerald-400" },
    { label: "Taxa de aprovação", value: `${metrics.taxaAprovacao}%`, icon: TrendingUp, color: "text-primary" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm font-medium mt-0.5">{value}</p>
    </div>
  );
}
