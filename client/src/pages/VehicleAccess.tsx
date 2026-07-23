/**
 * VehicleAccess — Clausura Veicular (LPR + UHF + Facial).
 *
 * Fase 3.2 do roadmap: Correlação veicular.
 * Mostra eventos de entrada/saída de veículos com:
 * - Reconhecimento de placa (LPR)
 * - Tag UHF (long range)
 * - Match facial do motorista
 * - Status de autorização
 * - Timeline de clausura (entrada → cancela → facial → liberação)
 */
import { useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import {
  Car, Search, Filter, Download, CheckCircle2, XCircle, AlertCircle,
  Clock, Camera, Radio, ScanFace, ArrowRight, ArrowLeft, ChevronDown,
  ChevronUp, Shield, ShieldAlert, ShieldCheck, Plus, Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";

// ===== Types =====
interface VehicleEvent {
  id: string;
  plate: string;
  vehicleModel: string;
  vehicleColor: string;
  driverName: string;
  driverMatch: number; // facial match score, 0 = unknown
  driverFaceList: "branca" | "negra" | "estranho" | "na";
  uhfTag: string;
  uhfValid: boolean;
  cameraId: string;
  cameraName: string;
  timestamp: string;
  date: string;
  time: string;
  direction: "entry" | "exit";
  status: "authorized" | "denied" | "pending" | "manual";
  gateAction: "opened" | "denied" | "manual_open" | "pending";
  duration?: string;
}

// ===== Mock data =====
const mockVehicleEvents: VehicleEvent[] = [
  { id: "v1", plate: "ABC-1234", vehicleModel: "Toyota Corolla", vehicleColor: "Prata", driverName: "João Pedro Silva", driverMatch: 92, driverFaceList: "branca", uhfTag: "TAG-001-A", uhfValid: true, cameraId: "D3", cameraName: "Estacionamento", timestamp: "2026-07-23T07:32:00", date: "2026-07-23", time: "07:32", direction: "entry", status: "authorized", gateAction: "opened" },
  { id: "v2", plate: "DEF-5678", vehicleModel: "Honda Civic", vehicleColor: "Preto", driverName: "Maria Eduarda Costa", driverMatch: 95, driverFaceList: "branca", uhfTag: "TAG-002-B", uhfValid: true, cameraId: "D3", cameraName: "Estacionamento", timestamp: "2026-07-23T07:45:00", date: "2026-07-23", time: "07:45", direction: "entry", status: "authorized", gateAction: "opened" },
  { id: "v3", plate: "GHI-9012", vehicleModel: "Fiat Toro", vehicleColor: "Branco", driverName: "Desconhecido", driverMatch: 0, driverFaceList: "estranho", uhfTag: "", uhfValid: false, cameraId: "D3", cameraName: "Estacionamento", timestamp: "2026-07-23T09:15:00", date: "2026-07-23", time: "09:15", direction: "entry", status: "pending", gateAction: "pending" },
  { id: "v4", plate: "JKL-3456", vehicleModel: "Chevrolet Onix", vehicleColor: "Vermelho", driverName: "Carlos Eduardo Lima", driverMatch: 87, driverFaceList: "branca", uhfTag: "TAG-003-C", uhfValid: true, cameraId: "D3", cameraName: "Estacionamento", timestamp: "2026-07-23T08:10:00", date: "2026-07-23", time: "08:10", direction: "entry", status: "authorized", gateAction: "opened" },
  { id: "v5", plate: "ABC-1234", vehicleModel: "Toyota Corolla", vehicleColor: "Prata", driverName: "João Pedro Silva", driverMatch: 90, driverFaceList: "branca", uhfTag: "TAG-001-A", uhfValid: true, cameraId: "D3", cameraName: "Estacionamento", timestamp: "2026-07-23T17:42:00", date: "2026-07-23", time: "17:42", direction: "exit", status: "authorized", gateAction: "opened", duration: "10h 10min" },
  { id: "v6", plate: "MNO-7890", vehicleModel: "VW Gol", vehicleColor: "Azul", driverName: "Suspeito Lista Negra", driverMatch: 81, driverFaceList: "negra", uhfTag: "", uhfValid: false, cameraId: "D3", cameraName: "Estacionamento", timestamp: "2026-07-23T14:22:00", date: "2026-07-23", time: "14:22", direction: "entry", status: "denied", gateAction: "denied" },
  { id: "v7", plate: "DEF-5678", vehicleModel: "Honda Civic", vehicleColor: "Preto", driverName: "Maria Eduarda Costa", driverMatch: 93, driverFaceList: "branca", uhfTag: "TAG-002-B", uhfValid: true, cameraId: "D3", cameraName: "Estacionamento", timestamp: "2026-07-23T18:05:00", date: "2026-07-23", time: "18:05", direction: "exit", status: "authorized", gateAction: "opened", duration: "10h 20min" },
  { id: "v8", plate: "PQR-2345", vehicleModel: "Hyundai HB20", vehicleColor: "Cinza", driverName: "Ana Beatriz Rocha", driverMatch: 89, driverFaceList: "branca", uhfTag: "TAG-004-D", uhfValid: true, cameraId: "D3", cameraName: "Estacionamento", timestamp: "2026-07-23T07:55:00", date: "2026-07-23", time: "07:55", direction: "entry", status: "authorized", gateAction: "opened" },
  { id: "v9", plate: "PQR-2345", vehicleModel: "Hyundai HB20", vehicleColor: "Cinza", driverName: "Ana Beatriz Rocha", driverMatch: 91, driverFaceList: "branca", uhfTag: "TAG-004-D", uhfValid: true, cameraId: "D3", cameraName: "Estacionamento", timestamp: "2026-07-23T17:50:00", date: "2026-07-23", time: "17:50", direction: "exit", status: "authorized", gateAction: "opened", duration: "9h 55min" },
  { id: "v10", plate: "STU-6789", vehicleModel: "Fiat Strada", vehicleColor: "Branco", driverName: "Entregador Express", driverMatch: 0, driverFaceList: "estranho", uhfTag: "", uhfValid: false, cameraId: "D3", cameraName: "Estacionamento", timestamp: "2026-07-23T11:30:00", date: "2026-07-23", time: "11:30", direction: "entry", status: "manual", gateAction: "manual_open" },
];

const statusConfig = {
  authorized: { label: "Autorizado", icon: ShieldCheck, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
  denied: { label: "Negado", icon: ShieldAlert, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  pending: { label: "Pendente", icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  manual: { label: "Manual", icon: Shield, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
};

export default function VehicleAccess() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAuthorized, setShowAuthorized] = useState(true);

  const filteredEvents = useMemo(() => {
    let filtered = [...mockVehicleEvents];
    if (statusFilter !== "all") filtered = filtered.filter(e => e.status === statusFilter);
    if (directionFilter !== "all") filtered = filtered.filter(e => e.direction === directionFilter);
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(e =>
        e.plate.toLowerCase().includes(s) ||
        e.driverName.toLowerCase().includes(s) ||
        e.vehicleModel.toLowerCase().includes(s) ||
        e.uhfTag.toLowerCase().includes(s)
      );
    }
    filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return filtered;
  }, [search, statusFilter, directionFilter]);

  const stats = useMemo(() => {
    const total = mockVehicleEvents.length;
    const authorized = mockVehicleEvents.filter(e => e.status === "authorized").length;
    const denied = mockVehicleEvents.filter(e => e.status === "denied").length;
    const pending = mockVehicleEvents.filter(e => e.status === "pending").length;
    const entries = mockVehicleEvents.filter(e => e.direction === "entry").length;
    const exits = mockVehicleEvents.filter(e => e.direction === "exit").length;
    const uniqueVehicles = new Set(mockVehicleEvents.map(e => e.plate)).size;
    return { total, authorized, denied, pending, entries, exits, uniqueVehicles };
  }, []);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeView="vehicle-access" onNavigate={() => {}} mobileOpen={false} onMobileClose={() => {}} />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-60">
        <MobileHeader onMenuClick={() => {}} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">{t("vehicle.title")}</h1>
              <p className="text-sm text-muted-foreground mt-1">LPR + UHF + Facial — correlação de entrada/saída de veículos</p>
            </div>
            <button className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Cadastrar Veículo
            </button>
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Car className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] text-muted-foreground">Veículos Únicos</span>
              </div>
              <p className="font-display text-xl font-bold">{stats.uniqueVehicles}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <ArrowRight className="h-3.5 w-3.5 text-green-400" />
                <span className="text-[11px] text-muted-foreground">Entradas / Saídas</span>
              </div>
              <p className="font-display text-xl font-bold">{stats.entries} / {stats.exits}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="h-3.5 w-3.5 text-green-400" />
                <span className="text-[11px] text-muted-foreground">Autorizados</span>
              </div>
              <p className="font-display text-xl font-bold text-green-400">{stats.authorized}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                <span className="text-[11px] text-muted-foreground">Negados / Pendentes</span>
              </div>
              <p className="font-display text-xl font-bold">
                <span className="text-red-400">{stats.denied}</span>
                <span className="text-muted-foreground mx-1">/</span>
                <span className="text-amber-400">{stats.pending}</span>
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
              >
                <option value="all">Todos os status</option>
                <option value="authorized">Autorizado</option>
                <option value="denied">Negado</option>
                <option value="pending">Pendente</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
            >
              <option value="all">Entradas e saídas</option>
              <option value="entry">Apenas entradas</option>
              <option value="exit">Apenas saídas</option>
            </select>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Placa, motorista, modelo, tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-border bg-background pl-7 pr-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <button className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors">
              <Download className="h-3.5 w-3.5" /> Exportar
            </button>
          </div>

          {/* Events table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">Hora</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">Placa</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground hidden sm:table-cell">Veículo</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground hidden md:table-cell">Motorista</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-muted-foreground">UHF</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-muted-foreground hidden lg:table-cell">Face</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-muted-foreground">Dir.</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-muted-foreground">Status</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                      <Car className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      Nenhum evento veicular encontrado
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((ev) => {
                    const isExpanded = expandedId === ev.id;
                    const sc = statusConfig[ev.status];
                    const StatusIcon = sc.icon;
                    return (
                      <>
                        <tr
                          key={ev.id}
                          className="hover:bg-accent/30 transition-colors cursor-pointer"
                          onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                        >
                          <td className="px-3 py-2.5">
                            <div className="font-mono text-xs font-semibold">{ev.time}</div>
                            <div className="text-[10px] text-muted-foreground">{ev.date}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="inline-flex items-center rounded border border-border bg-muted/50 px-2 py-0.5 font-mono text-xs font-bold tracking-wider">
                              {ev.plate}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 hidden sm:table-cell">
                            <div className="text-xs">{ev.vehicleModel}</div>
                            <div className="text-[10px] text-muted-foreground">{ev.vehicleColor}</div>
                          </td>
                          <td className="px-3 py-2.5 hidden md:table-cell">
                            <div className="text-xs font-medium">{ev.driverName}</div>
                            {ev.driverMatch > 0 && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <div className="h-1 w-12 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={cn("h-full", ev.driverMatch >= 85 ? "bg-green-500" : ev.driverMatch >= 70 ? "bg-amber-500" : "bg-red-500")}
                                    style={{ width: `${ev.driverMatch}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono text-muted-foreground">{ev.driverMatch}%</span>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {ev.uhfTag ? (
                              <div className="flex flex-col items-center">
                                <Radio className={cn("h-3.5 w-3.5", ev.uhfValid ? "text-green-400" : "text-red-400")} />
                                <span className="text-[9px] font-mono text-muted-foreground mt-0.5">{ev.uhfTag}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/50">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center hidden lg:table-cell">
                            {ev.driverMatch > 0 ? (
                              <div className="flex items-center justify-center gap-1">
                                <ScanFace className={cn("h-3.5 w-3.5", ev.driverFaceList === "branca" ? "text-green-400" : ev.driverFaceList === "negra" ? "text-red-400" : "text-amber-400")} />
                                <span className="text-[10px]">{ev.driverMatch}%</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/50">Sem match</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {ev.direction === "entry" ? (
                              <ArrowRight className="h-4 w-4 text-green-400 mx-auto" />
                            ) : (
                              <ArrowLeft className="h-4 w-4 text-blue-400 mx-auto" />
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium", sc.bg, sc.color, sc.border)}>
                              <StatusIcon className="h-3 w-3" />
                              {sc.label}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={ev.id + "-detail"} className="bg-muted/20">
                            <td colSpan={9} className="px-6 py-4">
                              {/* Clausura flow */}
                              <div className="mb-4">
                                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("vehicle.flow")}</h4>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* Step 1: LPR */}
                                  <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                                    <Camera className="h-4 w-4 text-primary" />
                                    <div>
                                      <p className="text-[10px] text-muted-foreground">LPR</p>
                                      <p className="text-xs font-mono font-bold">{ev.plate}</p>
                                    </div>
                                  </div>
                                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                  {/* Step 2: UHF */}
                                  <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", ev.uhfTag ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5")}>
                                    <Radio className={cn("h-4 w-4", ev.uhfTag ? "text-green-400" : "text-red-400")} />
                                    <div>
                                      <p className="text-[10px] text-muted-foreground">UHF Tag</p>
                                      <p className="text-xs font-mono">{ev.uhfTag || "Não detectada"}</p>
                                    </div>
                                  </div>
                                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                  {/* Step 3: Facial */}
                                  <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", ev.driverMatch > 0 ? "border-blue-500/20 bg-blue-500/5" : "border-amber-500/20 bg-amber-500/5")}>
                                    <ScanFace className={cn("h-4 w-4", ev.driverMatch > 0 ? "text-blue-400" : "text-amber-400")} />
                                    <div>
                                      <p className="text-[10px] text-muted-foreground">Facial</p>
                                      <p className="text-xs">{ev.driverMatch > 0 ? `${ev.driverMatch}% match` : "Sem match"}</p>
                                    </div>
                                  </div>
                                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                  {/* Step 4: Decision */}
                                  <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2", sc.bg, sc.border)}>
                                    <StatusIcon className={cn("h-4 w-4", sc.color)} />
                                    <div>
                                      <p className="text-[10px] text-muted-foreground">Decisão</p>
                                      <p className={cn("text-xs font-semibold", sc.color)}>{sc.label}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Details grid */}
                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Veículo</p>
                                  <p className="text-xs">{ev.vehicleModel}</p>
                                  <p className="text-xs text-muted-foreground">{ev.vehicleColor}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Motorista</p>
                                  <p className="text-xs font-medium">{ev.driverName}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {ev.driverFaceList === "branca" ? "Lista Branca" : ev.driverFaceList === "negra" ? "Lista Negra" : "Estranho"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Câmera</p>
                                  <p className="text-xs">{ev.cameraId} — {ev.cameraName}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Permanência</p>
                                  <p className="text-xs">{ev.duration || "Em andamento"}</p>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="mt-4 flex items-center gap-2">
                                <button className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                                  <Camera className="h-3.5 w-3.5" /> Ver Snapshot LPR
                                </button>
                                <button className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                                  <ScanFace className="h-3.5 w-3.5" /> Ver Captura Facial
                                </button>
                                {ev.status === "pending" && (
                                  <>
                                    <button className="flex items-center gap-1.5 rounded-md bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/20 transition-colors">
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Autorizar
                                    </button>
                                    <button className="flex items-center gap-1.5 rounded-md bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors">
                                      <XCircle className="h-3.5 w-3.5" /> Negar
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer summary */}
          <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Car className="h-3.5 w-3.5" />
              Mostrando {filteredEvents.length} de {mockVehicleEvents.length} eventos veiculares
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-green-400" /> Autorizado</span>
              <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-red-400" /> Negado</span>
              <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-amber-400" /> Pendente</span>
              <span className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-blue-400" /> Manual</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
