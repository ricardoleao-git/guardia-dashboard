import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import {
  Network, Server, HardDrive, Wifi, Scan, RefreshCw,
  Save, AlertTriangle, CheckCircle2, Cpu, MemoryStick,
  Database, Globe, Shield, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ConfigTab = "network" | "system" | "storage";

interface NetworkDevice {
  ip: string;
  mac: string;
  type: string;
  status: "online" | "offline";
  latency: number;
}

const mockDevices: NetworkDevice[] = [
  { ip: "192.168.1.100", mac: "AA:BB:CC:11:22:33", type: "Câmera IP P6S", status: "online", latency: 12 },
  { ip: "192.168.1.101", mac: "AA:BB:CC:11:22:34", type: "Câmera IP P6S", status: "online", latency: 8 },
  { ip: "192.168.1.102", mac: "AA:BB:CC:11:22:35", type: "Câmera IP P6S", status: "online", latency: 15 },
  { ip: "192.168.1.200", mac: "AA:BB:CC:11:22:36", type: "NVR P6S 5.0", status: "online", latency: 2 },
  { ip: "192.168.1.201", mac: "AA:BB:CC:11:22:37", type: "Connector GuardIA", status: "online", latency: 1 },
];

export default function SystemConfig() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ConfigTab>("network");
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<NetworkDevice[]>(mockDevices);
  const [networkConfig, setNetworkConfig] = useState({
    dhcp: true,
    ip: "192.168.1.200",
    mask: "255.255.255.0",
    gateway: "192.168.1.1",
    dns1: "8.8.8.8",
    dns2: "8.8.4.4",
    port: 80,
    rtspPort: 554,
    p6sPort: 8000,
  });
  const [systemConfig, setSystemConfig] = useState({
    deviceName: "GuardIA-NVR-01",
    timezone: "America/Sao_Paulo (GMT-3)",
    language: "Português (Brasil)",
    autoReboot: true,
    rebootTime: "03:00",
    ntpServer: "pool.ntp.org",
    autoUpdate: false,
  });
  const [storageConfig, setStorageConfig] = useState({
    disk1: { capacity: "4TB", used: "2.3TB", free: "1.7TB", health: "good", recording: true },
    disk2: { capacity: "4TB", used: "1.8TB", free: "2.2TB", health: "good", recording: true },
    overwrite: true,
    retentionDays: 30,
    snapshotInterval: "1h",
    alarmRecordPre: 10,
    alarmRecordPost: 30,
  });

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      // Simulate finding the same devices
      setDevices([...mockDevices]);
    }, 2000);
  };

  const tabs = [
    { key: "network" as const, label: "Rede", icon: Network },
    { key: "system" as const, label: "Sistema", icon: Server },
    { key: "storage" as const, label: "Armazenamento", icon: HardDrive },
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeView="config" onNavigate={() => {}} mobileOpen={mobileSidebarOpen} onMobileClose={() => setMobileSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader onMenuClick={() => setMobileSidebarOpen(true)} />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold">Configurações do Sistema</h1>
              <p className="text-sm text-muted-foreground mt-1">Rede, sistema e armazenamento do NVR</p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-border">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                    activeTab === tab.key
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Network Tab */}
            {activeTab === "network" && (
              <div className="space-y-6">
                {/* Network Detection */}
                <div className="rounded-lg border border-border bg-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold flex items-center gap-2">
                        <Scan className="h-4 w-4 text-primary" />
                        Detecção de Rede
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Escanear a rede local por dispositivos P6S</p>
                    </div>
                    <button
                      onClick={handleScan}
                      disabled={scanning}
                      className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {scanning ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Scan className="h-3.5 w-3.5" />}
                      {scanning ? "Escaneando..." : "Escanear Rede"}
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="text-left py-2 px-3 font-medium">Endereço IP</th>
                          <th className="text-left py-2 px-3 font-medium">MAC</th>
                          <th className="text-left py-2 px-3 font-medium">Tipo</th>
                          <th className="text-left py-2 px-3 font-medium">Latência</th>
                          <th className="text-left py-2 px-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {devices.map((dev, i) => (
                          <tr key={i} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                            <td className="py-2 px-3 font-mono">{dev.ip}</td>
                            <td className="py-2 px-3 font-mono text-muted-foreground">{dev.mac}</td>
                            <td className="py-2 px-3">{dev.type}</td>
                            <td className="py-2 px-3 font-mono text-muted-foreground">{dev.latency}ms</td>
                            <td className="py-2 px-3">
                              <span className={cn(
                                "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
                                dev.status === "online" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                              )}>
                                <span className={cn("h-1.5 w-1.5 rounded-full", dev.status === "online" ? "bg-green-500" : "bg-red-500")} />
                                {dev.status === "online" ? "Online" : "Offline"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Network Configuration */}
                <div className="rounded-lg border border-border bg-card p-5">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                    <Globe className="h-4 w-4 text-primary" />
                    Configuração de Rede
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 col-span-2">
                      <input
                        type="checkbox"
                        checked={networkConfig.dhcp}
                        onChange={(e) => setNetworkConfig({ ...networkConfig, dhcp: e.target.checked })}
                        className="accent-primary"
                      />
                      <span className="text-sm">DHCP (Obter IP automaticamente)</span>
                    </label>
                    {!networkConfig.dhcp && (
                      <>
                        <Field label="Endereço IP" value={networkConfig.ip} onChange={(v) => setNetworkConfig({ ...networkConfig, ip: v })} mono />
                        <Field label="Máscara de Sub-rede" value={networkConfig.mask} onChange={(v) => setNetworkConfig({ ...networkConfig, mask: v })} mono />
                        <Field label="Gateway Padrão" value={networkConfig.gateway} onChange={(v) => setNetworkConfig({ ...networkConfig, gateway: v })} mono />
                        <Field label="DNS Primário" value={networkConfig.dns1} onChange={(v) => setNetworkConfig({ ...networkConfig, dns1: v })} mono />
                        <Field label="DNS Secundário" value={networkConfig.dns2} onChange={(v) => setNetworkConfig({ ...networkConfig, dns2: v })} mono />
                      </>
                    )}
                    <Field label="Porta HTTP" value={String(networkConfig.port)} onChange={(v) => setNetworkConfig({ ...networkConfig, port: parseInt(v) || 80 })} mono />
                    <Field label="Porta RTSP" value={String(networkConfig.rtspPort)} onChange={(v) => setNetworkConfig({ ...networkConfig, rtspPort: parseInt(v) || 554 })} mono />
                    <Field label="Porta P6S" value={String(networkConfig.p6sPort)} onChange={(v) => setNetworkConfig({ ...networkConfig, p6sPort: parseInt(v) || 8000 })} mono />
                  </div>
                </div>
              </div>
            )}

            {/* System Tab */}
            {activeTab === "system" && (
              <div className="space-y-6">
                <div className="rounded-lg border border-border bg-card p-5">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                    <Server className="h-4 w-4 text-primary" />
                    Informações do Sistema
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Nome do Dispositivo" value={systemConfig.deviceName} onChange={(v) => setSystemConfig({ ...systemConfig, deviceName: v })} />
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Fuso Horário</label>
                      <select
                        value={systemConfig.timezone}
                        onChange={(e) => setSystemConfig({ ...systemConfig, timezone: e.target.value })}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option>America/Sao_Paulo (GMT-3)</option>
                        <option>America/Manaus (GMT-4)</option>
                        <option>America/Recife (GMT-3)</option>
                        <option>UTC</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Idioma</label>
                      <select
                        value={systemConfig.language}
                        onChange={(e) => setSystemConfig({ ...systemConfig, language: e.target.value })}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option>Português (Brasil)</option>
                        <option>English (US)</option>
                        <option>Español</option>
                      </select>
                    </div>
                    <Field label="Servidor NTP" value={systemConfig.ntpServer} onChange={(v) => setSystemConfig({ ...systemConfig, ntpServer: v })} mono />
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-5">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                    <RefreshCw className="h-4 w-4 text-primary" />
                    Manutenção
                  </h3>
                  <div className="space-y-4">
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked={systemConfig.autoReboot} onChange={(e) => setSystemConfig({ ...systemConfig, autoReboot: e.target.checked })} className="accent-primary" />
                      <span className="text-sm">Reinicialização Automática</span>
                    </label>
                    {systemConfig.autoReboot && (
                      <Field label="Horário de Reinicialização" value={systemConfig.rebootTime} onChange={(v) => setSystemConfig({ ...systemConfig, rebootTime: v })} mono />
                    )}
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked={systemConfig.autoUpdate} onChange={(e) => setSystemConfig({ ...systemConfig, autoUpdate: e.target.checked })} className="accent-primary" />
                      <span className="text-sm">Atualização Automática de Firmware</span>
                    </label>
                  </div>
                </div>

                {/* System Info */}
                <div className="rounded-lg border border-border bg-card p-5">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                    <Cpu className="h-4 w-4 text-primary" />
                    Informações de Hardware
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <InfoCard icon={Cpu} label="CPU" value="ARM Cortex A72" sub="4 núcleos · 1.5GHz" />
                    <InfoCard icon={MemoryStick} label="Memória RAM" value="4GB DDR4" sub="2.1GB em uso" />
                    <InfoCard icon={Database} label="Banco de Dados" value="SQLite + Supabase" sub="PostgreSQL 15" />
                  </div>
                </div>
              </div>
            )}

            {/* Storage Tab */}
            {activeTab === "storage" && (
              <div className="space-y-6">
                {/* Disk Status */}
                <div className="rounded-lg border border-border bg-card p-5">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                    <HardDrive className="h-4 w-4 text-primary" />
                    Discos de Armazenamento
                  </h3>
                  <div className="space-y-4">
                    {[
                      { num: 1, data: storageConfig.disk1 },
                      { num: 2, data: storageConfig.disk2 },
                    ].map(({ num, data }) => {
                      const usedPct = parseFloat(data.used) / parseFloat(data.capacity) * 100;
                      return (
                        <div key={num} className="rounded-lg bg-muted/30 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <HardDrive className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Disco {num}</span>
                              <span className="text-xs text-muted-foreground font-mono">{data.capacity}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {data.health === "good" ? (
                                <span className="flex items-center gap-1 text-xs text-green-400">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Saudável
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs text-amber-400">
                                  <AlertTriangle className="h-3.5 w-3.5" /> Atenção
                                </span>
                              )}
                              {data.recording && (
                                <span className="text-xs text-red-400 flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" /> REC
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Usage bar */}
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all", usedPct > 80 ? "bg-amber-500" : "bg-primary")}
                              style={{ width: `${usedPct}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
                            <span className="font-mono">{data.used} usados</span>
                            <span className="font-mono">{data.free} livres</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recording Settings */}
                <div className="rounded-lg border border-border bg-card p-5">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                    <Clock className="h-4 w-4 text-primary" />
                    Configurações de Gravação
                  </h3>
                  <div className="space-y-4">
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked={storageConfig.overwrite} onChange={(e) => setStorageConfig({ ...storageConfig, overwrite: e.target.checked })} className="accent-primary" />
                      <span className="text-sm">Sobrescrever gravações antigas quando o disco encher</span>
                    </label>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Retenção de Gravações (dias)</label>
                      <input
                        type="number"
                        value={storageConfig.retentionDays}
                        onChange={(e) => setStorageConfig({ ...storageConfig, retentionDays: parseInt(e.target.value) || 30 })}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Intervalo de Snapshot</label>
                      <select
                        value={storageConfig.snapshotInterval}
                        onChange={(e) => setStorageConfig({ ...storageConfig, snapshotInterval: e.target.value })}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="30min">30 minutos</option>
                        <option value="1h">1 hora</option>
                        <option value="2h">2 horas</option>
                        <option value="6h">6 horas</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Pré-gravação de Alarme (seg)</label>
                        <input
                          type="number"
                          value={storageConfig.alarmRecordPre}
                          onChange={(e) => setStorageConfig({ ...storageConfig, alarmRecordPre: parseInt(e.target.value) || 10 })}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Pós-gravação de Alarme (seg)</label>
                        <input
                          type="number"
                          value={storageConfig.alarmRecordPost}
                          onChange={(e) => setStorageConfig({ ...storageConfig, alarmRecordPost: parseInt(e.target.value) || 30 })}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end gap-3 pb-6">
              <button className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent transition-colors">
                Cancelar
              </button>
              <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                <Save className="h-4 w-4" />
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, mono }: { label: string; value: string; onChange: (v: string) => void; mono?: boolean }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn("w-full rounded-lg border border-input bg-background px-3 py-2 text-sm", mono && "font-mono")}
      />
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, sub }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg bg-muted/30 p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-sm font-medium">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}
