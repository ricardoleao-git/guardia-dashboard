/**
 * T7 — Custódia de Aluno
 * GuardIA Percebe — Differential screen for school vertical.
 *
 * States (CORE-03 §7): loading, empty, error, connector-offline, partial-sync.
 * Severity: 2 levels (critical, warning) — no third/fourth level.
 * Mock data only — no real personal data.
 */
import { useState, useMemo } from "react";
import {
  UserCheck, UserX, AlertTriangle, MessageCircle, Eye, MapPin,
  Clock, Check, X, ShieldAlert,
} from "lucide-react";
import {
  mockStudents, mockCustodyAlerts, mockCustodyMetrics, TURMAS,
} from "@/lib/mock-data";
import { useI18n } from "@/contexts/I18nContext";
import { PageStateWrapper, type LoadState } from "@/components/PageStateWrapper";
import type { CustodyStatus, CustodyAlert } from "@/lib/types";
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
import { toast } from "sonner";

const statusConfig: Record<CustodyStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  presente: { label: "Presente", variant: "default", className: "bg-green-500/15 text-green-400 border-green-500/30" },
  ausente: { label: "Ausente", variant: "secondary", className: "bg-red-500/15 text-red-400 border-red-500/30" },
  saida_irregular: { label: "Saída Irregular", variant: "destructive", className: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  saida_autorizada: { label: "Saída Autorizada", variant: "outline", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
};

const severityConfig = {
  critical: { label: "Crítico", className: "bg-red-500/15 text-red-400 border-red-500/30" },
  warning: { label: "Atenção", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
};

// O union dos 5 estados vem do PageStateWrapper — não redeclarar (§14.5).
// Esta página usava "ready" onde o canônico é "loaded"; normalizado.

export default function Custodia() {
  const { t } = useI18n();
  const [loadingState, setLoadingState] = useState<LoadState>("loaded");
  const [turmaFilter, setTurmaFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAlert, setSelectedAlert] = useState<CustodyAlert | null>(null);
  const [alerts, setAlerts] = useState(mockCustodyAlerts);

  const filteredStudents = useMemo(() => {
    return mockStudents.filter((s) => {
      if (turmaFilter !== "all" && s.turma !== turmaFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      return true;
    });
  }, [turmaFilter, statusFilter]);

  const openAlerts = alerts.filter((a) => !a.resolved);

  const handleNotifyResponsavel = (studentName: string, telefone: string) => {
    toast.success(`Notificação WhatsApp enviada para ${studentName} (${telefone})`);
  };

  const handleResolveAlert = (alertId: string, isFalsePositive: boolean) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              resolved: true,
              resolvedBy: "operador@guardia",
              resolvedAt: new Date().toLocaleTimeString("pt-BR"),
              isFalsePositive,
            }
          : a
      )
    );
    setSelectedAlert(null);
    toast.success(isFalsePositive ? "Alerta marcado como falso positivo" : "Alerta tratado e resolvido");
  };

  // CORE-03 §7: os 5 estados obrigatórios, via PageStateWrapper.
  return (
    <PageStateWrapper
      state={loadingState}
      onRetry={() => setLoadingState("loaded")}
      emptyTitle={t("cust.empty_title")}
      emptyDescription={t("cust.empty_desc")}
      partialMessage={t("cust.partial")}
    >
    <div className="space-y-5">

      {/* Metrics cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard icon={UserCheck} label="Presentes" value={mockCustodyMetrics.presentes} color="text-green-400" bg="bg-green-500/15" />
        <MetricCard icon={UserX} label="Ausentes" value={mockCustodyMetrics.ausentes} color="text-red-400" bg="bg-red-500/15" />
        <MetricCard icon={AlertTriangle} label="Saídas Irregulares" value={mockCustodyMetrics.saidasIrregulares} color="text-orange-400" bg="bg-orange-500/15" />
        <MetricCard icon={ShieldAlert} label="Alertas Abertos" value={mockCustodyMetrics.alertasAbertos} color="text-amber-400" bg="bg-amber-500/15" />
      </div>

      {/* Critical alerts panel */}
      {openAlerts.length > 0 && (
        <Card className="p-4 border-red-500/20 bg-red-500/5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="h-4 w-4 text-red-400" />
            <h3 className="font-display text-sm font-semibold text-red-400">Alertas Críticos — Gatilho por Não-Evento</h3>
          </div>
          <div className="space-y-2">
            {openAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Badge variant="outline" className={severityConfig[alert.severity].className}>
                    {severityConfig[alert.severity].label}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{alert.studentName} — {alert.turma}</p>
                    <p className="text-xs text-muted-foreground truncate">{alert.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground font-mono-tech">{alert.timestamp}</span>
                  <Button size="sm" variant="outline" onClick={() => setSelectedAlert(alert)}>
                    Tratar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={turmaFilter} onValueChange={setTurmaFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Turma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as turmas</SelectItem>
            {TURMAS.map((t) => (
              <SelectItem key={t} value={t}>Turma {t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="presente">Presente</SelectItem>
            <SelectItem value="ausente">Ausente</SelectItem>
            <SelectItem value="saida_irregular">Saída Irregular</SelectItem>
            <SelectItem value="saida_autorizada">Saída Autorizada</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground ml-auto">
          {filteredStudents.length} aluno(s)
        </span>
      </div>

      {/* Students table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead className="hidden md:table-cell">Turma</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Último Avistamento</TableHead>
              <TableHead className="hidden xl:table-cell">Responsável</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student) => {
              const cfg = statusConfig[student.status];
              return (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                        {student.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{student.name}</p>
                        <p className="text-xs text-muted-foreground font-mono-tech">{student.faceUUID}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline">{student.turma}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={cfg.variant} className={cfg.className}>
                      {cfg.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {student.ultimoAvistamento ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span className="font-mono-tech">{student.ultimoAvistamento.horario}</span>
                        <MapPin className="h-3 w-3 ml-1" />
                        <span>{student.ultimoAvistamento.canal}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    <p className="text-sm">{student.responsavel}</p>
                    <p className="text-xs text-muted-foreground font-mono-tech">{student.telefoneResponsavel}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    {student.status === "ausente" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleNotifyResponsavel(student.name, student.telefoneResponsavel)}
                      >
                        <MessageCircle className="h-3.5 w-3.5 mr-1" />
                        Notificar
                      </Button>
                    )}
                    {student.status === "saida_irregular" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          const alert = openAlerts.find((a) => a.studentId === student.id);
                          if (alert) setSelectedAlert(alert);
                        }}
                      >
                        <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                        Verificar
                      </Button>
                    )}
                    {student.status === "saida_autorizada" && (
                      <div className="flex items-center gap-1 text-xs text-blue-400">
                        <Check className="h-3.5 w-3.5" />
                        Autorizado
                      </div>
                    )}
                    {student.status === "presente" && (
                      <div className="flex items-center gap-1 text-xs text-green-400">
                        <UserCheck className="h-3.5 w-3.5" />
                        Presente
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Alert treatment modal */}
      <Dialog open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tratar Alerta — {selectedAlert?.studentName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={selectedAlert ? severityConfig[selectedAlert.severity].className : ""}>
                  {selectedAlert ? severityConfig[selectedAlert.severity].label : ""}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono-tech">{selectedAlert?.timestamp}</span>
              </div>
              <p className="text-sm">{selectedAlert?.description}</p>
              <p className="text-xs text-muted-foreground">
                Turma: {selectedAlert?.turma} · FaceUUID: {selectedAlert?.studentId}
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              <p>Registro de tratamento será gravado em <code className="font-mono-tech">audit_log</code> (append-only, sem DELETE).</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => selectedAlert && handleResolveAlert(selectedAlert.id, true)}>
              <X className="h-4 w-4 mr-1" /> Falso Positivo
            </Button>
            <Button onClick={() => selectedAlert && handleResolveAlert(selectedAlert.id, false)}>
              <Check className="h-4 w-4 mr-1" /> Confirmar e Resolver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PageStateWrapper>
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
