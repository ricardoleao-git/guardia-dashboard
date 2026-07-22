import { useState } from "react";
import { Bookmark, BookmarkPlus, Trash2, Check, X, Star, Cloud, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchPresets, SearchPreset } from "@/hooks/useSearchPresets";

interface SearchPresetsProps {
  currentFilters: Record<string, any>;
  onLoadPreset: (filters: Record<string, any>) => void;
}

export default function SearchPresets({ currentFilters, onLoadPreset }: SearchPresetsProps) {
  const { presets, savePreset, deletePreset, source } = useSearchPresets();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  const handleSave = async () => {
    if (!presetName.trim()) return;
    const preset = await savePreset(presetName.trim(), currentFilters);
    setActivePresetId(preset.id);
    setPresetName("");
    setShowSaveDialog(false);
  };

  const handleLoad = (preset: SearchPreset) => {
    onLoadPreset(preset.filters);
    setActivePresetId(preset.id);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deletePreset(id);
    if (activePresetId === id) setActivePresetId(null);
  };

  // Generate a summary of the filters for display
  const filterSummary = (filters: Record<string, any>): string => {
    const parts: string[] = [];
    if (filters.query) parts.push(`"${filters.query}"`);
    if (filters.personName) parts.push(`Nome: ${filters.personName}`);
    if (filters.plate) parts.push(`Placa: ${filters.plate}`);
    if (filters.operator) parts.push(filters.operator);
    if (filters.direction && filters.direction !== "all") parts.push(filters.direction === "entry" ? "Entrada" : "Saída");
    if (filters.timeRange && filters.timeRange !== "all") parts.push(filters.timeRange);
    if (filters.scoreMin > 0 || filters.scoreMax < 100) parts.push(`Score: ${filters.scoreMin}-${filters.scoreMax}%`);
    if (filters.cameraSerial) parts.push(filters.cameraSerial);
    return parts.length > 0 ? parts.join(" · ") : "Sem filtros";
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Source indicator */}
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mr-1" title={source === "cloud" ? "Presets sincronizados na nuvem (compartilhados com a equipe)" : "Presets salvos localmente neste navegador"}>
        {source === "cloud" ? <Cloud className="h-3 w-3 text-primary" /> : <HardDrive className="h-3 w-3" />}
        {source === "cloud" ? "Nuvem" : "Local"}
      </div>
      {/* Saved presets chips */}
      {presets.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleLoad(preset)}
              className={cn(
                "group flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                activePresetId === preset.id
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
              title={filterSummary(preset.filters)}
            >
              <Star className={cn("h-3 w-3", activePresetId === preset.id ? "fill-primary text-primary" : "")} />
              {preset.name}
              <span
                onClick={(e) => handleDelete(e, preset.id)}
                className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                role="button"
                tabIndex={-1}
              >
                <Trash2 className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Save button / dialog */}
      {!showSaveDialog ? (
        <button
          onClick={() => setShowSaveDialog(true)}
          className="flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
        >
          <BookmarkPlus className="h-3 w-3" />
          Salvar busca
        </button>
      ) : (
        <div className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2 py-1">
          <Bookmark className="h-3 w-3 text-primary" />
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") { setShowSaveDialog(false); setPresetName(""); }
            }}
            placeholder="Nome do preset..."
            autoFocus
            className="bg-transparent text-xs outline-none placeholder:text-muted-foreground w-32"
          />
          <button
            onClick={handleSave}
            className="text-primary hover:text-primary/80 transition-colors"
            disabled={!presetName.trim()}
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { setShowSaveDialog(false); setPresetName(""); }}
            className="text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
