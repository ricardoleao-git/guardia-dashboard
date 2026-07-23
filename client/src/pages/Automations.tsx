/**
 * Automations — Lista de regras de automação evento→condição→ação.
 *
 * Dados mock da bancada (spec 05): 3 automações reais.
 * Toggle ativa/inativa, badges de gatilho/condição/ação, log de disparos.
 */
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import { Zap, Plus, Bell, MessageSquare, Siren, DoorOpen, Volume2, Clock, Camera, UserX, AlertTriangle, Activity, Power, Trash2, Edit2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Automation {
  id: string;
  nome: string;
  gatilho: string;
  gatilhoIcon: typeof UserX;
  condicao: string;
  acao: string;
  acaoIcon: typeof Bell;
  ativa: boolean;
  disparos: number;
  ultimoDisparo: string | null;
}

const mockAutomations: Automation[] = [
  {
    id: "a1",
    nome: "Estranho fora de horário",
    gatilho: "facial=estranho",
    gatilhoIcon: UserX,
    condicao: "fora 07h-18h",
    acao: "WhatsApp + snapshot",
    acaoIcon: MessageSquare,
    ativa: true,
    disparos: 3,
    ultimoDisparo: "há 2h",
  },
  {
    id: "a2",
    nome: "Portaria vazia",
    gatilho: "off-duty",
    gatilhoIcon: Clock,
    condicao: ">5min sem movimento",
    acao: "avisar supervisor",
    acaoIcon: Bell,
    ativa: true,
    disparos: 1,
    ultimoDisparo: "há 5h",
  },
  {
    id: "a3",
    nome: "Aluno não chegou",
    gatilho: "ausência facial",
    gatilhoIcon: AlertTriangle,
    condicao: "até 08h turma 6A",
    acao: "avisar responsável",
    acaoIcon: MessageSquare,
    ativa: true,
    disparos: 0,
    ultimoDisparo: null,
  },
];

// Log de disparos recentes
const mockDisparos = [
  { id: "d1", automacao: "Estranho fora de horário", hora: "22:14", camera: "D2 Corredor", resultado: "WhatsApp enviado", status: "ok" },
  { id: "d2", automacao: "Portaria vazia", hora: "18:32", camera: "D3 Recepção", resultado: "Notificação supervisor", status: "ok" },
  { id: "d3", automacao: "Estranho fora de horário", hora: "21:47", camera: "D5 COPA", resultado: "WhatsApp enviado", status: "ok" },
  { id: "d4", automacao: "Estranho fora de horário", hora: "20:15", camera: "D2 Corredor", resultado: "WhatsApp enviado", status: "ok" },
];

const acaoIcons: Record<string, typeof Bell> = {
  "WhatsApp": MessageSquare,
  "snapshot": Camera,
  "avisar supervisor": Bell,
  "avisar responsável": MessageSquare,
  "sirene": Siren,
  "abrir porta": DoorOpen,
  "TTS": Volume2,
  "push": Bell,
};

function getAcaoIcon(acao: string): typeof Bell {
  for (const key of Object.keys(acaoIcons)) {
    if (acao.toLowerCase().includes(key.toLowerCase())) return acaoIcons[key];
  }
  return Bell;
}

export default function Automations() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [automations, setAutomations] = useState(mockAutomations);
  const [showNewModal, setShowNewModal] = useState(false);

  const toggleAutomation = (id: string) => {
    setAutomations(automations.map(a => a.id === id ? { ...a, ativa: !a.ativa } : a));
  };

  const activeCount = automations.filter(a => a.ativa).length;
  const totalDisparos = automations.reduce((acc, a) => acc + a.disparos, 0);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        activeView="automations"
        onNavigate={() => {}}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className="lg:ml-60">
        <MobileHeader onMenuClick={() => setMobileSidebarOpen(true)} />

        {/* Page header */}
        <div className="border-b border-border bg-card/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-400" />
                Automações
              </h2>
              <p className="text-xs text-muted-foreground">Regras evento → condição → ação</p>
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Nova Automação
            </button>
          </div>
        </div>

        <main className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <Zap className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <p className="font-display text-xl font-bold">{automations.length}</p>
                  <p className="text-[11px] text-muted-foreground">Total de regras</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                  <Power className="h-4 w-4 text-green-400" />
                </div>
                <div>
                  <p className="font-display text-xl font-bold">{activeCount}</p>
                  <p className="text-[11px] text-muted-foreground">Ativas</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                  <Activity className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <p className="font-display text-xl font-bold">{totalDisparos}</p>
                  <p className="text-[11px] text-muted-foreground">Disparos hoje</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rule list */}
          <div className="space-y-3">
            <h3 className="font-display text-sm font-semibold text-muted-foreground">Regras configuradas</h3>
            {automations.map((rule) => {
              const TriggerIcon = rule.gatilhoIcon;
              const ActionIcon = getAcaoIcon(rule.acao);
              return (
                <div
                  key={rule.id}
                  className={cn(
                    "rounded-xl border bg-card p-4 transition-all",
                    rule.ativa ? "border-border hover:border-primary/30" : "border-border/50 opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: rule info */}
                    <div className="flex-1 space-y-3">
                      {/* Name + toggle */}
                      <div className="flex items-center gap-3">
                        <h4 className="font-display text-sm font-semibold">{rule.nome}</h4>
                        <button
                          onClick={() => toggleAutomation(rule.id)}
                          className={cn(
                            "relative h-5 w-9 rounded-full transition-colors",
                            rule.ativa ? "bg-green-500" : "bg-muted"
                          )}
                        >
                          <div className={cn(
                            "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                            rule.ativa ? "translate-x-4" : "translate-x-0.5"
                          )} />
                        </button>
                        {rule.ativa && (
                          <span className="rounded bg-green-500/15 px-1.5 py-0.5 text-[9px] font-bold text-green-400">ATIVA</span>
                        )}
                      </div>

                      {/* Flow: gatilho → condição → ação */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Gatilho */}
                        <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5">
                          <TriggerIcon className="h-3.5 w-3.5 text-amber-400" />
                          <div className="flex flex-col">
                            <span className="text-[8px] text-amber-400/60 font-semibold uppercase">Gatilho</span>
                            <span className="text-xs font-medium text-amber-200">{rule.gatilho}</span>
                          </div>
                        </div>

                        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />

                        {/* Condição */}
                        <div className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-2.5 py-1.5">
                          <Clock className="h-3.5 w-3.5 text-blue-400" />
                          <div className="flex flex-col">
                            <span className="text-[8px] text-blue-400/60 font-semibold uppercase">Condição</span>
                            <span className="text-xs font-medium text-blue-200">{rule.condicao}</span>
                          </div>
                        </div>

                        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />

                        {/* Ação */}
                        <div className="flex items-center gap-1.5 rounded-lg bg-purple-500/10 px-2.5 py-1.5">
                          <ActionIcon className="h-3.5 w-3.5 text-purple-400" />
                          <div className="flex flex-col">
                            <span className="text-[8px] text-purple-400/60 font-semibold uppercase">Ação</span>
                            <span className="text-xs font-medium text-purple-200">{rule.acao}</span>
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                        <span>{rule.disparos} disparo(s) hoje</span>
                        {rule.ultimoDisparo && <span>Último: {rule.ultimoDisparo}</span>}
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-1">
                      <button className="rounded p-1.5 hover:bg-accent text-muted-foreground hover:text-primary transition-colors" title="Editar">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button className="rounded p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Excluir">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Disparos recentes */}
          <div className="space-y-3">
            <h3 className="font-display text-sm font-semibold text-muted-foreground">Disparos recentes</h3>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Hora</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Automação</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Câmera</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Resultado</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mockDisparos.map((d) => (
                    <tr key={d.id} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                      <td className="px-3 py-2.5 text-xs font-mono-tech">{d.hora}</td>
                      <td className="px-3 py-2.5 text-xs font-medium">{d.automacao}</td>
                      <td className="px-3 py-2.5 text-xs font-mono-tech text-muted-foreground">{d.camera}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{d.resultado}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-semibold text-green-400">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-400" /> OK
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* New automation modal placeholder */}
          {showNewModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              onClick={() => setShowNewModal(false)}
            >
              <div
                className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-base font-semibold">Nova Automação</h3>
                  <button onClick={() => setShowNewModal(false)} className="text-muted-foreground hover:text-foreground">
                    ✕
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  O editor visual completo será implementado na próxima iteração. Esta versão lista e gerencia regras existentes.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Nome da regra</label>
                    <input
                      type="text"
                      placeholder="Ex: Estranho no fim de semana"
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-amber-400/60 uppercase">Gatilho</label>
                      <select className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-xs">
                        <option>facial=estranho</option>
                        <option>facial=lista negra</option>
                        <option>movimento</option>
                        <option>off-duty</option>
                        <option>ausência facial</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-blue-400/60 uppercase">Condição</label>
                      <input
                        type="text"
                        placeholder="Ex: fora 07h-18h"
                        className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-purple-400/60 uppercase">Ação</label>
                      <select className="mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-xs">
                        <option>WhatsApp + snapshot</option>
                        <option>avisar supervisor</option>
                        <option>avisar responsável</option>
                        <option>sirene</option>
                        <option>abrir porta</option>
                        <option>TTS</option>
                        <option>push notification</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowNewModal(false)}
                    className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Criar Automação
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
