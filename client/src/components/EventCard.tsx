/**
 * EventCard — Card de evento com match facial detalhado.
 *
 * Design: duas miniaturas (capturada/cadastrada), barra de score,
 * lista colorida (Branca=verde, Negra=vermelho, Estranho=âmbar),
 * atributos (gênero/idade/óculos/máscara), botões Ver vídeo/Perfil.
 *
 * Dados: bancada real (spec 05) — eventos com cameraLabel, faceList, score.
 */
import { Camera, User, Car, AlertTriangle, Activity, Clock, Eye, Video, UserCircle, Glasses } from "lucide-react";
import { CameraEvent } from "@/lib/types";
import { operatorLabels, operatorColors } from "@/lib/mock-data";
import { timeAgo, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";

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

// Cores das listas faciais
const listColors: Record<string, { bg: string; text: string; border: string; label: string }> = {
  "Lista Branca": { bg: "bg-green-500/15", text: "text-green-400", border: "border-green-500/30", label: "Lista Branca" },
  "Lista Negra": { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30", label: "Lista Negra" },
  "Estranho": { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30", label: "Estranho" },
};

export default function EventCard({ event, onClick }: EventCardProps) {
  const { t } = useI18n();
  const Icon = operatorIcons[event.operator] || Activity;
  const label = operatorLabels[event.operator] || event.operator;
  const colorClass = operatorColors[event.operator] || "bg-gray-100 text-gray-700 border-gray-200";

  const data = event.payload?.data;
  const info = event.payload?.info;
  const isFacial = event.operator === "FaceReco";

  const captureImg = event.media_urls?.CaptureImage;
  const registeredImg = event.media_urls?.recognizeImage;
  const personName = data?.name;
  const matchScore = data?.matchScore;
  const faceList = data?.faceList;
  const initials = data?.initials;
  const gender = data?.gender;
  const age = data?.age;
  const hasGlasses = data?.glasses;
  const hasMask = data?.mask;
  const plate = data?.plate;
  const direction = data?.direction === "entry" ? t("freq.entry") : t("freq.exit");
  const cameraLabel = info?.cameraLabel || event.camera_serial;

  const listStyle = faceList ? listColors[faceList] : null;
  const scoreColor = matchScore !== null && matchScore !== undefined
    ? matchScore >= 80 ? "bg-green-500"
    : matchScore >= 50 ? "bg-amber-500"
    : "bg-red-500"
    : null;

  return (
    <button
      onClick={() => onClick(event)}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-all duration-150 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 active:scale-[0.98]"
    >
      {/* Dual thumbnails (facial) or single (other) */}
      {isFacial ? (
        <div className="relative flex aspect-[4/3] gap-px bg-muted">
          {/* Captured image */}
          <div className="relative flex-1 overflow-hidden">
            {captureImg ? (
              <img
                src={captureImg}
                alt="Captura"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <Camera className="h-6 w-6 text-muted-foreground/40" />
              </div>
            )}
            <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 py-0.5 text-[8px] font-medium text-white/80 backdrop-blur-sm">
              {t("event.capture")}
            </span>
          </div>

          {/* Registered image or placeholder */}
          <div className="relative flex-1 overflow-hidden">
            {registeredImg ? (
              <img
                src={registeredImg}
                alt="Cadastro"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                <div className="flex flex-col items-center gap-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted-foreground/10 text-sm font-bold text-muted-foreground/60">
                    {initials || "?"}
                  </div>
                  <span className="text-[8px] text-muted-foreground/50">
                    {faceList === "Estranho" ? t("event.stranger") : "Placeholder"}
                  </span>
                </div>
              </div>
            )}
            <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 py-0.5 text-[8px] font-medium text-white/80 backdrop-blur-sm">
              {t("event.registration")}
            </span>
          </div>

          {/* Operator badge */}
          <div className="absolute top-1.5 left-1.5 z-10">
            <span className={cn("inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold backdrop-blur-sm", colorClass)}>
              <Icon className="h-2.5 w-2.5" />
              {label}
            </span>
          </div>

          {/* Direction badge */}
          <div className="absolute top-1.5 right-1.5 z-10">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              {direction}
            </span>
          </div>
        </div>
      ) : (
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {captureImg ? (
            <img
              src={captureImg}
              alt="Capture"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Camera className="h-8 w-8 text-muted-foreground/40" />
            </div>
          )}
          <div className="absolute top-2 left-2">
            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold backdrop-blur-sm", colorClass)}>
              <Icon className="h-3 w-3" />
              {label}
            </span>
          </div>
          <div className="absolute top-2 right-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
              {direction}
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col gap-2 p-3">
        {/* Person name + match score bar */}
        {isFacial && (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="font-display text-sm font-semibold truncate">
                {personName || t("event.stranger")}
              </span>
              {matchScore !== null && matchScore !== undefined && (
                <span className={cn(
                  "font-mono-tech text-xs font-bold",
                  matchScore >= 80 ? "text-green-400" : matchScore >= 50 ? "text-amber-400" : "text-red-400"
                )}>
                  {matchScore}%
                </span>
              )}
            </div>

            {/* Match score bar */}
            {scoreColor && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", scoreColor)}
                  style={{ width: `${matchScore}%` }}
                />
              </div>
            )}

            {/* Face list badge */}
            {listStyle && (
              <div>
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                  listStyle.bg, listStyle.text, listStyle.border
                )}>
                  <div className={cn("h-1.5 w-1.5 rounded-full", listStyle.text.replace("text-", "bg-"))} />
                  {listStyle.label}
                </span>
              </div>
            )}

            {/* Attributes */}
            <div className="flex flex-wrap gap-1">
              {gender && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {gender === "M" ? (t("event.gender") + ": M") : (t("event.gender") + ": F")}
                </span>
              )}
              {age && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  ~{age} {t("event.age")}
                </span>
              )}
              {hasGlasses && (
                <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <Glasses className="h-2.5 w-2.5" /> {t("event.glasses")}
                </span>
              )}
              {hasMask && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {t("event.mask")}
                </span>
              )}
            </div>
          </>
        )}

        {/* Vehicle info */}
        {plate && (
          <div className="flex items-center justify-between">
            <span className="font-mono-tech text-sm font-semibold tracking-wider">{plate}</span>
          </div>
        )}

        {/* Camera label + time */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-2 mt-1">
          <span className="font-mono-tech truncate">{cameraLabel}</span>
          <div className="flex items-center gap-1 shrink-0">
            <Clock className="h-3 w-3" />
            <span>{timeAgo(event.timestamp)}</span>
          </div>
        </div>

        {/* Action buttons (appear on hover) */}
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">
            <Video className="h-3 w-3" /> {t("event.view_video")}
          </span>
          {isFacial && personName && (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">
              <UserCircle className="h-3 w-3" /> {t("event.profile")}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
