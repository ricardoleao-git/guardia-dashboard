import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import { Cpu, ScanFace, Car, DoorOpen, PersonStanding, Bell, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CameraAIConfig {
  channel: string;
  name: string;
  faceReco: boolean;
  vehicleReco: boolean;
  accessControl: boolean;
  motionDetection: boolean;
  alarmOut: boolean;
}

const mockCameras: CameraAIConfig[] = [
  { channel: "D2", name: "Corredor", faceReco: true, vehicleReco: false, accessControl: false, motionDetection: true, alarmOut: true },
  { channel: "D3", name: "Recepção", faceReco: true, vehicleReco: false, accessControl: true, motionDetection: true, alarmOut: false },
  { channel: "D4", name: "Portão", faceReco: false, vehicleReco: true, accessControl: true, motionDetection: true, alarmOut: true },
  { channel: "D5", name: "COPA", faceReco: true, vehicleReco: false, accessControl: false, motionDetection: true, alarmOut: false },
];

const aiFunctions = [
  { key: "faceReco", label: "Reconhecimento Facial", icon: ScanFace, color: "text-blue-400", bg: "bg-blue-500/10" },
  { key: "vehicleReco", label: "Reconhecimento de Veículos", icon: Car, color: "text-purple-400", bg: "bg-purple-500/10" },
  { key: "accessControl", label: "Controle de Acesso", icon: DoorOpen, color: "text-green-400", bg: "bg-green-500/10" },
  { key: "motionDetection", label: "Detecção de Movimento", icon: PersonStanding, color: "text-amber-400", bg: "bg-amber-500/10" },
  { key: "alarmOut", label: "Saída de Alarme", icon: Bell, color: "text-red-400", bg: "bg-red-500/10" },
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
                                {isEnabled ? "Ativo — processando eventos" : "Desativado"}
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
