/**
 * T4 — Painel da Administradora (multi-tenant)
 * GuardIA Percebe — Table stakes screen for managing N units in one panel.
 * Critical for selling to administradoras and enabling white label.
 * Depends on orgs/sites/memberships (CORE-01 §4).
 *
 * States (CORE-03 §7): loading, empty, error, connector-offline, partial-sync.
 * Severity: 3 levels (critical, warning, info) — never a fourth.
 * Mock data only — no real personal data.
 */
import { useState, useMemo } from "react";
import {
  Building2, School, Warehouse, Home, Search, Cpu, Camera, Users,
  AlertTriangle, Activity, WifiOff, RefreshCw, Server, HardDrive,
  CheckCircle2, XCircle, AlertCircle, Loader2, ChevronRight, MapPin,
} from "lucide-react";
import {
  mockSites, mockOrgMetrics,
} from "@/lib/mock-data";
import type { SiteStatus, SiteSummary, OrgMetrics } from "@/lib/types";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useI18n } from "@/contexts/I18nContext";

type LoadState = "loading" | "loaded" | "empty" | "error" | "offline" | "partial";

const STATUS_CONFIG: Record<SiteStatus, { label: string; color: string; dot: string; icon: typeof CheckCircle2 }> = {
  online:   { label: "Online",   color: "text-emerald-400", dot: "bg-emerald-500", icon: CheckCircle2 },
  degraded: { label: "Degradado", color: "text-amber-400",   dot: "bg-amber-500",   icon: AlertCircle },
  offline:  { label: "Offline",  color: "text-red-400",     dot: "bg-red-500",     icon: XCircle },
};

const VERTICAL_CONFIG: Record<string, { label: string; icon: typeof Building2 }> = {
  condominio:  { label: "Condomínio",  icon: Building2 },
  escola:      { label: "Escola",      icon: School },
  camara_fria: { label: "Câmara Fria", icon: Warehouse },
  misto:       { label: "Misto",       icon: Home },
};

function formatLastSeen(iso: string | null): string {
  if (!iso) return "Nunca";
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return "Agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function PainelAdministradora() {
  const { t } = useI18n();
  const [loadState, setLoadState] = useState<LoadState>("loaded");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [verticalFilter, setVerticalFilter] = useState<string>("all");
  const [selectedSite, setSelectedSite] = useState<SiteSummary | null>(null);

  const filtered = useMemo(() => {
    let result = mockSites;
    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }
    if (verticalFilter !== "all") {
      result = result.filter((s) => s.vertical === verticalFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(q));
    }
    return result;
  }, [search, statusFilter, verticalFilter]);

  // --- STATE: loading (skeleton) ---
  if (loadState === "loading") {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-72 bg-muted/30 rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted/20 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-muted/20 rounded-lg animate-pulse" />
      </div>
    );
  }

  // --- STATE: connector offline ---
  if (loadState === "offline") {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 bg-red-950/40 border border-red-800/50 rounded-lg p-4">
          <WifiOff className="h-5 w-5 text-red-400" />
          <div>
            <p className="text-red-400 font-medium">Sem conexão com os dispositivos</p>
            <p className="text-sm text-red-400/70">O connector está offline. Não é possível obter o estado das unidades.</p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto" onClick={() => setLoadState("loaded")}>
            <RefreshCw className="h-4 w-4 mr-1" /> Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  // --- STATE: error ---
  if (loadState === "error") {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <AlertTriangle className="h-12 w-12 text-amber-400" />
        <div className="text-center">
          <p className="text-lg font-medium">Erro ao carregar unidades</p>
          <p className="text-sm text-muted-foreground">Não foi possível buscar os dados das unidades. Verifique a conexão.</p>
        </div>
        <Button variant="outline" onClick={() => setLoadState("loaded")}>
          <RefreshCw className="h-4 w-4 mr-1" /> Tentar novamente
        </Button>
      </div>
    );
  }

  // --- STATE: empty ---
  if (loadState === "empty" || filtered.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <HeaderSection />
        <OrgMetricsCards metrics={mockOrgMetrics} />
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4 border border-dashed rounded-lg">
          <Building2 className="h-12 w-12 text-muted-foreground/50" />
          <div className="text-center">
            <p className="text-lg font-medium">Nenhuma unidade encontrada</p>
            <p className="text-sm text-muted-foreground">Ajuste os filtros ou cadastre a primeira unidade.</p>
          </div>
          <Button>
            <Building2 className="h-4 w-4 mr-1" /> Cadastrar unidade
          </Button>
        </div>
      </div>
    );
  }

  // --- STATE: partial sync ---
  const partialBadge = loadState === "partial" ? (
    <div className="flex items-center gap-2 bg-amber-950/30 border border-amber-800/40 rounded px-3 py-1.5">
      <AlertTriangle className="h-4 w-4 text-amber-400" />
      <span className="text-sm text-amber-400">Sincronização parcial — 2 unidades sem confirmar estado do connector</span>
    </div>
  ) : null;

  return (
    <div className="p-6 space-y-6">
      <HeaderSection />
      {partialBadge}
      <OrgMetricsCards metrics={mockOrgMetrics} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome da unidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="degraded">Degradado</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
        <Select value={verticalFilter} onValueChange={setVerticalFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Todas as verticais" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as verticais</SelectItem>
            <SelectItem value="condominio">Condomínio</SelectItem>
            <SelectItem value="escola">Escola</SelectItem>
            <SelectItem value="camara_fria">Câmara Fria</SelectItem>
            <SelectItem value="misto">Misto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sites Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unidade</TableHead>
              <TableHead>Vertical</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Câmeras</TableHead>
              <TableHead className="text-center">Dispositivos</TableHead>
              <TableHead className="text-center">Pessoas</TableHead>
              <TableHead className="text-center">Eventos hoje</TableHead>
              <TableHead className="text-center">Alertas</TableHead>
              <TableHead>Disco</TableHead>
              <TableHead>Último contato</TableHead>
              <TableHead>Connector</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((site) => {
              const sc = STATUS_CONFIG[site.status];
              const vc = VERTICAL_CONFIG[site.vertical];
              return (
                <TableRow
                  key={site.id}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => setSelectedSite(site)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <vc.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{site.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{vc.label}</span>
                  </TableCell>
                  <TableCell>
                    <div className={`flex items-center gap-1.5 ${sc.color}`}>
                      <span className={`h-2 w-2 rounded-full ${sc.dot}`} />
                      <span className="text-sm">{sc.label}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    <span className={site.camerasOnline < site.camerasTotal ? "text-amber-400" : ""}>
                      {site.camerasOnline}/{site.camerasTotal}
                    </span>
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    <span className={site.devicesOnline < site.devicesTotal ? "text-amber-400" : ""}>
                      {site.devicesOnline}/{site.devicesTotal}
                    </span>
                  </TableCell>
                  <TableCell className="text-center tabular-nums text-muted-foreground">{site.personsRegistered}</TableCell>
                  <TableCell className="text-center tabular-nums">{site.eventsToday}</TableCell>
                  <TableCell className="text-center tabular-nums">
                    {site.alertsToday > 0 ? (
                      <span className="text-amber-400">{site.alertsToday}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 w-24">
                      <Progress value={site.storageUsedPct} className="h-2" />
                      <span className={`text-xs tabular-nums ${site.storageUsedPct > 70 ? "text-amber-400" : "text-muted-foreground"}`}>
                        {site.storageUsedPct}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatLastSeen(site.lastSeenAt)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono">{site.connectorVersion ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        {filtered.length} unidade(s) · {mockOrgMetrics.onlineSites} online · {mockOrgMetrics.degradedSites} degradadas · {mockOrgMetrics.offlineSites} offline
      </p>

      {/* Site Detail Dialog */}
      <Dialog open={!!selectedSite} onOpenChange={(open) => !open && setSelectedSite(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedSite?.name}</DialogTitle>
            <DialogDescription>
              {selectedSite ? VERTICAL_CONFIG[selectedSite.vertical].label : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedSite && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                  <span>Câmeras: {selectedSite.camerasOnline}/{selectedSite.camerasTotal}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  <span>Dispositivos: {selectedSite.devicesOnline}/{selectedSite.devicesTotal}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Pessoas: {selectedSite.personsRegistered}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span>Eventos hoje: {selectedSite.eventsToday}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <span>Connector: {selectedSite.connectorVersion ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <span>Disco: {selectedSite.storageUsedPct}%</span>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button variant="outline" className="flex-1">Ver eventos</Button>
                <Button variant="outline" className="flex-1">Ver dispositivos</Button>
                <Button className="flex-1">Abrir painel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HeaderSection() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Painel da Administradora</h1>
        <p className="text-sm text-muted-foreground">Gestão multi-tenant de todas as unidades</p>
      </div>
      <Button>
        <Building2 className="h-4 w-4 mr-1" /> Cadastrar unidade
      </Button>
    </div>
  );
}

function OrgMetricsCards({ metrics }: { metrics: OrgMetrics }) {
  const cards = [
    { label: "Unidades", value: metrics.totalSites, sub: `${metrics.onlineSites} online`, icon: Building2, color: "text-blue-400" },
    { label: "Câmeras", value: metrics.totalCameras, sub: `${metrics.totalDevices} dispositivos`, icon: Camera, color: "text-cyan-400" },
    { label: "Pessoas", value: metrics.totalPersons, sub: "cadastradas", icon: Users, color: "text-emerald-400" },
    { label: "Eventos hoje", value: metrics.eventsToday, sub: `${metrics.alertsToday} alertas`, icon: Activity, color: "text-amber-400" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold tabular-nums">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-xs text-muted-foreground/70">{c.sub}</p>
              </div>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}


