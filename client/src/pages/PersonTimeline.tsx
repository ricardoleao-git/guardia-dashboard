/**
 * PersonTimeline — Histórico de aparições de uma pessoa ao longo do tempo.
 *
 * Fase 3.1 do roadmap: Correlação de identidade.
 * Mostra todas as aparições de um indivíduo, com câmera, horário, score facial,
 * lista (Branca/Negra/Estranho) e thumbnail. Permite filtrar por câmera, período e lista.
 */
import { useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import {
  Search, Camera, Clock, MapPin, Filter, ChevronDown, ChevronUp,
  ScanFace, Calendar, Download, ArrowLeft, Users, TrendingUp,
  Video, Image, AlertCircle, CheckCircle2, XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";

// ===== Types =====
interface Appearance {
  id: string;
  personId: string;
  personName: string;
  faceList: "branca" | "negra" | "estranho";
  cameraId: string;
  cameraName: string;
  timestamp: string;
  date: string;
  time: string;
  score: number;
  thumbnail: string;
  attributes: {
    gender?: "M" | "F";
    age?: number;
    glasses?: boolean;
    mask?: boolean;
  };
  direction?: "entry" | "exit";
}

// ===== Mock data — aparições realistas baseadas na bancada =====
const mockAppearances: Appearance[] = [
  { id: "ap1", personId: "p1", personName: "João Pedro Silva", faceList: "branca", cameraId: "D2", cameraName: "Portaria Principal", timestamp: "2026-07-23T07:32:00", date: "2026-07-23", time: "07:32", score: 94, thumbnail: "", attributes: { gender: "M", age: 42, glasses: true }, direction: "entry" },
  { id: "ap2", personId: "p1", personName: "João Pedro Silva", faceList: "branca", cameraId: "D4", cameraName: "Corredor Bloco A", timestamp: "2026-07-23T07:35:00", date: "2026-07-23", time: "07:35", score: 91, thumbnail: "", attributes: { gender: "M", age: 42, glasses: true } },
  { id: "ap3", personId: "p1", personName: "João Pedro Silva", faceList: "branca", cameraId: "D5", cameraName: "Refeitório", timestamp: "2026-07-23T12:15:00", date: "2026-07-23", time: "12:15", score: 88, thumbnail: "", attributes: { gender: "M", age: 42, glasses: true } },
  { id: "ap4", personId: "p1", personName: "João Pedro Silva", faceList: "branca", cameraId: "D4", cameraName: "Corredor Bloco A", timestamp: "2026-07-23T17:42:00", date: "2026-07-23", time: "17:42", score: 92, thumbnail: "", attributes: { gender: "M", age: 42, glasses: true }, direction: "exit" },
  { id: "ap5", personId: "p2", personName: "Maria Eduarda Costa", faceList: "branca", cameraId: "D2", cameraName: "Portaria Principal", timestamp: "2026-07-23T07:45:00", date: "2026-07-23", time: "07:45", score: 96, thumbnail: "", attributes: { gender: "F", age: 35, glasses: false }, direction: "entry" },
  { id: "ap6", personId: "p2", personName: "Maria Eduarda Costa", faceList: "branca", cameraId: "D3", cameraName: "Estacionamento", timestamp: "2026-07-23T07:48:00", date: "2026-07-23", time: "07:48", score: 89, thumbnail: "", attributes: { gender: "F", age: 35, glasses: false } },
  { id: "ap7", personId: "p2", personName: "Maria Eduarda Costa", faceList: "branca", cameraId: "D5", cameraName: "Refeitório", timestamp: "2026-07-23T12:30:00", date: "2026-07-23", time: "12:30", score: 93, thumbnail: "", attributes: { gender: "F", age: 35, glasses: false } },
  { id: "ap8", personId: "p2", personName: "Maria Eduarda Costa", faceList: "branca", cameraId: "D2", cameraName: "Portaria Principal", timestamp: "2026-07-23T18:05:00", date: "2026-07-23", time: "18:05", score: 90, thumbnail: "", attributes: { gender: "F", age: 35, glasses: false }, direction: "exit" },
  { id: "ap9", personId: "p3", personName: "Carlos Eduardo Lima", faceList: "branca", cameraId: "D2", cameraName: "Portaria Principal", timestamp: "2026-07-23T08:10:00", date: "2026-07-23", time: "08:10", score: 87, thumbnail: "", attributes: { gender: "M", age: 28, glasses: false }, direction: "entry" },
  { id: "ap10", personId: "p3", personName: "Carlos Eduardo Lima", faceList: "branca", cameraId: "D4", cameraName: "Corredor Bloco A", timestamp: "2026-07-23T08:12:00", date: "2026-07-23", time: "08:12", score: 85, thumbnail: "", attributes: { gender: "M", age: 28, glasses: false } },
  { id: "ap11", personId: "p3", personName: "Carlos Eduardo Lima", faceList: "branca", cameraId: "D2", cameraName: "Portaria Principal", timestamp: "2026-07-23T16:30:00", date: "2026-07-23", time: "16:30", score: 89, thumbnail: "", attributes: { gender: "M", age: 28, glasses: false }, direction: "exit" },
  { id: "ap12", personId: "p4", personName: "Desconhecido #4821", faceList: "estranho", cameraId: "D2", cameraName: "Portaria Principal", timestamp: "2026-07-23T14:22:00", date: "2026-07-23", time: "14:22", score: 0, thumbnail: "", attributes: { gender: "M", age: 30, glasses: false, mask: true } },
  { id: "ap13", personId: "p5", personName: "Ana Beatriz Rocha", faceList: "branca", cameraId: "D2", cameraName: "Portaria Principal", timestamp: "2026-07-23T07:55:00", date: "2026-07-23", time: "07:55", score: 95, thumbnail: "", attributes: { gender: "F", age: 31, glasses: false }, direction: "entry" },
  { id: "ap14", personId: "p5", personName: "Ana Beatriz Rocha", faceList: "branca", cameraId: "D5", cameraName: "Refeitório", timestamp: "2026-07-23T12:00:00", date: "2026-07-23", time: "12:00", score: 91, thumbnail: "", attributes: { gender: "F", age: 31, glasses: false } },
  { id: "ap15", personId: "p5", personName: "Ana Beatriz Rocha", faceList: "branca", cameraId: "D2", cameraName: "Portaria Principal", timestamp: "2026-07-23T17:50:00", date: "2026-07-23", time: "17:50", score: 93, thumbnail: "", attributes: { gender: "F", age: 31, glasses: false }, direction: "exit" },
  { id: "ap16", personId: "p1", personName: "João Pedro Silva", faceList: "branca", cameraId: "D2", cameraName: "Portaria Principal", timestamp: "2026-07-22T07:30:00", date: "2026-07-22", time: "07:30", score: 93, thumbnail: "", attributes: { gender: "M", age: 42, glasses: true }, direction: "entry" },
  { id: "ap17", personId: "p1", personName: "João Pedro Silva", faceList: "branca", cameraId: "D4", cameraName: "Corredor Bloco A", timestamp: "2026-07-22T17:38:00", date: "2026-07-22", time: "17:38", score: 90, thumbnail: "", attributes: { gender: "M", age: 42, glasses: true }, direction: "exit" },
  { id: "ap18", personId: "p2", personName: "Maria Eduarda Costa", faceList: "branca", cameraId: "D2", cameraName: "Portaria Principal", timestamp: "2026-07-22T07:42:00", date: "2026-07-22", time: "07:42", score: 94, thumbnail: "", attributes: { gender: "F", age: 35, glasses: false }, direction: "entry" },
  { id: "ap19", personId: "p6", personName: "Suspeito Lista Negra", faceList: "negra", cameraId: "D3", cameraName: "Estacionamento", timestamp: "2026-07-22T22:15:00", date: "2026-07-22", time: "22:15", score: 82, thumbnail: "", attributes: { gender: "M", age: 25, glasses: false } },
  { id: "ap20", personId: "p6", personName: "Suspeito Lista Negra", faceList: "negra", cameraId: "D2", cameraName: "Portaria Principal", timestamp: "2026-07-22T22:18:00", date: "2026-07-22", time: "22:18", score: 79, thumbnail: "", attributes: { gender: "M", age: 25, glasses: false } },
];

// Unique persons for the selector
const uniquePersons = Array.from(new Set(mockAppearances.map(a => a.personId)))
  .map(pid => mockAppearances.find(a => a.personId === pid)!)
  .filter(Boolean);

const cameras = ["all", "D1", "D2", "D3", "D4", "D5", "D6"];
const lists = ["all", "branca", "negra", "estranho"];

export default function PersonTimeline() {
  const { t } = useI18n();
  const [selectedPerson, setSelectedPerson] = useState<string>("p1");
  const [cameraFilter, setCameraFilter] = useState("all");
  const [listFilter, setListFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"time" | "camera" | "score">("time");

  const personAppearances = useMemo(() => {
    let filtered = mockAppearances.filter(a => a.personId === selectedPerson);
    if (cameraFilter !== "all") filtered = filtered.filter(a => a.cameraId === cameraFilter);
    if (listFilter !== "all") filtered = filtered.filter(a => a.faceList === listFilter);
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(a =>
        a.cameraName.toLowerCase().includes(s) ||
        a.time.includes(s) ||
        a.date.includes(s)
      );
    }
    if (sortBy === "time") filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    if (sortBy === "camera") filtered.sort((a, b) => a.cameraId.localeCompare(b.cameraId));
    if (sortBy === "score") filtered.sort((a, b) => b.score - a.score);
    return filtered;
  }, [selectedPerson, cameraFilter, listFilter, search, sortBy]);

  const personInfo = uniquePersons.find(p => p.personId === selectedPerson);
  const stats = useMemo(() => {
    const personEvents = mockAppearances.filter(a => a.personId === selectedPerson);
    const cameras_ = new Set(personEvents.map(a => a.cameraId));
    const dates_ = new Set(personEvents.map(a => a.date));
    const avgScore = personEvents.length > 0
      ? Math.round(personEvents.filter(a => a.score > 0).reduce((s, a) => s + a.score, 0) / personEvents.filter(a => a.score > 0).length)
      : 0;
    const firstSeen = personEvents.length > 0
      ? personEvents.reduce((min, a) => a.timestamp < min ? a.timestamp : min, personEvents[0].timestamp)
      : "";
    const lastSeen = personEvents.length > 0
      ? personEvents.reduce((max, a) => a.timestamp > max ? a.timestamp : max, personEvents[0].timestamp)
      : "";
    return { total: personEvents.length, cameras: cameras_.size, dates: dates_.size, avgScore, firstSeen, lastSeen };
  }, [selectedPerson]);

  const listColor = (list: string) => {
    if (list === "branca") return "bg-green-500/10 text-green-400 border-green-500/20";
    if (list === "negra") return "bg-red-500/10 text-red-400 border-red-500/20";
    return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  };

  const listLabel = (list: string) => {
    if (list === "branca") return "Lista Branca";
    if (list === "negra") return "Lista Negra";
    return "Estranho";
  };

  const scoreColor = (score: number) => {
    if (score >= 85) return "text-green-400";
    if (score >= 70) return "text-amber-400";
    if (score > 0) return "text-red-400";
    return "text-muted-foreground";
  };

  const initials = (name: string) => {
    const parts = name.split(" ");
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.substring(0, 2);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeView="person-timeline" onNavigate={() => {}} mobileOpen={false} onMobileClose={() => {}} />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-60">
        <MobileHeader onMenuClick={() => {}} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold tracking-tight">{t("timeline.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">Histórico de aparições e correlação de identidade entre câmeras</p>
          </div>

          {/* Person selector cards */}
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Selecionar Pessoa</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {uniquePersons.map(person => {
                const personEvents = mockAppearances.filter(a => a.personId === person.personId);
                const isSelected = selectedPerson === person.personId;
                return (
                  <button
                    key={person.personId}
                    onClick={() => setSelectedPerson(person.personId)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border p-3 transition-all duration-150",
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30 scale-[1.02]"
                        : "border-border bg-card hover:border-primary/30 hover:bg-accent/50"
                    )}
                  >
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold",
                      person.faceList === "branca" && "bg-green-500/15 text-green-400",
                      person.faceList === "negra" && "bg-red-500/15 text-red-400",
                      person.faceList === "estranho" && "bg-amber-500/15 text-amber-400"
                    )}>
                      {initials(person.personName)}
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold truncate max-w-[120px]">{person.personName}</p>
                      <p className="text-[10px] text-muted-foreground">{personEvents.length} aparições</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stats row */}
          {personInfo && (
            <div className="mb-6 grid grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Camera className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[11px] text-muted-foreground">Total Aparições</span>
                </div>
                <p className="font-display text-xl font-bold">{stats.total}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-[11px] text-muted-foreground">Câmeras Distintas</span>
                </div>
                <p className="font-display text-xl font-bold">{stats.cameras}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-3.5 w-3.5 text-purple-400" />
                  <span className="text-[11px] text-muted-foreground">Dias com Aparição</span>
                </div>
                <p className="font-display text-xl font-bold">{stats.dates}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                  <span className="text-[11px] text-muted-foreground">Score Médio</span>
                </div>
                <p className={cn("font-display text-xl font-bold", scoreColor(stats.avgScore))}>
                  {stats.avgScore > 0 ? `${stats.avgScore}%` : "N/A"}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-[11px] text-muted-foreground">Primeira / Última</span>
                </div>
                <p className="font-mono text-[10px] text-muted-foreground leading-tight">
                  {stats.firstSeen ? stats.firstSeen.replace("T", " ").substring(0, 16) : "—"}
                  <br />→ {stats.lastSeen ? stats.lastSeen.replace("T", " ").substring(0, 16) : "—"}
                </p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={cameraFilter}
                onChange={(e) => setCameraFilter(e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
              >
                {cameras.map(c => (
                  <option key={c} value={c}>{c === "all" ? "Todas as câmeras" : c}</option>
                ))}
              </select>
            </div>
            <select
              value={listFilter}
              onChange={(e) => setListFilter(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
            >
              {lists.map(l => (
                <option key={l} value={l}>{l === "all" ? "Todas as listas" : listLabel(l)}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "time" | "camera" | "score")}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
            >
              <option value="time">Ordenar: Mais recente</option>
              <option value="camera">Ordenar: Câmera</option>
              <option value="score">Ordenar: Score</option>
            </select>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-border bg-background pl-7 pr-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <button className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors">
              <Download className="h-3.5 w-3.5" /> Exportar
            </button>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {personAppearances.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ScanFace className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">Nenhuma aparição encontrada com os filtros atuais</p>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-6 top-4 bottom-4 w-px bg-border" />

                <div className="divide-y divide-border">
                  {personAppearances.map((ap) => {
                    const isExpanded = expandedId === ap.id;
                    return (
                      <div
                        key={ap.id}
                        className="relative pl-14 pr-4 py-3 hover:bg-accent/30 transition-colors cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : ap.id)}
                      >
                        {/* Timeline dot */}
                        <div className={cn(
                          "absolute left-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2",
                          ap.faceList === "branca" && "border-green-500 bg-green-500/20",
                          ap.faceList === "negra" && "border-red-500 bg-red-500/20",
                          ap.faceList === "estranho" && "border-amber-500 bg-amber-500/20"
                        )}>
                          <div className={cn(
                            "h-2 w-2 rounded-full",
                            ap.faceList === "branca" && "bg-green-500",
                            ap.faceList === "negra" && "bg-red-500",
                            ap.faceList === "estranho" && "bg-amber-500"
                          )} />
                        </div>

                        {/* Content */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Time + camera */}
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-mono text-xs font-semibold text-foreground">{ap.date} · {ap.time}</span>
                              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Camera className="h-3 w-3" /> {ap.cameraId} — {ap.cameraName}
                              </span>
                              {ap.direction && (
                                <span className={cn(
                                  "rounded px-1.5 py-0.5 text-[10px] font-medium",
                                  ap.direction === "entry" ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400"
                                )}>
                                  {ap.direction === "entry" ? "Entrada" : "Saída"}
                                </span>
                              )}
                            </div>

                            {/* Score + list badge */}
                            <div className="flex items-center gap-3">
                              <span className={cn(
                                "rounded border px-1.5 py-0.5 text-[10px] font-medium",
                                listColor(ap.faceList)
                              )}>
                                {listLabel(ap.faceList)}
                              </span>
                              {ap.score > 0 && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-muted-foreground">Match</span>
                                  <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full",
                                        ap.score >= 85 ? "bg-green-500" : ap.score >= 70 ? "bg-amber-500" : "bg-red-500"
                                      )}
                                      style={{ width: `${ap.score}%` }}
                                    />
                                  </div>
                                  <span className={cn("text-[10px] font-mono font-semibold", scoreColor(ap.score))}>{ap.score}%</span>
                                </div>
                              )}
                            </div>

                            {/* Expanded details */}
                            {isExpanded && (
                              <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3 rounded-lg bg-muted/30 p-3">
                                {/* Thumbnail placeholder */}
                                <div className="flex flex-col items-center gap-1">
                                  <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
                                    {initials(ap.personName)}
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">Captura</span>
                                </div>
                                {/* Attributes */}
                                <div className="space-y-1">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Atributos</p>
                                  <p className="text-xs">Gênero: {ap.attributes.gender === "M" ? "Masculino" : "Feminino"}</p>
                                  <p className="text-xs">Idade: ~{ap.attributes.age}</p>
                                  <p className="text-xs">Óculos: {ap.attributes.glasses ? "Sim" : "Não"}</p>
                                  <p className="text-xs">Máscara: {ap.attributes.mask ? "Sim" : "Não"}</p>
                                </div>
                                {/* Camera info */}
                                <div className="space-y-1">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Câmera</p>
                                  <p className="text-xs">{ap.cameraId} — {ap.cameraName}</p>
                                  <p className="text-xs text-muted-foreground">IP: 192.168.254.{ap.cameraId === "D1" ? "115" : ap.cameraId === "D2" ? "206" : ap.cameraId === "D3" ? "208" : ap.cameraId === "D4" ? "227" : ap.cameraId === "D5" ? "207" : "209"}</p>
                                </div>
                                {/* Actions */}
                                <div className="space-y-1">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Ações</p>
                                  <button className="flex items-center gap-1 text-xs text-primary hover:underline">
                                    <Video className="h-3 w-3" /> Ver vídeo
                                  </button>
                                  <button className="flex items-center gap-1 text-xs text-primary hover:underline">
                                    <Image className="h-3 w-3" /> Snapshot
                                  </button>
                                  <button className="flex items-center gap-1 text-xs text-primary hover:underline">
                                    <Download className="h-3 w-3" /> Baixar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Expand chevron */}
                          <button className="mt-1 text-muted-foreground hover:text-foreground transition-colors">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Summary footer */}
          {personInfo && (
            <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                Mostrando {personAppearances.length} de {stats.total} aparições de <span className="font-semibold text-foreground">{personInfo.personName}</span>
              </div>
              <div className="flex items-center gap-2">
                {personInfo.faceList === "branca" && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                {personInfo.faceList === "negra" && <XCircle className="h-4 w-4 text-red-400" />}
                {personInfo.faceList === "estranho" && <AlertCircle className="h-4 w-4 text-amber-400" />}
                <span className={cn("text-xs font-medium", listColor(personInfo.faceList).split(" ").find(c => c.startsWith("text-")))}>
                  {listLabel(personInfo.faceList)}
                </span>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
