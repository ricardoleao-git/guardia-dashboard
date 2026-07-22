import { Camera, Maximize2, Wifi, WifiOff, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface CameraFeed {
  id: string;
  name: string;
  serial: string;
  ip: string;
  status: "online" | "offline";
  location: string;
  hasAI: boolean;
  imageUrl?: string;
}

const mockFeeds: CameraFeed[] = [
  { id: "D2", name: "Corredor", serial: "F4C-T-D2", ip: "192.168.254.206", status: "online", location: "Bloco A - 1º Andar", hasAI: true, imageUrl: "/manus-storage/cam-facereco-school.jpg" },
  { id: "D3", name: "Recepção", serial: "F4C-T-D3", ip: "192.168.254.207", status: "online", location: "Entrada Principal", hasAI: true, imageUrl: "/manus-storage/cam-access-reception.jpg" },
  { id: "D5", name: "COPA", serial: "F4C-T-D5", ip: "192.168.254.207", status: "online", location: "Bloco B - Térreo", hasAI: true, imageUrl: "/manus-storage/cam-motion-hallway.jpg" },
  { id: "D4", name: "Portão", serial: "F4C-T-D4", ip: "192.168.254.208", status: "online", location: "Estacionamento", hasAI: true, imageUrl: "/manus-storage/cam-vehicle-gate.jpg" },
  { id: "D6", name: "AI IPC", serial: "H5AI-D6", ip: "192.168.254.209", status: "offline", location: "Bloco C - 2º Andar", hasAI: true },
  { id: "D1", name: "IPC", serial: "H5AI-D1", ip: "192.168.254.115", status: "offline", location: "Data Center", hasAI: false },
];

interface CameraMosaicProps {
  onCameraClick?: (serial: string) => void;
}

export default function CameraMosaic({ onCameraClick }: CameraMosaicProps) {
  const [layout, setLayout] = useState<"2x2" | "3x3" | "4x4">("2x2");

  const gridCols = layout === "2x2" ? "grid-cols-2" : layout === "3x3" ? "grid-cols-3" : "grid-cols-4";
  const visibleCount = layout === "2x2" ? 4 : layout === "3x3" ? 9 : 16;

  return (
    <div className="space-y-4">
      {/* Layout controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Mosaico:</span>
          {(["2x2", "3x3", "4x4"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLayout(l)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                layout === l
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-green-400" /> {mockFeeds.filter(f => f.status === "online").length} Online
          </span>
          <span className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-red-400" /> {mockFeeds.filter(f => f.status === "offline").length} Offline
          </span>
        </div>
      </div>

      {/* Camera grid */}
      <div className={cn("grid gap-2", gridCols)}>
        {mockFeeds.slice(0, visibleCount).map((feed) => (
          <CameraTile key={feed.id} feed={feed} onClick={() => onCameraClick?.(feed.serial)} />
        ))}
        {/* Fill empty slots */}
        {mockFeeds.length < visibleCount &&
          Array.from({ length: visibleCount - mockFeeds.length }).map((_, i) => (
            <div key={`empty-${i}`} className="relative aspect-video rounded-lg bg-card/50 border border-dashed border-border flex items-center justify-center">
              <Camera className="h-6 w-6 text-muted-foreground/30" />
            </div>
          ))}
      </div>
    </div>
  );
}

function CameraTile({ feed, onClick }: { feed: CameraFeed; onClick: () => void }) {
  const now = new Date().toLocaleTimeString("pt-BR");

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative aspect-video rounded-lg overflow-hidden bg-black cursor-pointer scanline",
        "ring-1 ring-border hover:ring-primary/50 transition-all duration-150"
      )}
    >
      {/* Camera feed or placeholder */}
      {feed.status === "online" && feed.imageUrl ? (
        <img
          src={feed.imageUrl}
          alt={feed.name}
          className="absolute inset-0 h-full w-full object-cover opacity-80 group-hover:opacity-90 transition-opacity"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-card to-black">
          <div className="text-center">
            <WifiOff className="h-8 w-8 text-red-400/50 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground font-mono-tech">SEM SINAL</p>
          </div>
        </div>
      )}

      {/* Top overlay: camera name + status */}
      <div className="absolute top-0 left-0 right-0 camera-overlay px-2 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {feed.status === "online" ? (
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-red-500 live-dot" />
              <span className="text-[10px] font-mono-tech text-white font-bold">LIVE</span>
            </div>
          ) : (
            <span className="text-[10px] font-mono-tech text-red-400 font-bold">OFFLINE</span>
          )}
          <span className="text-[10px] font-mono-tech text-white/80 ml-1">D{feed.id.replace("D", "")}</span>
        </div>
        {feed.hasAI && (
          <span className="rounded bg-primary/80 px-1 py-0.5 text-[8px] font-bold text-primary-foreground">AI</span>
        )}
      </div>

      {/* Bottom overlay: camera name + timestamp */}
      <div className="absolute bottom-0 left-0 right-0 camera-overlay px-2 py-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-white truncate">{feed.name}</span>
          <span className="text-[9px] font-mono-tech text-white/70">{now}</span>
        </div>
        <p className="text-[8px] text-white/50 truncate font-mono-tech">{feed.ip}</p>
      </div>

      {/* Hover controls */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-black/30">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/80">
            <Maximize2 className="h-4 w-4 text-white" />
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/60">
            <Video className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
