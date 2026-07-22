import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { CameraEvent } from "@/lib/types";

interface Timeline24hProps {
  events: CameraEvent[];
}

const operatorColors: Record<string, string> = {
  FaceReco: "bg-blue-500",
  VehicleReco: "bg-purple-500",
  AccessControl: "bg-green-500",
  MotionDetection: "bg-amber-500",
  Alarm: "bg-red-500",
};

export default function Timeline24h({ events }: Timeline24hProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const eventsByHour = useMemo(() => {
    const map: Record<number, CameraEvent[]> = {};
    for (let h = 0; h < 24; h++) map[h] = [];
    events.forEach((e) => {
      const hour = new Date(e.timestamp).getHours();
      if (map[hour]) map[hour].push(e);
    });
    return map;
  }, [events]);

  const maxEventsInHour = useMemo(() => {
    return Math.max(1, ...Object.values(eventsByHour).map((arr) => arr.length));
  }, [eventsByHour]);

  const currentHour = new Date().getHours();

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-display text-sm font-semibold">Timeline 24h</h3>
          <p className="text-[11px] text-muted-foreground">Distribuição de eventos por hora</p>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          {Object.entries(operatorColors).map(([op, color]) => (
            <span key={op} className="flex items-center gap-1 text-muted-foreground">
              <div className={cn("h-2 w-2 rounded-sm", color)} />
              {op === "FaceReco" ? "Facial" : op === "VehicleReco" ? "Veículo" : op === "AccessControl" ? "Acesso" : op === "MotionDetection" ? "Movimento" : "Alarme"}
            </span>
          ))}
        </div>
      </div>

      {/* Timeline grid */}
      <div className="relative">
        {/* Hour labels */}
        <div className="grid grid-cols-24 gap-0 mb-1" style={{ gridTemplateColumns: "repeat(24, 1fr)" }}>
          {hours.map((h) => (
            <div key={h} className="text-center">
              <span className={cn(
                "text-[8px] font-mono-tech",
                h === currentHour ? "text-primary font-bold" : "text-muted-foreground/60"
              )}>
                {h.toString().padStart(2, "0")}
              </span>
            </div>
          ))}
        </div>

        {/* Bars */}
        <div className="grid gap-0 h-20" style={{ gridTemplateColumns: "repeat(24, 1fr)" }}>
          {hours.map((h) => {
            const hourEvents = eventsByHour[h] || [];
            const heightPercent = (hourEvents.length / maxEventsInHour) * 100;
            const isCurrent = h === currentHour;

            return (
              <div
                key={h}
                className={cn(
                  "relative flex flex-col-reverse items-center justify-start rounded-sm overflow-hidden group cursor-pointer transition-all",
                  isCurrent ? "ring-1 ring-primary/50" : ""
                )}
                style={{ minHeight: "4px" }}
              >
                {/* Stacked colored blocks */}
                <div className="w-full flex flex-col-reverse" style={{ height: `${heightPercent}%` }}>
                  {hourEvents.map((e, i) => (
                    <div
                      key={e.id}
                      className={cn(
                        "timeline-block w-full",
                        operatorColors[e.operator] || "bg-gray-500"
                      )}
                      style={{ height: `${100 / hourEvents.length}%` }}
                      title={`${e.operator} - ${new Date(e.timestamp).toLocaleTimeString("pt-BR")}`}
                    />
                  ))}
                </div>

                {/* Empty hour baseline */}
                {hourEvents.length === 0 && (
                  <div className="w-full h-0.5 bg-border/50" />
                )}

                {/* Current hour indicator */}
                {isCurrent && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-primary live-dot z-10" />
                )}

                {/* Tooltip on hover */}
                {hourEvents.length > 0 && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                    <div className="rounded-md bg-popover border border-border px-2 py-1.5 whitespace-nowrap">
                      <p className="text-[10px] font-mono-tech text-foreground font-bold">{h.toString().padStart(2, "0")}:00 - {h.toString().padStart(2, "0")}:59</p>
                      <p className="text-[10px] text-muted-foreground">{hourEvents.length} evento{hourEvents.length > 1 ? "s" : ""}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Current time line */}
        <div className="absolute top-0 bottom-0 w-px bg-primary/30 pointer-events-none" style={{
          left: `${(currentHour / 24) * 100}%`
        }} />
      </div>
    </div>
  );
}
