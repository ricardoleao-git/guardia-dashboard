/**
 * AIBox — Configuração de AI Box (Edge Computing).
 *
 * Fase 4.4 do roadmap: AI Box.
 * - Gerenciamento de dispositivos de edge computing (NVIDIA Jetson, Hailo, etc.)
 * - Atribuição de câmeras a AI Boxes
 * - Monitoramento de recursos (CPU, GPU, memória, temperatura)
 * - Modelos AI carregados por box
 * - Throughput e latência
 */
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import {
  Boxes, Cpu, MemoryStick, Thermometer, Activity, Camera,
  Plus, Settings, RefreshCw, Zap, AlertTriangle, CheckCircle2,
  XCircle, Download, ChevronDown, ChevronUp, Microchip,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AIBoxDevice {
  id: string;
  name: string;
  model: string;
  ip: string;
  status: "online" | "offline" | "warning";
  cpu: number;
  gpu: number;
  memory: number;
  temp: number;
  cameras: string[];
  aiModels: string[];
  throughput: number;
  latency: number;
}

const mockBoxes: AIBoxDevice[] = [
  {
    id: "box1",
    name: "AI Box 01 — Portaria",
    model: "NVIDIA Jetson Orin NX 16GB",
    ip: "192.168.254.240",
    status: "online",
    cpu: 42,
    gpu: 67,
    memory: 58,
    temp: 52,
    cameras: ["D1", "D2"],
    aiModels: ["Face Recognition", "LPR", "Intrusion Detection"],
    throughput: 45,
    latency: 38,
  },
  {
    id: "box2",
    name: "AI Box 02 — Recepção",
    model: "Hailo-8 M.2",
    ip: "192.168.254.241",
    status: "online",
    cpu: 35,
    gpu: 81,
    memory: 44,
    temp: 61,
    cameras: ["D3", "D5"],
    aiModels: ["Face Recognition", "People Counting", "Loitering"],
    throughput: 60,
    latency: 22,
  },
  {
    id: "box3",
    name: "AI Box 03 — Estacionamento",
    model: "NVIDIA Jetson Orin Nano 8GB",
    ip: "192.168.254.242",
    status: "warning",
    cpu: 78,
    gpu: 92,
    memory: 87,
    temp: 74,
    cameras: ["D4", "D6"],
    aiModels: ["LPR", "Vehicle Detection", "Parking Violation"],
    throughput: 30,
    latency: 65,
  },
];

function getUsageColor(value: number): string {
  if (value >= 85) return "bg-red-500";
  if (value >= 70) return "bg-amber-500";
  return "bg-green-500";
}

function getUsageText(value: number): string {
  if (value >= 85) return "text-red-400";
  if (value >= 70) return "text-amber-400";
  return "text-green-400";
}

export default function AIBox() {
  const [expandedId, setExpandedId] = useState<string | null>("box1");
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeView="ai-box" onNavigate={() => {}} mobileOpen={false} onMobileClose={() => {}} />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-60">
        <MobileHeader onMenuClick={() => {}} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">AI Box</h1>
              <p className="text-sm text-muted-foreground mt-1">Dispositivos de edge computing para inferência AI</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors">
                <Download className="h-3.5 w-3.5" /> Exportar
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar Box
              </button>
            </div>
          </div>

          {/* Summary stats */}
          <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Boxes className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] text-muted-foreground">Total de Boxes</span>
              </div>
              <p className="font-display text-xl font-bold">{mockBoxes.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                <span className="text-[11px] text-muted-foreground">Online</span>
              </div>
              <p className="font-display text-xl font-bold text-green-400">
                {mockBoxes.filter(b => b.status === "online").length}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Camera className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-[11px] text-muted-foreground">Câmeras Gerenciadas</span>
              </div>
              <p className="font-display text-xl font-bold">
                {mockBoxes.reduce((acc, b) => acc + b.cameras.length, 0)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[11px] text-muted-foreground">Throughput Total</span>
              </div>
              <p className="font-display text-xl font-bold">
                {mockBoxes.reduce((acc, b) => acc + b.throughput, 0)} <span className="text-xs text-muted-foreground">fps</span>
              </p>
            </div>
          </div>

          {/* AI Box cards */}
          <div className="space-y-3">
            {mockBoxes.map(box => {
              const isExpanded = expandedId === box.id;
              const statusColor = box.status === "online" ? "text-green-400" : box.status === "warning" ? "text-amber-400" : "text-red-400";
              const statusBg = box.status === "online" ? "bg-green-500/10 border-green-500/20" : box.status === "warning" ? "bg-amber-500/10 border-amber-500/20" : "bg-red-500/10 border-red-500/20";
              return (
                <div key={box.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  {/* Header row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : box.id)}
                    className="flex w-full items-center gap-4 p-4 hover:bg-accent/30 transition-colors"
                  >
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg border", statusBg)}>
                      <Boxes className={cn("h-5 w-5", statusColor)} />
                    </div>

                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold">{box.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {box.model} · {box.ip} · {box.cameras.length} câmeras · {box.aiModels.length} modelos AI
                      </p>
                    </div>

                    {/* Quick metrics */}
                    <div className="hidden sm:flex items-center gap-4">
                      <div className="flex flex-col items-center">
                        <Cpu className="h-3.5 w-3.5 text-muted-foreground mb-0.5" />
                        <span className={cn("text-xs font-mono font-bold", getUsageText(box.cpu))}>{box.cpu}%</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Microchip className="h-3.5 w-3.5 text-muted-foreground mb-0.5" />
                        <span className={cn("text-xs font-mono font-bold", getUsageText(box.gpu))}>{box.gpu}%</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Thermometer className="h-3.5 w-3.5 text-muted-foreground mb-0.5" />
                        <span className={cn("text-xs font-mono font-bold", box.temp >= 70 ? "text-red-400" : box.temp >= 60 ? "text-amber-400" : "text-green-400")}>{box.temp}°C</span>
                      </div>
                    </div>

                    {/* Status badge */}
                    <span className={cn("rounded border px-2 py-0.5 text-[10px] font-medium", statusBg, statusColor)}>
                      {box.status === "online" ? "Online" : box.status === "warning" ? "Atenção" : "Offline"}
                    </span>

                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/20 p-4">
                      <div className="grid lg:grid-cols-2 gap-6">
                        {/* Resource monitors */}
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-3">Recursos</p>
                          <div className="space-y-3">
                            {/* CPU */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="flex items-center gap-1.5 text-xs"><Cpu className="h-3 w-3" /> CPU</span>
                                <span className={cn("text-xs font-mono font-bold", getUsageText(box.cpu))}>{box.cpu}%</span>
                              </div>
                              <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div className={cn("h-full transition-all", getUsageColor(box.cpu))} style={{ width: `${box.cpu}%` }} />
                              </div>
                            </div>
                            {/* GPU */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="flex items-center gap-1.5 text-xs"><Microchip className="h-3 w-3" /> GPU/NPU</span>
                                <span className={cn("text-xs font-mono font-bold", getUsageText(box.gpu))}>{box.gpu}%</span>
                              </div>
                              <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div className={cn("h-full transition-all", getUsageColor(box.gpu))} style={{ width: `${box.gpu}%` }} />
                              </div>
                            </div>
                            {/* Memory */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="flex items-center gap-1.5 text-xs"><MemoryStick className="h-3 w-3" /> Memória</span>
                                <span className={cn("text-xs font-mono font-bold", getUsageText(box.memory))}>{box.memory}%</span>
                              </div>
                              <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div className={cn("h-full transition-all", getUsageColor(box.memory))} style={{ width: `${box.memory}%` }} />
                              </div>
                            </div>
                            {/* Temperature */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="flex items-center gap-1.5 text-xs"><Thermometer className="h-3 w-3" /> Temperatura</span>
                                <span className={cn("text-xs font-mono font-bold", box.temp >= 70 ? "text-red-400" : box.temp >= 60 ? "text-amber-400" : "text-green-400")}>{box.temp}°C</span>
                              </div>
                              <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div className={cn("h-full transition-all", box.temp >= 70 ? "bg-red-500" : box.temp >= 60 ? "bg-amber-500" : "bg-green-500")} style={{ width: `${(box.temp / 100) * 100}%` }} />
                              </div>
                            </div>
                          </div>

                          {/* Performance */}
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-lg bg-muted/30 p-3">
                              <p className="text-[10px] text-muted-foreground uppercase">Throughput</p>
                              <p className="font-display text-lg font-bold">{box.throughput} <span className="text-xs text-muted-foreground">fps</span></p>
                            </div>
                            <div className="rounded-lg bg-muted/30 p-3">
                              <p className="text-[10px] text-muted-foreground uppercase">Latência</p>
                              <p className="font-display text-lg font-bold">{box.latency} <span className="text-xs text-muted-foreground">ms</span></p>
                            </div>
                          </div>
                        </div>

                        {/* Cameras and AI models */}
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-3">Câmeras Atribuídas</p>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {box.cameras.map(cam => (
                              <span key={cam} className="flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium">
                                <Camera className="h-3 w-3 text-primary" /> {cam}
                              </span>
                            ))}
                            <button className="flex items-center gap-1 rounded-lg border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent/30 transition-colors">
                              <Plus className="h-3 w-3" /> Atribuir
                            </button>
                          </div>

                          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-3">Modelos AI Carregados</p>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {box.aiModels.map(model => (
                              <span key={model} className="flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
                                <Zap className="h-3 w-3" /> {model}
                              </span>
                            ))}
                          </div>

                          {/* Warning for box3 */}
                          {box.status === "warning" && (
                            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                                <p className="text-xs font-semibold text-amber-400">Recursos Saturados</p>
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                GPU em {box.gpu}% e temperatura em {box.temp}°C. Recomenda-se redistribuir câmeras ou atualizar hardware.
                              </p>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="mt-4 flex items-center gap-2">
                            <button className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                              <Settings className="h-3.5 w-3.5" /> Configurar
                            </button>
                            <button className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                              <RefreshCw className="h-3.5 w-3.5" /> Reiniciar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add modal placeholder */}
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
              <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 m-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2 mb-4">
                  <Boxes className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-semibold">Adicionar AI Box</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Nome</label>
                    <input className="w-full mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Ex: AI Box 04 — Quadra" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Modelo</label>
                    <select className="w-full mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm">
                      <option>NVIDIA Jetson Orin NX 16GB</option>
                      <option>NVIDIA Jetson Orin Nano 8GB</option>
                      <option>Hailo-8 M.2</option>
                      <option>Rockchip RK3588</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Endereço IP</label>
                    <input className="w-full mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-mono" placeholder="192.168.254.xxx" />
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setShowAddModal(false)} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors">Cancelar</button>
                  <button onClick={() => setShowAddModal(false)} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Adicionar</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
