import { ShieldCheck, Activity, Camera, Settings, Bell, LayoutGrid, Zap, Database, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase";

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "events", label: "Eventos", icon: Activity },
  { id: "cameras", label: "Câmeras", icon: Camera },
  { id: "alerts", label: "Alertas", icon: Bell },
  { id: "settings", label: "Configurações", icon: Settings },
];

export default function Sidebar({ activeView, onNavigate, mobileOpen, onMobileClose }: SidebarProps) {
  const handleNavigate = (view: string) => {
    onNavigate(view);
    onMobileClose();
  };

  return (
    <>
      {/* Overlay para mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-200"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-out lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo + close button (mobile) */}
        <div className="flex items-center justify-between gap-3 px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight text-white">
                Guard<span className="text-primary">IA</span>
              </h1>
              <p className="text-[11px] text-sidebar-foreground/60">Security Monitoring</p>
            </div>
          </div>
          {/* Close button — only on mobile */}
          <button
            onClick={onMobileClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white lg:hidden transition-colors"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-sidebar-accent text-white shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white"
                )}
              >
                <Icon className={cn("h-4.5 w-4.5 shrink-0", isActive ? "text-primary" : "")} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border px-4 py-4 space-y-2">
          {/* Connector status */}
          <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/30 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
              <Zap className="h-4 w-4 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white">Connector Online</p>
              <p className="text-[10px] text-sidebar-foreground/50">Última sync: agora</p>
            </div>
            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse-dot" />
          </div>

          {/* Supabase config status */}
          <div className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 transition-colors",
            isSupabaseConfigured ? "bg-green-500/10" : "bg-amber-500/10"
          )}>
            <div className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full",
              isSupabaseConfigured ? "bg-green-500/20" : "bg-amber-500/20"
            )}>
              <Database className={cn("h-3.5 w-3.5", isSupabaseConfigured ? "text-green-400" : "text-amber-400")} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-white">
                {isSupabaseConfigured ? "Supabase Conectado" : "Modo Demo"}
              </p>
              <p className="text-[10px] text-sidebar-foreground/50">
                {isSupabaseConfigured ? "Dados em tempo real" : "Dados mockados"}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
