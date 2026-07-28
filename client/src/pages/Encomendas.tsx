/**
 * T1 — Encomendas
 * GuardIA Percebe — Table stakes screen for condominium vertical.
 * Registro com foto + retirada por QR Code. Feature mais usada no dia a dia do porteiro.
 *
 * States (CORE-03 §7): loading, empty, error, connector-offline, partial-sync.
 * Severity: 3 levels (critical, warning, info) — never a fourth.
 * Mock data only — no real personal data.
 */
import { useState, useMemo } from "react";
import {
  Package, Search, QrCode, Camera, CheckCircle2, Clock,
  XCircle, RotateCcw, Bell, FileText, Pill, ShoppingBag, PackageX,
} from "lucide-react";
import {
  mockPackages, mockPackageMetrics,
} from "@/lib/mock-data";
import type { PackageStatus, PackageCategory, PackageRecord } from "@/lib/types";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useI18n } from "@/contexts/I18nContext";
import { PageStateWrapper, type LoadState } from "@/components/PageStateWrapper";

// O union dos 5 estados vem do PageStateWrapper — não redeclarar (§14.5).

const STATUS_CONFIG: Record<PackageStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  received:  { label: "Recebida",      color: "text-blue-400",     icon: Clock },
  notified:  { label: "Notificada",    color: "text-cyan-400",     icon: Bell },
  picked_up: { label: "Retirada",      color: "text-emerald-400",  icon: CheckCircle2 },
  returned:  { label: "Devolvida",     color: "text-amber-400",    icon: RotateCcw },
  expired:   { label: "Expirada",      color: "text-red-400",      icon: XCircle },
};

const CATEGORY_CONFIG: Record<PackageCategory, { label: string; icon: typeof Package }> = {
  ecommerce:   { label: "E-commerce",   icon: ShoppingBag },
  document:    { label: "Documento",    icon: FileText },
  food:        { label: "Alimentação",  icon: Package },
  medication:  { label: "Medicação",    icon: Pill },
  other:       { label: "Outro",        icon: Package },
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function Encomendas() {
  const { t } = useI18n();
  const [loadState, setLoadState] = useState<LoadState>("loaded");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedPkg, setSelectedPkg] = useState<PackageRecord | null>(null);
  const [showRegister, setShowRegister] = useState(false);

  const filtered = useMemo(() => {
    let result = mockPackages;
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (categoryFilter !== "all") {
      result = result.filter((p) => p.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        p.recipientName.toLowerCase().includes(q) ||
        p.trackingCode.toLowerCase().includes(q) ||
        p.recipientUnit.toLowerCase().includes(q)
      );
    }
    return result;
  }, [search, statusFilter, categoryFilter]);

  // --- STATE: loading (skeleton, never full-screen spinner) ---
  // CORE-03 §7: os 5 estados obrigatórios, via PageStateWrapper.
  // O wrapper vai DEPOIS das métricas, que ficam sempre visíveis — antes,
  // loading/error/offline substituíam até o cabeçalho da página.
  return (
    <div className="p-6 space-y-6">
      <HeaderSection onRegister={() => setShowRegister(true)} />
      <MetricsCards />
      <PageStateWrapper
        state={loadState}
        onRetry={() => setLoadState("loaded")}
        emptyTitle={t("enc.empty_title")}
        emptyDescription={t("enc.empty_desc")}
        partialMessage={t("enc.partial")}
        emptyAction={
          <Button onClick={() => setShowRegister(true)}>
            <Package className="h-4 w-4 mr-1" /> {t("enc.register")}
          </Button>
        }
      >

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por morador, código de rastreio ou unidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="received">Recebida</SelectItem>
            <SelectItem value="notified">Notificada</SelectItem>
            <SelectItem value="picked_up">Retirada</SelectItem>
            <SelectItem value="returned">Devolvida</SelectItem>
            <SelectItem value="expired">Expirada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            <SelectItem value="ecommerce">E-commerce</SelectItem>
            <SelectItem value="document">Documento</SelectItem>
            <SelectItem value="food">Alimentação</SelectItem>
            <SelectItem value="medication">Medicação</SelectItem>
            <SelectItem value="other">Outro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Morador</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Rastreio</TableHead>
              <TableHead>Transportadora</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recebida</TableHead>
              <TableHead>Retirada</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((pkg) => {
              const StatusIcon = STATUS_CONFIG[pkg.status].icon;
              const CatIcon = CATEGORY_CONFIG[pkg.category].icon;
              return (
                <TableRow
                  key={pkg.id}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => setSelectedPkg(pkg)}
                >
                  <TableCell className="font-medium">{pkg.recipientName}</TableCell>
                  <TableCell className="text-muted-foreground">{pkg.recipientUnit}</TableCell>
                  <TableCell className="font-mono text-sm">{pkg.trackingCode}</TableCell>
                  <TableCell>{pkg.carrier}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <CatIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{CATEGORY_CONFIG[pkg.category].label}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`flex items-center gap-1.5 ${STATUS_CONFIG[pkg.status].color}`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      <span className="text-sm">{STATUS_CONFIG[pkg.status].label}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDateTime(pkg.receivedAt)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDateTime(pkg.pickedUpAt)}</TableCell>
                  <TableCell className="text-right">
                    {pkg.status === "received" || pkg.status === "notified" ? (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" className="h-8" onClick={(e) => { e.stopPropagation(); setSelectedPkg(pkg); }}>
                          <QrCode className="h-3.5 w-3.5" /> QR
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8" onClick={(e) => { e.stopPropagation(); setSelectedPkg(pkg); }}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Retirada
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-8" onClick={(e) => { e.stopPropagation(); setSelectedPkg(pkg); }}>
                        Detalhes
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        {filtered.length} encomenda(s) · {mockPackageMetrics.totalThisMonth} no mês
      </p>

      {/* Detail Dialog */}
      <Dialog open={!!selectedPkg} onOpenChange={(open) => !open && setSelectedPkg(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da encomenda</DialogTitle>
            <DialogDescription>{selectedPkg?.trackingCode}</DialogDescription>
          </DialogHeader>
          {selectedPkg && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Morador:</span> {selectedPkg.recipientName}</div>
                <div><span className="text-muted-foreground">Unidade:</span> {selectedPkg.recipientUnit}</div>
                <div><span className="text-muted-foreground">Transportadora:</span> {selectedPkg.carrier}</div>
                <div><span className="text-muted-foreground">Categoria:</span> {CATEGORY_CONFIG[selectedPkg.category].label}</div>
                <div><span className="text-muted-foreground">Recebida:</span> {formatDateTime(selectedPkg.receivedAt)}</div>
                <div><span className="text-muted-foreground">Notificada:</span> {formatDateTime(selectedPkg.notifiedAt)}</div>
                <div><span className="text-muted-foreground">Retirada:</span> {formatDateTime(selectedPkg.pickedUpAt)}</div>
                <div><span className="text-muted-foreground">Retirada por:</span> {selectedPkg.pickedUpBy ?? "—"}</div>
                <div><span className="text-muted-foreground">Método:</span> {selectedPkg.pickupMethod ? selectedPkg.pickupMethod.toUpperCase() : "—"}</div>
                <div><span className="text-muted-foreground">Prazo:</span> {formatDateTime(selectedPkg.expiresAt)}</div>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">Observações:</span>
                <p className="text-sm mt-1">{selectedPkg.notes}</p>
              </div>
              {selectedPkg.status === "received" || selectedPkg.status === "notified" ? (
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1" variant="outline">
                    <QrCode className="h-4 w-4 mr-1" /> Gerar QR Code
                  </Button>
                  <Button className="flex-1">
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar retirada
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {renderRegisterDialog()}
      </PageStateWrapper>
    </div>
  );

  function renderRegisterDialog() {
    return (
      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar encomenda</DialogTitle>
            <DialogDescription>Registre a chegada de um pacote na portaria</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Morador</label>
              <Input placeholder="Nome do morador" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Unidade</label>
              <Input placeholder="Bloco · Apartamento" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Código de rastreio</label>
              <Input placeholder="BR123456789" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground">Transportadora</label>
                <Input placeholder="Correios" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Categoria</label>
                <Select defaultValue="ecommerce">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ecommerce">E-commerce</SelectItem>
                    <SelectItem value="document">Documento</SelectItem>
                    <SelectItem value="food">Alimentação</SelectItem>
                    <SelectItem value="medication">Medicação</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button variant="outline" className="flex-1">
                <Camera className="h-4 w-4 mr-1" /> Foto do pacote
              </Button>
              <Button className="flex-1">
                <Package className="h-4 w-4 mr-1" /> Registrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
}

function HeaderSection({ onRegister }: { onRegister: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Encomendas</h1>
        <p className="text-sm text-muted-foreground">Registro de pacotes com foto e retirada por QR Code</p>
      </div>
      <Button onClick={onRegister}>
        <Package className="h-4 w-4 mr-1" /> Registrar encomenda
      </Button>
    </div>
  );
}

function MetricsCards() {
  const m = mockPackageMetrics;
  const cards = [
    { label: "Pendentes", value: m.pending, icon: Clock, color: "text-blue-400" },
    { label: "Notificadas", value: m.notified, icon: Bell, color: "text-cyan-400" },
    { label: "Retiradas hoje", value: m.pickedUpToday, icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Devolvidas", value: m.returned, icon: RotateCcw, color: "text-amber-400" },
    { label: "Expiradas", value: m.expired, icon: PackageX, color: "text-red-400" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold tabular-nums">{c.value}</p>
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
