import { useState, useMemo, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import Header from "@/components/Header";
import StatsBar from "@/components/StatsBar";
import EventCard from "@/components/EventCard";
import ImageViewer from "@/components/ImageViewer";
import CameraGrid from "@/components/CameraGrid";
import CameraMosaic from "@/components/CameraMosaic";
import Timeline24h from "@/components/Timeline24h";
import CategoryTabs, { CategoryKey } from "@/components/CategoryTabs";
import SmartSearch, { SmartSearchFilters, defaultSmartFilters } from "@/components/SmartSearch";
import ExportReports from "@/components/ExportReports";
import { useEvents, useConnectorStatus } from "@/hooks/useEvents";
import { useEventAlerts } from "@/hooks/useCriticalAlerts";
import { FilterState, CameraEvent } from "@/lib/types";
import { mockCameras } from "@/lib/mock-data";
import { Bell, Settings, ShieldCheck, Inbox } from "lucide-react";
import { useLocation } from "wouter";
import { useI18n } from "@/contexts/I18nContext";
import Playback from "@/pages/Playback";
import VehicleManagement from "@/pages/VehicleManagement";
import SystemConfig from "@/pages/SystemConfig";
import UserAdmin from "@/pages/UserAdmin";
import AuditLog from "@/pages/AuditLog";
import Automations from "@/pages/Automations";
import Frequencia from "@/pages/Frequencia";
import PersonTimeline from "@/pages/PersonTimeline";
import VehicleAccess from "@/pages/VehicleAccess";
import VisitorInvite from "@/pages/VisitorInvite";
import AbsenceAlerts from "@/pages/AbsenceAlerts";
import SemanticSearch from "@/pages/SemanticSearch";
import AISummary from "@/pages/AISummary";
import ElevatorControl from "@/pages/ElevatorControl";
import AIBox from "@/pages/AIBox";
import DeviceManagement from "@/pages/DeviceManagement";
import AIConfig from "@/pages/AIConfig";
import FaceLibrary from "@/pages/FaceLibrary";
import RealtimeNotifications from "@/components/RealtimeNotifications";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const emptyFilters: FilterState = {
  cameraSerial: null,
  operator: null,
  dateFrom: null,
  dateTo: null,
  search: null,
};

const categoryLabels: Record<string, string> = {
  all: "Todos",
  FaceReco: "Reconhecimento Facial",
  VehicleReco: "Reconhecimento de Veículos",
  AccessControl: "Controle de Acesso",
  MotionDetection: "Detecção de Movimento",
  Alarm: "Alarmes",
};

function getCategoryLabel(key: string): string {
  return categoryLabels[key] || key;
}

// Map sidebar IDs to URL paths
const viewToPath: Record<string, string> = {
  dashboard: "/",
  events: "/events",
  cameras: "/cameras",
  playback: "/playback",
  alerts: "/alerts",
  automations: "/automations",
  "ai-config": "/ai-config",
  "semantic-search": "/semantic-search",
  "ai-summary": "/ai-summary",
  frequencia: "/frequencia",
  "person-timeline": "/person-timeline",
  "visitor-invite": "/visitor-invite",
  "vehicle-access": "/vehicle-access",
  elevator: "/elevator",
  devices: "/devices",
  "ai-box": "/ai-box",
  "face-library": "/face-library",
  vehicles: "/vehicles",
  "system-config": "/system-config",
  "user-admin": "/user-admin",
  "audit-log": "/audit-log",
  settings: "/settings",
};

const pathToView: Record<string, string> = Object.entries(viewToPath).reduce(
  (acc, [view, path]) => { acc[path] = view; return acc; },
  {} as Record<string, string>
);

export default function Dashboard() {
  const [location, navigate] = useLocation();
  // Derive activeView from URL path, fallback to dashboard
  const urlView = pathToView[location] || "dashboard";
  const [activeView, setActiveViewState] = useState(urlView);

  // Sync state when URL changes (e.g., browser back/forward)
  useEffect(() => {
    setActiveViewState(urlView);
  }, [urlView]);

  // Navigate to URL when view changes
  const setActiveView = (view: string) => {
    setActiveViewState(view);
    const path = viewToPath[view] || "/";
    if (path !== location) {
      setPageLoading(true);
      navigate(path);
      setTimeout(() => setPageLoading(false), 300);
    }
  };
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("all");
  const [selectedEvent, setSelectedEvent] = useState<CameraEvent | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [smartFilters, setSmartFilters] = useState<SmartSearchFilters>(defaultSmartFilters);
  const [smartSearchActive, setSmartSearchActive] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const { t } = useI18n();

  const { events, loading, refetch } = useEvents(filters);
  const connectorStatus = useConnectorStatus();

  const categoryCounts = useMemo(() => {
    const counts: Record<CategoryKey, number> = {
      all: events.length,
      FaceReco: 0,
      VehicleReco: 0,
      AccessControl: 0,
      MotionDetection: 0,
      Alarm: 0,
    };
    events.forEach((e) => {
      if (counts[e.operator as CategoryKey] !== undefined) {
        counts[e.operator as CategoryKey]++;
      }
    });
    return counts;
  }, [events]);

  const smartFilteredEvents = useMemo(() => {
    if (!smartSearchActive) return events;
    return events.filter((e) => {
      // Text query
      if (smartFilters.query) {
        const q = smartFilters.query.toLowerCase();
        const name = e.payload?.data?.name?.toLowerCase() || "";
        const plate = e.payload?.data?.plate?.toLowerCase() || "";
        const eventId = e.event_id.toLowerCase();
        const serial = e.camera_serial.toLowerCase();
        if (!name.includes(q) && !plate.includes(q) && !eventId.includes(q) && !serial.includes(q)) return false;
      }
      if (smartFilters.personName) {
        const name = e.payload?.data?.name?.toLowerCase() || "";
        if (!name.includes(smartFilters.personName.toLowerCase())) return false;
      }
      if (smartFilters.plate) {
        const plate = e.payload?.data?.plate?.toLowerCase() || "";
        if (!plate.includes(smartFilters.plate.toLowerCase())) return false;
      }
      if (smartFilters.operator && e.operator !== smartFilters.operator) return false;
      if (smartFilters.direction !== "all") {
        const dir = e.payload?.data?.direction || "";
        if (dir !== smartFilters.direction) return false;
      }
      const score = e.payload?.data?.matchScore ?? 0;
      if (score < smartFilters.scoreMin || score > smartFilters.scoreMax) return false;
      if (smartFilters.timeRange !== "all") {
        const eventTime = new Date(e.timestamp).getTime();
        const now = Date.now();
        const ranges: Record<string, number> = { "1h": 3600000, "6h": 21600000, "24h": 86400000, "7d": 604800000 };
        if (now - eventTime > ranges[smartFilters.timeRange]) return false;
      }
      if (smartFilters.cameraSerial && e.camera_serial !== smartFilters.cameraSerial) return false;
      return true;
    });
  }, [events, smartFilters, smartSearchActive]);

  const categoryFilteredEvents = useMemo(() => {
    const base = smartSearchActive ? smartFilteredEvents : events;
    if (activeCategory === "all") return base;
    return base.filter((e) => e.operator === activeCategory);
  }, [events, smartFilteredEvents, activeCategory, smartSearchActive]);

  const recentEvents = useMemo(() => categoryFilteredEvents.slice(0, 24), [categoryFilteredEvents]);

  const handleEventClick = (event: CameraEvent) => {
    setSelectedEvent(event);
    setViewerOpen(true);
  };

  useEventAlerts(events, handleEventClick);

  const handleCameraClick = (serial: string) => {
    setFilters({ ...emptyFilters, cameraSerial: serial });
    setActiveCategory("all");
    setActiveView("events");
  };

  const handleCategoryChange = (category: CategoryKey) => {
    setActiveCategory(category);
    if (category === "all") {
      setFilters((prev) => ({ ...prev, operator: null }));
    } else {
      setFilters((prev) => ({ ...prev, operator: category }));
    }
  };

  const viewConfig = {
    dashboard: { title: "Dashboard", subtitle: "Visão geral do monitoramento em tempo real" },
    events: { title: "Eventos", subtitle: "Todos os eventos registrados pelo Connector" },
    cameras: { title: "Câmeras", subtitle: "Mosaico de câmeras ao vivo e dispositivos conectados" },
    alerts: { title: "Alertas", subtitle: "Alertas de segurança e anomalias detectadas" },
    playback: { title: "Playback", subtitle: "Reprodução de gravações por canal e data" },
    vehicles: { title: "Biblioteca de Veículos", subtitle: "Veículos cadastrados para reconhecimento de placas" },
    settings: { title: "Config. GuardIA", subtitle: "Configuração do Connector e integrações" },
    "system-config": { title: "Config. Sistema", subtitle: "Rede, sistema e armazenamento do NVR" },
    "user-admin": { title: "Operadores", subtitle: "Administração de usuários e níveis de acesso" },
    "audit-log": { title: "Auditoria", subtitle: "Rastreabilidade de ações dos operadores" },
    automations: { title: "Automações", subtitle: "Regras e automações de segurança" },
    frequencia: { title: "Frequência", subtitle: "Análise de frequência de pessoas" },
    "person-timeline": { title: "Linha do Tempo", subtitle: "Histórico de aparições por pessoa" },
    "vehicle-access": { title: "Acesso de Veículos", subtitle: "Controle de acesso por placa" },
    "visitor-invite": { title: "Convite de Visitantes", subtitle: "Gestão de visitantes e convites" },
    "semantic-search": { title: "Busca Semântica", subtitle: "Busca inteligente por atributos" },
    "ai-summary": { title: "Resumo IA", subtitle: "Resumo automático de eventos por IA" },
    elevator: { title: "Controle de Elevador", subtitle: "Integração com controle de elevadores" },
    "ai-box": { title: "AI Box", subtitle: "Configuração de caixas de IA" },
    devices: { title: "Dispositivos", subtitle: "Gestão de dispositivos conectados" },
    "ai-config": { title: "Config. IA", subtitle: "Configuração de IA por câmera" },
    "face-library": { title: "Biblioteca Facial", subtitle: "Cadastro e gestão de faces" },
  };

  const currentView = viewConfig[activeView as keyof typeof viewConfig] || viewConfig.dashboard;

  // Build breadcrumb from navSections data
  const breadcrumbSections: Record<string, string> = {
    dashboard: t("nav.operacao"), events: t("nav.operacao"), cameras: t("nav.operacao"),
    playback: t("nav.operacao"), alerts: t("nav.operacao"),
    automations: t("nav.inteligencia"), "ai-config": t("nav.inteligencia"),
    "semantic-search": t("nav.inteligencia"), "ai-summary": t("nav.inteligencia"),
    frequencia: t("nav.pessoas-acesso"), "person-timeline": t("nav.pessoas-acesso"),
    "visitor-invite": t("nav.pessoas-acesso"), "vehicle-access": t("nav.pessoas-acesso"),
    elevator: t("nav.pessoas-acesso"),
    devices: t("nav.gestao"), "ai-box": t("nav.gestao"), "face-library": t("nav.gestao"),
    vehicles: t("nav.gestao"), "system-config": t("nav.gestao"),
    "user-admin": t("nav.administracao"), "audit-log": t("nav.administracao"),
    settings: t("nav.administracao"),
  };
  const breadcrumbLabels: Record<string, string> = {
    dashboard: t("nav.dashboard"), events: t("nav.events"), cameras: t("nav.cameras"),
    playback: t("nav.playback"), alerts: t("nav.alerts"),
    automations: t("nav.automations"), "ai-config": t("nav.ai-config"),
    "semantic-search": t("nav.semantic-search"), "ai-summary": t("nav.ai-summary"),
    frequencia: t("nav.frequencia"), "person-timeline": t("nav.person-timeline"),
    "visitor-invite": t("nav.visitor-invite"), "vehicle-access": t("nav.vehicle-access"),
    elevator: t("nav.elevator"), devices: t("nav.devices"), "ai-box": t("nav.ai-box"),
    "face-library": t("nav.face-library"), vehicles: t("nav.vehicles"),
    "system-config": t("nav.system-config"), "user-admin": t("nav.user-admin"),
    "audit-log": t("nav.audit-log"), settings: t("nav.settings"),
  };
  const breadcrumb = activeView !== "dashboard" ? {
    section: breadcrumbSections[activeView] || "",
    label: breadcrumbLabels[activeView] || currentView.title,
  } : undefined;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className="lg:ml-60">
        <MobileHeader onMenuClick={() => setMobileSidebarOpen(true)} />
        <Header
          title={currentView.title}
          subtitle={currentView.subtitle}
          filters={filters}
          onFiltersChange={setFilters}
          onRefresh={refetch}
          totalEvents={events.length}
          breadcrumb={breadcrumb}
          pageLoading={pageLoading}
        />

        <main className="p-6">
          {activeView === "dashboard" && (
            <div className="space-y-5">
              {/* Stats */}
              <StatsBar events={events} />

              {/* Camera mosaic + Timeline */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="xl:col-span-2">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="font-display text-sm font-semibold">Mosaico de Câmeras</h3>
                    <button onClick={() => setActiveView("cameras")} className="text-xs text-primary hover:underline font-medium">Ver todas →</button>
                  </div>
                  <CameraMosaic onCameraClick={handleCameraClick} />
                </div>
                <div>
                  <Timeline24h events={events} />
                </div>
              </div>

              {/* Category tabs */}
              <CategoryTabs
                active={activeCategory}
                onChange={handleCategoryChange}
                counts={categoryCounts}
              />

              {/* Recent events */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-sm font-semibold">
                    {activeCategory === "all" ? "Eventos Recentes" : `${getCategoryLabel(activeCategory)} — Eventos`}
                  </h3>
                  <button onClick={() => setActiveView("events")} className="text-xs text-primary hover:underline font-medium">
                    Ver todos →
                  </button>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="rounded-lg border border-border bg-card overflow-hidden animate-pulse">
                        <div className="aspect-[4/3] bg-muted" />
                        <div className="p-3 space-y-2">
                          <div className="h-4 bg-muted rounded w-2/3" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentEvents.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {recentEvents.map((event) => (
                      <EventCard key={event.id} event={event} onClick={handleEventClick} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === "events" && (
            <div className="space-y-4">
              <SmartSearch
                filters={smartFilters}
                onFiltersChange={(f) => {
                  setSmartFilters(f);
                  setSmartSearchActive(true);
                }}
                events={events}
              />
              <div className="flex items-center justify-between gap-3">
                <CategoryTabs
                  active={activeCategory}
                  onChange={handleCategoryChange}
                  counts={categoryCounts}
                />
                <ExportReports
                  events={categoryFilteredEvents}
                  filters={{
                    category: activeCategory !== "all" ? activeCategory : undefined,
                    search: smartFilters.query || undefined,
                    operator: smartFilters.operator || undefined,
                    cameraSerial: smartFilters.cameraSerial || undefined,
                  }}
                />
              </div>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="rounded-lg border border-border bg-card overflow-hidden animate-pulse">
                      <div className="aspect-[4/3] bg-muted" />
                      <div className="p-3 space-y-2">
                        <div className="h-4 bg-muted rounded w-2/3" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : categoryFilteredEvents.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {categoryFilteredEvents.map((event) => (
                    <EventCard key={event.id} event={event} onClick={handleEventClick} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeView === "cameras" && (
            <div className="space-y-4">
              <CameraMosaic onCameraClick={handleCameraClick} />
              <div className="pt-4">
                <h3 className="font-display text-sm font-semibold mb-3">Lista de Dispositivos</h3>
                <CameraGrid cameras={mockCameras} onCameraClick={handleCameraClick} />
              </div>
            </div>
          )}

          {activeView === "playback" && (
            <div className="embedded-page"><Playback /></div>
          )}

          {activeView === "vehicles" && (
            <div className="embedded-page"><VehicleManagement /></div>
          )}

          {activeView === "alerts" && (
            <div className="embedded-page"><AbsenceAlerts /></div>
          )}

          {activeView === "settings" && (
            <SettingsView connectorStatus={connectorStatus} />
          )}

          {activeView === "system-config" && (
            <div className="embedded-page"><SystemConfig /></div>
          )}

          {activeView === "user-admin" && (
            <div className="embedded-page"><UserAdmin /></div>
          )}

          {activeView === "audit-log" && (
            <div className="embedded-page"><AuditLog /></div>
          )}

          {activeView === "automations" && (
            <div className="embedded-page"><Automations /></div>
          )}

          {activeView === "frequencia" && (
            <div className="embedded-page"><Frequencia /></div>
          )}

          {activeView === "person-timeline" && (
            <div className="embedded-page"><PersonTimeline /></div>
          )}

          {activeView === "vehicle-access" && (
            <div className="embedded-page"><VehicleAccess /></div>
          )}

          {activeView === "visitor-invite" && (
            <div className="embedded-page"><VisitorInvite /></div>
          )}

          {activeView === "semantic-search" && (
            <div className="embedded-page"><SemanticSearch /></div>
          )}

          {activeView === "ai-summary" && (
            <div className="embedded-page"><AISummary /></div>
          )}

          {activeView === "elevator" && (
            <div className="embedded-page"><ElevatorControl /></div>
          )}

          {activeView === "ai-box" && (
            <div className="embedded-page"><AIBox /></div>
          )}

          {activeView === "devices" && (
            <div className="embedded-page"><DeviceManagement /></div>
          )}

          {activeView === "ai-config" && (
            <div className="embedded-page"><AIConfig /></div>
          )}

          {activeView === "face-library" && (
            <div className="embedded-page"><FaceLibrary /></div>
          )}
        </main>
      </div>

      <RealtimeNotifications newEventCount={events.length} events={events} />
      <LanguageSwitcher variant="floating" />

      <ImageViewer
        event={selectedEvent}
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <Inbox className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-display text-base font-semibold mb-1">Nenhum evento encontrado</h3>
      <p className="text-sm text-muted-foreground">Ajuste os filtros ou aguarde novos eventos do Connector.</p>
    </div>
  );
}

function SettingsView({ connectorStatus }: { connectorStatus: any }) {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/15">
            <ShieldCheck className="h-5 w-5 text-green-400" />
          </div>
          <div>
            <h3 className="font-display text-base font-semibold">Connector On-Prem</h3>
            <p className="text-sm text-muted-foreground">Status do serviço local</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse-dot" />
              <span className="font-medium text-green-400">Online</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Última Sincronização</p>
            <span className="font-mono-tech text-xs">há 2 min</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Eventos Pendentes</p>
            <span className="font-mono-tech text-xs">{connectorStatus.pendingEvents}</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Total de Eventos</p>
            <span className="font-mono-tech text-xs">{connectorStatus.totalEvents}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="font-display text-base font-semibold mb-1">Integração Supabase</h3>
        <p className="text-sm text-muted-foreground mb-4">Configuração do banco de dados na nuvem</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Supabase URL</label>
            <div className="mt-1 rounded-lg border border-border bg-muted/50 px-3 py-2 font-mono-tech text-xs text-muted-foreground">
              https://xxxxx.supabase.co
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Service Role Key</label>
            <div className="mt-1 rounded-lg border border-border bg-muted/50 px-3 py-2 font-mono-tech text-xs text-muted-foreground">
              ••••••••••••••••••••••••
            </div>
          </div>
          <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-3">
            <p className="text-xs text-primary">
              Para conectar o dashboard ao Supabase, configure as variáveis <code className="font-mono-tech">VITE_SUPABASE_URL</code> e <code className="font-mono-tech">VITE_SUPABASE_ANON_KEY</code> no arquivo de ambiente.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="font-display text-base font-semibold mb-1">Sobre o GuardIA</h3>
        <p className="text-sm text-muted-foreground">
          GuardIA é uma plataforma de monitoramento de segurança inteligente que integra câmeras P6S com reconhecimento facial, controle de acesso e detecção de veículos. O Connector on-prem garante resiliência offline com sincronização automática para a nuvem.
        </p>
      </div>
    </div>
  );
}
