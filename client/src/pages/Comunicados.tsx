/**
 * Comunicados — Mural digital + notificação em massa.
 *
 * T3 do CORE-04: Table stakes (Onda 1).
 * - Publicar comunicados por categoria e prioridade
 * - Direcionar por destinatários (todos, bloco, proprietários)
 * - Acompanhar taxa de leitura
 * - Anexos e expiração automática
 * - CORE-03 §7: 5 estados obrigatórios (loading, empty, error, offline, partial)
 */
import { useState, useMemo, useEffect } from "react";
import {
  Megaphone, Plus, Search, Filter, Clock, CheckCircle2, AlertCircle,
  FileText, Calendar, Users, Trash2, Edit2, Eye, Download, Paperclip, XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";
import { PageStateWrapper, type LoadState } from "@/components/PageStateWrapper";
import { Button } from "@/components/ui/button";
import { mockComunicados, mockComunicadoMetrics } from "@/lib/mock-data";
import type { Comunicado } from "@/lib/types";

// O union dos 5 estados vem do PageStateWrapper — não redeclarar (§14.5).

const categoriaConfig: Record<string, { label: string; color: string; icon: typeof Megaphone }> = {
  urgente: { label: "Urgente", color: "bg-red-500/10 text-red-400 border-red-500/20", icon: AlertCircle },
  manutencao: { label: "Manutenção", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Wrench },
  evento: { label: "Evento", color: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: Calendar },
  assembleia: { label: "Assembleia", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Users },
  aviso: { label: "Aviso", color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20", icon: Megaphone },
};

const prioridadeConfig: Record<string, { label: string; color: string }> = {
  alta: { label: "Alta", color: "bg-red-500/80" },
  media: { label: "Média", color: "bg-amber-500/80" },
  baixa: { label: "Baixa", color: "bg-green-500/80" },
};

const destinatarioLabel: Record<string, string> = {
  todos: "Todos",
  proprietarios: "Proprietários",
  inquilinos: "Inquilinos",
  bloco_a: "Bloco A",
  bloco_b: "Bloco B",
};

// Need Wrench import
import { Wrench } from "lucide-react";

export default function Comunicados() {
  const { t } = useI18n();
  const [pageState, setPageState] = useState<LoadState>("loading");
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedComunicado, setSelectedComunicado] = useState<Comunicado | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setComunicados(mockComunicados);
      setPageState("loaded");
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const retry = () => { setPageState("loading"); setTimeout(() => { setComunicados(mockComunicados); setPageState("loaded"); }, 600); };

  const filtered = useMemo(() => {
    let result = comunicados;
    if (categoriaFilter !== "all") result = result.filter(c => c.categoria === categoriaFilter);
    if (statusFilter !== "all") result = result.filter(c => c.status === statusFilter);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(c => c.titulo.toLowerCase().includes(s) || c.conteudo.toLowerCase().includes(s));
    }
    return result.sort((a, b) => b.dataPublicacao.localeCompare(a.dataPublicacao));
  }, [comunicados, categoriaFilter, statusFilter, search]);

  // CORE-03 §7: os 5 estados obrigatórios, via PageStateWrapper.
  // Dentro do <main>: o cabeçalho permanece visível durante o carregamento.
  return (
            <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <PageStateWrapper
            state={pageState}
            onRetry={retry}
            emptyTitle={t("com.empty_title")}
            emptyDescription={t("com.empty_desc")}
          >
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">Comunicados</h1>
              <p className="text-sm text-muted-foreground mt-1">Mural digital + notificação em massa para moradores</p>
            </div>
            <Button onClick={() => setShowNewModal(true)} size="sm">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Novo Comunicado
            </Button>
          </div>

          {/* Metrics */}
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Megaphone className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold">{mockComunicadoMetrics.total}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span className="text-xs text-muted-foreground">Publicados</span>
              </div>
              <p className="text-2xl font-bold">{mockComunicadoMetrics.publicados}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-muted-foreground">Rascunhos</span>
              </div>
              <p className="text-2xl font-bold">{mockComunicadoMetrics.rascunhos}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Eye className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-muted-foreground">Taxa de leitura</span>
              </div>
              <p className="text-2xl font-bold">{mockComunicadoMetrics.taxaLeitura}%</p>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar comunicados..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-md border border-border bg-input pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <select
              value={categoriaFilter}
              onChange={e => setCategoriaFilter(e.target.value)}
              className="rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todas categorias</option>
              <option value="urgente">Urgente</option>
              <option value="manutencao">Manutenção</option>
              <option value="evento">Evento</option>
              <option value="assembleia">Assembleia</option>
              <option value="aviso">Aviso</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todos status</option>
              <option value="publicado">Publicado</option>
              <option value="rascunho">Rascunho</option>
              <option value="expirado">Expirado</option>
            </select>
          </div>

          {/* Comunicados list */}
          <div className="space-y-3">
            {filtered.map(c => {
              const cat = categoriaConfig[c.categoria];
              const prio = prioridadeConfig[c.prioridade];
              const readPercent = c.total > 0 ? Math.round((c.lido / c.total) * 100) : 0;
              return (
                <div
                  key={c.id}
                  className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedComunicado(c)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium", cat.color)}>
                          <cat.icon className="h-3 w-3" /> {cat.label}
                        </span>
                        <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-white", prio.color)}>
                          {prio.label}
                        </span>
                        <span className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border",
                          c.status === "publicado" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                          c.status === "rascunho" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                          "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                        )}>
                          {c.status === "publicado" ? "Publicado" : c.status === "rascunho" ? "Rascunho" : "Expirado"}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm mb-1 truncate">{c.titulo}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{c.conteudo}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {destinatarioLabel[c.destinatarios]}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(c.dataPublicacao).toLocaleDateString("pt-BR")}</span>
                        {c.anexos && c.anexos.length > 0 && (
                          <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" /> {c.anexos.length}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Leitura</p>
                        <p className="text-sm font-semibold">{readPercent}%</p>
                        <p className="text-xs text-muted-foreground">{c.lido}/{c.total}</p>
                      </div>
                      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${readPercent}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail Modal */}
          {selectedComunicado && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedComunicado(null)}>
              <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium", categoriaConfig[selectedComunicado.categoria].color)}>
                      {categoriaConfig[selectedComunicado.categoria].label}
                    </span>
                    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-white", prioridadeConfig[selectedComunicado.prioridade].color)}>
                      {prioridadeConfig[selectedComunicado.prioridade].label}
                    </span>
                  </div>
                  <button onClick={() => setSelectedComunicado(null)} className="text-muted-foreground hover:text-foreground">
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
                <h2 className="text-xl font-bold mb-2">{selectedComunicado.titulo}</h2>
                <p className="text-sm text-muted-foreground mb-4">{selectedComunicado.conteudo}</p>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div><span className="text-muted-foreground">Autor:</span> {selectedComunicado.autor}</div>
                  <div><span className="text-muted-foreground">Destinatários:</span> {destinatarioLabel[selectedComunicado.destinatarios]}</div>
                  <div><span className="text-muted-foreground">Publicado:</span> {new Date(selectedComunicado.dataPublicacao).toLocaleDateString("pt-BR")}</div>
                  {selectedComunicado.dataExpiracao && (
                    <div><span className="text-muted-foreground">Expira:</span> {new Date(selectedComunicado.dataExpiracao).toLocaleDateString("pt-BR")}</div>
                  )}
                </div>
                {selectedComunicado.anexos && selectedComunicado.anexos.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Anexos</p>
                    <div className="space-y-2">
                      {selectedComunicado.anexos.map(a => (
                        <div key={a} className="flex items-center gap-2 rounded-md border border-border bg-input p-2">
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm flex-1">{a}</span>
                          <Download className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">Taxa de leitura</span>
                    <span className="text-sm">{selectedComunicado.lido}/{selectedComunicado.total} ({Math.round(selectedComunicado.lido / selectedComunicado.total * 100)}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.round(selectedComunicado.lido / selectedComunicado.total * 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* New Comunicado Modal */}
          {showNewModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowNewModal(false)}>
              <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">Novo Comunicado</h2>
                  <button onClick={() => setShowNewModal(false)} className="text-muted-foreground hover:text-foreground">
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-3">
                  <input type="text" placeholder="Título" className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  <textarea placeholder="Conteúdo" rows={4} className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  <div className="grid grid-cols-2 gap-3">
                    <select className="rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="aviso">Aviso</option>
                      <option value="urgente">Urgente</option>
                      <option value="manutencao">Manutenção</option>
                      <option value="evento">Evento</option>
                      <option value="assembleia">Assembleia</option>
                    </select>
                    <select className="rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="media">Média prioridade</option>
                      <option value="alta">Alta prioridade</option>
                      <option value="baixa">Baixa prioridade</option>
                    </select>
                    <select className="rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                      <option value="todos">Todos</option>
                      <option value="proprietarios">Proprietários</option>
                      <option value="inquilinos">Inquilinos</option>
                      <option value="bloco_a">Bloco A</option>
                      <option value="bloco_b">Bloco B</option>
                    </select>
                    <input type="date" className="rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setShowNewModal(false)}>Cancelar</Button>
                    <Button onClick={() => setShowNewModal(false)}>Publicar</Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          </PageStateWrapper>
        </main>

  );
}
