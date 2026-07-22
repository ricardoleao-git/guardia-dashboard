import { useState, useMemo } from "react";
import {
  Search, ScanFace, Car, Clock, ArrowUpDown, Target, X, ChevronDown, SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CameraEvent } from "@/lib/types";

export interface SmartSearchFilters {
  query: string;
  personName: string;
  plate: string;
  operator: string | null;
  direction: "all" | "entry" | "exit";
  scoreMin: number;
  scoreMax: number;
  timeRange: "all" | "1h" | "6h" | "24h" | "7d";
  cameraSerial: string | null;
}

export const defaultSmartFilters: SmartSearchFilters = {
  query: "",
  personName: "",
  plate: "",
  operator: null,
  direction: "all",
  scoreMin: 0,
  scoreMax: 100,
  timeRange: "all",
  cameraSerial: null,
};

interface SmartSearchProps {
  filters: SmartSearchFilters;
  onFiltersChange: (filters: SmartSearchFilters) => void;
  events: CameraEvent[];
  onResultClick?: (event: CameraEvent) => void;
}

const timeRangeLabels: Record<string, string> = {
  all: "Todo período",
  "1h": "Última 1h",
  "6h": "Últimas 6h",
  "24h": "Últimas 24h",
  "7d": "Últimos 7 dias",
};

const directionLabels: Record<string, string> = {
  all: "Todas",
  entry: "Entrada",
  exit: "Saída",
};

export default function SmartSearch({ filters, onFiltersChange, events, onResultClick }: SmartSearchProps) {
  const [expanded, setExpanded] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [localQuery, setLocalQuery] = useState(filters.query);

  const update = (partial: Partial<SmartSearchFilters>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.personName !== "" ||
      filters.plate !== "" ||
      filters.direction !== "all" ||
      filters.scoreMin > 0 ||
      filters.scoreMax < 100 ||
      filters.timeRange !== "all" ||
      filters.operator !== null ||
      filters.cameraSerial !== null
    );
  }, [filters]);

  const filteredResults = useMemo(() => {
    return events.filter((e) => {
      // Text query (searches name, plate, event_id, camera_serial)
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const name = e.payload?.data?.name?.toLowerCase() || "";
        const plate = e.payload?.data?.plate?.toLowerCase() || "";
        const eventId = e.event_id.toLowerCase();
        const serial = e.camera_serial.toLowerCase();
        if (!name.includes(q) && !plate.includes(q) && !eventId.includes(q) && !serial.includes(q)) {
          return false;
        }
      }

      // Person name filter
      if (filters.personName) {
        const name = e.payload?.data?.name?.toLowerCase() || "";
        if (!name.includes(filters.personName.toLowerCase())) return false;
      }

      // Plate filter
      if (filters.plate) {
        const plate = e.payload?.data?.plate?.toLowerCase() || "";
        if (!plate.includes(filters.plate.toLowerCase())) return false;
      }

      // Operator filter
      if (filters.operator && e.operator !== filters.operator) return false;

      // Direction filter
      if (filters.direction !== "all") {
        const dir = e.payload?.data?.direction || "";
        if (dir !== filters.direction) return false;
      }

      // Score range filter
      const score = e.payload?.data?.matchScore ?? 0;
      if (score < filters.scoreMin || score > filters.scoreMax) return false;

      // Time range filter
      if (filters.timeRange !== "all") {
        const eventTime = new Date(e.timestamp).getTime();
        const now = Date.now();
        const ranges: Record<string, number> = {
          "1h": 60 * 60 * 1000,
          "6h": 6 * 60 * 60 * 1000,
          "24h": 24 * 60 * 60 * 1000,
          "7d": 7 * 24 * 60 * 60 * 1000,
        };
        if (now - eventTime > ranges[filters.timeRange]) return false;
      }

      // Camera serial filter
      if (filters.cameraSerial && e.camera_serial !== filters.cameraSerial) return false;

      return true;
    });
  }, [events, filters]);

  const handleSearch = () => {
    update({ query: localQuery });
    setShowResults(true);
  };

  const clearAll = () => {
    onFiltersChange(defaultSmartFilters);
    setLocalQuery("");
    setShowResults(false);
  };

  const cameraSerials = useMemo(() => {
    return Array.from(new Set(events.map((e) => e.camera_serial)));
  }, [events]);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Main search bar */}
      <div className="flex items-center gap-2 p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Buscar por nome, placa, ID do evento ou serial da câmera..."
            className="w-full rounded-lg border border-border bg-input pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          onClick={handleSearch}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Buscar
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors",
            expanded || hasActiveFilters ? "bg-primary/10 text-primary border-primary/30" : "hover:bg-accent text-muted-foreground"
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Filtros</span>
          {hasActiveFilters && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {Object.entries(filters).filter(([k, v]) => {
                if (k === "query") return false;
                if (typeof v === "string") return v !== "" && v !== "all";
                if (typeof v === "number") return k === "scoreMin" ? v > 0 : v < 100;
                return v !== null;
              }).length}
            </span>
          )}
        </button>
      </div>

      {/* Expanded filters panel */}
      {expanded && (
        <div className="border-t border-border bg-muted/30 p-4 space-y-4">
          {/* Row 1: Person name + Plate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                <ScanFace className="h-3.5 w-3.5" /> Nome da Pessoa
              </label>
              <input
                type="text"
                value={filters.personName}
                onChange={(e) => update({ personName: e.target.value })}
                placeholder="Ex: João Silva"
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                <Car className="h-3.5 w-3.5" /> Placa do Veículo
              </label>
              <input
                type="text"
                value={filters.plate}
                onChange={(e) => update({ plate: e.target.value.toUpperCase() })}
                placeholder="Ex: ABC1234"
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono-tech uppercase tracking-wider"
              />
            </div>
          </div>

          {/* Row 2: Operator + Direction + Time range */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                <Target className="h-3.5 w-3.5" /> Tipo de Evento
              </label>
              <select
                value={filters.operator || ""}
                onChange={(e) => update({ operator: e.target.value || null })}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Todos os tipos</option>
                <option value="FaceReco">Reconhecimento Facial</option>
                <option value="VehicleReco">Reconhecimento de Veículo</option>
                <option value="AccessControl">Controle de Acesso</option>
                <option value="MotionDetection">Detecção de Movimento</option>
                <option value="Alarm">Alarme</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                <ArrowUpDown className="h-3.5 w-3.5" /> Direção
              </label>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-input p-0.5">
                {(["all", "entry", "exit"] as const).map((dir) => (
                  <button
                    key={dir}
                    onClick={() => update({ direction: dir })}
                    className={cn(
                      "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                      filters.direction === dir ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {directionLabels[dir]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                <Clock className="h-3.5 w-3.5" /> Período
              </label>
              <select
                value={filters.timeRange}
                onChange={(e) => update({ timeRange: e.target.value as SmartSearchFilters["timeRange"] })}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {Object.entries(timeRangeLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Score range + Camera serial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5" /> Score de Match
                </span>
                <span className="font-mono-tech text-primary">{filters.scoreMin}% — {filters.scoreMax}%</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={filters.scoreMin}
                  onChange={(e) => update({ scoreMin: Math.min(Number(e.target.value), filters.scoreMax) })}
                  className="flex-1 accent-primary"
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={filters.scoreMax}
                  onChange={(e) => update({ scoreMax: Math.max(Number(e.target.value), filters.scoreMin) })}
                  className="flex-1 accent-primary"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5">Câmera (Serial)</label>
              <select
                value={filters.cameraSerial || ""}
                onChange={(e) => update({ cameraSerial: e.target.value || null })}
                className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm font-mono-tech focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Todas as câmeras</option>
                {cameraSerials.map((serial) => (
                  <option key={serial} value={serial}>{serial}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear button */}
          {hasActiveFilters && (
            <div className="flex justify-end">
              <button
                onClick={clearAll}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" /> Limpar todos os filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Search results summary */}
      {showResults && (
        <div className="border-t border-border px-4 py-2.5 bg-muted/20">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{filteredResults.length}</span> resultado(s) encontrado(s)
            </p>
            <button
              onClick={() => setShowResults(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Ocultar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
