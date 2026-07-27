import { useState } from "react";
import { Users, Plus, Search, Upload, Edit2, Trash2, ScanFace, X, Check, User, Phone, IdCard, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFaceLists } from "@/hooks/useFaceLists";
import { toast } from "sonner";

const categories = ["Todos", "WhiteList", "BlackList", "Visitor", "Stranger"];
const categoryLabels: Record<string, string> = {
  WhiteList: "Cadastrado",
  BlackList: "Lista Negra",
  Visitor: "Visitante",
  Stranger: "Estranho",
};

export default function FaceLibrary() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { entries: faces, loading, addEntry, deleteEntry } = useFaceLists();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({ person_name: "", face_list: "WhiteList", document: "", unit: "", role: "Aluno" });

  const filteredFaces = faces.filter(f => {
    const matchesSearch = f.person_name.toLowerCase().includes(search.toLowerCase()) || f.face_id.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "Todos" || f.face_list === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAdd = async () => {
    if (!newEntry.person_name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    const result = await addEntry({
      face_id: `FL${String(Date.now()).slice(-6)}`,
      person_name: newEntry.person_name,
      face_list: newEntry.face_list,
      document: newEntry.document || null,
      unit: newEntry.unit || null,
      role: newEntry.role || null,
      status: "active",
    });
    if (result.error) {
      toast.error("Erro ao cadastrar: " + result.error);
    } else {
      toast.success("Rosto cadastrado com sucesso!");
      setShowAddModal(false);
      setNewEntry({ person_name: "", face_list: "WhiteList", document: "", unit: "", role: "Aluno" });
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteEntry(id);
    if (result.error) {
      toast.error("Erro ao remover: " + result.error);
    } else {
      toast.success("Rosto removido");
    }
  };

  return (
    <div className="min-h-screen bg-background">


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
                  {cat === "Todos" ? "Todos" : categoryLabels[cat] || cat}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}

          {/* Face grid */}
          {!loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredFaces.map(face => (
                <div key={face.id} className="rounded-lg border border-border bg-card overflow-hidden group hover:ring-1 hover:ring-primary/40 transition-all">
                  {/* Face image placeholder */}
                  <div className="relative aspect-square bg-black/30 overflow-hidden flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <ScanFace className="h-12 w-12 text-muted-foreground/40" />
                      <span className="text-[10px] text-muted-foreground/60 font-mono-tech">{face.face_id}</span>
                    </div>
                    {/* Status badge */}
                    <div className="absolute top-2 right-2">
                      {face.status === "active" ? (
                        <span className="flex items-center gap-1 rounded-full bg-green-500/90 px-2 py-0.5 text-[10px] font-medium text-white">
                          <Check className="h-2.5 w-2.5" /> Ativo
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full bg-red-500/90 px-2 py-0.5 text-[10px] font-medium text-white">
                          <X className="h-2.5 w-2.5" /> Bloqueado
                        </span>
                      )}
                    </div>
                    {/* List type badge */}
                    <div className="absolute top-2 left-2">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        face.face_list === "BlackList" ? "bg-red-500/90 text-white" :
                        face.face_list === "Visitor" ? "bg-blue-500/90 text-white" :
                        face.face_list === "Stranger" ? "bg-orange-500/90 text-white" :
                        "bg-green-500/90 text-white"
                      )}>
                        {categoryLabels[face.face_list] || face.face_list}
                      </span>
                    </div>
                  </div>
                  {/* Info */}
                  <div className="p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{face.person_name}</p>
                      <span className="text-[10px] font-mono-tech text-muted-foreground">{face.face_id}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      {face.role && <span className="rounded bg-muted px-1.5 py-0.5">{face.role}</span>}
                      {face.unit && <span className="font-mono-tech">{face.unit}</span>}
                    </div>
                    {face.document && (
                      <div className="text-[10px] text-muted-foreground font-mono-tech">Doc: {face.document}</div>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(face.created_at).toLocaleDateString("pt-BR")}
                      </span>
                      <div className="flex items-center gap-1">
                        <button className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-primary transition-colors" title="Editar">
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(face.id)}
                          className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-destructive transition-colors"
                          title="Remover"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filteredFaces.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-display text-base font-semibold mb-1">Nenhum rosto encontrado</h3>
              <p className="text-sm text-muted-foreground">Ajuste a busca ou cadastre um novo rosto.</p>
            </div>
          )}
        </main>

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
                  <p className="text-[10px] text-muted-foreground">Preencha os campos para cadastrar na biblioteca facial</p>
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
                    <input
                      type="text"
                      value={newEntry.person_name}
                      onChange={e => setNewEntry({ ...newEntry, person_name: e.target.value })}
                      placeholder="Ex: João Silva"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Categoria</label>
                      <select
                        value={newEntry.face_list}
                        onChange={e => setNewEntry({ ...newEntry, face_list: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="WhiteList">Cadastrado (WhiteList)</option>
                        <option value="BlackList">Lista Negra (BlackList)</option>
                        <option value="Visitor">Visitante</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Função</label>
                      <select
                        value={newEntry.role}
                        onChange={e => setNewEntry({ ...newEntry, role: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option>Aluno</option>
                        <option>Professor</option>
                        <option>Funcionário</option>
                        <option>Visitante</option>
                        <option>Terceiro</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block flex items-center gap-1"><Phone className="h-3 w-3" /> Documento (CPF/RG)</label>
                    <input
                      type="text"
                      value={newEntry.document}
                      onChange={e => setNewEntry({ ...newEntry, document: e.target.value })}
                      placeholder="Ex: 123.456.789-00"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono-tech placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Unidade / Sala</label>
                    <input
                      type="text"
                      value={newEntry.unit}
                      onChange={e => setNewEntry({ ...newEntry, unit: e.target.value })}
                      placeholder="Ex: Sala 6A, Bloco B Apto 12"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-border bg-card px-5 py-3">
              <button onClick={() => setShowAddModal(false)} className="rounded-lg bg-muted px-4 py-2 text-sm font-medium hover:bg-accent transition-colors">Cancelar</button>
              <button
                onClick={handleAdd}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5" /> Cadastrar Rosto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
