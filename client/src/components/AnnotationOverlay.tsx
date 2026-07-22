import { useRef, useState, useCallback, useEffect } from "react";
import { Trash2, Eye, EyeOff, Pencil, Square, Circle, Highlighter, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AnnotationOverlay — Canvas overlay para anotar regiões de interesse em imagens.
 *
 * Suporta:
 * - Retângulos (para rostos, placas, áreas)
 * - Círculos (para pontos de interesse)
 * - Highlight (pincel livre)
 * - Cores por tipo de anotação
 * - Toggle de visibilidade
 * - Undo
 * - Limpar tudo
 * - Exportar anotações como JSON
 * - Sincroniza com zoom e pan do ImageViewer
 */

export type AnnotationType = "rect" | "circle" | "highlight";

export interface Annotation {
  id: string;
  type: AnnotationType;
  // Coordenadas normalizadas (0-1) em relação à imagem natural
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  label: string;
  // Pontos para highlight (pincel livre) — coordenadas normalizadas
  points?: { x: number; y: number }[];
}

export type AnnotationColor = "red" | "green" | "blue" | "yellow" | "purple";

const colorMap: Record<AnnotationColor, { stroke: string; fill: string; label: string }> = {
  red: { stroke: "#ef4444", fill: "rgba(239, 68, 68, 0.15)", label: "Rosto / Alerta" },
  green: { stroke: "#22c55e", fill: "rgba(34, 197, 94, 0.15)", label: "Match confirmado" },
  blue: { stroke: "#3b82f6", fill: "rgba(59, 130, 246, 0.15)", label: "Área de interesse" },
  yellow: { stroke: "#eab308", fill: "rgba(234, 179, 8, 0.15)", label: "Atenção" },
  purple: { stroke: "#a855f7", fill: "rgba(168, 85, 247, 0.15)", label: "Veículo / Placa" },
};

interface AnnotationOverlayProps {
  // Dimensões renderizadas da imagem na tela
  imageWidth: number;
  imageHeight: number;
  imageOffsetX: number;
  imageOffsetY: number;
  // Zoom e pan atuais do ImageViewer
  zoom: number;
  panX: number;
  panY: number;
  // Anotações
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
  // Modo de desenho ativo
  drawMode: boolean;
}

export default function AnnotationOverlay({
  imageWidth,
  imageHeight,
  imageOffsetX,
  imageOffsetY,
  zoom,
  panX,
  panY,
  annotations,
  onAnnotationsChange,
  drawMode,
}: AnnotationOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTool, setActiveTool] = useState<AnnotationType>("rect");
  const [activeColor, setActiveColor] = useState<AnnotationColor>("red");
  const [visible, setVisible] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [highlightPoints, setHighlightPoints] = useState<{ x: number; y: number }[]>([]);
  const drawStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [currentDraft, setCurrentDraft] = useState<Annotation | null>(null);

  // Redimensiona o canvas para cobrir a imagem
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = imageWidth * window.devicePixelRatio;
    canvas.height = imageHeight * window.devicePixelRatio;
    canvas.style.width = `${imageWidth}px`;
    canvas.style.height = `${imageHeight}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
  }, [imageWidth, imageHeight]);

  // Renderiza anotações + draft atual
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, imageWidth, imageHeight);

    if (!visible) return;

    const allAnnotations = currentDraft ? [...annotations, currentDraft] : annotations;

    for (const ann of allAnnotations) {
      const c = colorMap[ann.color as AnnotationColor] || colorMap.red;
      // Converte coords normalizadas (0-1) para pixels na tela
      const px = ann.x * imageWidth;
      const py = ann.y * imageHeight;
      const pw = ann.width * imageWidth;
      const ph = ann.height * imageHeight;

      ctx.strokeStyle = c.stroke;
      ctx.fillStyle = c.fill;
      ctx.lineWidth = 2;

      if (ann.type === "rect") {
        ctx.fillRect(px, py, pw, ph);
        ctx.strokeRect(px, py, pw, ph);
        // Label
        if (ann.label) {
          ctx.font = "11px system-ui, sans-serif";
          const textWidth = ctx.measureText(ann.label).width;
          ctx.fillStyle = c.stroke;
          ctx.fillRect(px, py - 18, textWidth + 10, 16);
          ctx.fillStyle = "#fff";
          ctx.fillText(ann.label, px + 5, py - 6);
        }
      } else if (ann.type === "circle") {
        const radius = Math.max(pw, ph) / 2;
        ctx.beginPath();
        ctx.arc(px + pw / 2, py + ph / 2, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (ann.type === "highlight") {
        // Highlight é desenhado durante o mouse move
        if (ann.points && ann.points.length > 1) {
          ctx.strokeStyle = c.stroke;
          ctx.lineWidth = 8;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          for (let i = 0; i < ann.points.length; i++) {
            const point = ann.points[i];
            const px = point.x * imageWidth;
            const py = point.y * imageHeight;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
      }
    }
  }, [annotations, currentDraft, visible, imageWidth, imageHeight]);

  // Converte coordenadas do mouse para coordenadas normalizadas na imagem
  const getNormalizedCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  }, []);

  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!drawMode) return;
    e.preventDefault();
    e.stopPropagation();
    const coords = getNormalizedCoords(e);
    drawStart.current = coords;
    setIsDrawing(true);

    if (activeTool === "highlight") {
      setHighlightPoints([coords]);
    }
  }, [drawMode, activeTool, getNormalizedCoords]);

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !drawMode) return;
    e.preventDefault();
    const coords = getNormalizedCoords(e);

    if (activeTool === "highlight") {
      setHighlightPoints(prev => [...prev, coords]);
      setCurrentDraft({
        id: "draft",
        type: "highlight",
        x: 0, y: 0, width: 0, height: 0,
        color: activeColor,
        label: "",
        points: [...highlightPoints, coords],
      });
    } else {
      const x = Math.min(drawStart.current.x, coords.x);
      const y = Math.min(drawStart.current.y, coords.y);
      const width = Math.abs(coords.x - drawStart.current.x);
      const height = Math.abs(coords.y - drawStart.current.y);
      setCurrentDraft({
        id: "draft",
        type: activeTool,
        x, y, width, height,
        color: activeColor,
        label: colorMap[activeColor].label,
      });
    }
  }, [isDrawing, drawMode, activeTool, activeColor, getNormalizedCoords, highlightPoints]);

  const handleEnd = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentDraft && (currentDraft.width > 0.01 || currentDraft.height > 0.01 || currentDraft.type === "highlight")) {
      const finalAnnotation: Annotation = {
        ...currentDraft,
        id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      };
      onAnnotationsChange([...annotations, finalAnnotation]);
    }
    setCurrentDraft(null);
    setHighlightPoints([]);
  }, [isDrawing, currentDraft, annotations, onAnnotationsChange]);

  const handleUndo = () => {
    onAnnotationsChange(annotations.slice(0, -1));
  };

  const handleClear = () => {
    onAnnotationsChange([]);
  };

  return (
    <>
      {/* Toolbar de anotações — aparece quando drawMode está ativo */}
      {drawMode && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 rounded-lg bg-neutral-900/90 backdrop-blur-sm border border-white/10 p-1.5 shadow-lg">
          {/* Ferramentas */}
          <ToolButton active={activeTool === "rect"} onClick={() => setActiveTool("rect")} title="Retângulo">
            <Square className="h-4 w-4" />
          </ToolButton>
          <ToolButton active={activeTool === "circle"} onClick={() => setActiveTool("circle")} title="Círculo">
            <Circle className="h-4 w-4" />
          </ToolButton>
          <ToolButton active={activeTool === "highlight"} onClick={() => setActiveTool("highlight")} title="Destaque">
            <Highlighter className="h-4 w-4" />
          </ToolButton>

          <div className="w-px h-5 bg-white/20 mx-1" />

          {/* Cores */}
          {(Object.keys(colorMap) as AnnotationColor[]).map(color => (
            <button
              key={color}
              onClick={() => setActiveColor(color)}
              className={cn(
                "h-6 w-6 rounded-full border-2 transition-all",
                activeColor === color ? "scale-110 border-white" : "border-transparent opacity-70 hover:opacity-100"
              )}
              style={{ backgroundColor: colorMap[color].stroke }}
              title={colorMap[color].label}
            />
          ))}

          <div className="w-px h-5 bg-white/20 mx-1" />

          {/* Ações */}
          <ToolButton onClick={handleUndo} disabled={annotations.length === 0} title="Desfazer">
            <Undo2 className="h-4 w-4" />
          </ToolButton>
          <ToolButton onClick={handleClear} disabled={annotations.length === 0} title="Limpar tudo">
            <Trash2 className="h-4 w-4" />
          </ToolButton>
          <ToolButton onClick={() => setVisible(!visible)} title={visible ? "Ocultar anotações" : "Mostrar anotações"}>
            {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </ToolButton>
        </div>
      )}

      {/* Canvas overlay — posicionado sobre a imagem */}
      <canvas
        ref={canvasRef}
        className="absolute pointer-events-auto"
        style={{
          left: imageOffsetX,
          top: imageOffsetY,
          pointerEvents: drawMode ? "auto" : "none",
        }}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />
    </>
  );
}

function ToolButton({ children, active, onClick, disabled, title }: { children: React.ReactNode; active?: boolean; onClick: () => void; disabled?: boolean; title: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md text-white transition-all",
        disabled
          ? "opacity-30 cursor-not-allowed"
          : active
            ? "bg-white/25 active:scale-90"
            : "hover:bg-white/15 active:scale-90"
      )}
    >
      {children}
    </button>
  );
}
