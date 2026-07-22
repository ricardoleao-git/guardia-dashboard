import { Camera, Wifi, WifiOff, MapPin } from "lucide-react";
import { CameraInfo } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

interface CameraGridProps {
  cameras: CameraInfo[];
  onCameraClick?: (serial: string) => void;
}

export default function CameraGrid({ cameras, onCameraClick }: CameraGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {cameras.map((cam) => (
        <button
          key={cam.serial}
          onClick={() => onCameraClick?.(cam.serial)}
          className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 active:scale-[0.98]"
        >
          {/* Camera preview placeholder */}
          <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
            <div className="flex h-full w-full items-center justify-center">
              <Camera className="h-10 w-10 text-white/20 transition-transform group-hover:scale-110" />
            </div>
            {/* Status indicator */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-full bg-black/50 px-2 py-1 backdrop-blur-sm">
              {cam.online ? (
                <>
                  <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse-dot" />
                  <span className="text-[10px] font-medium text-white">Online</span>
                </>
              ) : (
                <>
                  <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
                  <span className="text-[10px] font-medium text-white">Offline</span>
                </>
              )}
            </div>
            {/* Model badge */}
            <div className="absolute bottom-2 left-2">
              <span className="font-mono-tech text-[10px] font-medium text-white/70">{cam.model}</span>
            </div>
          </div>

          {/* Camera info */}
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono-tech text-sm font-semibold">{cam.serial}</span>
              {cam.online ? (
                <Wifi className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-red-400" />
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{cam.location}</span>
            </div>
            <div className="text-[11px] text-muted-foreground/70">
              {cam.lastEvent ? `Último evento: ${timeAgo(cam.lastEvent)}` : "Sem eventos"}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
