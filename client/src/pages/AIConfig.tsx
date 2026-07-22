import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import { Cpu, ScanFace, Car, DoorOpen, PersonStanding, Bell, ChevronDown, ChevronRight, Fence, MoveRight, Users2, TimerOff, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

interface CameraAIConfig {
  channel: string;
  name: string;
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
  { channel: "D2", name: "Corredor", faceReco: true, vehicleReco: false, accessControl: false, motionDetection: true, alarmOut: true, electronicFence: true, lineCrossing: false, peopleCounting: true, offServiceDetection: true, llmAnalysis: false, sensitivity: 70 },
  { channel: "D3", name: "Recepção", faceReco: true, vehicleReco: false, accessControl: true, motionDetection: true, alarmOut: false, electronicFence: false, lineCrossing: true, peopleCounting: true, offServiceDetection: false, llmAnalysis: false, sensitivity: 60 },
  { channel: "D4", name: "Portão", faceReco: false, vehicleReco: true, accessControl: true, motionDetection: true, alarmOut: true, electronicFence: true, lineCrossing: true, peopleCounting: false, offServiceDetection: true, llmAnalysis: false, sensitivity: 80 },
  { channel: "D5", name: "COPA", faceReco: true, vehicleReco: false, accessControl: false, motionDetection: true, alarmOut: false, electronicFence: false, lineCrossing: false, peopleCounting: false, offServiceDetection: false, llmAnalysis: false, sensitivity: 50 },
];

const aiFunctions = [
  { key: "faceReco", label: "Reconhecimento Facial", icon: ScanFace, color: "text-blue-400", bg: "bg-blue-500/10", desc: "Identifica rostos cadastrados na biblioteca" },
  { key: "vehicleReco", label: "Reconhecimento de Veículos", icon: Car, color: "text-purple-400", bg: "bg-purple-500/10", desc: "Lê placas e identifica modelos" },
  { key: "accessControl", label: "Controle de Acesso", icon: DoorOpen, color: "text-green-400", bg: "bg-green-500/10", desc: "Libera ou bloqueia acesso por credencial" },
  { key: "motionDetection", label: "Detecção de Movimento", icon: PersonStanding, color: "text-amber-400", bg: "bg-amber-500/10", desc: "Detecta movimento na área monitorada" },
  { key: "alarmOut", label: "Saída de Alarme", icon: Bell, color: "text-red-400", bg: "bg-red-500/10", desc: "Dispara alarme físico ao detectar evento" },
  { key: "electronicFence", label: "Cerca Eletrônica Virtual", icon: Fence, color: "text-cyan-400", bg: "bg-cyan-500/10", desc: "Define área proibida e alerta invasão" },
  { key: "lineCrossing", label: "Travessia de Linha", icon: MoveRight, color: "text-indigo-400", bg: "bg-indigo-500/10", desc: "Detecta travessia de linha direcional" },
  { key: "peopleCounting", label: "Contagem de Pessoas", icon: Users2, color: "text-teal-400", bg: "bg-teal-500/10", desc: "Conta fluxo de pessoas entrada/saída" },
  { key: "offServiceDetection", label: "Detecção Fora do Serviço", icon: TimerOff, color: "text-orange-400", bg: "bg-orange-500/10", desc: "Alerta movimento fora de horário comercial" },
  { key: "llmAnalysis", label: "Análise de Modelo Grande (LLM)", icon: Brain, color: "text-pink-400", bg: "bg-pink-500/10", desc: "Análise avançada de cena com IA generativa" },
] as const;

export default function AIConfig() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [cameras, setCameras] = useState(mockCameras);
  const [expandedCamera, setExpandedCamera] = useState<string | null>("D2");

  const toggleFunction = (channel: string, funcKey: keyof CameraAIConfig) => {
    setCameras(prev => prev.map(c =>
      c.channel === channel ? { ...c, [funcKey]: !c[funcKey] } : c
    ));
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

        <div className="border-b border-border bg-card/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15">
              <Cpu className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">Funções AI</h2>
              <p className="text-xs text-muted-foreground">Configuração de inteligência artificial por câmera</p>
            </div>
          </div>
        </div>

        <main className="p-6 space-y-3">
          {cameras.map((camera) => {
            const isExpanded = expandedCamera === camera.channel;
            const activeCount = aiFunctions.filter(f => camera[f.key]).length;

            return (
              <div key={camera.channel} className="rounded-lg border border-border bg-card overflow-hidden">
                {/* Camera header */}
                <button
                  onClick={() => setExpandedCamera(isExpanded ? null : camera.channel)}
                  className="flex w-full items-center justify-between px-4 py-3 hover:bg-accent/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-xs font-mono-tech font-bold">{camera.channel}</span>
                    <span className="text-sm font-medium">{camera.name}</span>
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {activeCount}/{aiFunctions.length} ativas
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {aiFunctions.filter(f => camera[f.key]).map(f => {
                      const Icon = f.icon;
                      return <Icon key={f.key} className={cn("h-3.5 w-3.5", f.color)} />;
                    })}
                  </div>
                </button>

                {/* Expanded config */}
                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-3">
                    {aiFunctions.map((func) => {
                      const Icon = func.icon;
                      const isEnabled = camera[func.key];
                      return (
                        <div key={func.key} className={cn("flex items-center justify-between rounded-lg px-3 py-2.5", func.bg)}>
                          <div className="flex items-center gap-3">
                            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-card/50")}>
                              <Icon className={cn("h-4 w-4", func.color)} />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{func.label}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {func.desc}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleFunction(camera.channel, func.key as keyof CameraAIConfig)}
                            className={cn(
                              "relative h-6 w-11 rounded-full transition-colors duration-200",
                              isEnabled ? "bg-primary" : "bg-muted"
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

          {/* Info banner */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              <strong className="text-primary">Nota:</strong> As funções AI são processadas diretamente na câmera F4C-T.
              O Connector recebe os eventos via protocolo P6S e encaminha para a nuvem.
              Alterações entram em vigor imediatamente após aplicação.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
