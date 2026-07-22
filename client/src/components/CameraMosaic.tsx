/**
 * CameraMosaic — Grid de câmeras ao vivo com suporte a streaming RTSP/WebRTC.
 *
 * Design Philosophy: NVR Dark Theme — grid denso, overlays semi-transparentes,
 * indicadores LIVE vermelhos, timestamp monospace, scanline effect.
 *
 * Cada tile suporta 4 protocolos de transporte (WebRTC > HLS > MJPEG > Snapshot)
 * com fallback automático. Em modo demo, usa imagens estáticas com simulação.
 */
import { Camera, Maximize2, Wifi, WifiOff, Video, Radio, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import LiveStream, { StreamProtocol } from "@/components/LiveStream";

interface CameraFeed {
  id: string;
  name: string;
  serial: string;
  ip: string;
  status: "online" | "offline";
  location: string;
  hasAI: boolean;
  imageUrl?: string;
  snapshotUrl?: string;
  // Live stream configuration
  streamUrl?: string;
  streamProtocol?: StreamProtocol;
}

const mockFeeds: CameraFeed[] = [
  {
    id: "D2",
    name: "Corredor",
    serial: "F4C-T-D2",
    ip: "192.168.254.206",
    status: "online",
    location: "Bloco A - 1º Andar",
    hasAI: true,
    imageUrl: "/manus-storage/cam-facereco-school.jpg",
    // RTSP via WebRTC gateway (when deployed on-prem)
    streamUrl: "wss://guardia-connector.local/rtc/F4C-T-D2",
    streamProtocol: "webrtc",
    snapshotUrl: "http://192.168.254.206/cgi-bin/snapshot.cgi",
  },
  {
    id: "D3",
    name: "Recepção",
    serial: "F4C-T-D3",
    ip: "192.168.254.207",
    status: "online",
    location: "Entrada Principal",
    hasAI: true,
    imageUrl: "/manus-storage/cam-access-reception.jpg",
    streamUrl: "wss://guardia-connector.local/rtc/F4C-T-D3",
    streamProtocol: "webrtc",
    snapshotUrl: "http://192.168.254.207/cgi-bin/snapshot.cgi",
  },
  {
    id: "D5",
    name: "COPA",
    serial: "F4C-T-D5",
    ip: "192.168.254.207",
    status: "online",
    location: "Bloco B - Térreo",
    hasAI: true,
    imageUrl: "/manus-storage/cam-motion-hallway.jpg",
    // HLS stream example
    streamUrl: "https://guardia-connector.local/stream/F4C-T-D5.m3u8",
    streamProtocol: "hls",
    snapshotUrl: "http://192.168.254.207/cgi-bin/snapshot.cgi",
  },
  {
    id: "D4",
    name: "Portão",
    serial: "F4C-T-D4",
    ip: "192.168.254.208",
    status: "online",
    location: "Estacionamento",
    hasAI: true,
    imageUrl: "/manus-storage/cam-vehicle-gate.jpg",
    // MJPEG stream
    streamUrl: "http://192.168.254.208/cgi-bin/mjpeg/stream.cgi",
    streamProtocol: "mjpeg",
    snapshotUrl: "http://192.168.254.208/cgi-bin/snapshot.cgi",
  },
  {
    id: "D6",
    name: "AI IPC",
    serial: "H5AI-D6",
    ip: "192.168.254.209",
    status: "offline",
    location: "Bloco C - 2º Andar",
    hasAI: true,
  },
  {
    id: "D1",
    name: "IPC",
    serial: "H5AI-D1",
    ip: "192.168.254.115",
    status: "offline",
    location: "Data Center",
    hasAI: false,
  },
];

interface CameraMosaicProps {
  onCameraClick?: (serial: string) => void;
}

export default function CameraMosaic({ onCameraClick }: CameraMosaicProps) {
  const [layout, setLayout] = useState<"2x2" | "3x3" | "4x4">("2x2");
  const [streamMode, setStreamMode] = useState<"live" | "snapshot">("live");

  const gridCols = layout === "2x2" ? "grid-cols-2" : layout === "3x3" ? "grid-cols-3" : "grid-cols-4";
  const visibleCount = layout === "2x2" ? 4 : layout === "3x3" ? 9 : 16;

  return (
    <div className="space-y-4">
      {/* Layout controls + stream mode */}
      <div className="flex items-center justify-between flex-wrap gap-2">
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

        <div className="flex items-center gap-3">
          {/* Stream mode toggle */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setStreamMode("live")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                streamMode === "live"
                  ? "bg-green-500/20 text-green-400 ring-1 ring-green-500/30"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              <Radio className="h-3 w-3" />
              Live
            </button>
            <button
              onClick={() => setStreamMode("snapshot")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                streamMode === "snapshot"
                  ? "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              <Camera className="h-3 w-3" />
              Snapshot
            </button>
          </div>

          {/* Status counts */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-green-400" /> {mockFeeds.filter((f) => f.status === "online").length} Online
            </span>
            <span className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-red-400" /> {mockFeeds.filter((f) => f.status === "offline").length} Offline
            </span>
          </div>
        </div>
      </div>

      {/* Camera grid */}
      <div className={cn("grid gap-2", gridCols)}>
        {mockFeeds.slice(0, visibleCount).map((feed) => (
          <CameraTile
            key={feed.id}
            feed={feed}
            streamMode={streamMode}
            onClick={() => onCameraClick?.(feed.serial)}
          />
        ))}
        {/* Fill empty slots */}
        {mockFeeds.length < visibleCount &&
          Array.from({ length: visibleCount - mockFeeds.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="relative aspect-video rounded-lg bg-card/50 border border-dashed border-border flex items-center justify-center"
            >
              <Camera className="h-6 w-6 text-muted-foreground/30" />
            </div>
          ))}
      </div>
    </div>
  );
}

function CameraTile({
  feed,
  streamMode,
  onClick,
}: {
  feed: CameraFeed;
  streamMode: "live" | "snapshot";
  onClick: () => void;
}) {
  // In snapshot mode, force snapshot protocol
  const effectiveProtocol: StreamProtocol = streamMode === "snapshot" ? "snapshot" : feed.streamProtocol || "snapshot";
  const effectiveUrl = streamMode === "snapshot" ? undefined : feed.streamUrl;

  return (
    <div className="group relative">
      <LiveStream
        cameraSerial={feed.serial}
        cameraName={feed.name}
        location={feed.location}
        streamUrl={effectiveUrl}
        protocol={effectiveProtocol}
        fallbackSnapshotUrl={feed.snapshotUrl}
        demoImageUrl={feed.imageUrl}
        status={feed.status}
        onClick={onClick}
        className="absolute inset-0"
      />

      {/* AI badge — positioned above stream overlay */}
      {feed.hasAI && feed.status === "online" && (
        <div className="absolute top-7 right-2 z-30">
          <span className="rounded bg-primary/80 px-1 py-0.5 text-[8px] font-bold text-primary-foreground">
            AI
          </span>
        </div>
      )}
    </div>
  );
}
