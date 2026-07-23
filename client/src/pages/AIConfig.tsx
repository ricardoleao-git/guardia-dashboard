/**
 * AIConfig — Funções AI por câmera.
 *
 * Melhorias Lote 2:
 * - Dados reais da bancada (D1-D6 com IPs, modelos, capacidades)
 * - Visualização em matriz (funções × câmeras) + lista detalhada
 * - Operações em lote (ativar/desativar por função ou por câmera)
 * - Indicadores de capacidade (AI/FACE/REC) por câmera
 * - Slider de sensibilidade por câmera
 * - Status de processamento (on-camera vs connector)
 */
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import {
  Cpu, ScanFace, Car, DoorOpen, PersonStanding, Bell,
  ChevronDown, ChevronRight, Fence, MoveRight, Users2,
  TimerOff, Brain, Grid3x3, List, Zap, ZapOff, Camera
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CameraAIConfig {
  channel: string;
  name: string;
  ip: string;
  model: string;
  capabilities: { ai: boolean; face: boolean; rec: boolean };
  online: boolean;
  faceReco: boolean;
  vehicleReco: boolean;
  accessControl: boolean;
  motionDetection: boolean;
  alarmOut: boolean;
  electronicFence: boolean;
  lineCrossing: boolean;
  peopleCounting: boolean;
  offServiceDetection: boolean;
  llmAnalysis: boolean;
  sensitivity: number;
}

const mockCameras: CameraAIConfig[] = [
  {
    channel: "D1", name: "Estacionamento", ip: "192.168.254.115", model: "H5AI-50",
    capabilities: { ai: true, face: false, rec: true }, online: false,
    faceReco: false, vehicleReco: true, accessControl: false, motionDetection: true,
    alarmOut: true, electronicFence: true, lineCrossing: true, peopleCounting: true,
    offServiceDetection: true, llmAnalysis: false, sensitivity: 75,
  },
  {
    channel: "D2", name: "Corredor", ip: "192.168.254.206", model: "F4C-T",
    capabilities: { ai: true, face: true, rec: true }, online: true,
    faceReco: true, vehicleReco: false, accessControl: false, motionDetection: true,
    alarmOut: true, electronicFence: true, lineCrossing: false, peopleCounting: true,
    offServiceDetection: true, llmAnalysis: false, sensitivity: 70,
  },
  {
    channel: "D3", name: "Recepção", ip: "192.168.254.208", model: "F4C-T",
    capabilities: { ai: true, face: true, rec: true }, online: true,
    faceReco: true, vehicleReco: false, accessControl: true, motionDetection: true,
    alarmOut: false, electronicFence: false, lineCrossing: true, peopleCounting: true,
    offServiceDetection: false, llmAnalysis: false, sensitivity: 60,
  },
  {
    channel: "D4", name: "AI IPC", ip: "192.168.254.227", model: "T5AI",
    capabilities: { ai: true, face: false, rec: false }, online: true,
    faceReco: false, vehicleReco: true, accessControl: true, motionDetection: true,
    alarmOut: true, electronicFence: true, lineCrossing: true, peopleCounting: false,
    offServiceDetection: true, llmAnalysis: false, sensitivity: 80,
  },
  {
    channel: "D5", name: "COPA", ip: "192.168.254.207", model: "F4C-T",
    capabilities: { ai: true, face: true, rec: true }, online: true,
    faceReco: true, vehicleReco: false, accessControl: false, motionDetection: true,
    alarmOut: false, electronicFence: false, lineCrossing: false, peopleCounting: false,
    offServiceDetection: false, llmAnalysis: false, sensitivity: 50,
  },
  {
    channel: "D6", name: "Sala Téc", ip: "192.168.254.209", model: "T5AI",
    capabilities: { ai: true, face: false, rec: false }, online: true,
    faceReco: false, vehicleReco: false, accessControl: false, motionDetection: true,
    alarmOut: false, electronicFence: true, lineCrossing: false, peopleCounting: false,
    offServiceDetection: true, llmAnalysis: false, sensitivity: 65,
  },
];

const aiFunctions = [
  { key: "faceReco", label: "Reconhecimento Facial", icon: ScanFace, color: "text-blue-400", bg: "bg-blue-500/10", desc: "Identifica rostos cadastrados na biblioteca", requires: "face" as const },
  { key: "vehicleReco", label: "Reconhecimento de Veículos", icon: Car, color: "text-purple-400", bg: "bg-purple-500/10", desc: "Lê placas e identifica modelos", requires: null },
  { key: "accessControl", label: "Controle de Acesso", icon: DoorOpen, color: "text-green-400", bg: "bg-green-500/10", desc: "Libera ou bloqueia acesso por credencial", requires: null },
  { key: "motionDetection", label: "Detecção de Movimento", icon: PersonStanding, color: "text-amber-400", bg: "bg-amber-500/10", desc: "Detecta movimento na área monitorada", requires: null },
  { key: "alarmOut", label: "Saída de Alarme", icon: Bell, color: "text-red-400", bg: "bg-red-500/10", desc: "Dispara alarme físico ao detectar evento", requires: null },
  { key: "electronicFence", label: "Cerca Eletrônica Virtual", icon: Fence, color: "text-cyan-400", bg: "bg-cyan-500/10", desc: "Define área proibida e alerta invasão", requires: null },
  { key: "lineCrossing", label: "Travessia de Linha", icon: MoveRight, color: "text-indigo-400", bg: "bg-indigo-500/10", desc: "Detecta travessia de linha direcional", requires: null },
  { key: "peopleCounting", label: "Contagem de Pessoas", icon: Users2, color: "text-teal-400", bg: "bg-teal-500/10", desc: "Conta fluxo de pessoas entrada/saída", requires: null },
  { key: "offServiceDetection", label: "Detecção Fora do Serviço", icon: TimerOff, color: "text-orange-400", bg: "bg-orange-500/10", desc: "Alerta movimento fora de horário comercial", requires: null },
  { key: "llmAnalysis", label: "Análise LLM", icon: Brain, color: "text-pink-400", bg: "bg-pink-500/10", desc: "Análise avançada de cena com IA generativa", requires: null },
] as const;

type ViewMode = "list" | "matrix";

export default function AIConfig() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [cameras, setCameras] = useState(mockCameras);
  const [expandedCamera, setExpandedCamera] = useState<string | null>("D2");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const toggleFunction = (channel: string, funcKey: keyof CameraAIConfig) => {
    setCameras(prev => prev.map(c =>
      c.channel === channel ? { ...c, [funcKey]: !c[funcKey] } : c
    ));
  };

  const toggleAllForFunction = (funcKey: string, enable: boolean) => {
    setCameras(prev => prev.map(c => ({ ...c, [funcKey]: enable })));
  };

  const toggleAllForCamera = (channel: string, enable: boolean) => {
    setCameras(prev => prev.map(c => {
      if (c.channel !== channel) return c;
      const updated = { ...c };
      aiFunctions.forEach(f => {
        (updated as Record<string, unknown>)[f.key] = enable;
      });
      return updated;
    }));
  };

  const isFunctionSupported = (camera: CameraAIConfig, func: typeof aiFunctions[number]) => {
    if (!func.requires) return true;
    return camera.capabilities[func.requires];
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        activeView="ai-config"
        onNavigate={() => {}}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className="lg:ml-60">
        <MobileHeader onMenuClick={() => setMobileSidebarOpen(true)} />

        {/* Page header */}
        <div className="border-b border-border bg-card/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
                <Cpu className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold">Funções AI</h2>
                <p className="text-xs text-muted-foreground">Configuração de inteligência artificial por câmera</p>
              </div>
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="h-3.5 w-3.5" /> Lista
              </button>
              <button
                onClick={() => setViewMode("matrix")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  viewMode === "matrix" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Grid3x3 className="h-3.5 w-3.5" /> Matriz
              </button>
            </div>
          </div>
        </div>

        <main className="p-6 space-y-4">
          {/* Summary bar */}
          <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{cameras.filter(c => c.online).length}/{cameras.length} online</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">
                {cameras.filter(c => c.capabilities.ai).length} com AI
              </span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <ScanFace className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-muted-foreground">
                {cameras.filter(c => c.capabilities.face).length} com FACE
              </span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-green-400">REC</span>
              <span className="text-xs text-muted-foreground">
                {cameras.filter(c => c.capabilities.rec).length} com REC
              </span>
            </div>
          </div>

          {/* LIST VIEW */}
          {viewMode === "list" && (
            <div className="space-y-3">
              {cameras.map((camera) => {
                const isExpanded = expandedCamera === camera.channel;
                const activeCount = aiFunctions.filter(f => camera[f.key]).length;
                const supportedCount = aiFunctions.filter(f => isFunctionSupported(camera, f)).length;

                return (
                  <div key={camera.channel} className={cn(
                    "rounded-xl border bg-card overflow-hidden transition-all",
                    camera.online ? "border-border" : "border-border/50 opacity-60"
                  )}>
                    {/* Camera header */}
                    <button
                      onClick={() => setExpandedCamera(isExpanded ? null : camera.channel)}
                      className="flex w-full items-center justify-between px-4 py-3 hover:bg-accent/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        <span className="text-xs font-mono-tech font-bold">{camera.channel}</span>
                        <span className="text-sm font-medium">{camera.name}</span>
                        <span className="text-[10px] font-mono-tech text-muted-foreground">{camera.ip}</span>
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-mono-tech text-muted-foreground">{camera.model}</span>
                        {/* Capability badges */}
                        <div className="flex items-center gap-0.5">
                          {camera.capabilities.ai && <span className="rounded bg-primary/15 px-1 py-0.5 text-[8px] font-bold text-primary">AI</span>}
                          {camera.capabilities.face && <span className="rounded bg-blue-500/15 px-1 py-0.5 text-[8px] font-bold text-blue-400">FACE</span>}
                          {camera.capabilities.rec && <span className="rounded bg-green-500/15 px-1 py-0.5 text-[8px] font-bold text-green-400">REC</span>}
                        </div>
                        {/* Online status */}
                        <div className={cn("h-2 w-2 rounded-full", camera.online ? "bg-green-400" : "bg-red-400")} />
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", camera.online ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400")}>
                          {camera.online ? "Online" : "Offline"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                          {activeCount}/{supportedCount} ativas
                        </span>
                        <div className="flex items-center gap-1">
                          {aiFunctions.filter(f => camera[f.key]).map(f => {
                            const Icon = f.icon;
                            return <Icon key={f.key} className={cn("h-3.5 w-3.5", f.color)} />;
                          })}
                        </div>
                      </div>
                    </button>

                    {/* Expanded config */}
                    {isExpanded && (
                      <div className="border-t border-border p-4 space-y-3">
                        {/* Batch actions */}
                        <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                          <span className="text-[11px] font-medium text-muted-foreground">Operações em lote:</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleAllForCamera(camera.channel, true)}
                              className="flex items-center gap-1 rounded-md bg-green-500/15 px-2 py-1 text-[10px] font-medium text-green-400 hover:bg-green-500/25 transition-colors"
                            >
                              <Zap className="h-3 w-3" /> Ativar todas
                            </button>
                            <button
                              onClick={() => toggleAllForCamera(camera.channel, false)}
                              className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-accent transition-colors"
                            >
                              <ZapOff className="h-3 w-3" /> Desativar todas
                            </button>
                          </div>
                        </div>

                        {/* Function toggles */}
                        {aiFunctions.map((func) => {
                          const Icon = func.icon;
                          const isEnabled = camera[func.key];
                          const isSupported = isFunctionSupported(camera, func);

                          return (
                            <div
                              key={func.key}
                              className={cn(
                                "flex items-center justify-between rounded-lg px-3 py-2.5 transition-opacity",
                                func.bg,
                                !isSupported && "opacity-40"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card/50">
                                  <Icon className={cn("h-4 w-4", func.color)} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium">{func.label}</p>
                                    {!isSupported && (
                                      <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[9px] font-bold text-red-400">
                                        NÃO SUPORTADO
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">{func.desc}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => isSupported && toggleFunction(camera.channel, func.key as keyof CameraAIConfig)}
                                disabled={!isSupported}
                                className={cn(
                                  "relative h-6 w-11 rounded-full transition-colors duration-200",
                                  isEnabled ? "bg-primary" : "bg-muted",
                                  !isSupported && "cursor-not-allowed"
                                )}
                              >
                                <div className={cn(
                                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
                                  isEnabled ? "translate-x-5" : "translate-x-0.5"
                                )} />
                              </button>
                            </div>
                          );
                        })}

                        {/* Sensitivity slider */}
                        <div className="rounded-lg bg-muted/30 px-3 py-3 mt-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-muted-foreground">Sensibilidade Geral</span>
                            <span className="font-mono-tech text-xs font-bold text-primary">{camera.sensitivity}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={camera.sensitivity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setCameras(prev => prev.map(c => c.channel === camera.channel ? { ...c, sensitivity: val } : c));
                            }}
                            className="w-full h-1.5 rounded-full bg-muted appearance-none cursor-pointer accent-primary"
                          />
                          <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
                            <span>Baixa</span>
                            <span>Média</span>
                            <span>Alta</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* MATRIX VIEW */}
          {viewMode === "matrix" && (
            <div className="rounded-xl border border-border bg-card overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2.5 text-left text-[11px] font-semibold text-muted-foreground">
                      Função
                    </th>
                    {cameras.map(c => (
                      <th key={c.channel} className="px-2 py-2.5 text-center min-w-[80px]">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] font-mono-tech font-bold">{c.channel}</span>
                          <span className="text-[9px] text-muted-foreground truncate max-w-[70px]">{c.name}</span>
                          <div className={cn("h-1.5 w-1.5 rounded-full", c.online ? "bg-green-400" : "bg-red-400")} />
                        </div>
                      </th>
                    ))}
                    <th className="px-2 py-2.5 text-center min-w-[70px]">
                      <span className="text-[9px] font-semibold text-muted-foreground">Lote</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {aiFunctions.map((func) => {
                    const Icon = func.icon;
                    const activeCount = cameras.filter(c => c[func.key]).length;
                    return (
                      <tr key={func.key} className="border-b border-border/50 hover:bg-accent/10 transition-colors">
                        <td className="sticky left-0 z-10 bg-card px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Icon className={cn("h-4 w-4", func.color)} />
                            <span className="text-xs font-medium">{func.label}</span>
                          </div>
                        </td>
                        {cameras.map(c => {
                          const isEnabled = c[func.key];
                          const isSupported = isFunctionSupported(c, func);
                          return (
                            <td key={c.channel} className="px-2 py-2 text-center">
                              <button
                                onClick={() => isSupported && toggleFunction(c.channel, func.key as keyof CameraAIConfig)}
                                disabled={!isSupported}
                                className={cn(
                                  "inline-flex h-7 w-7 items-center justify-center rounded-lg transition-all",
                                  isEnabled && isSupported && cn(func.bg, "ring-1 ring-current"),
                                  !isEnabled && isSupported && "bg-muted hover:bg-accent",
                                  !isSupported && "bg-muted/30 cursor-not-allowed"
                                )}
                              >
                                {isEnabled && isSupported ? (
                                  <Icon className={cn("h-3.5 w-3.5", func.color)} />
                                ) : !isSupported ? (
                                  <span className="text-[8px] font-bold text-muted-foreground">—</span>
                                ) : (
                                  <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                                )}
                              </button>
                            </td>
                          );
                        })}
                        {/* Batch toggle for this function */}
                        <td className="px-2 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => toggleAllForFunction(func.key, true)}
                              className="rounded p-1 text-green-400 hover:bg-green-500/15 transition-colors"
                              title="Ativar em todas"
                            >
                              <Zap className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => toggleAllForFunction(func.key, false)}
                              className="rounded p-1 text-muted-foreground hover:bg-muted transition-colors"
                              title="Desativar em todas"
                            >
                              <ZapOff className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="text-[9px] text-muted-foreground block mt-0.5">{activeCount}/{cameras.length}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Sensitivity row */}
                  <tr className="border-b border-border/50">
                    <td className="sticky left-0 z-10 bg-card px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-primary" />
                        <span className="text-xs font-medium">Sensibilidade</span>
                      </div>
                    </td>
                    {cameras.map(c => (
                      <td key={c.channel} className="px-2 py-2 text-center">
                        <span className={cn(
                          "font-mono-tech text-xs font-bold",
                          c.sensitivity >= 70 ? "text-green-400" : c.sensitivity >= 50 ? "text-amber-400" : "text-red-400"
                        )}>
                          {c.sensitivity}%
                        </span>
                      </td>
                    ))}
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Info banner */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              <strong className="text-primary">Nota:</strong> As funções AI são processadas diretamente na câmera (on-device).
              Câmeras F4C-T suportam Reconhecimento Facial; T5AI e H5AI-50 suportam AI mas não FACE.
              O Connector recebe os eventos via protocolo P6S e encaminha para a nuvem.
              Alterações entram em vigor imediatamente após aplicação.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
