/**
 * UserAdmin — Painel de administração de usuários e operadores.
 *
 * Design Philosophy: NVR Dark Theme — tabela densa com headers em uppercase,
 * badges coloridos por role, modais para convite e edição.
 *
 * Features:
 * - Lista de operadores com role, status, último acesso
 * - Convidar novo operador (email + role)
 * - Editar role (admin/operator/viewer)
 * - Revogar acesso (desativar ou remover)
 * - Filtro por role e busca por nome/email
 * - Indicador de usuário atual (você)
 *
 * Em modo demo, usa dados mockados. Com Supabase, usa tabela profiles.
 */
import { useState, useMemo, useEffect } from "react";
import {
  Users,
  UserPlus,
  Search,
  MoreVertical,
  Shield,
  Eye,
  User as UserIcon,
  Trash2,
  Edit2,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  Crown,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";

type UserRole = "admin" | "operator" | "viewer";
type UserStatus = "active" | "invited" | "disabled";

interface OperatorUser {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  status: UserStatus;
  avatar_url: string | null;
  last_sign_in_at: string | null;
  created_at: string;
}

// Mock operators for demo mode
const mockOperators: OperatorUser[] = [
  {
    id: "demo-1",
    email: "ricardo@zenitetech.com",
    full_name: "Ricardo Leão",
    role: "admin",
    status: "active",
    avatar_url: null,
    last_sign_in_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-2",
    email: "operador1@escola.com.br",
    full_name: "Carlos Mendes",
    role: "operator",
    status: "active",
    avatar_url: null,
    last_sign_in_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-3",
    email: "portaria@condominio.com.br",
    full_name: "Ana Paula Silva",
    role: "operator",
    status: "active",
    avatar_url: null,
    last_sign_in_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-4",
    email: "diretor@escola.com.br",
    full_name: "Prof. Eduardo Costa",
    role: "viewer",
    status: "active",
    avatar_url: null,
    last_sign_in_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-5",
    email: "novo.operador@escola.com.br",
    full_name: "Juliana Ferreira",
    role: "operator",
    status: "invited",
    avatar_url: null,
    last_sign_in_at: null,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-6",
    email: "ex.funcionario@escola.com.br",
    full_name: "Pedro Almeida",
    role: "viewer",
    status: "disabled",
    avatar_url: null,
    last_sign_in_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const roleConfig: Record<UserRole, { label: string; icon: typeof Shield; color: string; badge: string }> = {
  admin: {
    label: "Administrador",
    icon: Crown,
    color: "text-amber-400",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  operator: {
    label: "Operador",
    icon: Shield,
    color: "text-blue-400",
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  viewer: {
    label: "Visualizador",
    icon: Eye,
    color: "text-gray-400",
    badge: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  },
};

const statusConfig: Record<UserStatus, { label: string; color: string; dot: string }> = {
  active: { label: "Ativo", color: "text-green-400", dot: "bg-green-400" },
  invited: { label: "Convidado", color: "text-amber-400", dot: "bg-amber-400" },
  disabled: { label: "Desativado", color: "text-red-400", dot: "bg-red-400" },
};

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Nunca";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Agora";
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days}d`;
  const months = Math.floor(days / 30);
  return `há ${months} mês${months > 1 ? "es" : ""}`;
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

export default function UserAdmin() {
  const { user, isDemoMode } = useAuth();
  const [operators, setOperators] = useState<OperatorUser[]>(mockOperators);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editUser, setEditUser] = useState<OperatorUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<OperatorUser | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("operator");
  const [inviting, setInviting] = useState(false);

  // Edit form state
  const [editRole, setEditRole] = useState<UserRole>("operator");
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  // Load operators from Supabase
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    setLoading(true);
    supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao carregar operadores:", error);
          toast.error("Erro ao carregar operadores");
        } else if (data && data.length > 0) {
          setOperators(
            data.map((p: any) => ({
              id: p.id,
              email: p.email,
              full_name: p.full_name,
              role: p.role as UserRole,
              status: "active" as UserStatus,
              avatar_url: p.avatar_url,
              last_sign_in_at: null,
              created_at: p.created_at,
            }))
          );
        }
        setLoading(false);
      });
  }, []);

  const filteredOperators = useMemo(() => {
    return operators.filter((op) => {
      if (roleFilter !== "all" && op.role !== roleFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = (op.full_name || "").toLowerCase();
        const email = op.email.toLowerCase();
        if (!name.includes(q) && !email.includes(q)) return false;
      }
      return true;
    });
  }, [operators, search, roleFilter]);

  const stats = useMemo(() => {
    return {
      total: operators.length,
      admins: operators.filter((o) => o.role === "admin").length,
      operators: operators.filter((o) => o.role === "operator").length,
      viewers: operators.filter((o) => o.role === "viewer").length,
      active: operators.filter((o) => o.status === "active").length,
      invited: operators.filter((o) => o.status === "invited").length,
    };
  }, [operators]);

  const currentUserEmail = user?.email || (isDemoMode ? "ricardo@zenitetech.com" : "");

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Informe o email do novo operador");
      return;
    }

    setInviting(true);

    try {
      if (isSupabaseConfigured && supabase) {
        // Send invite via Supabase Auth
        const { error } = await supabase.auth.signInWithOtp({
          email: inviteEmail.trim(),
          options: {
            data: {
              full_name: inviteName.trim() || undefined,
              role: inviteRole,
            },
          },
        });

        if (error) throw error;

        toast.success(`Convite enviado para ${inviteEmail}`);
      } else {
        // Demo mode — add to mock list
        const newOp: OperatorUser = {
          id: `demo-${Date.now()}`,
          email: inviteEmail.trim(),
          full_name: inviteName.trim() || null,
          role: inviteRole,
          status: "invited",
          avatar_url: null,
          last_sign_in_at: null,
          created_at: new Date().toISOString(),
        };
        setOperators((prev) => [newOp, ...prev]);
        toast.success(`Operador ${inviteEmail} convidado (modo demo)`);
      }

      setInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("operator");
    } catch (err: any) {
      toast.error(`Erro ao convidar: ${err.message || err}`);
    } finally {
      setInviting(false);
    }
  };

  const handleEditSave = async () => {
    if (!editUser) return;

    setSaving(true);

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from("profiles")
          .update({ role: editRole, full_name: editName.trim() || null })
          .eq("id", editUser.id);

        if (error) throw error;
      }

      // Update local state
      setOperators((prev) =>
        prev.map((op) =>
          op.id === editUser.id
            ? { ...op, role: editRole, full_name: editName.trim() || op.full_name }
            : op
        )
      );

      toast.success(`Permissões de ${editUser.full_name || editUser.email} atualizadas`);
      setEditUser(null);
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from("profiles").delete().eq("id", deleteUser.id);
        if (error) throw error;
      }

      setOperators((prev) => prev.filter((op) => op.id !== deleteUser.id));
      toast.success(`Acesso de ${deleteUser.full_name || deleteUser.email} revogado`);
      setDeleteUser(null);
    } catch (err: any) {
      toast.error(`Erro ao revogar acesso: ${err.message || err}`);
    }
  };

  const handleToggleStatus = (op: OperatorUser) => {
    const newStatus: UserStatus = op.status === "disabled" ? "active" : "disabled";
    setOperators((prev) =>
      prev.map((o) => (o.id === op.id ? { ...o, status: newStatus } : o))
    );
    toast.success(
      newStatus === "disabled"
        ? `${op.full_name || op.email} desativado`
        : `${op.full_name || op.email} reativado`
    );
  };

  return (
    <div className="space-y-5">
      {/* Header with stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} icon={Users} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard label="Admins" value={stats.admins} icon={Crown} color="text-amber-400" bg="bg-amber-500/10" />
        <StatCard label="Operadores" value={stats.operators} icon={Shield} color="text-green-400" bg="bg-green-500/10" />
        <StatCard label="Visualizadores" value={stats.viewers} icon={Eye} color="text-gray-400" bg="bg-gray-500/10" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={roleFilter}
            onValueChange={(v) => setRoleFilter(v as UserRole | "all")}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os níveis</SelectItem>
              <SelectItem value="admin">Administradores</SelectItem>
              <SelectItem value="operator">Operadores</SelectItem>
              <SelectItem value="viewer">Visualizadores</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Convidar Operador
        </Button>
      </div>

      {/* Operators table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Operador</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nível de Acesso</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Último Acesso</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <Loader2 className="h-6 w-6 text-muted-foreground animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredOperators.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    Nenhum operador encontrado
                  </td>
                </tr>
              ) : (
                filteredOperators.map((op) => {
                  const role = roleConfig[op.role];
                  const status = statusConfig[op.status];
                  const isCurrentUser = op.email === currentUserEmail;
                  const RoleIcon = role.icon;

                  return (
                    <tr key={op.id} className="hover:bg-accent/30 transition-colors">
                      {/* Operator info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">
                            {getInitials(op.full_name, op.email)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">
                                {op.full_name || op.email.split("@")[0]}
                              </p>
                              {isCurrentUser && (
                                <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-primary/30 text-primary">
                                  Você
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{op.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium", role.badge)}>
                          <RoleIcon className="h-3 w-3" />
                          {role.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={cn("h-2 w-2 rounded-full", status.dot)} />
                          <span className={cn("text-xs font-medium", status.color)}>{status.label}</span>
                        </div>
                      </td>

                      {/* Last access */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(op.last_sign_in_at)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="rounded-md p-1.5 hover:bg-accent transition-colors">
                              <MoreVertical className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditUser(op);
                                setEditRole(op.role);
                                setEditName(op.full_name || "");
                              }}
                            >
                              <Edit2 className="h-3.5 w-3.5 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(op)}>
                              {op.status === "disabled" ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                                  Reativar
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3.5 w-3.5 mr-2" />
                                  Desativar
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteUser(op)}
                              className="text-destructive focus:text-destructive"
                              disabled={isCurrentUser}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Revogar Acesso
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role descriptions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <RoleCard
          icon={Crown}
          title="Administrador"
          description="Acesso total: gerencia operadores, configurações do sistema, câmeras e auditoria."
          permissions={["Convidar e remover operadores", "Definir níveis de acesso", "Configurar sistema", "Exportar relatórios", "Ver auditoria"]}
        />
        <RoleCard
          icon={Shield}
          title="Operador"
          description="Operação diária: monitora eventos, faz anotações, gerencia bibliotecas."
          permissions={["Ver eventos ao vivo", "Criar anotações", "Gerenciar biblioteca de rostos", "Gerenciar veículos", "Salvar presets de busca"]}
        />
        <RoleCard
          icon={Eye}
          title="Visualizador"
          description="Acesso somente leitura: visualiza eventos e câmeras sem editar."
          permissions={["Ver eventos", "Ver câmeras ao vivo", "Ver bibliotecas", "Exportar relatórios"]}
        />
      </div>

      {/* Invite Modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Convidar Operador
            </DialogTitle>
            <DialogDescription>
              O operador receberá um email com link de acesso. Defina o nível de permissão agora — poderá ser alterado depois.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="operador@escola.com.br"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-name">Nome completo (opcional)</Label>
              <Input
                id="invite-name"
                placeholder="Nome do operador"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Nível de Acesso</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Crown className="h-3.5 w-3.5 text-amber-400" />
                      Administrador
                    </div>
                  </SelectItem>
                  <SelectItem value="operator">
                    <div className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5 text-blue-400" />
                      Operador
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <Eye className="h-3.5 w-3.5 text-gray-400" />
                      Visualizador
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleInvite} disabled={inviting}>
              {inviting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar Convite
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-primary" />
              Editar Operador
            </DialogTitle>
            <DialogDescription>
              Altere o nome e o nível de acesso de {editUser?.full_name || editUser?.email}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                placeholder="Nome do operador"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Nível de Acesso</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Crown className="h-3.5 w-3.5 text-amber-400" />
                      Administrador
                    </div>
                  </SelectItem>
                  <SelectItem value="operator">
                    <div className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5 text-blue-400" />
                      Operador
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <Eye className="h-3.5 w-3.5 text-gray-400" />
                      Visualizador
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Revogar Acesso
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja revogar o acesso de{" "}
              <strong className="text-foreground">{deleteUser?.full_name || deleteUser?.email}</strong>?
              Esta ação remove o operador do sistema. Ele não poderá mais acessar o GuardIA.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Revogar Acesso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  color: string;
  bg: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold font-display mt-1">{value}</p>
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", bg)}>
          <Icon className={cn("h-5 w-5", color)} />
        </div>
      </div>
    </div>
  );
}

function RoleCard({
  icon: Icon,
  title,
  description,
  permissions,
}: {
  icon: typeof Shield;
  title: string;
  description: string;
  permissions: string[];
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-primary" />
        <h4 className="font-display text-sm font-semibold">{title}</h4>
      </div>
      <p className="text-xs text-muted-foreground mb-3">{description}</p>
      <ul className="space-y-1.5">
        {permissions.map((perm) => (
          <li key={perm} className="flex items-center gap-2 text-xs">
            <CheckCircle2 className="h-3 w-3 text-green-400 shrink-0" />
            {perm}
          </li>
        ))}
      </ul>
    </div>
  );
}
