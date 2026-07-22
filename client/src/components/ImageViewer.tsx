import { X, Camera, User, Car, Clock, Hash, ArrowLeftRight } from "lucide-react";
import { CameraEvent } from "@/lib/types";
import { operatorLabels, operatorColors } from "@/lib/mock-data";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ImageViewerProps {
  event: CameraEvent | null;
  open: boolean;
  onClose: () => void;
}

export default function ImageViewer({ event, open, onClose }: ImageViewerProps) {
  if (!event) return null;

  const label = operatorLabels[event.operator] || event.operator;
  const colorClass = operatorColors[event.operator] || "bg-gray-100 text-gray-700 border-gray-200";
  const captureImg = event.media_urls?.CaptureImage;
  const recoImg = event.media_urls?.recognizeImage;
  const personName = event.payload?.data?.name;
  const matchScore = event.payload?.data?.matchScore;
  const plate = event.payload?.data?.plate;
  const direction = event.payload?.data?.direction === "entry" ? "Entrada" : "Saída";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Detalhes do Evento {event.event_id}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row">
          {/* Image section */}
          <div className="relative flex-1 bg-black/95 min-h-[300px]">
            {captureImg ? (
              <img
                src={captureImg}
                alt="Capture"
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full min-h-[300px] items-center justify-center">
                <Camera className="h-12 w-12 text-white/30" />
              </div>
            )}
            {/* Close button overlay */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
            >
              <X className="h-4 w-4" />
            </button>
            {/* Operator badge overlay */}
            <div className="absolute top-3 left-3">
              <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold", colorClass)}>
                {label}
              </span>
            </div>
          </div>

          {/* Details panel */}
          <div className="w-full md:w-80 flex flex-col bg-card p-5 gap-4">
            <div>
              <h3 className="font-display text-lg font-bold mb-1">
                {personName || plate || "Evento Detectado"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {direction} — {formatDateTime(event.timestamp)}
              </p>
            </div>

            {/* Match score */}
            {matchScore && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-green-700">Score de Match</span>
                  <span className="font-mono-tech text-sm font-bold text-green-700">{matchScore}%</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-green-200 overflow-hidden">
                  <div className="h-full rounded-full bg-green-500" style={{ width: `${matchScore}%` }} />
                </div>
              </div>
            )}

            {/* Recognize image */}
            {recoImg && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Rosto Cadastrado</p>
                <img
                  src={recoImg}
                  alt="Recognize"
                  className="w-24 h-24 rounded-lg object-cover border border-border"
                />
              </div>
            )}

            {/* Technical details */}
            <div className="space-y-2 border-t border-border pt-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dados Técnicos</h4>

              <DetailRow icon={Hash} label="Event ID" value={event.event_id} mono />
              <DetailRow icon={Camera} label="Câmera" value={event.camera_serial} mono />
              <DetailRow icon={Clock} label="Timestamp" value={formatDateTime(event.timestamp)} />
              {plate && <DetailRow icon={Car} label="Placa" value={plate} mono />}
              {personName && <DetailRow icon={User} label="Pessoa" value={personName} />}
              <DetailRow icon={ArrowLeftRight} label="Direção" value={direction} />
            </div>

            {/* Raw payload */}
            <details className="border-t border-border pt-3">
              <summary className="cursor-pointer text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Payload JSON
              </summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-muted p-3 text-[11px] font-mono-tech">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ icon: Icon, label, value, mono }: { icon: typeof User; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <span className={cn("font-medium text-foreground", mono && "font-mono-tech text-xs")}>
        {value}
      </span>
    </div>
  );
}
