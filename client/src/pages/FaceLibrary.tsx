import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import { Users, Plus, Search, Upload, Edit2, Trash2, ScanFace, X, Check, User, Phone, IdCard, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface FaceRecord {
  id: string;
  name: string;
  category: string;
  employeeId: string;
  gender: string;
  phone: string;
  certType: string;
  certNumber: string;
  library: string;
  registeredAt: string;
  lastSeen: string;
  imageUrl: string;
  status: "active" | "disabled";
}

const mockFaces: FaceRecord[] = [
  { id: "F001", name: "João Silva", category: "Funcionário", employeeId: "EMP-001", gender: "Masculino", phone: "(11) 98765-4321", certType: "RG", certNumber: "12.345.678-9", library: "Biblioteca Padrão", registeredAt: "2024-01-15", lastSeen: "há 2 min", imageUrl: "/manus-storage/cam-facereco-reco1.jpg", status: "active" },
  { id: "F002", name: "Maria Santos", category: "Funcionário", employeeId: "EMP-002", gender: "Feminino", phone: "(11) 91234-5678", certType: "RG", certNumber: "98.765.432-1", library: "Biblioteca Padrão", registeredAt: "2024-01-15", lastSeen: "há 15 min", imageUrl: "/manus-storage/cam-facereco-reco2.jpg", status: "active" },
  { id: "F003", name: "Carlos Oliveira", category: "Visitante", employeeId: "VIS-003", gender: "Masculino", phone: "(11) 95555-1234", certType: "CNH", certNumber: "01234567890", library: "Visitantes", registeredAt: "2024-02-20", lastSeen: "há 3h", imageUrl: "/manus-storage/cam-facereco-reco1.jpg", status: "active" },
  { id: "F004", name: "Ana Costa", category: "Aluno", employeeId: "ALU-004", gender: "Feminino", phone: "(11) 94444-9999", certType: "Certidão", certNumber: "2024-00123", library: "Alunos", registeredAt: "2024-03-10", lastSeen: "há 1 dia", imageUrl: "/manus-storage/cam-facereco-reco2.jpg", status: "disabled" },
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

      {/* Add face modal — detailed registration */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowAddModal(false)}>
          <div className="rounded-xl border border-border bg-card max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-5 py-3.5 z-10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                  <ScanFace className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-semibold">Cadastrar Novo Rosto</h3>
                  <p className="text-[10px] text-muted-foreground">Preencha todos os campos para cadastrar na biblioteca facial</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="rounded-md p-1 hover:bg-accent text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-5 py-4 space-y-4">
              {/* Upload area */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Foto do Rosto</label>
                  <div className="rounded-lg border-2 border-dashed border-border aspect-square flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors cursor-pointer bg-muted/20">
                    <Upload className="h-6 w-6 text-muted-foreground mb-1.5" />
                    <p className="text-[10px] text-muted-foreground px-2">Clique ou arraste</p>
                    <p className="text-[9px] text-muted-foreground/60 mt-0.5">JPG, PNG — máx 5MB</p>
                  </div>
                </div>
                <div className="col-span-2 space-y-3">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block flex items-center gap-1"><User className="h-3 w-3" /> Nome completo</label>
                    <input type="text" placeholder="Ex: João Silva" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Gênero</label>
                      <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                        <option>Masculino</option>
                        <option>Feminino</option>
                        <option>Outro</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Categoria</label>
                      <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                        <option>Funcionário</option>
                        <option>Visitante</option>
                        <option>Fornecedor</option>
                        <option>Aluno</option>
                        <option>Terceiro</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block flex items-center gap-1"><Phone className="h-3 w-3" /> Telefone / Contato</label>
                    <input type="text" placeholder="(11) 98765-4321" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono-tech placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border pt-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5"><IdCard className="h-3 w-3" /> Documentação</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Tipo de Certificado</label>
                    <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                      <option>RG</option>
                      <option>CNH</option>
                      <option>Passaporte</option>
                      <option>Certidão de Nascimento</option>
                      <option>Crachá Corporativo</option>
                      <option>Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Número do Certificado</label>
                    <input type="text" placeholder="Ex: 12.345.678-9" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono-tech placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
              </div>

              {/* Library selection */}
              <div className="border-t border-border pt-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5"><Users className="h-3 w-3" /> Biblioteca Facial</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Biblioteca de Destino</label>
                    <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                      <option>Biblioteca Padrão</option>
                      <option>Visitantes</option>
                      <option>Alunos</option>
                      <option>Funcionários</option>
                      <option>Fornecedores</option>
                      <option>Nova biblioteca...</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block flex items-center gap-1"><Calendar className="h-3 w-3" /> Validade (opcional)</label>
                    <input type="date" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono-tech focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-border bg-card px-5 py-3">
              <button onClick={() => setShowAddModal(false)} className="rounded-lg bg-muted px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">Cancelar</button>
              <button onClick={() => setShowAddModal(false)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" /> Cadastrar Rosto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
