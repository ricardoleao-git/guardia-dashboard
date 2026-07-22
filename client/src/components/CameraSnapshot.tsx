import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, RefreshCw, AlertCircle, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CameraSnapshotProps {
  cameraSerial: string;
  cameraName: string;
  location?: string;
  // HTTP snapshot URL pattern — e.g. http://192.168.1.100/cgi-bin/snapshot.cgi
  snapshotUrl?: string;
  // Refresh interval in seconds (0 = manual only)
  refreshInterval?: number;
  onClick?: () => void;
  className?: string;
}

/**
 * CameraSnapshot — displays a live snapshot from an IP camera via HTTP.
 *
 * Uses the camera's HTTP snapshot endpoint to fetch JPEG images.
 * When Supabase is configured, the snapshot URL can be stored in the
 * camera_events table or a dedicated cameras table.
 *
 * In demo mode (no snapshotUrl), shows a placeholder with camera info.
 */
export default function CameraSnapshot({
  cameraSerial,
  cameraName,
  location,
  snapshotUrl,
  refreshInterval = 10,
  onClick,
  className,
}: CameraSnapshotProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSnapshot = useCallback(() => {
    if (!snapshotUrl) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);

    // Add cache-buster to force fresh image
    const url = `${snapshotUrl}?t=${Date.now()}`;
    const img = new Image();

    img.onload = () => {
      setImgSrc(url);
      setLoading(false);
      setError(false);
      setLastRefresh(new Date());
    };

    img.onerror = () => {
      setLoading(false);
      setError(true);
    };

    img.src = url;
  }, [snapshotUrl]);

  useEffect(() => {
    fetchSnapshot();

    if (refreshInterval > 0 && snapshotUrl) {
      intervalRef.current = setInterval(fetchSnapshot, refreshInterval * 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchSnapshot, refreshInterval, snapshotUrl]);

  return (
    <div
      className={cn(
        "group relative aspect-video overflow-hidden rounded-lg border border-border bg-black cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {/* Snapshot image */}
      {imgSrc && !error && (
        <img
          src={imgSrc}
          alt={cameraName}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      )}

      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <RefreshCw className="h-5 w-5 text-white/50 animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-2">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <p className="text-[10px] text-white/50">Falha ao conectar</p>
        </div>
      )}

      {/* Demo placeholder (no snapshotUrl) */}
      {!snapshotUrl && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Camera className="h-6 w-6 text-white/20" />
          <p className="text-[10px] text-white/30 font-mono">{cameraSerial}</p>
        </div>
      )}

      {/* Overlay info bar */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-white truncate">{cameraName}</p>
            {location && (
              <p className="text-[10px] text-white/60 truncate">{location}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* LIVE indicator */}
            <span className="flex items-center gap-1 text-[9px] font-bold text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
            {/* Refresh button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                fetchSnapshot();
              }}
              className="rounded p-1 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Atualizar snapshot"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
            {/* Expand button */}
            {onClick && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
                className="rounded p-1 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Expandir"
              >
                <Maximize2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Timestamp overlay (top-right) */}
      {imgSrc && !error && (
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5">
          <p className="text-[9px] text-white/80 font-mono">
            {lastRefresh.toLocaleTimeString("pt-BR")}
          </p>
        </div>
      )}
    </div>
  );
}
