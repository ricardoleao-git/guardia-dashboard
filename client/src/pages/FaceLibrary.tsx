import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import { Users, Plus, Search, Upload, Edit2, Trash2, ScanFace, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface FaceRecord {
  id: string;
  name: string;
  category: string;
  employeeId: string;
  registeredAt: string;
  lastSeen: string;
  imageUrl: string;
  status: "active" | "disabled";
}

const mockFaces: FaceRecord[] = [
  { id: "F001", name: "João Silva", category: "Funcionário", employeeId: "EMP-001", registeredAt: "2024-01-15", lastSeen: "há 2 min", imageUrl: "/manus-storage/cam-facereco-reco1.jpg", status: "active" },
  { id: "F002", name: "Maria Santos", category: "Funcionário", employeeId: "EMP-002", registeredAt: "2024-01-15", lastSeen: "há 15 min", imageUrl: "/manus-storage/cam-facereco-reco2.jpg", status: "active" },
  { id: "F003", name: "Carlos Oliveira", category: "Visitante", employeeId: "VIS-003", registeredAt: "2024-02-20", lastSeen: "há 3h", imageUrl: "/manus-storage/cam-facereco-reco1.jpg", status: "active" },
  { id: "F004", name: "Ana Costa", category: "Funcionário", employeeId: "EMP-004", registeredAt: "2024-03-10", lastSeen: "há 1 dia", imageUrl: "/manus-storage/cam-facereco-reco2.jpg", status: "disabled" },
];

const categories = ["Todos", "Funcionário", "Visitante", "Fornecedor", "Aluno"];

export default function FaceLibrary() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [faces] = useState(mockFaces);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredFaces = faces.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase()) || f.employeeId.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "Todos" || f.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        activeView="face-library"
        onNavigate={() => {}}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className="lg:ml-60">
        <MobileHeader onMenuClick={() => setMobileSidebarOpen(true)} />

        <div className="border-b border-border bg-card/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold">Biblioteca de Rostos</h2>
                <p className="text-xs text-muted-foreground">{faces.length} rostos cadastrados — {faces.filter(f => f.status === "active").length} ativos</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Cadastrar Rosto
            </button>
          </div>
        </div>

        <main className="p-6 space-y-4">
          {/* Search + filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou ID..."
                className="w-full rounded-lg border border-border bg-input pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                    activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Face grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFaces.map(face => (
              <div key={face.id} className="rounded-lg border border-border bg-card overflow-hidden group hover:ring-1 hover:ring-primary/40 transition-all">
                {/* Face image */}
                <div className="relative aspect-square bg-black/30 overflow-hidden">
                  <img src={face.imageUrl} alt={face.name} className="absolute inset-0 h-full w-full object-cover" />
                  {/* Status badge */}
                  <div className="absolute top-2 right-2">
                    {face.status === "active" ? (
                      <span className="flex items-center gap-1 rounded-full bg-green-500/90 px-2 py-0.5 text-[10px] font-medium text-white">
                        <Check className="h-2.5 w-2.5" /> Ativo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-muted/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        <X className="h-2.5 w-2.5" /> Inativo
                      </span>
                    )}
                  </div>
                  {/* Scan overlay on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 flex items-center justify-center">
                    <ScanFace className="h-8 w-8 text-primary" />
                  </div>
                </div>
                {/* Info */}
                <div className="p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{face.name}</p>
                    <span className="text-[10px] font-mono-tech text-muted-foreground">{face.id}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded bg-muted px-1.5 py-0.5">{face.category}</span>
                    <span className="font-mono-tech">{face.employeeId}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-muted-foreground">Última aparição: {face.lastSeen}</span>
                    <div className="flex items-center gap-1">
                      <button className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-primary transition-colors" title="Editar">
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-destructive transition-colors" title="Remover">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredFaces.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-display text-base font-semibold mb-1">Nenhum rosto encontrado</h3>
              <p className="text-sm text-muted-foreground">Ajuste a busca ou cadastre um novo rosto.</p>
            </div>
          )}
        </main>
      </div>

      {/* Add face modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowAddModal(false)}>
          <div className="rounded-xl border border-border bg-card p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-semibold">Cadastrar Novo Rosto</h3>
              <button onClick={() => setShowAddModal(false)} className="rounded-md p-1 hover:bg-accent text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Upload area */}
            <div className="rounded-lg border-2 border-dashed border-border p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Clique ou arraste uma foto aqui</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">JPG, PNG — máximo 5MB</p>
            </div>
            {/* Form fields */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nome completo</label>
                <input type="text" placeholder="Ex: João Silva" className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                  <select className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                    <option>Funcionário</option>
                    <option>Visitante</option>
                    <option>Fornecedor</option>
                    <option>Aluno</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">ID / Matrícula</label>
                  <input type="text" placeholder="Ex: EMP-005" className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button onClick={() => setShowAddModal(false)} className="flex-1 rounded-lg bg-muted px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">Cancelar</button>
              <button onClick={() => setShowAddModal(false)} className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Cadastrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
