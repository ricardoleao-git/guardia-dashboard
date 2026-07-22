/**
 * LiveStream — Componente de streaming ao vivo para câmeras IP.
 *
 * Design Philosophy: NVR Dark Theme — fundo #0b0f19, overlay semi-transparente,
 * indicador LIVE vermelho pulsante, timestamp em fonte monospace.
 *
 * Suporta 3 modos de transporte:
 * 1. WebRTC (latência ~200ms) — preferencial quando backend MediaServer disponível
 * 2. HLS via m3u8 (latência ~3-5s) — compatível com maioria dos browsers
 * 3. MJPEG stream (latência ~1s) — fallback via HTTP multipart
 *
 * Em modo demo (sem streamUrl), mostra snapshot estático com simulação de movimento.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, RefreshCw, AlertCircle, Maximize2, Video, VideoOff, Loader2, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export type StreamProtocol = "webrtc" | "hls" | "mjpeg" | "snapshot";

interface LiveStreamProps {
  cameraSerial: string;
  cameraName: string;
  location?: string;
  /** URL do stream — formato depende do protocolo:
   *  - webrtc: wss://server/rtc/cameraId
   *  - hls: https://server/stream/cameraId.m3u8
   *  - mjpeg: http://camera-ip/cgi-bin/mjpeg/stream.cgi
   *  - snapshot: http://camera-ip/cgi-bin/snapshot.cgi
   */
  streamUrl?: string;
  protocol?: StreamProtocol;
  /** URL de fallback (snapshot HTTP) se o stream falhar */
  fallbackSnapshotUrl?: string;
  /** Imagem estática demo */
  demoImageUrl?: string;
  /** Intervalo de refresh para snapshot (segundos) */
  refreshInterval?: number;
  /** Status da câmera */
  status?: "online" | "offline";
  onClick?: () => void;
  onStreamError?: (error: string) => void;
  className?: string;
}

export default function LiveStream({
  cameraSerial,
  cameraName,
  location,
  streamUrl,
  protocol = "webrtc",
  fallbackSnapshotUrl,
  demoImageUrl,
  refreshInterval = 10,
  status = "online",
  onClick,
  onStreamError,
  className,
}: LiveStreamProps) {
  const [activeProtocol, setActiveProtocol] = useState<StreamProtocol>(protocol);
  const [streamState, setStreamState] = useState<"connecting" | "live" | "error" | "demo">("connecting");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [snapshotSrc, setSnapshotSrc] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hlsRef = useRef<any>(null);

  // --- WebRTC connection ---
  const connectWebRTC = useCallback(async () => {
    if (!streamUrl || !streamUrl.startsWith("ws")) {
      setStreamState("error");
      return;
    }

    try {
      setStreamState("connecting");

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          setStreamState("live");
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setStreamState("error");
          onStreamError?.("WebRTC connection lost");
          tryFallback();
        }
      };

      // Add transceiver for video (recvonly)
      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });

      const ws = new WebSocket(streamUrl);

      ws.onopen = async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify({ type: "offer", sdp: offer.sdp }));
      };

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "answer") {
          await pc.setRemoteDescription({ type: "answer", sdp: data.sdp });
        } else if (data.type === "ice") {
          await pc.addIceCandidate({ candidate: data.candidate });
        }
      };

      ws.onerror = () => {
        setStreamState("error");
        onStreamError?.("WebSocket error");
        tryFallback();
      };
    } catch (err) {
      setStreamState("error");
      onStreamError?.(String(err));
      tryFallback();
    }
  }, [streamUrl]);

  // --- HLS connection ---
  const connectHLS = useCallback(async () => {
    if (!streamUrl || !streamUrl.endsWith(".m3u8")) {
      setStreamState("error");
      return;
    }

    try {
      setStreamState("connecting");

      // Check if browser supports HLS natively (Safari)
      if (videoRef.current && videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
        videoRef.current.src = streamUrl;
        videoRef.current.play();
        setStreamState("live");
        return;
      }

      // Use hls.js if available (loaded dynamically via CDN or npm)
      const HlsLib = (window as any).Hls;
      if (HlsLib && HlsLib.isSupported()) {
        const hls = new HlsLib({ liveDurationInfinity: true, lowLatencyMode: true });
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(videoRef.current!);
        hls.on(HlsLib.Events.MANIFEST_PARSED, () => {
          videoRef.current?.play();
          setStreamState("live");
        });
        hls.on(HlsLib.Events.ERROR, (_event: any, data: any) => {
          if (data.fatal) {
            setStreamState("error");
            onStreamError?.("HLS fatal error");
            tryFallback();
          }
        });
      } else {
        // No HLS support — fallback to snapshot
        setStreamState("error");
        tryFallback();
      }
    } catch (err) {
      setStreamState("error");
      onStreamError?.(String(err));
      tryFallback();
    }
  }, [streamUrl]);

  // --- MJPEG stream ---
  const connectMJPEG = useCallback(() => {
    if (!streamUrl) {
      setStreamState("error");
      return;
    }

    setStreamState("connecting");

    // MJPEG is just an <img> with a streaming src
    if (imgRef.current) {
      imgRef.current.src = `${streamUrl}?t=${Date.now()}`;
      setStreamState("live");
    }
  }, [streamUrl]);

  // --- Snapshot fallback ---
  const fetchSnapshot = useCallback(() => {
    const url = fallbackSnapshotUrl || demoImageUrl;
    if (!url) {
      setStreamState("demo");
      return;
    }

    const snapshotUrl = fallbackSnapshotUrl
      ? `${fallbackSnapshotUrl}?t=${Date.now()}`
      : url;

    const img = new Image();
    img.onload = () => {
      setSnapshotSrc(snapshotUrl);
      setStreamState("live");
      setLastRefresh(new Date());
    };
    img.onerror = () => {
      setStreamState("demo");
    };
    img.src = snapshotUrl;
  }, [fallbackSnapshotUrl, demoImageUrl]);

  // --- Try fallback protocol ---
  const tryFallback = useCallback(() => {
    if (fallbackSnapshotUrl) {
      setActiveProtocol("snapshot");
      fetchSnapshot();
    } else if (demoImageUrl) {
      setSnapshotSrc(demoImageUrl);
      setStreamState("demo");
    } else {
      setStreamState("demo");
    }
  }, [fallbackSnapshotUrl, demoImageUrl, fetchSnapshot]);

  // --- Connect based on protocol ---
  useEffect(() => {
    if (status === "offline") {
      setStreamState("error");
      return;
    }

    if (!streamUrl && !fallbackSnapshotUrl && !demoImageUrl) {
      setStreamState("demo");
      return;
    }

    // If no streamUrl but we have snapshot/demo, go straight to fallback
    if (!streamUrl) {
      tryFallback();
      return;
    }

    setStreamState("connecting");

    if (activeProtocol === "webrtc") {
      connectWebRTC();
    } else if (activeProtocol === "hls") {
      connectHLS();
    } else if (activeProtocol === "mjpeg") {
      connectMJPEG();
    } else {
      fetchSnapshot();
    }

    // Cleanup
    return () => {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [streamUrl, activeProtocol, status]);

  // --- Snapshot refresh interval ---
  useEffect(() => {
    if (activeProtocol === "snapshot" && fallbackSnapshotUrl && refreshInterval > 0) {
      intervalRef.current = setInterval(fetchSnapshot, refreshInterval * 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeProtocol, fallbackSnapshotUrl, refreshInterval, fetchSnapshot]);

  // --- Render ---
  if (status === "offline") {
    return (
      <div className={cn("relative aspect-video overflow-hidden rounded-lg bg-black", className)}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <VideoOff className="h-8 w-8 text-red-400/50" />
          <p className="text-[10px] text-red-400/70 font-mono-tech font-bold">SEM SINAL</p>
          <p className="text-[8px] text-white/30 font-mono-tech">{cameraSerial}</p>
        </div>
        <StreamOverlay cameraName={cameraName} cameraSerial={cameraSerial} location={location} status="offline" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative aspect-video overflow-hidden rounded-lg bg-black cursor-pointer scanline",
        "ring-1 ring-border hover:ring-primary/50 transition-all duration-150",
        className
      )}
      onClick={onClick}
    >
      {/* Video element for WebRTC/HLS */}
      {(activeProtocol === "webrtc" || activeProtocol === "hls") && streamState !== "demo" && (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* Image element for MJPEG */}
      {activeProtocol === "mjpeg" && streamState === "live" && (
        <img
          ref={imgRef}
          alt={cameraName}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* Snapshot image */}
      {(activeProtocol === "snapshot" || streamState === "demo") && snapshotSrc && (
        <img
          src={snapshotSrc}
          alt={cameraName}
          className="absolute inset-0 h-full w-full object-cover opacity-90 group-hover:opacity-95 transition-opacity"
        />
      )}

      {/* Demo placeholder */}
      {streamState === "demo" && !snapshotSrc && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-card to-black gap-2">
          <Camera className="h-6 w-6 text-white/20" />
          <p className="text-[10px] text-white/30 font-mono-tech">{cameraSerial}</p>
          <p className="text-[8px] text-white/20">Aguardando stream</p>
        </div>
      )}

      {/* Connecting state */}
      {streamState === "connecting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-2 z-10">
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
          <p className="text-[10px] text-white/50 font-mono-tech">Conectando...</p>
          <ProtocolBadge protocol={activeProtocol} />
        </div>
      )}

      {/* Error state (non-fatal, showing fallback) */}
      {streamState === "error" && !snapshotSrc && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-2 z-10">
          <AlertCircle className="h-5 w-5 text-amber-400" />
          <p className="text-[10px] text-white/50">Stream indisponível</p>
          {fallbackSnapshotUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveProtocol("snapshot");
                fetchSnapshot();
              }}
              className="rounded bg-primary/80 px-2 py-1 text-[9px] text-white hover:bg-primary transition-colors"
            >
              Usar snapshot
            </button>
          )}
        </div>
      )}

      {/* Scanline effect for live video */}
      {streamState === "live" && (activeProtocol === "webrtc" || activeProtocol === "hls") && (
        <div className="absolute inset-0 pointer-events-none scanline-overlay" />
      )}

      {/* Top overlay: LIVE indicator + protocol */}
      <div className="absolute top-0 left-0 right-0 camera-overlay px-2 py-1.5 flex items-center justify-between z-20">
        <div className="flex items-center gap-1.5">
          {streamState === "live" ? (
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-red-500 live-dot" />
              <span className="text-[10px] font-mono-tech text-white font-bold">LIVE</span>
            </div>
          ) : streamState === "connecting" ? (
            <span className="text-[10px] font-mono-tech text-amber-400 font-bold">CONNECT</span>
          ) : (
            <span className="text-[10px] font-mono-tech text-white/50 font-bold">SNAP</span>
          )}
          <span className="text-[10px] font-mono-tech text-white/80 ml-1">{cameraSerial}</span>
        </div>
        <ProtocolBadge protocol={activeProtocol} compact />
      </div>

      {/* Bottom overlay: camera name + timestamp */}
      <div className="absolute bottom-0 left-0 right-0 camera-overlay px-2 py-1.5 z-20">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-white truncate">{cameraName}</span>
          <span className="text-[9px] font-mono-tech text-white/70">
            {lastRefresh.toLocaleTimeString("pt-BR")}
          </span>
        </div>
        {location && (
          <p className="text-[8px] text-white/50 truncate font-mono-tech">{location}</p>
        )}
      </div>

      {/* Hover controls */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-black/30 z-30">
        <div className="flex items-center gap-2">
          {onClick && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/80">
              <Maximize2 className="h-4 w-4 text-white" />
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Cycle through protocols
              const protocols: StreamProtocol[] = ["webrtc", "hls", "mjpeg", "snapshot"];
              const next = protocols[(protocols.indexOf(activeProtocol) + 1) % protocols.length];
              setActiveProtocol(next);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 hover:bg-black/80 transition-colors"
            title="Trocar protocolo"
          >
            <Radio className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Protocol Badge ---
function ProtocolBadge({ protocol, compact }: { protocol: StreamProtocol; compact?: boolean }) {
  const labels: Record<StreamProtocol, { text: string; color: string }> = {
    webrtc: { text: "WebRTC", color: "bg-green-500/80" },
    hls: { text: "HLS", color: "bg-blue-500/80" },
    mjpeg: { text: "MJPEG", color: "bg-amber-500/80" },
    snapshot: { text: "SNAP", color: "bg-gray-500/80" },
  };

  const { text, color } = labels[protocol];

  return (
    <span className={cn("rounded px-1 py-0.5 text-[8px] font-bold text-white", color)}>
      {text}
    </span>
  );
}

// --- Stream Overlay (for offline cameras) ---
function StreamOverlay({
  cameraName,
  cameraSerial,
  location,
  status,
}: {
  cameraName: string;
  cameraSerial: string;
  location?: string;
  status: "online" | "offline";
}) {
  return (
    <div className="absolute top-0 left-0 right-0 camera-overlay px-2 py-1.5 flex items-center justify-between z-20">
      <span className="text-[10px] font-mono-tech text-red-400 font-bold">OFFLINE</span>
      <span className="text-[10px] font-mono-tech text-white/50">{cameraSerial}</span>
    </div>
  );
}
