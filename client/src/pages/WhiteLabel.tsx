/**
 * WhiteLabel (T10) — Marca, cores, logo e domínio por cliente.
 * Onda 3 do CORE-04. Casca visual com mock sintético.
 *
 * 5 estados obrigatórios (CORE-03 §7):
 *   loading | empty | error | offline | partial
 *
 * Tipos canônicos: WhiteLabelConfig (CORE-01).
 * Dados: mock sintético, sem pessoa real.
 */
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Palette, Globe, Shield, CheckCircle2, AlertCircle, Clock, XCircle,
  Loader2, Building2, Eye, Plus, Search,
} from "lucide-react";
import { mockWhiteLabelConfigs } from "@/lib/mock-data";
import type { WhiteLabelConfig } from "@/lib/types";

type PageState = "loading" | "ready" | "empty" | "error" | "offline" | "partial";

export default function WhiteLabel() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [configs, setConfigs] = useState<WhiteLabelConfig[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedConfig, setSelectedConfig] = useState<WhiteLabelConfig | null>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [previewConfig, setPreviewConfig] = useState<WhiteLabelConfig | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setConfigs(mockWhiteLabelConfigs);
      setPageState("ready");
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const filtered = configs.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.clienteNome.toLowerCase().includes(q) && !c.dominio.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const metrics = {
    total: configs.length,
    ativos: configs.filter((c) => c.status === "ativo").length,
    pendentes: configs.filter((c) => c.status === "pendente").length,
    suspensos: configs.filter((c) => c.status === "suspenso").length,
    customDomain: configs.filter((c) => c.personalizacoes.customDomain).length,
    sslAtivo: configs.filter((c) => c.sslStatus === "ativo").length,
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; icon: typeof CheckCircle2 }> = {
      ativo: { variant: "default", label: "Ativo", icon: CheckCircle2 },
      pendente: { variant: "secondary", label: "Pendente", icon: Clock },
      suspenso: { variant: "destructive", label: "Suspenso", icon: XCircle },
    };
    const cfg = map[status] || map.pendente;
    const Icon = cfg.icon;
    return <Badge variant={cfg.variant} className="gap-1"><Icon className="h-3 w-3" />{cfg.label}</Badge>;
  };

  const sslBadge = (ssl: string) => {
    if (ssl === "ativo") return <Badge variant="default" className="gap-1"><Shield className="h-3 w-3" />SSL Ativo</Badge>;
    if (ssl === "pendente") return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />SSL Pendente</Badge>;
    return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />SSL Expirado</Badge>;
  };

  const dominioBadge = (dom: string) => {
    if (dom === "propagado") return <Badge variant="outline" className="gap-1"><Globe className="h-3 w-3" />Propagado</Badge>;
    if (dom === "propagando") return <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Propagando</Badge>;
    return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pendente</Badge>;
  };

  // === ESTADO: LOADING ===
  if (pageState === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando configurações de white label...</p>
      </div>
    );
  }

  // === ESTADO: ERROR ===
  if (pageState === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-base font-medium">Erro ao carregar white label</p>
        <p className="text-sm text-muted-foreground">Não foi possível conectar ao serviço de configuração.</p>
        <Button variant="outline" onClick={() => setPageState("loading")}>
          <Loader2 className="h-4 w-4 mr-2" /> Tentar novamente
        </Button>
      </div>
    );
  }

  // === ESTADO: OFFLINE (connector offline) ===
  if (pageState === "offline") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <XCircle className="h-10 w-10 text-muted-foreground" />
        <p className="text-base font-medium">Connector offline</p>
        <p className="text-sm text-muted-foreground">O serviço de white label requer o connector ativo.</p>
        <Button variant="outline" onClick={() => setPageState("loading")}>Verificar conexão</Button>
      </div>
    );
  }

  // === ESTADO: EMPTY ===
  if (pageState === "empty" || configs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Palette className="h-10 w-10 text-muted-foreground" />
        <p className="text-base font-medium">Nenhuma configuração de white label</p>
        <p className="text-sm text-muted-foreground">Crie a primeira personalização de marca para um cliente.</p>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova configuração
        </Button>
      </div>
    );
  }

  // === ESTADO: PARTIAL (sincronização parcial) ===
  const isPartial = pageState === "partial";

  return (
    <div className="space-y-6">
      {isPartial && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <span className="text-sm text-yellow-600 dark:text-yellow-400">
            Sincronização parcial: 4 de {configs.length} configurações sincronizadas. Tentando reconectar...
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Palette className="h-6 w-6 text-primary" />
            White Label
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Marca, cores, logo e domínio personalizado por cliente
          </p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova configuração
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="text-2xl font-bold">{metrics.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Ativos</p>
            <p className="text-2xl font-bold text-green-600">{metrics.ativos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Pendentes</p>
            <p className="text-2xl font-bold text-yellow-600">{metrics.pendentes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Suspensos</p>
            <p className="text-2xl font-bold text-red-600">{metrics.suspensos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Domínio próprio</p>
            <p className="text-2xl font-bold">{metrics.customDomain}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">SSL ativo</p>
            <p className="text-2xl font-bold text-green-600">{metrics.sslAtivo}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou domínio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="suspenso">Suspenso</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid de configurações */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((cfg) => (
          <Card
            key={cfg.id}
            className="cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all"
            onClick={() => setSelectedConfig(cfg)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ backgroundColor: cfg.branding.corPrimaria }}
                  >
                    {cfg.branding.marcaNome.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-sm truncate">{cfg.clienteNome}</CardTitle>
                    <p className="text-xs text-muted-foreground truncate">{cfg.dominio}</p>
                  </div>
                </div>
                {statusBadge(cfg.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Preview de cores */}
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded" style={{ backgroundColor: cfg.branding.corPrimaria }} title="Primária" />
                <div className="h-6 w-6 rounded" style={{ backgroundColor: cfg.branding.corSecundaria }} title="Secundária" />
                <div className="h-6 w-6 rounded" style={{ backgroundColor: cfg.branding.corAcento }} title="Acento" />
                <span className="text-xs text-muted-foreground ml-1">{cfg.branding.fontFamily.split(",")[0]}</span>
              </div>

              {/* Personalizações ativas */}
              <div className="flex flex-wrap gap-1">
                {cfg.personalizacoes.customDomain && <Badge variant="outline" className="text-xs">Domínio</Badge>}
                {cfg.personalizacoes.customEmail && <Badge variant="outline" className="text-xs">Email</Badge>}
                {cfg.personalizacoes.customWhatsApp && <Badge variant="outline" className="text-xs">WhatsApp</Badge>}
                {cfg.personalizacoes.exibirGuardIA && <Badge variant="outline" className="text-xs">GuardIA</Badge>}
                {cfg.personalizacoes.exibirPercebe && <Badge variant="outline" className="text-xs">Percebe</Badge>}
                {cfg.personalizacoes.exibirZenite && <Badge variant="outline" className="text-xs">Zênite</Badge>}
              </div>

              {/* Status inferior */}
              <div className="flex items-center justify-between pt-2 border-t">
                {dominioBadge(cfg.dominioStatus)}
                {sslBadge(cfg.sslStatus)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Search className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhuma configuração encontrada com os filtros aplicados.</p>
        </div>
      )}

      {/* Modal de detalhes / edição */}
      <Dialog open={!!selectedConfig} onOpenChange={(open) => !open && setSelectedConfig(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              {selectedConfig?.clienteNome}
            </DialogTitle>
            <DialogDescription>
              Personalização de marca e domínio para {selectedConfig?.clienteTipo}
            </DialogDescription>
          </DialogHeader>

          {selectedConfig && (
            <div className="space-y-5">
              {/* Preview ao vivo */}
              <div className="rounded-lg border p-4" style={{ backgroundColor: selectedConfig.branding.corSecundaria + "20" }}>
                <p className="text-xs text-muted-foreground mb-2">Preview da marca</p>
                <div className="flex items-center gap-3">
                  <div
                    className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: selectedConfig.branding.corPrimaria }}
                  >
                    {selectedConfig.branding.marcaNome.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-lg" style={{ color: selectedConfig.branding.corPrimaria }}>
                      {selectedConfig.branding.marcaNome}
                    </p>
                    <p className="text-xs text-muted-foreground">{selectedConfig.dominio}</p>
                  </div>
                </div>
              </div>

              {/* Cores */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Cor Primária</Label>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded border" style={{ backgroundColor: selectedConfig.branding.corPrimaria }} />
                    <Input value={selectedConfig.branding.corPrimaria} readOnly className="font-mono text-xs" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cor Secundária</Label>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded border" style={{ backgroundColor: selectedConfig.branding.corSecundaria }} />
                    <Input value={selectedConfig.branding.corSecundaria} readOnly className="font-mono text-xs" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cor de Acento</Label>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded border" style={{ backgroundColor: selectedConfig.branding.corAcento }} />
                    <Input value={selectedConfig.branding.corAcento} readOnly className="font-mono text-xs" />
                  </div>
                </div>
              </div>

              {/* Fonte e marca */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome da marca</Label>
                  <Input value={selectedConfig.branding.marcaNome} readOnly />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Fonte</Label>
                  <Input value={selectedConfig.branding.fontFamily} readOnly className="font-mono text-xs" />
                </div>
              </div>

              {/* Domínio e SSL */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Domínio</Label>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <Input value={selectedConfig.dominio} readOnly className="text-xs" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Status SSL</Label>
                  <div>{sslBadge(selectedConfig.sslStatus)}</div>
                </div>
              </div>

              {/* Personalizações */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold">Personalizações ativas</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm">Domínio próprio</span>
                    <Switch checked={selectedConfig.personalizacoes.customDomain} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm">Email personalizado</span>
                    <Switch checked={selectedConfig.personalizacoes.customEmail} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm">WhatsApp personalizado</span>
                    <Switch checked={selectedConfig.personalizacoes.customWhatsApp} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm">Exibir marca GuardIA</span>
                    <Switch checked={selectedConfig.personalizacoes.exibirGuardIA} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm">Exibir marca Percebe</span>
                    <Switch checked={selectedConfig.personalizacoes.exibirPercebe} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm">Exibir marca Zênite</span>
                    <Switch checked={selectedConfig.personalizacoes.exibirZenite} />
                  </div>
                </div>
              </div>

              {/* Botão de preview */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setPreviewConfig(selectedConfig)}
              >
                <Eye className="h-4 w-4 mr-2" /> Abrir preview em nova aba
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedConfig(null)}>Fechar</Button>
            <Button>Salvar alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de nova configuração */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Nova configuração white label
            </DialogTitle>
            <DialogDescription>
              Personalize a marca para um novo cliente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome do cliente</Label>
              <Input placeholder="Ex: Condomínio Edifício Aurora" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select defaultValue="condominio">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="condominio">Condomínio</SelectItem>
                    <SelectItem value="escola">Escola</SelectItem>
                    <SelectItem value="empresa">Empresa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Domínio</Label>
                <Input placeholder="cliente.guardia.app" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nome da marca</Label>
              <Input placeholder="Ex: Aurora Security" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Cor Primária</Label>
                <Input type="color" defaultValue="#1B4D3E" className="h-10 p-1" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cor Secundária</Label>
                <Input type="color" defaultValue="#2D7A5F" className="h-10 p-1" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cor de Acento</Label>
                <Input type="color" defaultValue="#A8E6CF" className="h-10 p-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancelar</Button>
            <Button onClick={() => setShowNewDialog(false)}>Criar configuração</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
