import { Search, Filter, Download, RefreshCw, Bell, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterState } from "@/lib/types";
import { mockCameras } from "@/lib/mock-data";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { LogOut, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  subtitle: string;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onRefresh: () => void;
  totalEvents: number;
}

export default function Header({ title, subtitle, filters, onFiltersChange, onRefresh, totalEvents }: HeaderProps) {
  const { t, lang } = useI18n();
  const [notifCount, setNotifCount] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const locale = lang === "pt" ? "pt-BR" : lang === "zh" ? "zh-CN" : "en-US";
      setCurrentTime(now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Simulate notification count based on critical events
    const critical = Math.floor(totalEvents * 0.18);
    setNotifCount(critical);
  }, [totalEvents]);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="px-4 py-3 lg:px-6 lg:py-4">
        {/* Title row */}
        <div className="flex items-center justify-between mb-3 lg:mb-4">
          <div className="min-w-0">
            <h2 className="font-display text-xl lg:text-2xl font-bold tracking-tight truncate">{title}</h2>
            <p className="text-xs lg:text-sm text-muted-foreground mt-0.5 truncate">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Clock */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground font-mono-tech px-2">
              <Clock className="h-3.5 w-3.5" />
              <span>{currentTime}</span>
            </div>

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifPanel(!showNotifPanel)}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-accent transition-colors"
              >
                <Bell className="h-4 w-4" />
                {notifCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {notifCount > 99 ? "99+" : notifCount}
                  </span>
                )}
              </button>
              {showNotifPanel && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-border bg-popover shadow-xl z-50">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <span className="font-display text-sm font-semibold">{t("notif.title")}</span>
                    <button onClick={() => setNotifCount(0)} className="text-xs text-primary hover:underline">{lang === "zh" ? "全部已读" : lang === "en" ? "Mark all read" : "Marcar todas como lidas"}</button>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifCount === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">{lang === "zh" ? "暂无新通知" : lang === "en" ? "No new notifications" : "Nenhuma notificação nova"}</div>
                    ) : (
                      <>
                        <div className="px-4 py-3 border-b border-border/50 hover:bg-accent/50 cursor-pointer">
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 h-2 w-2 rounded-full bg-red-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium">Rosto não reconhecido</p>
                              <p className="text-xs text-muted-foreground">Câmera D2 — Corredor • há 2 min</p>
                            </div>
                          </div>
                        </div>
                        <div className="px-4 py-3 border-b border-border/50 hover:bg-accent/50 cursor-pointer">
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium">Match baixo (45%)</p>
                              <p className="text-xs text-muted-foreground">Câmera D3 — Recepção • há 8 min</p>
                            </div>
                          </div>
                        </div>
                        <div className="px-4 py-3 border-b border-border/50 hover:bg-accent/50 cursor-pointer">
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 h-2 w-2 rounded-full bg-red-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium">Movimento fora de horário</p>
                              <p className="text-xs text-muted-foreground">Câmera D5 — Portão • há 15 min</p>
                            </div>
                          </div>
                        </div>
                        <div className="px-4 py-3 hover:bg-accent/50 cursor-pointer">
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium">Veículo autorizado entrou</p>
                              <p className="text-xs text-muted-foreground">Placa ABC1D23 • há 32 min</p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("header.refresh")}</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("header.export")}</span>
            </Button>

            {/* User info + logout */}
            <UserMenu />
          </div>
        </div>

        {/* Filters row — empilha em mobile, linha em desktop */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <div className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={lang === "zh" ? "搜索ID、序列号或姓名..." : lang === "en" ? "Search by ID, serial or name..." : "Buscar por ID, serial ou nome..."}
              value={filters.search || ""}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              className="pl-9"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Select
              value={filters.cameraSerial || "all"}
              onValueChange={(v) => onFiltersChange({ ...filters, cameraSerial: v === "all" ? null : v })}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Câmera" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{lang === "zh" ? "所有摄像头" : lang === "en" ? "All cameras" : "Todas as câmeras"}</SelectItem>
                {mockCameras.map((cam) => (
                  <SelectItem key={cam.serial} value={cam.serial}>
                    {cam.serial} — {cam.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.operator || "all"}
              onValueChange={(v) => onFiltersChange({ ...filters, operator: v === "all" ? null : v })}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Operador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="FaceReco">{lang === "zh" ? "人脸识别" : lang === "en" ? "Facial Recognition" : "Reconhecimento Facial"}</SelectItem>
                <SelectItem value="AccessControl">{lang === "zh" ? "门禁控制" : lang === "en" ? "Access Control" : "Controle de Acesso"}</SelectItem>
                <SelectItem value="VehicleReco">{lang === "zh" ? "车辆识别" : lang === "en" ? "Vehicle Recognition" : "Reconhecimento de Veículo"}</SelectItem>
                <SelectItem value="MotionDetection">{lang === "zh" ? "移动检测" : lang === "en" ? "Motion Detection" : "Detecção de Movimento"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground sm:ml-auto">
            <Filter className="h-3.5 w-3.5" />
            <span className="font-mono-tech text-xs">{totalEvents} {lang === "zh" ? "事件" : lang === "en" ? "events" : "eventos"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function UserMenu() {
  const { user, profile, signOut, isDemoMode, isAdmin } = useAuth();
  const { lang } = useI18n();
  const [showMenu, setShowMenu] = useState(false);

  if (isDemoMode) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-primary/10 border border-primary/20">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
          D
        </div>
        <span className="text-xs text-primary font-medium hidden sm:inline">Demo Admin</span>
      </div>
    );
  }

  const initials = profile?.full_name?.charAt(0).toUpperCase() ?? user?.email?.charAt(0).toUpperCase() ?? "U";
  const displayName = profile?.full_name || (user?.email?.split("@")[0] ?? "Operador");
  const roleLabel = profile?.role === "admin" ? "Administrador" : profile?.role === "operator" ? "Operador" : "Visualizador";
  const roleColor = profile?.role === "admin" ? "text-amber-400" : profile?.role === "operator" ? "text-blue-400" : "text-gray-400";

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 hover:bg-accent transition-colors"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
          {initials}
        </div>
        <span className="text-xs font-medium hidden sm:inline max-w-[100px] truncate">{displayName}</span>
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-border bg-popover shadow-xl z-50">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              <span className={cn("text-[10px] font-medium", roleColor)}>{roleLabel}</span>
            </div>
            <button
              onClick={() => {
                setShowMenu(false);
                signOut();
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              {lang === "zh" ? "退出" : lang === "en" ? "Sign Out" : "Sair"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
