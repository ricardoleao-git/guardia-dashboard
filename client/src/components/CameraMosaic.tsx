/**
 * CameraMosaic — Grid de câmeras ao vivo com dados REAIS da bancada.
 *
 * Design Philosophy: NVR Dark Theme — grid denso, overlays semi-transparentes,
 * indicadores LIVE vermelhos, timestamp monospace, scanline effect.
 *
 * Dados: bancada real (spec 05 §1) — D1-D6 com IPs, tipos e capacidades corretas.
 * Layouts: 1, 4, 6, 9, 16, 36 tiles + toggle Auto-relevância.
 */
import { Camera, Maximize2, Wifi, WifiOff, Video, Radio, Settings2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import LiveStream, { StreamProtocol } from "@/components/LiveStream";
import { useI18n } from "@/contexts/I18nContext";
import { isLiveBackend } from "@/lib/data";

interface CameraFeed {
  id: string;
  name: string;
  serial: string;
  ip: string;
  type: string;
  status: "online" | "offline";
  location: string;
  hasAI: boolean;
  hasFace: boolean;
  recording: boolean;
  imageUrl?: string;
  snapshotUrl?: string;
  streamUrl?: string;
  streamProtocol?: StreamProtocol;
}

// Dados REAIS da bancada (spec 05 §1)
const benchFeeds: CameraFeed[] = [
  {
    id: "D2",
    name: "Corredor",
    serial: "F4C-T-D2",
    ip: "192.168.254.206",
    type: "F4C-T",
    status: "online",
    location: "Corredor",
    hasAI: true,
    hasFace: true,
    recording: true,
    imageUrl: "https://placehold.co/640x360/1a1a2e/6366f1?text=Camera+D1",
    streamUrl: "wss://guardia-connector.local/rtc/F4C-T-D2",
    streamProtocol: "webrtc",
    snapshotUrl: "http://192.168.254.206/cgi-bin/snapshot.cgi",
  },
  {
    id: "D3",
    name: "Recepção",
    serial: "F4C-T-D3",
    ip: "192.168.254.208",
    type: "F4C-T",
    status: "online",
    location: "Recepção",
    hasAI: true,
    hasFace: true,
    recording: true,
    imageUrl: "https://placehold.co/640x360/1a1a2e/6366f1?text=Camera+D6",
    streamUrl: "wss://guardia-connector.local/rtc/F4C-T-D3",
    streamProtocol: "webrtc",
    snapshotUrl: "http://192.168.254.208/cgi-bin/snapshot.cgi",
  },
  {
    id: "D5",
    name: "COPA",
    serial: "F4C-T-D5",
    ip: "192.168.254.207",
    type: "F4C-T",
    status: "online",
    location: "COPA",
    hasAI: true,
    hasFace: true,
    recording: true,
    imageUrl: "https://placehold.co/640x360/1a1a2e/6366f1?text=Camera+D7",
    streamUrl: "https://guardia-connector.local/stream/F4C-T-D5.m3u8",
    streamProtocol: "hls",
    snapshotUrl: "http://192.168.254.207/cgi-bin/snapshot.cgi",
  },
  {
    id: "D4",
    name: "AI IPC",
    serial: "T5AI-D4",
    ip: "192.168.254.227",
    type: "T5AI",
    status: "online",
    location: "AI IPC",
    hasAI: true,
    hasFace: false,
    recording: false,
    imageUrl: "https://placehold.co/640x360/1a1a2e/6366f1?text=Camera+D8",
    streamUrl: "http://192.168.254.227/cgi-bin/mjpeg/stream.cgi",
    streamProtocol: "mjpeg",
    snapshotUrl: "http://192.168.254.227/cgi-bin/snapshot.cgi",
  },
  {
    id: "D6",
    name: "AI IPC",
    serial: "T5AI-D6",
    ip: "192.168.254.209",
    type: "T5AI",
    status: "online",
    location: "AI IPC",
    hasAI: true,
    hasFace: false,
    recording: false,
    imageUrl: "https://placehold.co/640x360/1a1a2e/6366f1?text=Camera+D3",
    streamUrl: "http://192.168.254.209/cgi-bin/mjpeg/stream.cgi",
    streamProtocol: "mjpeg",
    snapshotUrl: "http://192.168.254.209/cgi-bin/snapshot.cgi",
  },
  {
    id: "D1",
    name: "CAM01",
    serial: "H5AI-D1",
    ip: "192.168.254.115",
    type: "H5AI-50",
    status: "offline",
    location: "CAM01",
    hasAI: false,
    hasFace: false,
    recording: false,
  },
];

type LayoutOption = "1" | "4" | "6" | "9" | "16" | "36";

const layoutConfig: Record<LayoutOption, { cols: string; count: number; label: string }> = {
  "1":  { cols: "grid-cols-1",              count: 1,  label: "1"   },
  "4":  { cols: "grid-cols-2",              count: 4,  label: "2×2" },
  "6":  { cols: "grid-cols-3",              count: 6,  label: "3×2" },
  "9":  { cols: "grid-cols-3",              count: 9,  label: "3×3" },
  "16": { cols: "grid-cols-4",              count: 16, label: "4×4" },
  "36": { cols: "grid-cols-6 md:grid-cols-6", count: 36, label: "6×6" },
};

interface CameraMosaicProps {
  onCameraClick?: (serial: string) => void;
}

export default function CameraMosaic({ onCameraClick }: CameraMosaicProps) {
  const { t } = useI18n();
  const [layout, setLayout] = useState<LayoutOption>("4");
  // Em mock não há câmera alcançável: os streamUrl apontam para a LAN da
  // bancada (192.168.254.0/24). Entrar em "live" abre uma RTCPeerConnection
  // + WebSocket por tile contra host inexistente — 6 de cada no layout cheio
  // (CLAUDE.md §14.2, causa 1). Mesma detecção dos 7 hooks (§12.0).
  const isMock = !isLiveBackend();
  const [streamMode, setStreamMode] = useState<"live" | "snapshot">(
    isMock ? "snapshot" : "live"
  );
  const [autoRelevance, setAutoRelevance] = useState(true);

  const config = layoutConfig[layout];

  return (
    <div className="space-y-3">
      {/* Layout controls + stream mode + auto-relevância */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">{t("dash.mosaic")}:</span>
          {(Object.keys(layoutConfig) as LayoutOption[]).map((l) => (
            <button
              key={l}
              onClick={() => setLayout(l)}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                layout === l
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {layoutConfig[l].label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-relevância toggle */}
          <button
            onClick={() => setAutoRelevance(!autoRelevance)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              autoRelevance
                ? "bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30"
                : "bg-muted text-muted-foreground hover:bg-accent"
            )}
            title="Destaca automaticamente tiles com eventos recentes"
          >
            <Sparkles className="h-3 w-3" />
            {t("mosaic.auto_relevance")}
          </button>

          {/* Stream mode toggle */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setStreamMode("live")}
              disabled={isMock}
              title={
                isMock
                  ? "Indisponível no modo demo — sem câmera alcançável"
                  : undefined
              }
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                streamMode === "live"
                  ? "bg-green-500/20 text-green-400 ring-1 ring-green-500/30"
                  : "bg-muted text-muted-foreground hover:bg-accent",
                isMock && "cursor-not-allowed opacity-40 hover:bg-muted"
              )}
            >
              <Radio className="h-3 w-3" />
              {t("mosaic.live")}
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
              {t("mosaic.snapshot")}
            </button>
          </div>

          {/* Status counts */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-green-400" /> {benchFeeds.filter((f) => f.status === "online").length} {t("common.online")}
            </span>
            <span className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-red-400" /> {benchFeeds.filter((f) => f.status === "offline").length} {t("common.offline")}
            </span>
          </div>
        </div>
      </div>

      {/* Camera grid */}
      <div className={cn("grid gap-1.5", config.cols)}>
        {benchFeeds.slice(0, config.count).map((feed) => (
          <CameraTile
            key={feed.id}
            feed={feed}
            streamMode={streamMode}
            autoRelevance={autoRelevance}
            singleView={layout === "1"}
            onClick={() => onCameraClick?.(feed.serial)}
          />
        ))}
        {/* Fill empty slots */}
        {benchFeeds.length < config.count &&
          Array.from({ length: config.count - benchFeeds.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="relative aspect-video rounded-lg bg-card/50 border border-dashed border-border flex items-center justify-center"
            >
              <Camera className="h-5 w-5 text-muted-foreground/30" />
            </div>
          ))}
      </div>
    </div>
  );
}

function CameraTile({
  feed,
  streamMode,
  autoRelevance,
  singleView,
  onClick,
}: {
  feed: CameraFeed;
  streamMode: "live" | "snapshot";
  autoRelevance: boolean;
  singleView: boolean;
  onClick: () => void;
}) {
  const effectiveProtocol: StreamProtocol = streamMode === "snapshot" ? "snapshot" : feed.streamProtocol || "snapshot";
  const effectiveUrl = streamMode === "snapshot" ? undefined : feed.streamUrl;

  return (
    <div className={cn(
      "group relative",
      autoRelevance && feed.status === "online" && "ring-1 ring-primary/20",
      singleView && "aspect-video",
      !singleView && "aspect-video",
    )}>
      <LiveStream
        cameraSerial={feed.serial}
        cameraName={`${feed.id} · ${feed.name}`}
        location={feed.location}
        streamUrl={effectiveUrl}
        protocol={effectiveProtocol}
        fallbackSnapshotUrl={feed.snapshotUrl}
        demoImageUrl={feed.imageUrl}
        status={feed.status}
        onClick={onClick}
        className="absolute inset-0"
      />

      {/* AI badge */}
      {feed.hasAI && feed.status === "online" && (
        <div className="absolute top-7 right-2 z-30 flex gap-1">
          <span className="rounded bg-primary/80 px-1 py-0.5 text-[8px] font-bold text-primary-foreground">
            AI
          </span>
          {feed.hasFace && (
            <span className="rounded bg-purple-500/80 px-1 py-0.5 text-[8px] font-bold text-white">
              FACE
            </span>
          )}
          {feed.recording && (
            <span className="rounded bg-red-500/80 px-1 py-0.5 text-[8px] font-bold text-white flex items-center gap-0.5">
              <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> REC
            </span>
          )}
        </div>
      )}

      {/* Channel + IP info (bottom-left, below stream overlay) */}
      <div className="absolute bottom-7 left-2 z-30 flex flex-col gap-0.5">
        <span className="text-[8px] font-mono text-white/60">{feed.ip}</span>
        <span className="text-[8px] font-mono text-white/40">{feed.type}</span>
      </div>
    </div>
  );
}
