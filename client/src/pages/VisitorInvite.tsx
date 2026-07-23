/**
 * VisitorInvite — Convite de Visitante com QR Code e notificação de chegada.
 *
 * Fase 3.3 do roadmap: Provisionamento de visitante.
 * - Criar convite com dados do visitante + host + período
 * - Gerar QR code visual (placeholder SVG)
 * - Lista de convites ativos/expirados/usados
 * - Notificação ao chegar (match facial na portaria)
 * - Pré-cadastro na lista branca temporária do P6S
 */
import { useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import {
  UserPlus, Search, Filter, Download, QrCode, Clock, CheckCircle2,
  XCircle, AlertCircle, Calendar, Mail, Phone, Send, Copy,
  ChevronDown, ChevronUp, User, MapPin, Shield, Trash2, Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";

// ===== Types =====
interface VisitorInvite {
  id: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  visitorCompany?: string;
  hostName: string;
  purpose: string;
  expectedArrival: string;
  expectedDeparture: string;
  status: "pending" | "arrived" | "completed" | "expired" | "cancelled";
  qrCode: string;
  createdAt: string;
  arrivedAt?: string;
  cameraId?: string;
  faceMatch?: number;
  notifiedHost?: boolean;
}

// ===== Mock data =====
const mockInvites: VisitorInvite[] = [
  { id: "vi1", visitorName: "Roberto Mendes", visitorEmail: "roberto@externo.com", visitorPhone: "(11) 98765-4321", visitorCompany: "Tech Solutions Ltda", hostName: "João Pedro Silva", purpose: "Reunião comercial", expectedArrival: "2026-07-23T10:00:00", expectedDeparture: "2026-07-23T12:00:00", status: "arrived", qrCode: "GUARDIA-VIS-001", createdAt: "2026-07-22T15:00:00", arrivedAt: "2026-07-23T10:05:00", cameraId: "D2", faceMatch: 88, notifiedHost: true },
  { id: "vi2", visitorName: "Fernanda Cruz", visitorEmail: "fernanda@parceiro.com", visitorPhone: "(11) 91234-5678", visitorCompany: "Parceiros & Cia", hostName: "Maria Eduarda Costa", purpose: "Apresentação de produto", expectedArrival: "2026-07-23T14:00:00", expectedDeparture: "2026-07-23T15:30:00", status: "pending", qrCode: "GUARDIA-VIS-002", createdAt: "2026-07-23T08:00:00" },
  { id: "vi3", visitorName: "Técnico Câmeras", visitorEmail: "tecnico@manutencao.com", visitorPhone: "(11) 99999-0000", hostName: "Carlos Eduardo Lima", purpose: "Manutenção preventiva", expectedArrival: "2026-07-23T09:00:00", expectedDeparture: "2026-07-23T11:00:00", status: "completed", qrCode: "GUARDIA-VIS-003", createdAt: "2026-07-21T10:00:00", arrivedAt: "2026-07-23T09:02:00", cameraId: "D2", faceMatch: 91, notifiedHost: true },
  { id: "vi4", visitorName: "Ana Paula Vendas", visitorEmail: "ana@vendas.com", visitorPhone: "(11) 98888-7777", visitorCompany: "Vendas Pro", hostName: "João Pedro Silva", purpose: "Proposta comercial", expectedArrival: "2026-07-22T16:00:00", expectedDeparture: "2026-07-22T17:00:00", status: "expired", qrCode: "GUARDIA-VIS-004", createdAt: "2026-07-22T12:00:00" },
  { id: "vi5", visitorName: "Pedro Santos", visitorEmail: "pedro@consultoria.com", visitorPhone: "(11) 97777-6666", visitorCompany: "Consultoria JS", hostName: "Ana Beatriz Rocha", purpose: "Consultoria técnica", expectedArrival: "2026-07-24T09:00:00", expectedDeparture: "2026-07-24T18:00:00", status: "pending", qrCode: "GUARDIA-VIS-005", createdAt: "2026-07-23T07:00:00" },
];

const statusConfig = {
  pending: { label: "Aguardando", icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  arrived: { label: "No local", icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
  completed: { label: "Concluído", icon: CheckCircle2, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  expired: { label: "Expirado", icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  cancelled: { label: "Cancelado", icon: XCircle, color: "text-muted-foreground", bg: "bg-muted", border: "border-border" },
};

export default function VisitorInvite() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNewInvite, setShowNewInvite] = useState(false);
  const [showQR, setShowQR] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // New invite form
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newHost, setNewHost] = useState("");
  const [newPurpose, setNewPurpose] = useState("");
  const [newArrival, setNewArrival] = useState("");
  const [newDeparture, setNewDeparture] = useState("");

  const filteredInvites = useMemo(() => {
    let filtered = [...mockInvites];
    if (statusFilter !== "all") filtered = filtered.filter(i => i.status === statusFilter);
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(i =>
        i.visitorName.toLowerCase().includes(s) ||
        i.visitorEmail.toLowerCase().includes(s) ||
        i.hostName.toLowerCase().includes(s) ||
        i.qrCode.toLowerCase().includes(s)
      );
    }
    filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return filtered;
  }, [search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: mockInvites.length,
      pending: mockInvites.filter(i => i.status === "pending").length,
      arrived: mockInvites.filter(i => i.status === "arrived").length,
      completed: mockInvites.filter(i => i.status === "completed").length,
      expired: mockInvites.filter(i => i.status === "expired").length,
    };
  }, []);

  const handleCreateInvite = () => {
    if (!newName.trim() || !newHost.trim()) return;
    setShowNewInvite(false);
    setNewName(""); setNewEmail(""); setNewPhone(""); setNewCompany("");
    setNewHost(""); setNewPurpose(""); setNewArrival(""); setNewDeparture("");
  };

  const copyQR = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeView="visitor-invite" onNavigate={() => {}} mobileOpen={false} onMobileClose={() => {}} />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-60">
        <MobileHeader onMenuClick={() => {}} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">{t("visitor.title")}</h1>
              <p className="text-sm text-muted-foreground mt-1">Pré-cadastro facial temporário + QR Code + notificação de chegada</p>
            </div>
            <button
              onClick={() => setShowNewInvite(true)}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Novo Convite
            </button>
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <UserPlus className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] text-muted-foreground">Total</span>
              </div>
              <p className="font-display text-xl font-bold">{stats.total}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[11px] text-muted-foreground">Aguardando</span>
              </div>
              <p className="font-display text-xl font-bold text-amber-400">{stats.pending}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                <span className="text-[11px] text-muted-foreground">No Local</span>
              </div>
              <p className="font-display text-xl font-bold text-green-400">{stats.arrived}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-[11px] text-muted-foreground">Concluídos</span>
              </div>
              <p className="font-display text-xl font-bold text-blue-400">{stats.completed}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="h-3.5 w-3.5 text-red-400" />
                <span className="text-[11px] text-muted-foreground">Expirados</span>
              </div>
              <p className="font-display text-xl font-bold text-red-400">{stats.expired}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground"
              >
                <option value="all">Todos os status</option>
                <option value="pending">Aguardando</option>
                <option value="arrived">No local</option>
                <option value="completed">Concluído</option>
                <option value="expired">Expirado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Nome, email, host, QR..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-border bg-background pl-7 pr-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <button className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors">
              <Download className="h-3.5 w-3.5" /> Exportar
            </button>
          </div>

          {/* Invites list */}
          <div className="space-y-3">
            {filteredInvites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground rounded-xl border border-border bg-card">
                <UserPlus className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">Nenhum convite encontrado</p>
              </div>
            ) : (
              filteredInvites.map(invite => {
                const isExpanded = expandedId === invite.id;
                const sc = statusConfig[invite.status];
                const StatusIcon = sc.icon;
                return (
                  <div
                    key={invite.id}
                    className="rounded-xl border border-border bg-card overflow-hidden transition-all"
                  >
                    {/* Row */}
                    <div
                      className="flex items-center gap-4 p-4 cursor-pointer hover:bg-accent/30 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : invite.id)}
                    >
                      {/* Avatar */}
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold shrink-0",
                        sc.bg, sc.color
                      )}>
                        {invite.visitorName.split(" ").map(p => p[0]).slice(0, 2).join("")}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate">{invite.visitorName}</p>
                          <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium", sc.bg, sc.color, sc.border)}>
                            <StatusIcon className="h-3 w-3" /> {sc.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1"><User className="h-3 w-3" /> {invite.hostName}</span>
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {invite.expectedArrival.replace("T", " ").substring(0, 16)}</span>
                          {invite.visitorCompany && <span className="hidden sm:inline">{invite.visitorCompany}</span>}
                        </div>
                      </div>

                      {/* QR code button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowQR(showQR === invite.id ? null : invite.id); }}
                        className="flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2.5 py-1.5 text-xs font-medium hover:bg-accent transition-colors shrink-0"
                      >
                        <QrCode className="h-3.5 w-3.5" /> QR
                      </button>

                      {/* Expand */}
                      <button className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* QR Code panel */}
                    {showQR === invite.id && (
                      <div className="border-t border-border bg-muted/30 p-4 flex items-center gap-6">
                        {/* QR placeholder */}
                        <div className="flex h-32 w-32 items-center justify-center rounded-lg border-2 border-border bg-white">
                          <div className="grid grid-cols-8 gap-0.5">
                            {Array.from({ length: 64 }).map((_, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "h-3 w-3 rounded-sm",
                                  (i * 7 + invite.id.charCodeAt(2)) % 3 === 0 ? "bg-black" : "bg-white"
                                )}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Código do Convite</p>
                          <p className="font-mono text-sm font-bold mb-3">{invite.qrCode}</p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyQR(invite.qrCode)}
                              className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                            >
                              <Copy className="h-3.5 w-3.5" /> {copied ? "Copiado!" : "Copiar"}
                            </button>
                            <button className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                              <Send className="h-3.5 w-3.5" /> Enviar por Email
                            </button>
                            <button className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                              <Send className="h-3.5 w-3.5" /> WhatsApp
                            </button>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-2">
                            Válido das {invite.expectedArrival.replace("T", " ").substring(11, 16)} às {invite.expectedDeparture.replace("T", " ").substring(11, 16)} em {invite.expectedArrival.substring(0, 10)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/20 p-4">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Visitante</p>
                            <p className="text-xs font-medium">{invite.visitorName}</p>
                            {invite.visitorCompany && <p className="text-[11px] text-muted-foreground">{invite.visitorCompany}</p>}
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Contato</p>
                            <p className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> {invite.visitorEmail}</p>
                            <p className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> {invite.visitorPhone}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Período</p>
                            <p className="text-xs">Chegada: {invite.expectedArrival.replace("T", " ").substring(0, 16)}</p>
                            <p className="text-xs">Saída: {invite.expectedDeparture.replace("T", " ").substring(0, 16)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Finalidade</p>
                            <p className="text-xs">{invite.purpose}</p>
                          </div>
                        </div>

                        {/* Arrival info */}
                        {invite.status === "arrived" && invite.arrivedAt && (
                          <div className="mt-3 flex items-center gap-3 rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                            <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-green-400">Visitante chegou</p>
                              <p className="text-[11px] text-muted-foreground">
                {invite.arrivedAt.replace("T", " ").substring(0, 16)} · Câmera {invite.cameraId} · Match facial: {invite.faceMatch}%
                              </p>
                            </div>
                            {invite.notifiedHost && (
                              <span className="flex items-center gap-1 text-[10px] text-green-400">
                                <Send className="h-3 w-3" /> Host notificado
                              </span>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="mt-3 flex items-center gap-2">
                          {invite.status === "pending" && (
                            <>
                              <button className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                                <Send className="h-3.5 w-3.5" /> Reenviar Convite
                              </button>
                              <button className="flex items-center gap-1.5 rounded-md bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors">
                                <XCircle className="h-3.5 w-3.5" /> Cancelar
                              </button>
                            </>
                          )}
                          {invite.status === "arrived" && (
                            <button className="flex items-center gap-1.5 rounded-md bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/20 transition-colors">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Registrar Saída
                            </button>
                          )}
                          <button className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors">
                            <Shield className="h-3.5 w-3.5" /> Ver na Lista Branca
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* New Invite Modal */}
          {showNewInvite && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowNewInvite(false)}>
              <div
                className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <UserPlus className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <h2 className="font-display text-base font-semibold">{t("visitor.new")}</h2>
                  </div>
                  <button onClick={() => setShowNewInvite(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Nome do Visitante *</label>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Nome completo"
                        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Empresa</label>
                      <input
                        type="text"
                        value={newCompany}
                        onChange={(e) => setNewCompany(e.target.value)}
                        placeholder="Empresa (opcional)"
                        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Email</label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Telefone / WhatsApp</label>
                      <input
                        type="text"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Host (Anfitrião) *</label>
                    <input
                      type="text"
                      value={newHost}
                      onChange={(e) => setNewHost(e.target.value)}
                      placeholder="Quem o visitante vai encontrar"
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Finalidade da Visita</label>
                    <input
                      type="text"
                      value={newPurpose}
                      onChange={(e) => setNewPurpose(e.target.value)}
                      placeholder="Reunião, manutenção, entrega..."
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Chegada Prevista</label>
                      <input
                        type="datetime-local"
                        value={newArrival}
                        onChange={(e) => setNewArrival(e.target.value)}
                        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Saída Prevista</label>
                      <input
                        type="datetime-local"
                        value={newDeparture}
                        onChange={(e) => setNewDeparture(e.target.value)}
                        className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground"
                      />
                    </div>
                  </div>
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                    <p className="text-[11px] text-muted-foreground">
                      <Shield className="inline h-3 w-3 mr-1" />
                      O visitante será pré-cadastrado na lista branca temporária do P6S durante o período da visita. Ao chegar, o sistema fará match facial na portaria e notificará o host automaticamente.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
                  <button
                    onClick={() => setShowNewInvite(false)}
                    className="rounded-md bg-muted px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateInvite}
                    disabled={!newName.trim() || !newHost.trim()}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-medium transition-colors",
                      newName.trim() && newHost.trim()
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    <QrCode className="h-3.5 w-3.5" /> Gerar Convite + QR
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
