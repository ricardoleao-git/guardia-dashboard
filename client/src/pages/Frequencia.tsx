/**
 * Frequencia — Controle de frequência por reconhecimento facial.
 *
 * Mostra presentes/ausentes, primeira entrada, última saída,
 * tempo de permanência, taxa de presença por turno.
 *
 * Dados mock da bancada (spec 05): pessoas cadastradas + eventos faciais.
 * CORE-03 §7: 5 estados obrigatórios (loading, empty, error, offline, partial)
 */
import { useState, useMemo, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import { CalendarCheck, Clock, UserCheck, UserX, TrendingUp, Download, Search, Loader2, AlertTriangle, WifiOff, Inbox, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";
import { useAttendance } from "@/hooks/useAttendance";
import { useFaceLists } from "@/hooks/useFaceLists";
import { Button } from "@/components/ui/button";

interface Person {
  id: string;
  nome: string;
  lista: string;
  genero: "M" | "F";
  turno: string;
  primeiraEntrada: string | null;
  ultimaSaida: string | null;
  status: "presente" | "ausente" | "atrasado";
  tempoPermanencia: string | null;
  fotoUrl?: string;
}

const statusConfig = {
  presente:  { bg: "bg-green-500/15",  text: "text-green-400",  label: "status.presente",  dot: "bg-green-400"  },
  ausente:   { bg: "bg-red-500/15",    text: "text-red-400",    label: "status.ausente",   dot: "bg-red-400"    },
  atrasado:  { bg: "bg-amber-500/15",  text: "text-amber-400",  label: "status.atrasado",  dot: "bg-amber-400"  },
};

type PageState = "loading" | "loaded" | "empty" | "error" | "offline" | "partial";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeView="frequencia" onNavigate={() => {}} mobileOpen={false} onMobileClose={() => {}} />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-60">
        <MobileHeader onMenuClick={() => {}} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function Frequencia() {
  const { t } = useI18n();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "presente" | "ausente" | "atrasado">("all");
  const { records, loading } = useAttendance();
  const { entries } = useFaceLists();
  const [pessoas, setPessoas] = useState<Person[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setPageState("loaded"), 600);
    return () => clearTimeout(timer);
  }, []);

  const retry = () => { setPageState("loading"); setTimeout(() => setPageState("loaded"), 600); };

  // Build presence data from attendance records + face_lists
  useEffect(() => {
    if (!loading && entries.length > 0) {
      const today = new Date().toISOString().split("T")[0];
      const todayRecords = records.filter(r => r.date === today || new Date(r.event_time).toISOString().split("T")[0] === today);

      const personMap = new Map<string, Person>();

      entries.filter(e => e.face_list === "WhiteList" && e.status === "active").forEach(entry => {
        const entryRecords = todayRecords.filter(r => r.person_name === entry.person_name);
        const firstEntry = entryRecords.find(r => r.direction === "entry");
        const lastExit = entryRecords.find(r => r.direction === "exit");

        const hasEntry = !!firstEntry;
        const entryTime = firstEntry ? new Date(firstEntry.event_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null;
        const exitTime = lastExit ? new Date(lastExit.event_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null;

        let status: "presente" | "ausente" | "atrasado" = "ausente";
        if (hasEntry) {
          const hour = firstEntry ? new Date(firstEntry.event_time).getHours() : 0;
          status = hour >= 8 ? "atrasado" : "presente";
        }

        let tempoPermanencia: string | null = null;
        if (firstEntry && !lastExit) {
          const diff = Date.now() - new Date(firstEntry.event_time).getTime();
          const hours = Math.floor(diff / 3600000);
          const mins = Math.floor((diff % 3600000) / 60000);
          tempoPermanencia = `${hours}h ${mins}min`;
        } else if (firstEntry && lastExit) {
          const diff = new Date(lastExit.event_time).getTime() - new Date(firstEntry.event_time).getTime();
          const hours = Math.floor(diff / 3600000);
          const mins = Math.floor((diff % 3600000) / 60000);
          tempoPermanencia = `${hours}h ${mins}min`;
        }

        personMap.set(entry.person_name, {
          id: entry.id,
          nome: entry.person_name,
          lista: entry.face_list,
          genero: "M",
          turno: "shift.integral",
          primeiraEntrada: entryTime,
          ultimaSaida: exitTime,
          status,
          tempoPermanencia,
        });
      });

      setPessoas(Array.from(personMap.values()));
    }
  }, [records, entries, loading]);

  const filtered = useMemo(() => {
    return pessoas.filter(p => {
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (search && !p.nome.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, filterStatus, pessoas]);

  const presentes = pessoas.filter(p => p.status === "presente").length;
  const ausentes = pessoas.filter(p => p.status === "ausente").length;
  const atrasados = pessoas.filter(p => p.status === "atrasado").length;
  const taxaPresenca = pessoas.length > 0 ? Math.round((presentes / pessoas.length) * 100) : 0;

  // CORE-03 §7: 5 estados obrigatórios
  if (pageState === "loading") {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando frequência...</p>
        </div>
      </Shell>
    );
  }

  if (pageState === "error") {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <AlertTriangle className="h-12 w-12 text-red-400" />
          <div className="text-center">
            <h3 className="text-lg font-semibold">Erro ao carregar</h3>
            <p className="text-sm text-muted-foreground mt-1">Não foi possível conectar ao servidor.</p>
          </div>
          <Button variant="outline" onClick={retry}><RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente</Button>
        </div>
      </Shell>
    );
  }

  if (pageState === "offline") {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <WifiOff className="h-12 w-12 text-zinc-400" />
          <div className="text-center">
            <h3 className="text-lg font-semibold">Connector offline</h3>
            <p className="text-sm text-muted-foreground mt-1">O servidor GuardIA não está respondendo.</p>
          </div>
          <Button variant="outline" onClick={retry}><RefreshCw className="h-4 w-4 mr-2" /> Reconectar</Button>
        </div>
      </Shell>
    );
  }

  if (pageState === "empty" || pessoas.length === 0) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Inbox className="h-12 w-12 text-zinc-400" />
          <div className="text-center">
            <h3 className="text-lg font-semibold">Nenhum registro de frequência</h3>
            <p className="text-sm text-muted-foreground mt-1">Não há eventos faciais cadastrados para hoje.</p>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {pageState === "partial" && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-400 mb-4">
          <AlertTriangle className="h-4 w-4" />
          Sincronização parcial — alguns dados podem estar incompletos.
        </div>
      )}

      {/* Page header */}
      <div className="border-b border-border bg-card/50 px-6 py-4 -mx-4 lg:-mx-6 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-green-400" />
              {t("freq.title")}
            </h2>
            <p className="text-xs text-muted-foreground">{t("freq.subtitle")}</p>
          </div>
          <button className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors">
            <Download className="h-3.5 w-3.5" /> {t("common.export_pdf")}
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-border bg-card p-4 ring-1 ring-green-500/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <UserCheck className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold">{presentes}</p>
              <p className="text-[11px] text-muted-foreground">{t("freq.present")}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 ring-1 ring-red-500/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <UserX className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold">{ausentes}</p>
              <p className="text-[11px] text-muted-foreground">{t("freq.absent")}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 ring-1 ring-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold">{atrasados}</p>
              <p className="text-[11px] text-muted-foreground">{t("freq.late")}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 ring-1 ring-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <TrendingUp className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold">{taxaPresenca}%</p>
              <p className="text-[11px] text-muted-foreground">{t("freq.rate")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("freq.search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-card pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {(["all", "presente", "ausente", "atrasado"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                filterStatus === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {f === "all" ? t("common.all") : t(statusConfig[f].label)}
            </button>
          ))}
        </div>
      </div>

      {/* Person table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden mb-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">{t("freq.person")}</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">{t("freq.shift")}</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">{t("freq.first_entry")}</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">{t("freq.last_exit")}</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">{t("freq.duration")}</th>
              <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-muted-foreground">{t("common.status")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const sc = statusConfig[p.status];
              return (
                <tr key={p.id} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                        p.genero === "F" ? "bg-pink-500/15 text-pink-400" : "bg-blue-500/15 text-blue-400"
                      )}>
                        {t(p.nome).split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                      </div>
                      <span className="text-xs font-medium">{t(p.nome)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{t(p.turno)}</td>
                  <td className="px-3 py-2.5 text-xs font-mono-tech">
                    {p.primeiraEntrada ? (
                      <span className={p.primeiraEntrada > "08:00" ? "text-amber-400" : "text-green-400"}>
                        {p.primeiraEntrada}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs font-mono-tech">
                    {p.ultimaSaida || <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs font-mono-tech text-muted-foreground">
                    {p.tempoPermanencia || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      sc.bg, sc.text
                    )}>
                      <div className={cn("h-1.5 w-1.5 rounded-full", sc.dot)} />
                      {t(sc.label)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Turno breakdown */}
      <div className="grid grid-cols-3 gap-3">
        {(["shift.manha", "shift.tarde", "shift.integral"] as const).map((turnoKey) => {
          const turnoPessoas = pessoas.filter(p => p.turno === turnoKey);
          const turnoPresentes = turnoPessoas.filter(p => p.status === "presente").length;
          const turnoTaxa = turnoPessoas.length > 0 ? Math.round((turnoPresentes / turnoPessoas.length) * 100) : 0;
          return (
            <div key={turnoKey} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold">{t(turnoKey)}</span>
                <span className={cn(
                  "text-xs font-bold",
                  turnoTaxa >= 70 ? "text-green-400" : turnoTaxa >= 50 ? "text-amber-400" : "text-red-400"
                )}>
                  {turnoTaxa}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    turnoTaxa >= 70 ? "bg-green-500" : turnoTaxa >= 50 ? "bg-amber-500" : "bg-red-500"
                  )}
                  style={{ width: `${turnoTaxa}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                {turnoPresentes}/{turnoPessoas.length} {t("freq.present")}
              </p>
            </div>
          );
        })}
      </div>
    </Shell>
  );
}
