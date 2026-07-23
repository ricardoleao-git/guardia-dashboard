/**
 * Sidebar — Navegação lateral com 5 categorias.
 * Labels internacionalizadas via useI18n (PT/EN/ZH).
 */
import {
  ShieldCheck, Activity, Camera, Settings, Bell, LayoutGrid, Zap, Database,
  X, Cpu, Users, HardDrive, Play, Car, Server, ScrollText, UserCog,
  CalendarCheck, ScanFace, UserPlus, Search, FileText, Building, Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useI18n } from "@/contexts/I18nContext";

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

// Keys for i18n lookup
const navSections = [
  {
    titleKey: "nav.operacao",
    items: [
      { id: "dashboard", labelKey: "nav.dashboard", icon: LayoutGrid },
      { id: "events", labelKey: "nav.events", icon: Activity },
      { id: "cameras", labelKey: "nav.cameras", icon: Camera },
      { id: "playback", labelKey: "nav.playback", icon: Play },
      { id: "alerts", labelKey: "nav.alerts", icon: Bell },
    ],
  },
  {
    titleKey: "nav.inteligencia",
    items: [
      { id: "automations", labelKey: "nav.automations", icon: Zap },
      { id: "ai-config", labelKey: "nav.ai-config", icon: Cpu },
      { id: "semantic-search", labelKey: "nav.semantic-search", icon: Search },
      { id: "ai-summary", labelKey: "nav.ai-summary", icon: FileText },
    ],
  },
  {
    titleKey: "nav.pessoas-acesso",
    items: [
      { id: "frequencia", labelKey: "nav.frequencia", icon: CalendarCheck },
      { id: "person-timeline", labelKey: "nav.person-timeline", icon: ScanFace },
      { id: "visitor-invite", labelKey: "nav.visitor-invite", icon: UserPlus },
      { id: "vehicle-access", labelKey: "nav.vehicle-access", icon: Car },
      { id: "elevator", labelKey: "nav.elevator", icon: Building },
    ],
  },
  {
    titleKey: "nav.gestao",
    items: [
      { id: "devices", labelKey: "nav.devices", icon: HardDrive },
      { id: "ai-box", labelKey: "nav.ai-box", icon: Boxes },
      { id: "face-library", labelKey: "nav.face-library", icon: Users },
      { id: "vehicles", labelKey: "nav.vehicles", icon: Car },
      { id: "system-config", labelKey: "nav.system-config", icon: Server },
    ],
  },
  {
    titleKey: "nav.administracao",
    items: [
      { id: "user-admin", labelKey: "nav.user-admin", icon: UserCog },
      { id: "audit-log", labelKey: "nav.audit-log", icon: ScrollText },
      { id: "settings", labelKey: "nav.settings", icon: Settings },
    ],
  },
];

export default function Sidebar({ activeView, onNavigate, mobileOpen, onMobileClose }: SidebarProps) {
  const { t } = useI18n();

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
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation with sections */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.titleKey} className="mb-4">
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {t(section.titleKey)}
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
                      {t(item.labelKey)}
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
              <p className="text-[11px] font-semibold text-white">{t("connector.online")}</p>
              <p className="text-[9px] text-sidebar-foreground/50 font-mono-tech">{t("connector.sync_now")}</p>
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
                {isSupabaseConfigured ? t("supabase.connected") : t("supabase.demo")}
              </p>
              <p className="text-[9px] text-sidebar-foreground/50">
                {isSupabaseConfigured ? t("supabase.realtime") : t("supabase.mock")}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
