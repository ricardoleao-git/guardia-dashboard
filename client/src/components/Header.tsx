import { Search, Filter, Download, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterState } from "@/lib/types";
import { mockCameras } from "@/lib/mock-data";

interface HeaderProps {
  title: string;
  subtitle: string;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onRefresh: () => void;
  totalEvents: number;
}

export default function Header({ title, subtitle, filters, onFiltersChange, onRefresh, totalEvents }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="px-4 py-3 lg:px-6 lg:py-4">
        {/* Title row */}
        <div className="flex items-center justify-between mb-3 lg:mb-4">
          <div className="min-w-0">
            <h2 className="font-display text-xl lg:text-2xl font-bold tracking-tight truncate">{title}</h2>
            <p className="text-xs lg:text-sm text-muted-foreground mt-0.5 truncate">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
          </div>
        </div>

        {/* Filters row — empilha em mobile, linha em desktop */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <div className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID, serial ou nome..."
              value={filters.search || ""}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              className="pl-9"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Select
              value={filters.cameraSerial || "all"}
              onValueChange={(v) => onFiltersChange({ ...filters, cameraSerial: v === "all" ? null : v })}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Câmera" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as câmeras</SelectItem>
                {mockCameras.map((cam) => (
                  <SelectItem key={cam.serial} value={cam.serial}>
                    {cam.serial} — {cam.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.operator || "all"}
              onValueChange={(v) => onFiltersChange({ ...filters, operator: v === "all" ? null : v })}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Operador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="FaceReco">Reconhecimento Facial</SelectItem>
                <SelectItem value="AccessControl">Controle de Acesso</SelectItem>
                <SelectItem value="VehicleReco">Reconhecimento de Veículo</SelectItem>
                <SelectItem value="MotionDetection">Detecção de Movimento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground sm:ml-auto">
            <Filter className="h-3.5 w-3.5" />
            <span className="font-mono-tech text-xs">{totalEvents} eventos</span>
          </div>
        </div>
      </div>
    </header>
  );
}
