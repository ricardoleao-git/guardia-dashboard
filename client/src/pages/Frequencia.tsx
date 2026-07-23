/**
 * Frequencia — Controle de frequência por reconhecimento facial.
 *
 * Mostra presentes/ausentes, primeira entrada, última saída,
 * tempo de permanência, taxa de presença por turno.
 *
 * Dados mock da bancada (spec 05): pessoas cadastradas + eventos faciais.
 */
import { useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import { CalendarCheck, Clock, UserCheck, UserX, TrendingUp, TrendingDown, Download, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";

interface Person {
  id: string;
  nome: string;
  lista: "Lista Branca";
  genero: "M" | "F";
  turno: "Manhã" | "Tarde" | "Integral";
  primeiraEntrada: string | null;
  ultimaSaida: string | null;
  status: "presente" | "ausente" | "atrasado";
  tempoPermanencia: string | null;
  fotoUrl?: string;
}

const mockPessoas: Person[] = [
  { id: "p1", nome: "Ana Silva",   lista: "Lista Branca", genero: "F", turno: "Integral", primeiraEntrada: "07:12", ultimaSaida: null,    status: "presente",  tempoPermanencia: "5h 28min" },
  { id: "p2", nome: "Bruno Costa", lista: "Lista Branca", genero: "M", turno: "Manhã",    primeiraEntrada: "06:58", ultimaSaida: "12:05", status: "presente",  tempoPermanencia: "5h 07min" },
  { id: "p3", nome: "Carla Dias",  lista: "Lista Branca", genero: "F", turno: "Tarde",    primeiraEntrada: "13:02", ultimaSaida: null,    status: "presente",  tempoPermanencia: "3h 18min" },
  { id: "p4", nome: "Diego Lima",  lista: "Lista Branca", genero: "M", turno: "Integral", primeiraEntrada: "08:45", ultimaSaida: null,    status: "atrasado",  tempoPermanencia: "3h 55min" },
  { id: "p5", nome: "Eva Souza",   lista: "Lista Branca", genero: "F", turno: "Manhã",    primeiraEntrada: "07:30", ultimaSaida: "12:10", status: "presente",  tempoPermanencia: "4h 40min" },
  { id: "p6", nome: "Felipe Alves",lista: "Lista Branca", genero: "M", turno: "Tarde",    primeiraEntrada: null,    ultimaSaida: null,    status: "ausente",   tempoPermanencia: null },
  { id: "p7", nome: "Gabi Rocha",  lista: "Lista Branca", genero: "F", turno: "Integral", primeiraEntrada: "07:05", ultimaSaida: null,    status: "presente",  tempoPermanencia: "5h 35min" },
  { id: "p8", nome: "Heitor Paz",  lista: "Lista Branca", genero: "M", turno: "Manhã",    primeiraEntrada: null,    ultimaSaida: null,    status: "ausente",   tempoPermanencia: null },
  { id: "p9", nome: "Iris Castro", lista: "Lista Branca", genero: "F", turno: "Tarde",    primeiraEntrada: "13:15", ultimaSaida: null,    status: "presente",  tempoPermanencia: "3h 05min" },
  { id: "p10",nome: "João Barros", lista: "Lista Branca", genero: "M", turno: "Integral", primeiraEntrada: "07:20", ultimaSaida: null,    status: "presente",  tempoPermanencia: "5h 20min" },
];

const statusConfig = {
  presente:  { bg: "bg-green-500/15",  text: "text-green-400",  label: "Presente",  dot: "bg-green-400"  },
  ausente:   { bg: "bg-red-500/15",    text: "text-red-400",    label: "Ausente",   dot: "bg-red-400"    },
  atrasado:  { bg: "bg-amber-500/15",  text: "text-amber-400",  label: "Atrasado",  dot: "bg-amber-400"  },
};

export default function Frequencia() {
  const { t } = useI18n();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "presente" | "ausente" | "atrasado">("all");

  const filtered = useMemo(() => {
    return mockPessoas.filter(p => {
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (search && !p.nome.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, filterStatus]);

  const presentes = mockPessoas.filter(p => p.status === "presente").length;
  const ausentes = mockPessoas.filter(p => p.status === "ausente").length;
  const atrasados = mockPessoas.filter(p => p.status === "atrasado").length;
  const taxaPresenca = Math.round((presentes / mockPessoas.length) * 100);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        activeView="frequencia"
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

        <main className="p-6 space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
          <div className="flex items-center gap-3 flex-wrap">
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
                  {f === "all" ? t("common.all") : statusConfig[f].label}
                </button>
              ))}
            </div>
          </div>

          {/* Person table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">Pessoa</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">{t("freq.shift")}</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">{t("freq.first_entry")}</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">{t("freq.last_exit")}</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">{t("freq.duration")}</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-muted-foreground">Status</th>
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
                            {p.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
                          </div>
                          <span className="text-xs font-medium">{p.nome}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{p.turno}</td>
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
                          {sc.label}
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
            {(["Manhã", "Tarde", "Integral"] as const).map((turno) => {
              const turnoPessoas = mockPessoas.filter(p => p.turno === turno);
              const turnoPresentes = turnoPessoas.filter(p => p.status === "presente").length;
              const turnoTaxa = Math.round((turnoPresentes / turnoPessoas.length) * 100);
              return (
                <div key={turno} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold">{turno}</span>
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
                    {turnoPresentes}/{turnoPessoas.length} {t("freq.present_lower")}
                  </p>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
