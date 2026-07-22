import { useState } from "react";
import { Car, Plus, Search, Edit2, Trash2, X, Download, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface Vehicle {
  id: string;
  plate: string;
  model: string;
  color: string;
  owner: string;
  category: "authorized" | "visitor" | "blocked";
  registeredAt: string;
  lastSeen?: string;
}

const mockVehicles: Vehicle[] = [
  { id: "V001", plate: "ABC1J23", model: "Toyota Corolla", color: "Prata", owner: "João Silva", category: "authorized", registeredAt: "2025-03-15", lastSeen: "2025-07-22 08:34" },
  { id: "V002", plate: "DEF2K45", model: "Honda Civic", color: "Preto", owner: "Maria Santos", category: "authorized", registeredAt: "2025-03-20", lastSeen: "2025-07-22 07:15" },
  { id: "V003", plate: "GHI3L67", model: "Jeep Compass", color: "Branco", owner: "Pedro Costa", category: "authorized", registeredAt: "2025-04-01", lastSeen: "2025-07-21 18:42" },
  { id: "V004", plate: "JKL4M89", model: "Volkswagen Golf", color: "Vermelho", owner: "Ana Oliveira", category: "visitor", registeredAt: "2025-07-22", lastSeen: "2025-07-22 09:20" },
  { id: "V005", plate: "MNO5N01", model: "Fiat Toro", color: "Cinza", owner: "Carlos Souza", category: "authorized", registeredAt: "2025-02-10", lastSeen: "2025-07-22 06:55" },
  { id: "V006", plate: "PQR6O23", model: "Hyundai Creta", color: "Azul", owner: "Visitante 001", category: "visitor", registeredAt: "2025-07-22", lastSeen: "2025-07-22 10:10" },
  { id: "V007", plate: "STU7P45", model: "Chevrolet Onix", color: "Preto", owner: "Roberto Lima", category: "blocked", registeredAt: "2025-01-05", lastSeen: "2025-07-19 22:30" },
  { id: "V008", plate: "VWX8Q67", model: "Nissan Kicks", color: "Branco", owner: "Fernanda Alves", category: "authorized", registeredAt: "2025-03-28", lastSeen: "2025-07-22 07:45" },
];

const CATEGORY_CONFIG = {
  authorized: { label: "Autorizado", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30" },
  visitor: { label: "Visitante", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  blocked: { label: "Bloqueado", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
};

export default function VehicleManagement() {
  const [vehicles, setVehicles] = useState(mockVehicles);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ plate: "", model: "", color: "", owner: "", category: "authorized" as Vehicle["category"] });

  const filtered = vehicles.filter((v) => {
    const matchesSearch = !search ||
      v.plate.toLowerCase().includes(search.toLowerCase()) ||
      v.model.toLowerCase().includes(search.toLowerCase()) ||
      v.owner.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === "all" || v.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAdd = () => {
    if (!formData.plate || !formData.model) return;
    const newVehicle: Vehicle = {
      id: `V${String(vehicles.length + 1).padStart(3, "0")}`,
      plate: formData.plate.toUpperCase(),
      model: formData.model,
      color: formData.color || "—",
      owner: formData.owner || "—",
      category: formData.category,
      registeredAt: new Date().toISOString().split("T")[0],
    };
    setVehicles([newVehicle, ...vehicles]);
    setShowAddModal(false);
    setFormData({ plate: "", model: "", color: "", owner: "", category: "authorized" });
  };

  const handleDelete = (id: string) => {
    setVehicles(vehicles.filter((v) => v.id !== id));
  };

  const counts = {
    total: vehicles.length,
    authorized: vehicles.filter((v) => v.category === "authorized").length,
    visitor: vehicles.filter((v) => v.category === "visitor").length,
    blocked: vehicles.filter((v) => v.category === "blocked").length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" /> Gestão de Veículos
          </h2>
          <p className="text-xs text-muted-foreground">Biblioteca de veículos cadastrados para reconhecimento de placas</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors">
            <Download className="h-3.5 w-3.5" /> Exportar
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Cadastrar Veículo
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
          <p className="text-xl font-semibold font-mono-tech">{counts.total}</p>
        </div>
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
          <p className="text-[10px] text-green-400/70 uppercase tracking-wide">Autorizados</p>
          <p className="text-xl font-semibold font-mono-tech text-green-400">{counts.authorized}</p>
        </div>
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
          <p className="text-[10px] text-blue-400/70 uppercase tracking-wide">Visitantes</p>
          <p className="text-xl font-semibold font-mono-tech text-blue-400">{counts.visitor}</p>
        </div>
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-[10px] text-red-400/70 uppercase tracking-wide">Bloqueados</p>
          <p className="text-xl font-semibold font-mono-tech text-red-400">{counts.blocked}</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por placa, modelo ou proprietário..."
            className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {["all", "authorized", "visitor", "blocked"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                filterCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {cat === "all" ? "Todos" : CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG].label}
            </button>
          ))}
        </div>
      </div>

      {/* Vehicle table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">Placa</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">Modelo</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">Cor</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">Proprietário</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">Categoria</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">Cadastro</th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">Última passagem</th>
              <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <tr key={v.id} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                <td className="px-3 py-2.5">
                  <span className="inline-block rounded border border-border bg-muted/50 px-2 py-0.5 text-xs font-mono-tech font-bold tracking-wider">
                    {v.plate}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs font-medium">{v.model}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{v.color}</td>
                <td className="px-3 py-2.5 text-xs">{v.owner}</td>
                <td className="px-3 py-2.5">
                  <span className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                    CATEGORY_CONFIG[v.category].border,
                    CATEGORY_CONFIG[v.category].bg,
                    CATEGORY_CONFIG[v.category].color,
                  )}>
                    {CATEGORY_CONFIG[v.category].label}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs font-mono-tech text-muted-foreground">{v.registeredAt}</td>
                <td className="px-3 py-2.5 text-xs font-mono-tech text-muted-foreground">{v.lastSeen || "—"}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-center gap-1.5">
                    <button className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-primary transition-colors" title="Editar">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(v.id)}
                      className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-destructive transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Car className="h-10 w-10 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum veículo encontrado</p>
            <p className="text-xs text-muted-foreground/60">Ajuste os filtros ou cadastre um novo veículo</p>
          </div>
        )}
      </div>

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                  <Car className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Cadastrar Veículo</h3>
                  <p className="text-[10px] text-muted-foreground">Adicionar veículo à biblioteca de reconhecimento</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="rounded p-1 hover:bg-accent transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-3.5 px-5 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Placa *</label>
                  <input
                    type="text"
                    value={formData.plate}
                    onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                    placeholder="ABC1J23"
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-mono-tech font-bold tracking-wider focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Cor</label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="Prata"
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Modelo *</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Toyota Corolla"
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Proprietário</label>
                <input
                  type="text"
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  placeholder="Nome do responsável"
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Categoria</label>
                <div className="flex items-center gap-2">
                  {(Object.keys(CATEGORY_CONFIG) as Vehicle["category"][]).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFormData({ ...formData, category: cat })}
                      className={cn(
                        "flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                        formData.category === cat
                          ? cn(CATEGORY_CONFIG[cat].border, CATEGORY_CONFIG[cat].bg, CATEGORY_CONFIG[cat].color)
                          : "border-border bg-muted/50 text-muted-foreground hover:bg-accent"
                      )}
                    >
                      {CATEGORY_CONFIG[cat].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3.5">
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-md bg-muted px-4 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdd}
                disabled={!formData.plate || !formData.model}
                className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cadastrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
