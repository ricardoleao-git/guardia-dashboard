import { Camera, User, Car, AlertTriangle, Activity, Clock, Eye } from "lucide-react";
import { CameraEvent } from "@/lib/types";
import { operatorLabels, operatorColors } from "@/lib/mock-data";
import { timeAgo, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface EventCardProps {
  event: CameraEvent;
  onClick: (event: CameraEvent) => void;
}

const operatorIcons: Record<string, typeof User> = {
  FaceReco: User,
  AccessControl: Eye,
  VehicleReco: Car,
  MotionDetection: Activity,
  Alarm: AlertTriangle,
  Heartbeat: Activity,
};

export default function EventCard({ event, onClick }: EventCardProps) {
  const Icon = operatorIcons[event.operator] || Activity;
  const label = operatorLabels[event.operator] || event.operator;
  const colorClass = operatorColors[event.operator] || "bg-gray-100 text-gray-700 border-gray-200";
  const thumbnail = event.media_urls?.CaptureImage;
  const personName = event.payload?.data?.name;
  const matchScore = event.payload?.data?.matchScore;
  const plate = event.payload?.data?.plate;
  const direction = event.payload?.data?.direction === "entry" ? "Entrada" : "Saída";

  return (
    <button
      onClick={() => onClick(event)}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-all duration-150 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 active:scale-[0.98]"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt="Capture"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Camera className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}
        {/* Operator badge */}
        <div className="absolute top-2 left-2">
          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold backdrop-blur-sm", colorClass)}>
            <Icon className="h-3 w-3" />
            {label}
          </span>
        </div>
        {/* Direction badge */}
        <div className="absolute top-2 right-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
            {direction}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-3">
        {/* Person/Plate info */}
        {personName && (
          <div className="flex items-center justify-between">
            <span className="font-display text-sm font-semibold truncate">{personName}</span>
            {matchScore && (
              <span className="font-mono-tech text-xs text-green-600 font-medium">
                {matchScore}% match
              </span>
            )}
          </div>
        )}
        {plate && (
          <div className="flex items-center justify-between">
            <span className="font-mono-tech text-sm font-semibold tracking-wider">{plate}</span>
          </div>
        )}

        {/* Camera serial + time */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono-tech">{event.camera_serial}</span>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{timeAgo(event.timestamp)}</span>
          </div>
        </div>

        {/* Full timestamp on hover */}
        <div className="text-[10px] text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity">
          {formatDateTime(event.timestamp)}
        </div>
      </div>
    </button>
  );
}
