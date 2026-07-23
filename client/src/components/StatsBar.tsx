/**
 * StatsBar — KPIs do dashboard com dados da bancada real.
 *
 * KPIs: Eventos hoje, Reconhecidas, Estranhos, Câmeras online, Alertas.
 * Cores alinhadas ao design system dark (OKLCH).
 */
import { Activity, Users, UserX, Camera, AlertTriangle } from "lucide-react";
import { CameraEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StatsBarProps {
  events: CameraEvent[];
}

export default function StatsBar({ events }: StatsBarProps) {
  const faceReco = events.filter(e => e.operator === "FaceReco");
  const recognized = faceReco.filter(e => e.payload?.data?.matchScore && e.payload.data.matchScore >= 50).length;
  const strangers = faceReco.filter(e => !e.payload?.data?.matchScore || e.payload.data.matchScore < 50).length;
  const camerasOnline = "5/6";
  const alerts = events.filter(e => e.operator === "Alarm" || (e.operator === "FaceReco" && (!e.payload?.data?.matchScore || e.payload.data.matchScore < 50))).length;

  const stats = [
    {
      label: "Eventos Hoje",
      value: events.length,
      icon: Activity,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      ring: "ring-blue-500/20",
    },
    {
      label: "Reconhecidas",
      value: recognized,
      icon: Users,
      color: "text-green-400",
      bg: "bg-green-500/10",
      ring: "ring-green-500/20",
    },
    {
      label: "Estranhos",
      value: strangers,
      icon: UserX,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      ring: "ring-amber-500/20",
    },
    {
      label: "Câmeras Online",
      value: camerasOnline,
      icon: Camera,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      ring: "ring-cyan-500/20",
    },
    {
      label: "Alertas",
      value: alerts,
      icon: AlertTriangle,
      color: "text-red-400",
      bg: "bg-red-500/10",
      ring: "ring-red-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={cn(
              "flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:shadow-lg ring-1",
              stat.ring
            )}
          >
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", stat.bg)}>
              <Icon className={cn("h-5 w-5", stat.color)} />
            </div>
            <div className="min-w-0">
              <p className="font-display text-2xl font-bold leading-none">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">{stat.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
