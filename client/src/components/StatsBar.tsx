import { Activity, Users, Car, AlertTriangle, TrendingUp } from "lucide-react";
import { CameraEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StatsBarProps {
  events: CameraEvent[];
}

export default function StatsBar({ events }: StatsBarProps) {
  const faceReco = events.filter(e => e.operator === "FaceReco").length;
  const vehicleReco = events.filter(e => e.operator === "VehicleReco").length;
  const accessControl = events.filter(e => e.operator === "AccessControl").length;
  const alarms = events.filter(e => e.operator === "Alarm" || e.operator === "MotionDetection").length;

  const stats = [
    {
      label: "Total de Eventos",
      value: events.length,
      icon: Activity,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      label: "Reconhecimento Facial",
      value: faceReco,
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-100",
    },
    {
      label: "Veículos",
      value: vehicleReco,
      icon: Car,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-100",
    },
    {
      label: "Acessos",
      value: accessControl,
      icon: TrendingUp,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
    },
    {
      label: "Alertas",
      value: alarms,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-100",
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
              "flex items-center gap-3 rounded-xl border bg-card p-4 transition-all hover:shadow-md",
              stat.border
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
