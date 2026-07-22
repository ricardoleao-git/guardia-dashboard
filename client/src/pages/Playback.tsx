import { useState, useMemo, useRef, useCallback } from "react";
import {
  Calendar, ChevronLeft, ChevronRight, Play, Pause, Square,
  SkipBack, SkipForward, Camera, ZoomIn, ZoomOut, Scissors, Clock,
  Circle, Triangle, Square as SquareIcon, Download, Maximize,
  Crop, Check, X, RotateCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock channels matching NVR screenshots (D1-D17)
const CHANNELS = [
  { id: "D1", name: "Corredor", serial: "G12345678", status: "online" },
  { id: "D2", name: "Recepcao", serial: "G23456789", status: "online" },
  { id: "D3", name: "AI IPC", serial: "G34567890", status: "online" },
  { id: "D5", name: "COPA", serial: "G56789012", status: "online" },
  { id: "D6", name: "Estacionamento", serial: "G67890123", status: "offline" },
  { id: "D7", name: "Portao Principal", serial: "G78901234", status: "online" },
];

// Recording types matching NVR color scheme
const REC_TYPES = {
  intelligence: { label: "Inteligência", color: "#1E6BE6", bg: "bg-blue-500" },
  common: { label: "Comum", color: "#22C55E", bg: "bg-green-500" },
  alarm: { label: "Alarme", color: "#EF4444", bg: "bg-red-500" },
  motion: { label: "Movimento", color: "#EAB308", bg: "bg-yellow-500" },
};

// Generate mock recording segments for a channel on a given day
function generateSegments(channelId: string, date: Date) {
  const segments: { start: number; end: number; type: keyof typeof REC_TYPES }[] = [];
  const seed = channelId.charCodeAt(1) + date.getDate();
  const rand = (i: number) => ((seed * 9301 + i * 49297) % 233280) / 233280;

  // Common recording (continuous) — most of the day
  segments.push({ start: 0, end: 6, type: "common" });
  segments.push({ start: 6, end: 6.5, type: "motion" });
  segments.push({ start: 6.5, end: 8, type: "common" });
  segments.push({ start: 8, end: 8.3, type: "intelligence" });
  segments.push({ start: 8.3, end: 12, type: "common" });
  segments.push({ start: 12, end: 12.2, type: "motion" });
  segments.push({ start: 12.2, end: 14, type: "common" });
  segments.push({ start: 14, end: 14.5, type: "intelligence" });
  segments.push({ start: 14.5, end: 18, type: "common" });
  segments.push({ start: 18, end: 18.1, type: "alarm" });
  segments.push({ start: 18.1, end: 22, type: "common" });
  segments.push({ start: 22, end: 24, type: "common" });

  // Add some random intelligence events
  if (rand(1) > 0.5) {
    segments.push({ start: 7.5, end: 7.55, type: "intelligence" });
  }
  if (rand(2) > 0.3) {
    segments.push({ start: 16.2, end: 16.25, type: "intelligence" });
  }

  return segments.sort((a, b) => a.start - b.start);
}

// Calendar component
function MiniCalendar({ selectedDate, onDateChange }: { selectedDate: Date; onDateChange: (d: Date) => void }) {
  const [viewMonth, setViewMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  const today = new Date();
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay();
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const dayNames = ["D", "S", "T", "Q", "Q", "S", "S"];

  const days: (Date | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
  }

  const isSameDay = (a: Date, b: Date) =>
    a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const isToday = (d: Date) => isSameDay(d, today);
  const hasRecordings = (d: Date) => d <= today;

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
          className="rounded p-1 hover:bg-accent transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">
          {monthNames[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </span>
        <button
          onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
          className="rounded p-1 hover:bg-accent transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayNames.map((d, i) => (
          <div key={i} className="text-center text-[10px] text-muted-foreground font-medium">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => (
          <button
            key={i}
            disabled={!day || !hasRecordings(day)}
            onClick={() => day && onDateChange(day)}
            className={cn(
              "relative aspect-square rounded text-xs transition-colors",
              !day || !hasRecordings(day) ? "text-muted-foreground/30 cursor-not-allowed" : "hover:bg-accent",
              day && isSameDay(day, selectedDate) && "bg-primary text-primary-foreground hover:bg-primary",
              day && isToday(day) && !isSameDay(day, selectedDate) && "ring-1 ring-primary/40"
            )}
          >
            {day?.getDate()}
            {day && hasRecordings(day) && !isSameDay(day, selectedDate) && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary/50" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// Timeline for a single channel
function ChannelTimeline({ channelId, date, selectedTime, onTimeSelect }: {
  channelId: string;
  date: Date;
  selectedTime: number;
  onTimeSelect: (hour: number) => void;
}) {
  const segments = useMemo(() => generateSegments(channelId, date), [channelId, date]);

  return (
    <div className="relative h-7 group">
      {/* Background track */}
      <div className="absolute inset-0 rounded bg-muted/40 overflow-hidden">
        {segments.map((seg, i) => (
          <div
            key={i}
            className={cn("absolute top-0 bottom-0", REC_TYPES[seg.type].bg)}
            style={{
              left: `${(seg.start / 24) * 100}%`,
              width: `${((seg.end - seg.start) / 24) * 100}%`,
              opacity: 0.7,
            }}
          />
        ))}
      </div>
      {/* Hour markers */}
      {[0, 6, 12, 18, 24].map((h) => (
        <div key={h} className="absolute top-0 bottom-0 border-l border-border/50" style={{ left: `${(h / 24) * 100}%` }}>
          <span className="absolute -top-0.5 left-1 text-[9px] text-muted-foreground font-mono">{String(h).padStart(2, '0')}h</span>
        </div>
      ))}
      {/* Selected time indicator */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg cursor-pointer"
        style={{ left: `${(selectedTime / 24) * 100}%` }}
      >
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-white" />
      </div>
      {/* Click overlay */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          onTimeSelect(Math.max(0, Math.min(23.99, pct * 24)));
        }}
      />
    </div>
  );
}

// Playback controls
function PlaybackControls({ isPlaying, onPlayPause, onSkip, speed, onSpeedChange, currentTime, zoom, onZoomIn, onZoomOut, onZoomReset, onCapture, onCropToggle, cropMode, onDownload }: {
  isPlaying: boolean;
  onPlayPause: () => void;
  onSkip: (dir: "back" | "forward") => void;
  speed: number;
  onSpeedChange: (s: number) => void;
  currentTime: number;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onCapture: () => void;
  onCropToggle: () => void;
  cropMode: boolean;
  onDownload: () => void;
}) {
  const formatTime = (h: number) => {
    const hours = Math.floor(h);
    const mins = Math.floor((h - hours) * 60);
    const secs = Math.floor(((h - hours) * 60 - mins) * 60);
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
      <span className="font-mono text-sm text-primary tabular-nums">{formatTime(currentTime)}</span>
      <div className="h-4 w-px bg-border" />
      <button onClick={() => onSkip("back")} className="rounded p-1.5 hover:bg-accent transition-colors">
        <SkipBack className="h-4 w-4" />
      </button>
      <button onClick={onPlayPause} className="rounded-lg bg-primary p-2 text-primary-foreground hover:bg-primary/90 transition-colors">
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <button onClick={() => onSkip("forward")} className="rounded p-1.5 hover:bg-accent transition-colors">
        <SkipForward className="h-4 w-4" />
      </button>
      <button className="rounded p-1.5 hover:bg-accent transition-colors" title="Parar">
        <Square className="h-4 w-4" />
      </button>
      <div className="h-4 w-px bg-border" />
      {/* Speed selector */}
      <div className="flex items-center gap-1">
        {[0.5, 1, 2, 4, 8].map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className={cn(
              "rounded px-1.5 py-0.5 text-xs font-mono transition-colors",
              speed === s ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground"
            )}
          >
            {s}x
          </button>
        ))}
      </div>
      <div className="h-4 w-px bg-border" />
      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <button onClick={onZoomOut} className="rounded p-1.5 hover:bg-accent transition-colors" title="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="font-mono text-xs text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={onZoomIn} className="rounded p-1.5 hover:bg-accent transition-colors" title="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </button>
        <button onClick={onZoomReset} className="rounded p-1.5 hover:bg-accent transition-colors" title="Reset zoom">
          <Maximize className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="h-4 w-px bg-border" />
      <button onClick={onCapture} className="rounded p-1.5 hover:bg-accent transition-colors" title="Captura de tela">
        <Camera className="h-4 w-4" />
      </button>
      <button onClick={onCropToggle} className={cn("rounded p-1.5 transition-colors", cropMode ? "bg-primary text-primary-foreground" : "hover:bg-accent")} title="Modo recorte">
        {cropMode ? <Check className="h-4 w-4" /> : <Crop className="h-4 w-4" />}
      </button>
      <button onClick={onDownload} className="rounded p-1.5 hover:bg-accent transition-colors" title="Download">
        <Download className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function Playback() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedChannel, setSelectedChannel] = useState<string | null>(CHANNELS[1].id);
  const [selectedTime, setSelectedTime] = useState(8.5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [activeRecFilters, setActiveRecFilters] = useState<Set<string>>(new Set(["intelligence", "common", "alarm", "motion"]));
  const [zoom, setZoom] = useState(1);
  const [cropMode, setCropMode] = useState(false);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const videoAreaRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoom((z) => Math.min(5, z + 0.25));
  const handleZoomOut = () => setZoom((z) => Math.max(1, z - 0.25));
  const handleZoomReset = () => setZoom(1);

  const handleCapture = () => {
    const timestamp = `${channel?.id || "CH"}_${formatDate(selectedDate).replace(/\//g, "-")}_${Math.floor(selectedTime).toString().padStart(2, "0")}${Math.floor((selectedTime % 1) * 60).toString().padStart(2, "0")}`;
    setCapturedFrames((prev) => [...prev, timestamp]);
  };

  const handleDownload = () => {
    if (capturedFrames.length > 0) {
      const filename = capturedFrames[capturedFrames.length - 1];
      const blob = new Blob([`GuardIA Playback Capture\nChannel: ${channel?.id}\nDate: ${formatDate(selectedDate)}\nTime: ${Math.floor(selectedTime).toString().padStart(2, "0")}:${Math.floor((selectedTime % 1) * 60).toString().padStart(2, "0")}:00\nZoom: ${Math.round(zoom * 100)}%\n`], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `guardia_${filename}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleCropMouseDown = (e: React.MouseEvent) => {
    if (!cropMode || !videoAreaRef.current) return;
    const rect = videoAreaRef.current.getBoundingClientRect();
    setCropStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setCropRect(null);
  };

  const handleCropMouseMove = (e: React.MouseEvent) => {
    if (!cropMode || !cropStart || !videoAreaRef.current) return;
    const rect = videoAreaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCropRect({
      x: Math.min(cropStart.x, x),
      y: Math.min(cropStart.y, y),
      w: Math.abs(x - cropStart.x),
      h: Math.abs(y - cropStart.y),
    });
  };

  const handleCropMouseUp = () => {
    setCropStart(null);
  };

  const toggleRecFilter = (type: string) => {
    setActiveRecFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const formatDate = (d: Date) => {
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    return `${day}/${month}/${d.getFullYear()}`;
  };

  const channel = CHANNELS.find((c) => c.id === selectedChannel);

  return (
    <div className="flex h-full gap-4">
      {/* Left sidebar: Calendar + Channels */}
      <div className="w-64 flex-shrink-0 space-y-3 overflow-y-auto">
        <MiniCalendar selectedDate={selectedDate} onDateChange={setSelectedDate} />

        {/* Recording type filters */}
        <div className="rounded-lg border border-border bg-card p-3">
          <h3 className="text-xs font-medium text-muted-foreground mb-2">Tipo de Gravação</h3>
          <div className="space-y-1.5">
            {Object.entries(REC_TYPES).map(([key, val]) => (
              <button
                key={key}
                onClick={() => toggleRecFilter(key)}
                className="flex items-center gap-2 w-full text-xs hover:bg-accent rounded px-2 py-1 transition-colors"
              >
                <span className={cn("h-3 w-3 rounded-sm", val.bg, !activeRecFilters.has(key) && "opacity-30")} />
                <span className={!activeRecFilters.has(key) ? "text-muted-foreground line-through" : ""}>{val.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Channel list */}
        <div className="rounded-lg border border-border bg-card p-3">
          <h3 className="text-xs font-medium text-muted-foreground mb-2">Canais</h3>
          <div className="space-y-1">
            {CHANNELS.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setSelectedChannel(ch.id)}
                className={cn(
                  "flex items-center gap-2 w-full rounded px-2 py-1.5 text-xs transition-colors",
                  selectedChannel === ch.id ? "bg-primary/15 text-primary" : "hover:bg-accent"
                )}
              >
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  ch.status === "online" ? "bg-green-500" : "bg-red-500"
                )} />
                <span className="font-mono font-medium">{ch.id}</span>
                <span className="text-muted-foreground">{ch.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main area: Video player + Timeline */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* Date + channel header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{formatDate(selectedDate)}</h2>
            {channel && (
              <span className="text-sm text-muted-foreground">
                · {channel.id} {channel.name}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground font-mono">{CHANNELS.length} canais</span>
        </div>

        {/* Video player area */}
        <div
          ref={videoAreaRef}
          onMouseDown={handleCropMouseDown}
          onMouseMove={handleCropMouseMove}
          onMouseUp={handleCropMouseUp}
          onMouseLeave={handleCropMouseUp}
          className={cn("relative flex-1 min-h-[300px] rounded-lg border border-border bg-black overflow-hidden", cropMode && "cursor-crosshair")}
          style={zoom > 1 ? { transform: `scale(${zoom})`, transformOrigin: "center" } : undefined}
        >
          {channel?.status === "online" ? (
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Placeholder video frame */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black" />
              <div className="relative z-10 text-center">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 ring-2 ring-primary/30">
                  <Play className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">Playback · {channel.id} {channel.name}</p>
                <p className="text-xs text-muted-foreground/60 mt-1 font-mono">
                  {formatDate(selectedDate)} · {Math.floor(selectedTime).toString().padStart(2, "0")}:{Math.floor((selectedTime % 1) * 60).toString().padStart(2, "0")}:00
                </p>
              </div>
              {/* Overlay timestamp like NVR */}
              <div className="absolute top-3 left-3 font-mono text-xs text-green-400/80">
                {channel.id} · {channel.name} · {formatDate(selectedDate)}
              </div>
              <div className="absolute top-3 right-3 font-mono text-xs text-green-400/80">
                REC · {Math.floor(selectedTime).toString().padStart(2, "0")}:{Math.floor((selectedTime % 1) * 60).toString().padStart(2, "0")}:00
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 ring-2 ring-red-500/20">
                  <Triangle className="h-8 w-8 text-red-500" />
                </div>
                <p className="text-sm text-muted-foreground">Canal {selectedChannel} — Sem sinal</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Câmera offline ou rede inacessível</p>
              </div>
            </div>
          )}
          {/* Crop overlay */}
          {cropMode && cropRect && (
            <div
              className="absolute border-2 border-primary bg-primary/20 pointer-events-none"
              style={{ left: cropRect.x, top: cropRect.y, width: cropRect.w, height: cropRect.h }}
            />
          )}
          {/* Crop mode banner */}
          {cropMode && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg bg-primary/90 px-3 py-1.5 text-xs text-primary-foreground flex items-center gap-2">
              <Crop className="h-3.5 w-3.5" />
              Arraste para selecionar a área de recorte
              <button onClick={() => { setCropMode(false); setCropRect(null); }} className="ml-2 hover:bg-primary-foreground/20 rounded p-0.5">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          {/* Captured frames indicator */}
          {capturedFrames.length > 0 && (
            <div className="absolute bottom-3 right-3 rounded-lg bg-black/70 px-2.5 py-1.5 text-xs text-green-400 flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5" />
              {capturedFrames.length} captura{capturedFrames.length > 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Playback controls */}
        <PlaybackControls
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onSkip={(dir) => {
            const delta = dir === "forward" ? 1 / speed : -1 / speed;
            setSelectedTime(Math.max(0, Math.min(23.99, selectedTime + delta)));
          }}
          speed={speed}
          onSpeedChange={setSpeed}
          currentTime={selectedTime}
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          onCapture={handleCapture}
          onCropToggle={() => { setCropMode(!cropMode); setCropRect(null); }}
          cropMode={cropMode}
          onDownload={handleDownload}
        />

        {/* Per-channel timelines */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-2.5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Timeline 24h · {formatDate(selectedDate)}
            </h3>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              {Object.entries(REC_TYPES).map(([key, val]) => (
                <span key={key} className="flex items-center gap-1">
                  <span className={cn("h-2 w-2 rounded-sm", val.bg)} />
                  {val.label}
                </span>
              ))}
            </div>
          </div>
          {CHANNELS.map((ch) => (
            <div key={ch.id} className="flex items-center gap-3">
              <button
                onClick={() => setSelectedChannel(ch.id)}
                className={cn(
                  "flex items-center gap-1.5 w-28 flex-shrink-0 text-xs",
                  selectedChannel === ch.id ? "text-primary font-medium" : "text-muted-foreground"
                )}
              >
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  ch.status === "online" ? "bg-green-500" : "bg-red-500"
                )} />
                <span className="font-mono">{ch.id}</span>
                <span className="truncate">{ch.name}</span>
              </button>
              <div className="flex-1">
                <ChannelTimeline
                  channelId={ch.id}
                  date={selectedDate}
                  selectedTime={selectedChannel === ch.id ? selectedTime : -1}
                  onTimeSelect={(t) => {
                    setSelectedChannel(ch.id);
                    setSelectedTime(t);
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
