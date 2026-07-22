import { ShieldCheck, Activity, Camera, Settings, Bell, LayoutGrid, Zap, Database, X, Cpu, Users, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase";

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const navSections = [
  {
    title: "Monitoramento",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
      { id: "events", label: "Eventos", icon: Activity },
      { id: "cameras", label: "Câmeras", icon: Camera },
      { id: "alerts", label: "Alertas", icon: Bell },
    ],
  },
  {
    title: "Gestão",
    items: [
      { id: "devices", label: "Dispositivos", icon: HardDrive },
      { id: "ai-config", label: "Funções AI", icon: Cpu },
      { id: "face-library", label: "Bib. de Rostos", icon: Users },
      { id: "settings", label: "Configurações", icon: Settings },
    ],
  },
];

export default function Sidebar({ activeView, onNavigate, mobileOpen, onMobileClose }: SidebarProps) {
  const handleNavigate = (view: string) => {
    onNavigate(view);
    onMobileClose();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-200"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-60 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-out lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo + close button */}
        <div className="flex items-center justify-between gap-3 px-4 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 ring-1 ring-primary/30">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-base font-bold tracking-tight text-white leading-none">
                Guard<span className="text-primary">IA</span>
              </h1>
              <p className="text-[10px] text-sidebar-foreground/50 mt-0.5 font-mono-tech">NVR 5.0 AI</p>
            </div>
          </div>
          <button
            onClick={onMobileClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white lg:hidden transition-colors"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation with sections */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.title} className="mb-4">
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-white"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0")} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer with status indicators */}
        <div className="border-t border-sidebar-border px-3 py-3 space-y-2">
          {/* Connector status */}
          <div className="flex items-center gap-2 rounded-md bg-sidebar-accent/30 px-2.5 py-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500/15">
              <Zap className="h-3.5 w-3.5 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-white">Connector Online</p>
              <p className="text-[9px] text-sidebar-foreground/50 font-mono-tech">sync: agora</p>
            </div>
            <div className="h-2 w-2 rounded-full bg-green-400 live-dot" />
          </div>

          {/* Supabase config status */}
          <div className={cn(
            "flex items-center gap-2 rounded-md px-2.5 py-2 transition-colors",
            isSupabaseConfigured ? "bg-green-500/10" : "bg-amber-500/10"
          )}>
            <div className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full",
              isSupabaseConfigured ? "bg-green-500/20" : "bg-amber-500/20"
            )}>
              <Database className={cn("h-3 w-3", isSupabaseConfigured ? "text-green-400" : "text-amber-400")} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium text-white">
                {isSupabaseConfigured ? "Supabase Conectado" : "Modo Demo"}
              </p>
              <p className="text-[9px] text-sidebar-foreground/50">
                {isSupabaseConfigured ? "Tempo real" : "Dados mockados"}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
