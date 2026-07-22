import { useState, useRef, useCallback, useEffect } from "react";
import { X, Camera, User, Car, Clock, Hash, ArrowLeftRight, ZoomIn, ZoomOut, Download, RotateCcw, Maximize2, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
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
import AnnotationOverlay, { Annotation } from "@/components/AnnotationOverlay";

interface ImageViewerProps {
  event: CameraEvent | null;
  open: boolean;
  onClose: () => void;
}

interface ImageEntry {
  key: string;
  label: string;
  url: string;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;

export default function ImageViewer({ event, open, onClose }: ImageViewerProps) {
  // Estado de zoom e pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [drawMode, setDrawMode] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [imageRenderSize, setImageRenderSize] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset estado quando o modal fecha ou muda de evento
  useEffect(() => {
    if (!open) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setActiveImageIdx(0);
      setDrawMode(false);
      setAnnotations([]);
    }
  }, [open]);

  // Atualiza dimenões renderizadas da imagem para o overlay
  useEffect(() => {
    const updateSize = () => {
      const img = imgRef.current;
      const container = imageContainerRef.current;
      if (!img || !container) return;
      const imgRect = img.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      setImageRenderSize({
        width: imgRect.width / zoom,
        height: imgRect.height / zoom,
        offsetX: imgRect.left - containerRect.left,
        offsetY: imgRect.top - containerRect.top,
      });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [zoom, pan, activeImageIdx, open]);

  // Reset zoom quando troca de imagem
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [activeImageIdx]);

  if (!event) return null;

  const label = operatorLabels[event.operator] || event.operator;
  const colorClass = operatorColors[event.operator] || "bg-gray-100 text-gray-700 border-gray-200";
  const personName = event.payload?.data?.name;
  const matchScore = event.payload?.data?.matchScore;
  const plate = event.payload?.data?.plate;
  const direction = event.payload?.data?.direction === "entry" ? "Entrada" : "Saída";

  // Coleta todas as imagens disponíveis no evento
  const images: ImageEntry[] = [];
  if (event.media_urls) {
    const labelMap: Record<string, string> = {
      CaptureImage: "Captura",
      recognizeImage: "Rosto Cadastrado",
      BkgImage: "Fundo",
    };
    for (const [key, url] of Object.entries(event.media_urls)) {
      if (url) {
        images.push({ key, label: labelMap[key] || key, url });
      }
    }
  }

  const activeImage = images[activeImageIdx];

  // Handlers de zoom
  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(z + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(z => {
      const newZoom = Math.max(z - ZOOM_STEP, MIN_ZOOM);
      if (newZoom === 1) setPan({ x: 0, y: 0 });
      return newZoom;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Double-click para zoom
  const handleDoubleClick = useCallback(() => {
    if (zoom === 1) {
      setZoom(2);
    } else {
      handleResetZoom();
    }
  }, [zoom, handleResetZoom]);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom(z => Math.min(z + ZOOM_STEP, MAX_ZOOM));
    } else {
      setZoom(z => {
        const newZoom = Math.max(z - ZOOM_STEP, MIN_ZOOM);
        if (newZoom === 1) setPan({ x: 0, y: 0 });
        return newZoom;
      });
    }
  }, []);

  // Pan handlers (arrastar a imagem com zoom) — desativado em drawMode
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (drawMode || zoom <= 1) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Touch handlers para mobile — desativado em drawMode
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (drawMode || zoom <= 1) return;
    const touch = e.touches[0];
    panStart.current = { x: touch.clientX, y: touch.clientY, panX: pan.x, panY: pan.y };
    setIsPanning(true);
  }, [zoom, pan]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPanning) return;
    const touch = e.touches[0];
    const dx = touch.clientX - panStart.current.x;
    const dy = touch.clientY - panStart.current.y;
    setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
  }, [isPanning]);

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Download da imagem ativa
  const handleDownload = useCallback(async () => {
    if (!activeImage) return;
    try {
      const response = await fetch(activeImage.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `guardia_${event.event_id}_${activeImage.key}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: abre em nova aba
      window.open(activeImage.url, "_blank");
    }
  }, [activeImage, event.event_id]);

  // Navegação entre imagens
  const handlePrevImage = () => {
    setActiveImageIdx(i => (i > 0 ? i - 1 : images.length - 1));
  };
  const handleNextImage = () => {
    setActiveImageIdx(i => (i < images.length - 1 ? i + 1 : 0));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Detalhes do Evento {event.event_id}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row max-h-[90vh]">
          {/* Image section with zoom/pan controls */}
          <div className="relative flex-1 bg-neutral-950 min-h-[300px] flex flex-col">
            {/* Toolbar superior */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/70 to-transparent">
              {/* Operator badge */}
              <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold", colorClass)}>
                {label}
              </span>

              {/* Zoom controls */}
              <div className="flex items-center gap-1 rounded-lg bg-black/60 backdrop-blur-sm p-1">
                <ToolbarButton onClick={handleZoomOut} disabled={zoom <= MIN_ZOOM} title="Diminuir zoom">
                  <ZoomOut className="h-4 w-4" />
                </ToolbarButton>
                <span className="text-white text-xs font-mono-tech px-1 min-w-[42px] text-center select-none">
                  {Math.round(zoom * 100)}%
                </span>
                <ToolbarButton onClick={handleZoomIn} disabled={zoom >= MAX_ZOOM} title="Aumentar zoom">
                  <ZoomIn className="h-4 w-4" />
                </ToolbarButton>
                <div className="w-px h-5 bg-white/20 mx-0.5" />
                <ToolbarButton onClick={handleResetZoom} disabled={zoom === 1} title="Resetar zoom">
                  <RotateCcw className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton onClick={handleDownload} disabled={!activeImage} title="Baixar imagem">
                  <Download className="h-4 w-4" />
                </ToolbarButton>
                <div className="w-px h-5 bg-white/20 mx-0.5" />
                <ToolbarButton
                  onClick={() => setDrawMode(!drawMode)}
                  active={drawMode}
                  title={drawMode ? "Sair do modo anotação" : "Anotar imagem"}
                >
                  <Pencil className="h-4 w-4" />
                </ToolbarButton>
                <div className="w-px h-5 bg-white/20 mx-0.5" />
                <ToolbarButton onClick={onClose} title="Fechar">
                  <X className="h-4 w-4" />
                </ToolbarButton>
              </div>
            </div>

            {/* Image container com zoom e pan */}
            <div
              ref={imageContainerRef}
              className="flex-1 overflow-hidden flex items-center justify-center relative select-none"
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onDoubleClick={handleDoubleClick}
              style={{ cursor: zoom > 1 ? (isPanning ? "grabbing" : "grab") : "default" }}
            >
              {activeImage ? (
                <div className="relative" style={{ display: "inline-block" }}>
                  <img
                    ref={imgRef}
                    src={activeImage.url}
                    alt={activeImage.label}
                    draggable={false}
                    className="max-w-full max-h-full object-contain transition-transform duration-100 ease-out"
                    style={{
                      transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                      transformOrigin: "center center",
                    }}
                  />
                  {drawMode && imageRenderSize.width > 0 && (
                    <AnnotationOverlay
                      imageWidth={imageRenderSize.width}
                      imageHeight={imageRenderSize.height}
                      imageOffsetX={imageRenderSize.offsetX}
                      imageOffsetY={imageRenderSize.offsetY}
                      zoom={zoom}
                      panX={pan.x}
                      panY={pan.y}
                      annotations={annotations}
                      onAnnotationsChange={setAnnotations}
                      drawMode={drawMode}
                    />
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-white/30">
                  <Camera className="h-12 w-12 mb-2" />
                  <span className="text-sm">Sem imagem disponível</span>
                </div>
              )}
            </div>

            {/* Image gallery navigation (se houver múltiplas imagens) */}
            {images.length > 1 && (
              <>
                {/* Nav arrows */}
                <button
                  onClick={handlePrevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors z-10"
                  title="Imagem anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors z-10"
                  title="Próxima imagem"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                {/* Thumbnail strip */}
                <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent">
                  {images.map((img, idx) => (
                    <button
                      key={img.key}
                      onClick={() => setActiveImageIdx(idx)}
                      className={cn(
                        "rounded-md overflow-hidden border-2 transition-all",
                        idx === activeImageIdx
                          ? "border-primary opacity-100 scale-105"
                          : "border-transparent opacity-60 hover:opacity-90"
                      )}
                      title={img.label}
                    >
                      <img src={img.url} alt={img.label} className="h-12 w-16 object-cover" />
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Label da imagem ativa */}
            {activeImage && images.length > 1 && (
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 rounded-full bg-black/60 px-3 py-1 text-xs text-white/80 backdrop-blur-sm">
                {activeImage.label} ({activeImageIdx + 1}/{images.length})
              </div>
            )}
          </div>

          {/* Details panel */}
          <div className="w-full md:w-80 flex flex-col bg-card overflow-y-auto max-h-[40vh] md:max-h-[90vh]">
            <div className="p-5 gap-4 flex flex-col">
              <div>
                <h3 className="font-display text-lg font-bold mb-1">
                  {personName || plate || "Evento Detectado"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {direction} — {formatDateTime(event.timestamp)}
                </p>
              </div>

              {/* Match score */}
              {matchScore != null && (
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

              {/* Annotations summary */}
              {annotations.length > 0 && (
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Anotações ({annotations.length})
                    </h4>
                    <button
                      onClick={() => setAnnotations([])}
                      className="text-xs text-destructive hover:underline"
                    >
                      Limpar
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {annotations.map((ann, i) => (
                      <div key={ann.id} className="flex items-center gap-2 text-xs">
                        <div
                          className="h-3 w-3 rounded-sm shrink-0"
                          style={{
                            backgroundColor:
                              ann.color === "red" ? "#ef4444" :
                              ann.color === "green" ? "#22c55e" :
                              ann.color === "blue" ? "#3b82f6" :
                              ann.color === "yellow" ? "#eab308" : "#a855f7",
                          }}
                        />
                        <span className="text-muted-foreground">{ann.label || `Anotação ${i + 1}`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ToolbarButton({ children, onClick, disabled, active, title }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean; title: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md text-white transition-all",
        disabled
          ? "opacity-40 cursor-not-allowed"
          : active
            ? "bg-white/25 active:scale-90"
            : "hover:bg-white/20 active:scale-90"
      )}
    >
      {children}
    </button>
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
