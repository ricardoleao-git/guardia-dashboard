/**
 * T8 — Consentimento e Conformidade (LGPD)
 * GuardIA Percebe — Differential screen for compliance.
 *
 * States (CORE-03 §7): loading, empty, error, connector-offline, partial-sync.
 * Severity: 2 levels (critical, warning) — no third/fourth level.
 * Mock data only — no real personal data.
 *
 * Key features:
 * - Revogação em duas etapas com confirmação de FaceUUID
 * - Expurgo propagado (comando CGI para deletar template nos NVRs)
 * - Comprovante de exclusão em PDF
 * - Log de acesso a dado biométrico (append-only)
 */
import { useState, useMemo } from "react";
import {
  ShieldCheck, FileText, AlertTriangle, Loader2, WifiOff, RefreshCw,
  Check, X, Trash2, Download, Eye, Clock, User,
} from "lucide-react";
import {
  mockConsentRecords, mockConsentMetrics,
} from "@/lib/mock-data";
import type { ConsentStatus, ExpurgoStatus, ConsentRecord } from "@/lib/types";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const consentStatusConfig: Record<ConsentStatus, { label: string; className: string }> = {
  ativo: { label: "Ativo", className: "bg-green-500/15 text-green-400 border-green-500/30" },
  pendente: { label: "Pendente", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  revogado: { label: "Revogado", className: "bg-red-500/15 text-red-400 border-red-500/30" },
  expirado: { label: "Expirado", className: "bg-gray-500/15 text-gray-400 border-gray-500/30" },
};

const expurgoStatusConfig: Record<ExpurgoStatus, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  em_andamento: { label: "Em andamento", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  concluido: { label: "Concluído", className: "bg-green-500/15 text-green-400 border-green-500/30" },
  falhou: { label: "Falhou", className: "bg-red-500/15 text-red-400 border-red-500/30" },
};

const tipoLabels: Record<string, string> = {
  aluno: "Aluno",
  responsavel: "Responsável",
  funcionario: "Funcionário",
};

type LoadingState = "loading" | "empty" | "error" | "offline" | "partial" | "ready";

export default function Consentimento() {
  const [loadingState, setLoadingState] = useState<LoadingState>("ready");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [records, setRecords] = useState(mockConsentRecords);
  const [revokeTarget, setRevokeTarget] = useState<ConsentRecord | null>(null);
  const [revokeConfirmUUID, setRevokeConfirmUUID] = useState("");
  const [detailRecord, setDetailRecord] = useState<ConsentRecord | null>(null);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (tipoFilter !== "all" && r.titular.tipo !== tipoFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!r.titular.nome.toLowerCase().includes(q) && !r.faceUUID.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [records, statusFilter, tipoFilter, searchQuery]);

  const handleRevoke = () => {
    if (!revokeTarget) return;
    if (revokeConfirmUUID !== revokeTarget.faceUUID) {
      toast.error("FaceUUID não confere. Digite exatamente o identificador mostrado.");
      return;
    }
    // Simulate propagated expurgo
    setRecords((prev) =>
      prev.map((r) =>
        r.id === revokeTarget.id
          ? {
              ...r,
              status: "revogado" as ConsentStatus,
              dataRevogacao: new Date().toLocaleDateString("pt-BR"),
              dispositivos: r.dispositivos.map((d) => ({
                ...d,
                expurgoStatus: "em_andamento" as ExpurgoStatus,
              })),
              auditLog: [
                ...r.auditLog,
                { acao: "Revogação solicitada", operador: "operador@guardia", timestamp: new Date().toLocaleString("pt-BR") },
                { acao: "Expurgo propagado — comando CGI enviado", operador: "connector", timestamp: new Date().toLocaleString("pt-BR") },
              ],
            }
          : r
      )
    );
    toast.success(`Consentimento revogado. Expurgo propagado para ${revokeTarget.dispositivos.length} dispositivo(s). Comprovante disponível para download.`);
    setRevokeTarget(null);
    setRevokeConfirmUUID("");
  };

  const handleDownloadComprovante = (record: ConsentRecord) => {
    const comprovante = `COMPROVANTE DE EXCLUSÃO — LGPD Art. 18\n\nTitular: ${record.titular.nome}\nFaceUUID: ${record.faceUUID}\nTipo: ${tipoLabels[record.titular.tipo]}\nBase Legal: ${record.baseLegal}\nData Concessão: ${record.dataConcessao}\nData Revogação: ${record.dataRevogacao || "N/A"}\n\nDispositivos com expurgo:\n${record.dispositivos.map((d) => `  - ${d.deviceName} (${d.deviceId}): ${expurgoStatusConfig[d.expurgoStatus].label}`).join("\n")}\n\nLog de auditoria:\n${record.auditLog.map((a) => `  [${a.timestamp}] ${a.acao} — por ${a.operador}`).join("\n")}\n\nDocumento gerado em ${new Date().toLocaleString("pt-BR")}`;
    const blob = new Blob([comprovante], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comprovante-exclusao-${record.faceUUID}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Comprovante de exclusão baixado.");
  };

  // ===== Loading state =====
  if (loadingState === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Carregando registros de consentimento...</p>
      </div>
    );
  }

  // ===== Error state =====
  if (loadingState === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 mb-4">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="font-display text-base font-semibold mb-1">Erro ao carregar consentimentos</h3>
        <p className="text-sm text-muted-foreground mb-4">Não foi possível acessar o registro de conformidade.</p>
        <Button variant="outline" onClick={() => setLoadingState("ready")}>
          <RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente
        </Button>
      </div>
    );
  }

  // ===== Connector offline state =====
  if (loadingState === "offline") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 mb-4">
          <WifiOff className="h-8 w-8 text-amber-400" />
        </div>
        <h3 className="font-display text-base font-semibold mb-1">Connector offline</h3>
        <p className="text-sm text-muted-foreground mb-4">Não é possível verificar status de expurgo nos dispositivos.</p>
        <Button variant="outline" onClick={() => setLoadingState("ready")}>
          <RefreshCw className="h-4 w-4 mr-2" /> Verificar novamente
        </Button>
      </div>
    );
  }

  // ===== Empty state =====
  if (loadingState === "empty" || filteredRecords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-display text-base font-semibold mb-1">Nenhum registro encontrado</h3>
        <p className="text-sm text-muted-foreground mb-4">Ajuste os filtros ou verifique se há consentimentos cadastrados.</p>
        <Button variant="outline" onClick={() => { setStatusFilter("all"); setTipoFilter("all"); setSearchQuery(""); }}>
          Limpar filtros
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Partial sync warning */}
      {loadingState === "partial" && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-400">
            Sincronização parcial: status de expurgo pode estar desatualizado para dispositivos offline.
          </p>
        </div>
      )}

      {/* Metrics cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard icon={ShieldCheck} label="Ativos" value={mockConsentMetrics.ativos} color="text-green-400" bg="bg-green-500/15" />
        <MetricCard icon={Clock} label="Pendentes" value={mockConsentMetrics.pendentes} color="text-amber-400" bg="bg-amber-500/15" />
        <MetricCard icon={X} label="Revogados" value={mockConsentMetrics.revogados} color="text-red-400" bg="bg-red-500/15" />
        <MetricCard icon={AlertTriangle} label="Expirados" value={mockConsentMetrics.expirados} color="text-gray-400" bg="bg-gray-500/15" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="revogado">Revogado</SelectItem>
            <SelectItem value="expirado">Expirado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="aluno">Aluno</SelectItem>
            <SelectItem value="responsavel">Responsável</SelectItem>
            <SelectItem value="funcionario">Funcionário</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Buscar por nome ou FaceUUID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:w-64"
        />

        <span className="text-xs text-muted-foreground ml-auto">
          {filteredRecords.length} registro(s)
        </span>
      </div>

      {/* Records table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titular</TableHead>
              <TableHead className="hidden md:table-cell">Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Base Legal</TableHead>
              <TableHead className="hidden lg:table-cell">Concessão</TableHead>
              <TableHead className="hidden xl:table-cell">Dispositivos</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.map((record) => {
              const cfg = consentStatusConfig[record.status];
              const hasPendingExpurgo = record.dispositivos.some((d) => d.expurgoStatus === "pendente" || d.expurgoStatus === "em_andamento" || d.expurgoStatus === "falhou");
              return (
                <TableRow key={record.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{record.titular.nome}</p>
                        <p className="text-xs text-muted-foreground font-mono-tech">{record.faceUUID}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline">{tipoLabels[record.titular.tipo]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant="outline" className={cfg.className}>
                        {cfg.label}
                      </Badge>
                      {hasPendingExpurgo && (
                        <div className="flex items-center gap-1 text-xs text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                          Expurgo pendente
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <p className="text-xs text-muted-foreground max-w-[180px] truncate">{record.baseLegal}</p>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-xs font-mono-tech">{record.dataConcessao}</span>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {record.dispositivos.slice(0, 2).map((d) => (
                        <Badge key={d.deviceId} variant="outline" className={expurgoStatusConfig[d.expurgoStatus].className}>
                          {d.deviceName.split(" ")[0]}
                        </Badge>
                      ))}
                      {record.dispositivos.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{record.dispositivos.length - 2}
                        </Badge>
                      )}
                      {record.dispositivos.length === 0 && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setDetailRecord(record)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {record.status === "ativo" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => setRevokeTarget(record)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {record.status === "revogado" && (
                        <Button size="sm" variant="ghost" onClick={() => handleDownloadComprovante(record)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Revoke dialog — two-step confirmation */}
      <Dialog open={!!revokeTarget} onOpenChange={(open) => { if (!open) { setRevokeTarget(null); setRevokeConfirmUUID(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Revogar Consentimento — Confirmação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <p className="text-sm font-semibold text-red-400">Ação irreversível</p>
              </div>
              <p className="text-xs text-muted-foreground">
                A revogação dispara o expurgo propagado do template facial em todos os dispositivos cadastrados.
                O comprovante de exclusão será gerado automaticamente.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Titular:</span> {revokeTarget?.titular.nome}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Tipo:</span> {revokeTarget ? tipoLabels[revokeTarget.titular.tipo] : ""}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Dispositivos afetados:</span> {revokeTarget?.dispositivos.length || 0}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="uuid-confirm" className="text-xs">
                Para confirmar, digite o FaceUUID exato:
              </Label>
              <p className="text-xs text-muted-foreground font-mono-tech">
                {revokeTarget?.faceUUID}
              </p>
              <Input
                id="uuid-confirm"
                value={revokeConfirmUUID}
                onChange={(e) => setRevokeConfirmUUID(e.target.value)}
                placeholder={revokeTarget?.faceUUID}
                className="font-mono-tech text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRevokeTarget(null); setRevokeConfirmUUID(""); }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={revokeConfirmUUID !== revokeTarget?.faceUUID}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Revogar e Propagar Expurgo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog — audit log + expurgo status */}
      <Dialog open={!!detailRecord} onOpenChange={(open) => !open && setDetailRecord(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes — {detailRecord?.titular.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">FaceUUID</p>
                <p className="font-mono-tech text-xs">{detailRecord?.faceUUID}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant="outline" className={detailRecord ? consentStatusConfig[detailRecord.status].className : ""}>
                  {detailRecord ? consentStatusConfig[detailRecord.status].label : ""}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Base Legal</p>
                <p className="text-xs">{detailRecord?.baseLegal}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Concessão</p>
                <p className="text-xs font-mono-tech">{detailRecord?.dataConcessao}</p>
              </div>
              {detailRecord?.dataRevogacao && (
                <div>
                  <p className="text-xs text-muted-foreground">Revogação</p>
                  <p className="text-xs font-mono-tech">{detailRecord.dataRevogacao}</p>
                </div>
              )}
              {detailRecord?.dataExpiracao && (
                <div>
                  <p className="text-xs text-muted-foreground">Expiração</p>
                  <p className="text-xs font-mono-tech">{detailRecord.dataExpiracao}</p>
                </div>
              )}
            </div>

            {/* Expurgo status per device */}
            {detailRecord && detailRecord.dispositivos.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expurgo por Dispositivo</p>
                {detailRecord.dispositivos.map((d) => (
                  <div key={d.deviceId} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{d.deviceName}</p>
                      <p className="text-xs text-muted-foreground font-mono-tech">{d.deviceId}</p>
                    </div>
                    <Badge variant="outline" className={expurgoStatusConfig[d.expurgoStatus].className}>
                      {expurgoStatusConfig[d.expurgoStatus].label}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Audit log */}
            {detailRecord && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Log de Auditoria (append-only)</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {detailRecord.auditLog.map((entry, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg bg-muted/20 px-3 py-1.5">
                      <Clock className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs">{entry.acao}</p>
                        <p className="text-[10px] text-muted-foreground font-mono-tech">
                          {entry.timestamp} · {entry.operador}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Download comprovante */}
            {detailRecord && (detailRecord.status === "revogado" || detailRecord.status === "expirado") && (
              <Button variant="outline" className="w-full" onClick={() => handleDownloadComprovante(detailRecord)}>
                <Download className="h-4 w-4 mr-2" />
                Baixar Comprovante de Exclusão
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color, bg }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number; color: string; bg: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold font-display">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </Card>
  );
}
