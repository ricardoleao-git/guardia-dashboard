/**
 * ElevatorControl — Dashboard de Elevador com Controle de Acesso por Andar.
 *
 * Fase 4.3 do roadmap: Elevador inteligente.
 * - Visualização do prédio em seção vertical (andares)
 * - Estado do elevador (andar atual, direção, portas)
 * - Controle de acesso por andar (quem pode ir onde)
 * - Log de viagens com match facial
 * - Grupos de acesso (moradores, visitantes, serviço)
 */
import { useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import {
  Building, ArrowUp, ArrowDown, Minus, Users, ScanFace,
  CheckCircle2, XCircle, Clock, ChevronRight, Download,
  ShieldCheck, ShieldAlert, Wrench, RefreshCw, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";

interface Floor {
  number: number;
  name: string;
  authorizedGroups: string[];
  lastAccess?: string;
  lastPerson?: string;
  status: "authorized" | "restricted" | "service";
}

interface TripLog {
  id: string;
  personName: string;
  faceMatch: number;
  faceList: "branca" | "negra" | "estranho" | "visitante";
  fromFloor: number;
  toFloor: number;
  timestamp: string;
  time: string;
  authorized: boolean;
  group: string;
}

const mockFloors: Floor[] = [
  { number: 0, name: "Térreo — Recepção", authorizedGroups: ["moradores", "visitantes", "servico"], status: "authorized" },
  { number: 1, name: "1º Andar — Administrativo", authorizedGroups: ["moradores", "servico"], lastAccess: "07:45", lastPerson: "Maria Eduarda Costa", status: "authorized" },
  { number: 2, name: "2º Andar — Salas de Aula", authorizedGroups: ["moradores", "visitantes", "servico"], lastAccess: "07:32", lastPerson: "João Pedro Silva", status: "authorized" },
  { number: 3, name: "3º Andar — Laboratórios", authorizedGroups: ["moradores", "servico"], lastAccess: "08:10", lastPerson: "Carlos Eduardo Lima", status: "restricted" },
  { number: 4, name: "4º Andar — Diretoria", authorizedGroups: ["moradores"], lastAccess: "09:02", lastPerson: "Técnico Câmeras", status: "restricted" },
  { number: 5, name: "5º Andar — Manutenção", authorizedGroups: ["servico"], status: "service" },
];

const mockTrips: TripLog[] = [
  { id: "t1", personName: "João Pedro Silva", faceMatch: 92, faceList: "branca", fromFloor: 0, toFloor: 2, timestamp: "2026-07-23T07:32:00", time: "07:32", authorized: true, group: "Morador" },
  { id: "t2", personName: "Maria Eduarda Costa", faceMatch: 95, faceList: "branca", fromFloor: 0, toFloor: 1, timestamp: "2026-07-23T07:45:00", time: "07:45", authorized: true, group: "Morador" },
  { id: "t3", personName: "Carlos Eduardo Lima", faceMatch: 87, faceList: "branca", fromFloor: 0, toFloor: 3, timestamp: "2026-07-23T08:10:00", time: "08:10", authorized: true, group: "Morador" },
  { id: "t4", personName: "Ana Beatriz Rocha", faceMatch: 89, faceList: "branca", fromFloor: 0, toFloor: 2, timestamp: "2026-07-23T07:55:00", time: "07:55", authorized: true, group: "Morador" },
  { id: "t5", personName: "Roberto Mendes", faceMatch: 88, faceList: "visitante", fromFloor: 0, toFloor: 2, timestamp: "2026-07-23T10:05:00", time: "10:05", authorized: true, group: "Visitante" },
  { id: "t6", personName: "Suspeito Lista Negra", faceMatch: 81, faceList: "negra", fromFloor: 0, toFloor: 4, timestamp: "2026-07-23T14:22:00", time: "14:22", authorized: false, group: "Negado" },
  { id: "t7", personName: "Técnico Câmeras", faceMatch: 91, faceList: "branca", fromFloor: 0, toFloor: 5, timestamp: "2026-07-23T09:02:00", time: "09:02", authorized: true, group: "Serviço" },
];

const groupColors: Record<string, string> = {
  "Morador": "text-green-400 bg-green-500/10 border-green-500/20",
  "Visitante": "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "Serviço": "text-amber-400 bg-amber-500/10 border-amber-500/20",
  "Negado": "text-red-400 bg-red-500/10 border-red-500/20",
};

export default function ElevatorControl() {
  const { t } = useI18n();
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [elevatorFloor] = useState(2);
  const [elevatorDir] = useState<"up" | "down" | "idle">("idle");

  const stats = useMemo(() => {
    return {
      totalTrips: mockTrips.length,
      authorized: mockTrips.filter(t => t.authorized).length,
      denied: mockTrips.filter(t => !t.authorized).length,
      visitors: mockTrips.filter(t => t.group === "Visitante").length,
    };
  }, []);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeView="elevator" onNavigate={() => {}} mobileOpen={false} onMobileClose={() => {}} />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-60">
        <MobileHeader onMenuClick={() => {}} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">{t("elevator.title")}</h1>
              <p className="text-sm text-muted-foreground mt-1">Controle de acesso por andar com reconhecimento facial</p>
            </div>
            <button className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors">
              <Download className="h-3.5 w-3.5" /> Exportar
            </button>
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] text-muted-foreground">Viagens Hoje</span>
              </div>
              <p className="font-display text-xl font-bold">{stats.totalTrips}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                <span className="text-[11px] text-muted-foreground">Autorizadas</span>
              </div>
              <p className="font-display text-xl font-bold text-green-400">{stats.authorized}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="h-3.5 w-3.5 text-red-400" />
                <span className="text-[11px] text-muted-foreground">Negadas</span>
              </div>
              <p className="font-display text-xl font-bold text-red-400">{stats.denied}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-[11px] text-muted-foreground">Visitantes</span>
              </div>
              <p className="font-display text-xl font-bold text-blue-400">{stats.visitors}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Building visualization */}
            <div className="lg:col-span-1">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Building className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Prédio</h3>
                </div>

                {/* Elevator status */}
                <div className="mb-4 rounded-lg bg-primary/5 border border-primary/20 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Elevador</p>
                      <p className="font-display text-lg font-bold">{elevatorFloor}º andar</p>
                    </div>
                    <div className="flex flex-col items-center">
                      {elevatorDir === "up" ? <ArrowUp className="h-5 w-5 text-green-400" />
                        : elevatorDir === "down" ? <ArrowDown className="h-5 w-5 text-blue-400" />
                        : <Minus className="h-5 w-5 text-muted-foreground" />}
                      <span className="text-[10px] text-muted-foreground mt-1">
                        {elevatorDir === "idle" ? "Parado" : elevatorDir === "up" ? "Subindo" : "Descendo"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Floors (top to bottom) */}
                <div className="space-y-1.5">
                  {[...mockFloors].reverse().map(floor => {
                    const isSelected = selectedFloor === floor.number;
                    const isCurrent = elevatorFloor === floor.number;
                    const statusColor = floor.status === "restricted" ? "border-red-500/20" : floor.status === "service" ? "border-amber-500/20" : "border-green-500/20";
                    const statusBg = floor.status === "restricted" ? "bg-red-500/5" : floor.status === "service" ? "bg-amber-500/5" : "bg-green-500/5";
                    return (
                      <button
                        key={floor.number}
                        onClick={() => setSelectedFloor(isSelected ? null : floor.number)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all",
                          isSelected ? "ring-2 ring-primary/50 " + statusColor + " " + statusBg : statusColor + " " + statusBg + " hover:bg-accent/30"
                        )}
                      >
                        {/* Floor number */}
                        <div className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg font-display text-sm font-bold shrink-0",
                          isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          {floor.number}
                        </div>

                        {/* Floor info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{floor.name}</p>
                          {floor.lastAccess && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              <Clock className="inline h-2.5 w-2.5 mr-0.5" />
                              {floor.lastAccess} — {floor.lastPerson}
                            </p>
                          )}
                        </div>

                        {/* Status icon */}
                        {floor.status === "restricted" && <ShieldAlert className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                        {floor.status === "service" && <Wrench className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                        {floor.status === "authorized" && <ShieldCheck className="h-3.5 w-3.5 text-green-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Floor details + Trip log */}
            <div className="lg:col-span-2 space-y-6">
              {/* Selected floor details */}
              {selectedFloor !== null && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Building className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">{mockFloors.find(f => f.number === selectedFloor)?.name}</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Status</p>
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium",
                        mockFloors.find(f => f.number === selectedFloor)?.status === "restricted"
                          ? "bg-red-500/10 text-red-400 border-red-500/20"
                          : mockFloors.find(f => f.number === selectedFloor)?.status === "service"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-green-500/10 text-green-400 border-green-500/20"
                      )}>
                        {mockFloors.find(f => f.number === selectedFloor)?.status === "restricted" ? "Restrito" :
                         mockFloors.find(f => f.number === selectedFloor)?.status === "service" ? "Serviço" : "Autorizado"}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Grupos Permitidos</p>
                      <div className="flex flex-wrap gap-1">
                        {mockFloors.find(f => f.number === selectedFloor)?.authorizedGroups.map(g => (
                          <span key={g} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {g === "moradores" ? "Moradores" : g === "visitantes" ? "Visitantes" : g === "servico" ? "Serviço" : g}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Últimos Acessos a este Andar</p>
                  <div className="space-y-1.5">
                    {mockTrips.filter(t => t.toFloor === selectedFloor).map(t => (
                      <div key={t.id} className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2">
                        <ScanFace className={cn("h-3.5 w-3.5", t.authorized ? "text-green-400" : "text-red-400")} />
                        <span className="text-xs font-medium flex-1">{t.personName}</span>
                        <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-medium", groupColors[t.group])}>{t.group}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{t.time}</span>
                      </div>
                    ))}
                    {mockTrips.filter(t => t.toFloor === selectedFloor).length === 0 && (
                      <p className="text-xs text-muted-foreground py-2">Nenhum acesso registrado a este andar</p>
                    )}
                  </div>
                </div>
              )}

              {/* Trip log */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2 p-4 border-b border-border">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Log de Viagens</h3>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Hora</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Pessoa</th>
                      <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground hidden sm:table-cell">Face</th>
                      <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground">Trajeto</th>
                      <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground">Grupo</th>
                      <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {mockTrips.map(t => (
                      <tr key={t.id} className="hover:bg-accent/30 transition-colors">
                        <td className="px-3 py-2.5 font-mono text-xs">{t.time}</td>
                        <td className="px-3 py-2.5 text-xs font-medium">{t.personName}</td>
                        <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                          <div className="flex items-center justify-center gap-1">
                            <div className="h-1 w-10 rounded-full bg-muted overflow-hidden">
                              <div className={cn("h-full", t.faceMatch >= 85 ? "bg-green-500" : "bg-amber-500")} style={{ width: `${t.faceMatch}%` }} />
                            </div>
                            <span className="text-[10px] font-mono">{t.faceMatch}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="inline-flex items-center gap-1 text-xs">
                            {t.fromFloor}º <ArrowRight className="h-3 w-3 text-muted-foreground" /> {t.toFloor}º
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={cn("inline-flex rounded border px-1.5 py-0.5 text-[10px] font-medium", groupColors[t.group])}>{t.group}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {t.authorized ? <CheckCircle2 className="h-4 w-4 text-green-400 mx-auto" /> : <XCircle className="h-4 w-4 text-red-400 mx-auto" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
