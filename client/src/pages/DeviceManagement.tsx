import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import { HardDrive, Wifi, WifiOff, Edit2, Search, Settings2, Plus, RefreshCw, AlertTriangle, ChevronDown, X, Network, Trash2, KeyRound, Globe, ScanLine, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Device {
  channel: string;
  status: "online" | "offline";
  ip: string;
  name: string;
  protocol: string;
  type: string;
  firmware: string;
  mac: string;
  bandwidth: string;
}

const mockDevices: Device[] = [
  { channel: "D1", status: "offline", ip: "192.168.254.115", name: "IPC", protocol: "P6S", type: "H5AI-500", firmware: "V7.0.1", mac: "5A:5A:00:F0:FD:01", bandwidth: "—" },
  { channel: "D2", status: "online", ip: "192.168.254.206", name: "Corredor", protocol: "P6S", type: "F4C-T", firmware: "V7.0.1", mac: "5A:5A:00:F0:FD:02", bandwidth: "4.2 Mbps" },
  { channel: "D3", status: "online", ip: "192.168.254.207", name: "Recepção", protocol: "P6S", type: "F4C-T", firmware: "V7.0.1", mac: "5A:5A:00:F0:FD:03", bandwidth: "3.8 Mbps" },
  { channel: "D4", status: "online", ip: "192.168.254.208", name: "Portão", protocol: "P6S", type: "F4C-T", firmware: "V7.0.1", mac: "5A:5A:00:F0:FD:04", bandwidth: "5.1 Mbps" },
  { channel: "D5", status: "online", ip: "192.168.254.209", name: "COPA", protocol: "P6S", type: "F4C-T", firmware: "V7.0.1", mac: "5A:5A:00:F0:FD:05", bandwidth: "2.1 Mbps" },
  { channel: "D6", status: "offline", ip: "192.168.254.210", name: "AI IPC", protocol: "P6S", type: "H5AI-50", firmware: "V7.0.1", mac: "5A:5A:00:F0:FD:06", bandwidth: "—" },
];

export default function DeviceManagement() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [devices, setDevices] = useState(mockDevices);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNetworkScan, setShowNetworkScan] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<{ip: string; mac: string; type: string; status: string}[]>([]);
  const [batchFormData, setBatchFormData] = useState({ password: "", ipPrefix: "192.168.254." });
  const [formData, setFormData] = useState({
    ip: "", protocol: "P6S", channel: "", httpPort: "80", cmdPort: "6060", videoPort: "6066", user: "admin", password: "",
  });

  const handleAddDevice = () => {
    if (!formData.ip || !formData.channel) return;
    const newDevice: Device = {
      channel: formData.channel,
      status: "offline",
      ip: formData.ip,
      name: `Canal ${formData.channel}`,
      protocol: formData.protocol,
      type: "Manual",
      firmware: "—",
      mac: "—",
      bandwidth: "—",
    };
    setDevices([...devices, newDevice]);
    setShowAddModal(false);
    setFormData({ ip: "", protocol: "P6S", channel: "", httpPort: "80", cmdPort: "6060", videoPort: "6066", user: "admin", password: "" });
  };

  const totalOnline = devices.filter(d => d.status === "online").length;
  const totalBandwidth = devices.filter(d => d.status === "online").reduce((acc, d) => {
    const m = parseFloat(d.bandwidth);
    return acc + (isNaN(m) ? 0 : m);
  }, 0);

  const toggleSelect = (channel: string) => {
    setSelectedDevices(prev => prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]);
  };

  const toggleSelectAll = () => {
    setSelectedDevices(prev => prev.length === devices.length ? [] : devices.map(d => d.channel));
  };

  const handleBatchDelete = () => {
    setDevices(devices.filter(d => !selectedDevices.includes(d.channel)));
    setSelectedDevices([]);
    setShowDeleteConfirm(false);
  };

  const handleBatchPassword = () => {
    setDevices(devices.map(d => selectedDevices.includes(d.channel) ? { ...d } : d));
    setSelectedDevices([]);
    setShowBatchModal(null);
  };

  const handleBatchIP = () => {
    setDevices(devices.map(d => selectedDevices.includes(d.channel) ? { ...d, ip: batchFormData.ipPrefix + (parseInt(d.channel.replace(/\D/g, "")) + 100) } : d));
    setSelectedDevices([]);
    setShowBatchModal(null);
  };

  const handleNetworkScan = () => {
    setScanning(true);
    setScanResults([]);
    setTimeout(() => {
      setScanResults([
        { ip: "192.168.254.115", mac: "5A:5A:00:F0:FD:01", type: "H5AI-500", status: "Detectado" },
        { ip: "192.168.254.206", mac: "5A:5A:00:F0:FD:02", type: "F4C-T", status: "Detectado" },
        { ip: "192.168.254.207", mac: "5A:5A:00:F0:FD:03", type: "F4C-T", status: "Detectado" },
        { ip: "192.168.254.220", mac: "5A:5A:00:F0:FD:0A", type: "F4C-T", status: "Novo" },
        { ip: "192.168.254.221", mac: "5A:5A:00:F0:FD:0B", type: "H5AI-50", status: "Novo" },
      ]);
      setScanning(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        activeView="devices"
        onNavigate={() => {}}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className="lg:ml-60">
        <MobileHeader onMenuClick={() => setMobileSidebarOpen(true)} />

        {/* Page header */}
        <div className="border-b border-border bg-card/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">Gerenciamento de Dispositivos</h2>
              <p className="text-xs text-muted-foreground">Câmeras IP conectadas ao NVR</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar Personalizado
              </button>
              <button
                onClick={() => { setShowNetworkScan(true); handleNetworkScan(); }}
                className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                <ScanLine className="h-3.5 w-3.5" /> Detecção de Rede
              </button>
              <button className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors">
                <Network className="h-3.5 w-3.5" /> Rede
              </button>
              <button className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors">
                <RefreshCw className="h-3.5 w-3.5" /> Atualizar
              </button>
            </div>
          </div>
        </div>

        <main className="p-6 space-y-4">
          {/* Warning banner */}
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-200">
              A largura de banda total pode atingir eth1 apenas quando a placa de rede 480Mbps está ligada a uma porta de rede Gigabit
            </p>
          </div>

          {/* Status bar */}
          <div className="flex items-center gap-6 text-xs">
            <span className="text-green-400">Dispositivos adicionados: <strong>{devices.length}</strong></span>
            <span className="text-green-400">Online: <strong>{totalOnline}</strong></span>
            <span className="text-red-400">Offline: <strong>{devices.length - totalOnline}</strong></span>
            <span className="text-green-400">Largura de banda total: <strong>80Mbps</strong></span>
            <span className="text-green-400">Atual: <strong>{totalBandwidth.toFixed(1)}Mbps</strong></span>
          </div>

          {/* Device table */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground w-8">
                    <input type="checkbox" checked={selectedDevices.length === devices.length && devices.length > 0} onChange={toggleSelectAll} className="rounded border-border" />
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">Canal</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">Status</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">Endereço IP</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">Nome</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">Protocolo</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">Tipo</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">Firmware</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">MAC</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">Banda</th>
                  <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr
                    key={device.channel}
                    className={cn(
                      "border-b border-border/50 hover:bg-accent/20 transition-colors",
                      selectedDevices.includes(device.channel) && "bg-primary/5"
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedDevices.includes(device.channel)}
                        onChange={() => toggleSelect(device.channel)}
                        className="rounded border-border"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-xs font-mono-tech font-medium">{device.channel}</td>
                    <td className="px-3 py-2.5">
                      {device.status === "online" ? (
                        <span className="flex items-center gap-1.5 text-xs text-green-400">
                          <Wifi className="h-3 w-3" /> Online
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs text-red-400">
                          <WifiOff className="h-3 w-3" /> Rede inacessível
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-mono-tech text-muted-foreground">{device.ip}</td>
                    <td className="px-3 py-2.5 text-xs font-medium">{device.name}</td>
                    <td className="px-3 py-2.5 text-xs font-mono-tech">{device.protocol}</td>
                    <td className="px-3 py-2.5 text-xs font-mono-tech text-muted-foreground">{device.type}</td>
                    <td className="px-3 py-2.5 text-xs font-mono-tech text-muted-foreground">{device.firmware}</td>
                    <td className="px-3 py-2.5 text-xs font-mono-tech text-muted-foreground">{device.mac}</td>
                    <td className="px-3 py-2.5 text-xs font-mono-tech">
                      {device.status === "online" ? (
                        <span className="text-green-400">{device.bandwidth}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-primary transition-colors" title="Editar">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-primary transition-colors" title="Buscar">
                          <Search className="h-3.5 w-3.5" />
                        </button>
                        <button className="rounded p-1 hover:bg-accent text-muted-foreground hover:text-primary transition-colors" title="Avançado">
                          <Settings2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Batch actions */}
          {selectedDevices.length > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 flex-wrap">
              <span className="text-xs text-primary font-medium">{selectedDevices.length} dispositivo(s) selecionado(s)</span>
              <div className="flex items-center gap-2 ml-auto flex-wrap">
                <button onClick={() => setShowBatchModal("password")} className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs hover:bg-accent transition-colors">
                  <KeyRound className="h-3 w-3" /> Editar Senhas
                </button>
                <button onClick={() => setShowBatchModal("ip")} className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs hover:bg-accent transition-colors">
                  <Globe className="h-3 w-3" /> Modificar IP
                </button>
                <button className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs hover:bg-accent transition-colors">
                  <RotateCcw className="h-3 w-3" /> Restaurar Fábrica
                </button>
                <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1.5 rounded-md bg-destructive/20 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/30 transition-colors">
                  <Trash2 className="h-3 w-3" /> Eliminação em Lote
                </button>
              </div>
            </div>
          )}

          {/* Batch Password Modal */}
          {showBatchModal === "password" && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowBatchModal(null)}>
              <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <KeyRound className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Edição de Senhas em Lote</h3>
                  </div>
                  <button onClick={() => setShowBatchModal(null)} className="rounded p-1 hover:bg-accent"><X className="h-4 w-4 text-muted-foreground" /></button>
                </div>
                <div className="space-y-3 px-5 py-4">
                  <p className="text-xs text-muted-foreground">Aplicar nova senha para {selectedDevices.length} dispositivo(s):</p>
                  <input type="password" value={batchFormData.password} onChange={(e) => setBatchFormData({ ...batchFormData, password: e.target.value })} placeholder="Nova senha" className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono-tech focus:outline-none focus:ring-1 focus:ring-primary" />
                  <button onClick={handleBatchPassword} className="w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">Aplicar</button>
                </div>
              </div>
            </div>
          )}

          {/* Batch IP Modal */}
          {showBatchModal === "ip" && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowBatchModal(null)}>
              <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <Globe className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Modificar IP em Lote</h3>
                  </div>
                  <button onClick={() => setShowBatchModal(null)} className="rounded p-1 hover:bg-accent"><X className="h-4 w-4 text-muted-foreground" /></button>
                </div>
                <div className="space-y-3 px-5 py-4">
                  <p className="text-xs text-muted-foreground">Prefixo de rede para {selectedDevices.length} dispositivo(s):</p>
                  <input type="text" value={batchFormData.ipPrefix} onChange={(e) => setBatchFormData({ ...batchFormData, ipPrefix: e.target.value })} placeholder="192.168.254." className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono-tech focus:outline-none focus:ring-1 focus:ring-primary" />
                  <button onClick={handleBatchIP} className="w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">Aplicar</button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)}>
              <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2.5 border-b border-border px-5 py-3.5">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <h3 className="text-sm font-semibold">Confirmar Eliminação</h3>
                </div>
                <div className="space-y-3 px-5 py-4">
                  <p className="text-xs text-muted-foreground">Tem certeza que deseja remover {selectedDevices.length} dispositivo(s) do NVR?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-md bg-muted px-3 py-2 text-xs hover:bg-accent">Cancelar</button>
                    <button onClick={handleBatchDelete} className="flex-1 rounded-md bg-destructive px-3 py-2 text-xs text-destructive-foreground hover:bg-destructive/90">Eliminar</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Network Scan Modal */}
          {showNetworkScan && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowNetworkScan(false)}>
              <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <ScanLine className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Detecção de Rede</h3>
                  </div>
                  <button onClick={() => setShowNetworkScan(false)} className="rounded p-1 hover:bg-accent"><X className="h-4 w-4 text-muted-foreground" /></button>
                </div>
                <div className="px-5 py-4">
                  {scanning ? (
                    <div className="flex flex-col items-center py-8 gap-3">
                      <ScanLine className="h-8 w-8 text-primary animate-pulse" />
                      <p className="text-xs text-muted-foreground">Escaneando rede 192.168.254.0/24...</p>
                      <div className="w-full max-w-xs h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary animate-pulse" style={{ width: "60%" }} />
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground mb-3">{scanResults.length} dispositivo(s) encontrado(s):</p>
                      <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border bg-muted/50">
                              <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground">IP</th>
                              <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground">MAC</th>
                              <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground">Tipo</th>
                              <th className="px-3 py-2 text-left text-[10px] font-semibold text-muted-foreground">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scanResults.map((r) => (
                              <tr key={r.ip} className="border-b border-border/50 hover:bg-accent/20">
                                <td className="px-3 py-2 text-xs font-mono-tech">{r.ip}</td>
                                <td className="px-3 py-2 text-xs font-mono-tech text-muted-foreground">{r.mac}</td>
                                <td className="px-3 py-2 text-xs font-mono-tech">{r.type}</td>
                                <td className="px-3 py-2">
                                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", r.status === "Novo" ? "bg-blue-500/20 text-blue-400" : "bg-green-500/20 text-green-400")}>{r.status}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <button className="mt-3 w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">Adicionar Novos</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Channel IP Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                  <Network className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Adicionar Canal IP Personalizado</h3>
                  <p className="text-[10px] text-muted-foreground">Configure uma nova câmera IP no NVR</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded p-1 hover:bg-accent transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Modal body */}
            <div className="space-y-3.5 px-5 py-4">
              {/* IP + Protocol */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Endereço IP</label>
                  <input
                    type="text"
                    value={formData.ip}
                    onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                    placeholder="192.168.254.xxx"
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-mono-tech focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Protocolo</label>
                  <select
                    value={formData.protocol}
                    onChange={(e) => setFormData({ ...formData, protocol: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-mono-tech focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="P6S">P6S</option>
                    <option value="ONVIF">ONVIF</option>
                    <option value="RTSP">RTSP</option>
                  </select>
                </div>
              </div>

              {/* Channel */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Canal</label>
                <input
                  type="text"
                  value={formData.channel}
                  onChange={(e) => setFormData({ ...formData, channel: e.target.value.toUpperCase() })}
                  placeholder="D7"
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-mono-tech focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Ports */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Porta HTTP</label>
                  <input
                    type="text"
                    value={formData.httpPort}
                    onChange={(e) => setFormData({ ...formData, httpPort: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-mono-tech focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Comando</label>
                  <input
                    type="text"
                    value={formData.cmdPort}
                    onChange={(e) => setFormData({ ...formData, cmdPort: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-mono-tech focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Vídeo</label>
                  <input
                    type="text"
                    value={formData.videoPort}
                    onChange={(e) => setFormData({ ...formData, videoPort: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-mono-tech focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* User + Password */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Usuário</label>
                  <input
                    type="text"
                    value={formData.user}
                    onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-mono-tech focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Senha</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••"
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-mono-tech focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3.5">
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-md bg-muted px-4 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddDevice}
                disabled={!formData.ip || !formData.channel}
                className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Adicionar Canal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
