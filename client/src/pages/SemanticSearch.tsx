/**
 * SemanticSearch — Busca Semântica de Pessoas.
 *
 * Fase 4.1 do roadmap: Busca por linguagem natural.
 * - Input de texto livre ("homem de óculos azul ontem")
 * - Filtros visuais (atributos faciais, roupas, período, câmera)
 * - Resultados com thumbnails e score de relevância
 * - Histórico de buscas
 */
import { useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import {
  Search, Sparkles, Clock, Camera, ScanFace, Filter,
  ChevronDown, ChevronUp, Download, History, X, CheckCircle2,
  Glasses, User, Calendar, Shirt, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  personName: string;
  faceList: "branca" | "negra" | "estranho";
  matchScore: number;
  cameraId: string;
  cameraName: string;
  timestamp: string;
  date: string;
  time: string;
  attributes: {
    gender: "M" | "F";
    age: string;
    glasses: boolean;
    mask: boolean;
    shirtColor: string;
  };
  thumbnail?: string;
}

interface SearchHistory {
  query: string;
  timestamp: string;
  results: number;
}

const mockResults: SearchResult[] = [
  { id: "s1", personName: "João Pedro Silva", faceList: "branca", matchScore: 94, cameraId: "D2", cameraName: "Corredor", timestamp: "2026-07-23T07:32:00", date: "2026-07-23", time: "07:32", attributes: { gender: "M", age: "35-40", glasses: true, mask: false, shirtColor: "Azul" } },
  { id: "s2", personName: "Carlos Eduardo Lima", faceList: "branca", matchScore: 88, cameraId: "D3", cameraName: "Recepção", timestamp: "2026-07-23T08:10:00", date: "2026-07-23", time: "08:10", attributes: { gender: "M", age: "30-35", glasses: true, mask: false, shirtColor: "Azul" } },
  { id: "s3", personName: "Desconhecido", faceList: "estranho", matchScore: 72, cameraId: "D5", cameraName: "Estacionamento", timestamp: "2026-07-22T14:45:00", date: "2026-07-22", time: "14:45", attributes: { gender: "M", age: "25-30", glasses: true, mask: false, shirtColor: "Azul" } },
  { id: "s4", personName: "Técnico Câmeras", faceList: "branca", matchScore: 85, cameraId: "D2", cameraName: "Corredor", timestamp: "2026-07-23T09:02:00", date: "2026-07-23", time: "09:02", attributes: { gender: "M", age: "40-45", glasses: false, mask: false, shirtColor: "Cinza" } },
  { id: "s5", personName: "Ana Beatriz Rocha", faceList: "branca", matchScore: 91, cameraId: "D3", cameraName: "Recepção", timestamp: "2026-07-23T07:55:00", date: "2026-07-23", time: "07:55", attributes: { gender: "F", age: "28-33", glasses: false, mask: false, shirtColor: "Vermelho" } },
];

const mockHistory: SearchHistory[] = [
  { query: "homem de óculos azul ontem", timestamp: "2026-07-23T10:30:00", results: 3 },
  { query: "mulher vermelho recepção hoje", timestamp: "2026-07-23T09:15:00", results: 1 },
  { query: "estranho sem máscara estacionamento", timestamp: "2026-07-22T16:00:00", results: 2 },
  { query: "homem 40 anos corredor manhã", timestamp: "2026-07-22T11:20:00", results: 4 },
];

const suggestedQueries = [
  "Homem de óculos hoje",
  "Mulher na recepção",
  "Estranho sem máscara",
  "Pessoa de camisa azul ontem",
  "Lista negra detectada",
  "Criança no estacionamento",
];

export default function SemanticSearch() {
  const [query, setQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [genderFilter, setGenderFilter] = useState("all");
  const [glassesFilter, setGlassesFilter] = useState("all");
  const [cameraFilter, setCameraFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");

  const results = useMemo(() => {
    if (!hasSearched) return [];
    let filtered = [...mockResults];
    if (genderFilter !== "all") filtered = filtered.filter(r => r.attributes.gender === genderFilter);
    if (glassesFilter === "yes") filtered = filtered.filter(r => r.attributes.glasses);
    if (glassesFilter === "no") filtered = filtered.filter(r => !r.attributes.glasses);
    if (cameraFilter !== "all") filtered = filtered.filter(r => r.cameraId === cameraFilter);
    return filtered.sort((a, b) => b.matchScore - a.matchScore);
  }, [hasSearched, genderFilter, glassesFilter, cameraFilter]);

  const handleSearch = (q?: string) => {
    const searchQuery = q || query;
    if (!searchQuery.trim()) return;
    setQuery(searchQuery);
    setHasSearched(true);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeView="semantic-search" onNavigate={() => {}} mobileOpen={false} onMobileClose={() => {}} />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-60">
        <MobileHeader onMenuClick={() => {}} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold tracking-tight">Busca Semântica</h1>
            <p className="text-sm text-muted-foreground mt-1">Encontre pessoas por descrição em linguagem natural</p>
          </div>

          {/* Search bar */}
          <div className="mb-4">
            <div className="relative">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Ex: homem de óculos, camisa azul, visto ontem na recepção..."
                className="w-full rounded-xl border border-border bg-card pl-10 pr-28 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
              <button
                onClick={() => handleSearch()}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Search className="h-3.5 w-3.5" /> Buscar
              </button>
            </div>
          </div>

          {/* Suggested queries */}
          {!hasSearched && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sugestões</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQueries.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSearch(q)}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    <Sparkles className="h-3 w-3 text-primary" /> {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          {hasSearched && (
            <div className="mb-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Filter className="h-3.5 w-3.5" /> Filtros {showFilters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {showFilters && (
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1.5 text-xs">
                    <option value="all">Todos os gêneros</option>
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                  </select>
                  <select value={glassesFilter} onChange={(e) => setGlassesFilter(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1.5 text-xs">
                    <option value="all">Óculos: todos</option>
                    <option value="yes">Com óculos</option>
                    <option value="no">Sem óculos</option>
                  </select>
                  <select value={cameraFilter} onChange={(e) => setCameraFilter(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1.5 text-xs">
                    <option value="all">Todas as câmeras</option>
                    <option value="D1">D1 — Portão</option>
                    <option value="D2">D2 — Corredor</option>
                    <option value="D3">D3 — Recepção</option>
                    <option value="D5">D5 — Estacionamento</option>
                  </select>
                  <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1.5 text-xs">
                    <option value="all">Todo período</option>
                    <option value="today">Hoje</option>
                    <option value="yesterday">Ontem</option>
                    <option value="week">Última semana</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {hasSearched && (
            <>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{results.length}</span> resultados para "<span className="text-primary">{query}</span>"
                </p>
                <button className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors">
                  <Download className="h-3.5 w-3.5" /> Exportar
                </button>
              </div>

              <div className="space-y-3">
                {results.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground rounded-xl border border-border bg-card">
                    <Search className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm">Nenhum resultado encontrado</p>
                    <p className="text-xs mt-1">Tente uma descrição diferente ou ajuste os filtros</p>
                  </div>
                ) : (
                  results.map((r) => {
                    const isExpanded = expandedId === r.id;
                    const faceColor = r.faceList === "branca" ? "text-green-400" : r.faceList === "negra" ? "text-red-400" : "text-amber-400";
                    return (
                      <div key={r.id} className="rounded-xl border border-border bg-card overflow-hidden transition-all">
                        <div
                          className="flex items-center gap-4 p-4 cursor-pointer hover:bg-accent/30 transition-colors"
                          onClick={() => setExpandedId(isExpanded ? null : r.id)}
                        >
                          {/* Thumbnail placeholder */}
                          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted shrink-0">
                            <ScanFace className={cn("h-6 w-6", faceColor)} />
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">{r.personName}</p>
                              <span className={cn("text-[10px] font-medium", faceColor)}>
                                {r.faceList === "branca" ? "Lista Branca" : r.faceList === "negra" ? "Lista Negra" : "Estranho"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1"><Camera className="h-3 w-3" /> {r.cameraId} — {r.cameraName}</span>
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {r.date} {r.time}</span>
                            </div>
                          </div>

                          {/* Score */}
                          <div className="flex flex-col items-end shrink-0">
                            <div className="flex items-center gap-1.5">
                              <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn("h-full", r.matchScore >= 85 ? "bg-green-500" : r.matchScore >= 70 ? "bg-amber-500" : "bg-red-500")}
                                  style={{ width: `${r.matchScore}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono font-bold">{r.matchScore}%</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-0.5">relevância</span>
                          </div>

                          <button className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-border bg-muted/20 p-4">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Gênero</p>
                                <p className="text-xs flex items-center gap-1"><User className="h-3 w-3" /> {r.attributes.gender === "M" ? "Masculino" : "Feminino"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Idade</p>
                                <p className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> {r.attributes.age}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Óculos</p>
                                <p className="text-xs flex items-center gap-1"><Glasses className="h-3 w-3" /> {r.attributes.glasses ? "Sim" : "Não"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Camisa</p>
                                <p className="text-xs flex items-center gap-1"><Shirt className="h-3 w-3" /> {r.attributes.shirtColor}</p>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                              <button className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                                <ScanFace className="h-3.5 w-3.5" /> Ver Perfil Completo
                              </button>
                              <button className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                                <Camera className="h-3.5 w-3.5" /> Ver Snapshot
                              </button>
                              <button className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                                <ArrowRight className="h-3.5 w-3.5" /> Ir para Timeline
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* Search history */}
          {!hasSearched && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <History className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Buscas Recentes</p>
              </div>
              <div className="space-y-2">
                {mockHistory.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => handleSearch(h.query)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 text-left hover:bg-accent/30 transition-colors"
                  >
                    <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs font-medium flex-1 truncate">{h.query}</span>
                    <span className="text-[10px] text-muted-foreground">{h.results} resultados</span>
                    <span className="text-[10px] text-muted-foreground/50">{h.timestamp.substring(11, 16)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
