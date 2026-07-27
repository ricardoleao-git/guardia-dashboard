/**
 * PortariaRemota — Um operador atende N portarias remotamente.
 *
 * T5 do CORE-04: Table stakes (Onda 1) — casca visual.
 * - Monitorar múltiplas portarias em tempo real
 * - Status de câmeras, intercoms e portões
 * - Fila de atendimento
 * - CORE-03 §7: 5 estados obrigatórios
 */
import { useState, useMemo, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import {
  Building2, Video, PhoneCall, DoorOpen, Users, Activity,
  AlertCircle, CheckCircle2, XCircle, Clock, Radio,
  Loader2, WifiOff, Inbox, RefreshCw, Headphones, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";
import { Button } from "@/components/ui/button";
import { mockPortarias } from "@/lib/mock-data";
import type { PortariaRemota as Portaria } from "@/lib/types";

type PageState = "loading" | "loaded" | "empty" | "error" | "offline" | "partial";

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  online: { label: "Online", color: "text-green-400", dot: "bg-green-500" },
  degradado: { label: "Degradado", color: "text-amber-400", dot: "bg-amber-500" },
  offline: { label: "Offline", color: "text-red-400", dot: "bg-red-500" },
};

const portaoStatusConfig: Record<string, { label: string; color: string }> = {
  fechado: { label: "Fechado", color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
  aberto: { label: "Aberto", color: "bg-green-500/10 text-green-400 border-green-500/20" },
  bloqueado: { label: "Bloqueado", color: "bg-red-500/10 text-red-400 border-red-500/20" },
};

export default function PortariaRemotaPage() {
  const { t } = useI18n();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [portarias, setPortarias] = useState<Portaria[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPortarias(mockPortarias);
      setSelectedId(mockPortarias[0]?.id ?? null);
      setPageState("loaded");
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const retry = () => { setPageState("loading"); setTimeout(() => { setPortarias(mockPortarias); setPageState("loaded"); }, 600); };

  const selected = portarias.find(p => p.id === selectedId);

  const totals = useMemo(() => {
    const online = portarias.filter(p => p.status === "online").length;
    const degradado = portarias.filter(p => p.status === "degradado").length;
    const offline = portarias.filter(p => p.status === "offline").length;
    const cameras = portarias.reduce((s, p) => s + p.camerasAtivas, 0);
    const camerasTotal = portarias.reduce((s, p) => s + p.camerasTotal, 0);
    const eventos = portarias.reduce((s, p) => s + p.eventosHoje, 0);
    const aguardando = portarias.reduce((s, p) => s + p.aguardandoAtendimento, 0);
    return { online, degradado, offline, cameras, camerasTotal, eventos, aguardando };
  }, [portarias]);

  // CORE-03 §7: 5 estados obrigatórios
  if (pageState === "loading") {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar activeView="portaria-remota" onNavigate={() => {}} mobileOpen={false} onMobileClose={() => {}} />
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-60">
          <MobileHeader onMenuClick={() => {}} />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando portarias...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar activeView="portaria-remota" onNavigate={() => {}} mobileOpen={false} onMobileClose={() => {}} />
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-60">
          <MobileHeader onMenuClick={() => {}} />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <AlertCircle className="h-12 w-12 text-red-400" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">Erro ao carregar</h3>
                <p className="text-sm text-muted-foreground mt-1">Não foi possível conectar ao servidor.</p>
              </div>
              <Button variant="outline" onClick={retry}><RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente</Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (pageState === "offline") {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar activeView="portaria-remota" onNavigate={() => {}} mobileOpen={false} onMobileClose={() => {}} />
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-60">
          <MobileHeader onMenuClick={() => {}} />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <WifiOff className="h-12 w-12 text-zinc-400" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">Connector offline</h3>
                <p className="text-sm text-muted-foreground mt-1">O servidor GuardIA não está respondendo.</p>
              </div>
              <Button variant="outline" onClick={retry}><RefreshCw className="h-4 w-4 mr-2" /> Reconectar</Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (pageState === "empty") {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar activeView="portaria-remota" onNavigate={() => {}} mobileOpen={false} onMobileClose={() => {}} />
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-60">
          <MobileHeader onMenuClick={() => {}} />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Inbox className="h-12 w-12 text-zinc-400" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">Nenhuma portaria cadastrada</h3>
                <p className="text-sm text-muted-foreground mt-1">Cadastre uma unidade para iniciar o monitoramento remoto.</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeView="portaria-remota" onNavigate={() => {}} mobileOpen={false} onMobileClose={() => {}} />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-60">
        <MobileHeader onMenuClick={() => {}} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold tracking-tight">Portaria Remota</h1>
            <p className="text-sm text-muted-foreground mt-1">Um operador atende N portarias em tempo real</p>
          </div>

          {/* Summary metrics */}
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Headphones className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Portarias online</span>
              </div>
              <p className="text-2xl font-bold">{totals.online}<span className="text-sm text-muted-foreground">/{portarias.length}</span></p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Video className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-muted-foreground">Câmeras ativas</span>
              </div>
              <p className="text-2xl font-bold">{totals.cameras}<span className="text-sm text-muted-foreground">/{totals.camerasTotal}</span></p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-muted-foreground">Eventos hoje</span>
              </div>
              <p className="text-2xl font-bold">{totals.eventos}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-red-400" />
                <span className="text-xs text-muted-foreground">Aguardando</span>
              </div>
              <p className="text-2xl font-bold">{totals.aguardando}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Portaria list */}
            <div className="lg:col-span-1 space-y-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Unidades</h2>
            {portarias.map(p => {
              const st = statusConfig[p.status];
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={cn(
                    "w-full text-left rounded-xl border p-3 transition-all",
                    selectedId === p.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm truncate">{p.unidadeNome}</span>
                    <span className={cn("h-2 w-2 rounded-full shrink-0", st.dot)} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={st.color}>{st.label}</span>
                    <span>•</span>
                    <span>{p.camerasAtivas}/{p.camerasTotal} câmeras</span>
                  </div>
                  {p.aguardandoAtendimento > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-red-400">
                      <AlertCircle className="h-3 w-3" /> {p.aguardandoAtendimento} aguardando atendimento
                    </div>
                  )}
                  {p.operadorOnline && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-green-400">
                      <Radio className="h-3 w-3" /> {p.operadorNome}
                    </div>
                  )}
                </button>
              );
            })}
            </div>

            {/* Detail panel */}
            <div className="lg:col-span-2">
              {selected && (
                <div className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold">{selected.unidadeNome}</h2>
                      <p className="text-xs text-muted-foreground capitalize">{selected.unidadeTipo}</p>
                    </div>
                    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium", statusConfig[selected.status].color, "border-current/20")}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", statusConfig[selected.status].dot)} />
                      {statusConfig[selected.status].label}
                    </span>
                  </div>

                  {/* Operator info */}
                  <div className="mb-4 rounded-lg border border-border bg-input/50 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Headphones className={cn("h-4 w-4", selected.operadorOnline ? "text-green-400" : "text-zinc-400")} />
                        <div>
                          <p className="text-sm font-medium">{selected.operadorOnline ? selected.operadorNome : "Sem operador"}</p>
                          <p className="text-xs text-muted-foreground">{selected.operadorOnline ? "Online" : "Offline"}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">Último contato: {selected.ultimoContato}</span>
                    </div>
                  </div>

                  {/* Cameras */}
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Video className="h-3.5 w-3.5" /> Câmeras ({selected.camerasAtivas}/{selected.camerasTotal} ativas)
                    </h3>
                    <div className="grid grid-cols-4 gap-2">
                      {Array.from({ length: selected.camerasTotal }).map((_, i) => (
                        <div key={i} className={cn(
                          "aspect-video rounded-lg border flex items-center justify-center text-xs",
                          i < selected.camerasAtivas ? "border-green-500/20 bg-green-500/5 text-green-400" : "border-red-500/20 bg-red-500/5 text-red-400"
                        )}>
                          {i < selected.camerasAtivas ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Intercoms */}
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      <PhoneCall className="h-3.5 w-3.5" /> Intercomunicadores
                    </h3>
                    <div className="space-y-2">
                      {selected.intercoms.map(ic => (
                        <div key={ic.id} className="flex items-center justify-between rounded-lg border border-border bg-input/50 p-2.5">
                          <div className="flex items-center gap-2">
                            <PhoneCall className={cn("h-4 w-4", ic.status === "online" ? "text-green-400" : "text-red-400")} />
                            <span className="text-sm">{ic.nome}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {ic.emChamada && <span className="text-xs text-amber-400 animate-pulse">Em chamada...</span>}
                            <span className={cn("text-xs", ic.status === "online" ? "text-green-400" : "text-red-400")}>
                              {ic.status === "online" ? "Online" : "Offline"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Portões */}
                  <div className="mb-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                      <DoorOpen className="h-3.5 w-3.5" /> Portões
                    </h3>
                    <div className="space-y-2">
                      {selected.portoes.map(pg => {
                        const ps = portaoStatusConfig[pg.status];
                        return (
                          <div key={pg.id} className="flex items-center justify-between rounded-lg border border-border bg-input/50 p-2.5">
                            <div className="flex items-center gap-2">
                              <DoorOpen className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <span className="text-sm">{pg.nome}</span>
                                <span className="text-xs text-muted-foreground ml-2 capitalize">({pg.tipo})</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {pg.ultimaOperacao && <span className="text-xs text-muted-foreground">{pg.ultimaOperacao}</span>}
                              <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", ps.color)}>
                                {ps.label}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Event stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border bg-input/50 p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Eventos hoje</p>
                      <p className="text-xl font-bold">{selected.eventosHoje}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-input/50 p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Aguardando</p>
                      <p className={cn("text-xl font-bold", selected.aguardandoAtendimento > 0 ? "text-red-400" : "text-green-400")}>
                        {selected.aguardandoAtendimento}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
