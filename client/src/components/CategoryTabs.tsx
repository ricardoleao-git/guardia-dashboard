import { User, Car, DoorOpen, Activity, AlertTriangle, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

export type CategoryKey = "all" | "FaceReco" | "VehicleReco" | "AccessControl" | "MotionDetection" | "Alarm";

interface CategoryTab {
  key: CategoryKey;
  label: string;
  icon: typeof User;
  color: string;
  activeColor: string;
  dotColor: string;
}

const tabs: CategoryTab[] = [
  {
    key: "all",
    label: "Todos",
    icon: LayoutGrid,
    color: "text-muted-foreground",
    activeColor: "bg-foreground text-background",
    dotColor: "bg-foreground",
  },
  {
    key: "FaceReco",
    label: "Facial",
    icon: User,
    color: "text-blue-600",
    activeColor: "bg-blue-600 text-white",
    dotColor: "bg-blue-500",
  },
  {
    key: "VehicleReco",
    label: "Veículos",
    icon: Car,
    color: "text-purple-600",
    activeColor: "bg-purple-600 text-white",
    dotColor: "bg-purple-500",
  },
  {
    key: "AccessControl",
    label: "Acesso",
    icon: DoorOpen,
    color: "text-green-600",
    activeColor: "bg-green-600 text-white",
    dotColor: "bg-green-500",
  },
  {
    key: "MotionDetection",
    label: "Movimento",
    icon: Activity,
    color: "text-amber-600",
    activeColor: "bg-amber-600 text-white",
    dotColor: "bg-amber-500",
  },
  {
    key: "Alarm",
    label: "Alarmes",
    icon: AlertTriangle,
    color: "text-red-600",
    activeColor: "bg-red-600 text-white",
    dotColor: "bg-red-500",
  },
];

interface CategoryTabsProps {
  active: CategoryKey;
  onChange: (category: CategoryKey) => void;
  counts: Record<CategoryKey, number>;
}

export default function CategoryTabs({ active, onChange, counts }: CategoryTabsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;
        const count = counts[tab.key] || 0;

        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 shrink-0",
              "border border-border hover:border-foreground/20",
              isActive
                ? cn(tab.activeColor, "border-transparent shadow-sm")
                : cn("bg-card hover:bg-accent", tab.color)
            )}
            style={{
              transform: isActive ? "scale(1.02)" : "scale(1)",
            }}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">{tab.label}</span>
            <span
              className={cn(
                "ml-0.5 rounded-full px-1.5 py-0.5 text-xs font-mono-tech tabular-nums",
                isActive
                  ? "bg-white/20"
                  : "bg-muted text-muted-foreground group-hover:bg-background"
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
