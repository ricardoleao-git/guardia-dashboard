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
      <div className="px-6 py-4">
        {/* Title row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">{title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-3.5 w-3.5" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ID, serial ou nome..."
              value={filters.search || ""}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              className="pl-9"
            />
          </div>

          <Select
            value={filters.cameraSerial || "all"}
            onValueChange={(v) => onFiltersChange({ ...filters, cameraSerial: v === "all" ? null : v })}
          >
            <SelectTrigger className="w-[180px]">
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
            <SelectTrigger className="w-[180px]">
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

          <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
            <Filter className="h-3.5 w-3.5" />
            <span className="font-mono-tech text-xs">{totalEvents} eventos</span>
          </div>
        </div>
      </div>
    </header>
  );
}
