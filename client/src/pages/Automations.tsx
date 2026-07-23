/**
 * Automations — Lista de regras + editor visual de automações.
 *
 * Lote 2 (3b): Editor visual completo com:
 * - Seleção visual de gatilho (cards clicáveis)
 * - Condições múltiplas (horário, câmera, zona, pessoa)
 * - Ações múltiplas (WhatsApp, push, email, sirene, porta, TTS, snapshot)
 * - Preview do fluxo em tempo real
 * - Validação e salvamento
 */
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import {
  Zap, Plus, Bell, MessageSquare, Siren, DoorOpen, Volume2,
  Clock, Camera, UserX, AlertTriangle, Activity, Power,
  Trash2, Edit2, ChevronRight, X, Check, Mail, Smartphone,
  ScanFace, Car, PersonStanding, Fence, MoveRight, Users2,
  TimerOff, Save, ArrowRight, Layers
} from "lucide-react";
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
    id: "a1", nome: "Estranho fora de horário",
    gatilho: "facial=estranho", gatilhoIcon: UserX,
    condicao: "fora 07h-18h",
    acao: "WhatsApp + snapshot", acaoIcon: MessageSquare,
    ativa: true, disparos: 3, ultimoDisparo: "há 2h",
  },
  {
    id: "a2", nome: "Portaria vazia",
    gatilho: "off-duty", gatilhoIcon: Clock,
    condicao: ">5min sem movimento",
    acao: "avisar supervisor", acaoIcon: Bell,
    ativa: true, disparos: 1, ultimoDisparo: "há 5h",
  },
  {
    id: "a3", nome: "Aluno não chegou",
    gatilho: "ausência facial", gatilhoIcon: AlertTriangle,
    condicao: "até 08h turma 6A",
    acao: "avisar responsável", acaoIcon: MessageSquare,
    ativa: true, disparos: 0, ultimoDisparo: null,
  },
];

const mockDisparos = [
  { id: "d1", automacao: "Estranho fora de horário", hora: "22:14", camera: "D2 Corredor", resultado: "WhatsApp enviado", status: "ok" },
  { id: "d2", automacao: "Portaria vazia", hora: "18:32", camera: "D3 Recepção", resultado: "Notificação supervisor", status: "ok" },
  { id: "d3", automacao: "Estranho fora de horário", hora: "21:47", camera: "D5 COPA", resultado: "WhatsApp enviado", status: "ok" },
  { id: "d4", automacao: "Estranho fora de horário", hora: "20:15", camera: "D2 Corredor", resultado: "WhatsApp enviado", status: "ok" },
];

// Visual editor options
const triggerOptions = [
  { id: "facial-estranho", label: "Facial: Estranho", icon: UserX, color: "text-amber-400", bg: "bg-amber-500/10", desc: "Rosto não cadastrado detectado" },
  { id: "facial-negra", label: "Facial: Lista Negra", icon: ScanFace, color: "text-red-400", bg: "bg-red-500/10", desc: "Rosto da lista negra detectado" },
  { id: "facial-branca", label: "Facial: Lista Branca", icon: ScanFace, color: "text-green-400", bg: "bg-green-500/10", desc: "Pessoa cadastrada reconhecida" },
  { id: "movimento", label: "Detecção de Movimento", icon: PersonStanding, color: "text-blue-400", bg: "bg-blue-500/10", desc: "Movimento na área monitorada" },
  { id: "off-duty", label: "Fora de Horário", icon: TimerOff, color: "text-orange-400", bg: "bg-orange-500/10", desc: "Movimento fora do horário comercial" },
  { id: "ausencia", label: "Ausência Facial", icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10", desc: "Pessoa esperada não apareceu" },
  { id: "veiculo", label: "Veículo Detectado", icon: Car, color: "text-purple-400", bg: "bg-purple-500/10", desc: "Placa ou modelo reconhecido" },
  { id: "cerca", label: "Cerca Eletrônica", icon: Fence, color: "text-cyan-400", bg: "bg-cyan-500/10", desc: "Invasão de área proibida" },
  { id: "linha", label: "Travessia de Linha", icon: MoveRight, color: "text-indigo-400", bg: "bg-indigo-500/10", desc: "Travessia de linha direcional" },
];

const conditionOptions = [
  { id: "horario", label: "Horário", icon: Clock, desc: "Em um horário específico ou intervalo" },
  { id: "camera", label: "Câmera específica", icon: Camera, desc: "Apenas em câmera(s) selecionada(s)" },
  { id: "duracao", label: "Duração mínima", icon: TimerOff, desc: "Evento persiste por X minutos" },
  { id: "pessoa", label: "Pessoa específica", icon: Users2, desc: "Apenas para pessoa(s) cadastrada(s)" },
  { id: "zona", label: "Zona/Região", icon: Fence, desc: "Apenas em zona definida no frame" },
];

const actionOptions = [
  { id: "whatsapp", label: "WhatsApp", icon: MessageSquare, color: "text-green-400", bg: "bg-green-500/10" },
  { id: "push", label: "Push Notification", icon: Smartphone, color: "text-blue-400", bg: "bg-blue-500/10" },
  { id: "email", label: "Email", icon: Mail, color: "text-amber-400", bg: "bg-amber-500/10" },
  { id: "sirene", label: "Sirene", icon: Siren, color: "text-red-400", bg: "bg-red-500/10" },
  { id: "porta", label: "Abrir Porta", icon: DoorOpen, color: "text-green-400", bg: "bg-green-500/10" },
  { id: "tts", label: "TTS (Voz)", icon: Volume2, color: "text-purple-400", bg: "bg-purple-500/10" },
  { id: "snapshot", label: "Snapshot", icon: Camera, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { id: "gravar", label: "Iniciar Gravação", icon: Activity, color: "text-indigo-400", bg: "bg-indigo-500/10" },
];

const acaoIcons: Record<string, typeof Bell> = {
  "WhatsApp": MessageSquare, "snapshot": Camera, "avisar supervisor": Bell,
  "avisar responsável": MessageSquare, "sirene": Siren, "abrir porta": DoorOpen,
  "TTS": Volume2, "push": Bell,
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
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Editor state
  const [ruleName, setRuleName] = useState("");
  const [selectedTrigger, setSelectedTrigger] = useState<string | null>(null);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [conditionParams, setConditionParams] = useState<Record<string, string>>({
    horario: "", camera: "", duracao: "", pessoa: "", zona: "",
  });

  const toggleAutomation = (id: string) => {
    setAutomations(automations.map(a => a.id === id ? { ...a, ativa: !a.ativa } : a));
  };

  const openEditor = (id?: string) => {
    if (id) {
      const rule = automations.find(a => a.id === id);
      if (rule) {
        setEditingId(id);
        setRuleName(rule.nome);
        setSelectedTrigger(null);
        setSelectedConditions([]);
        setSelectedActions([]);
      }
    } else {
      setEditingId(null);
      setRuleName("");
      setSelectedTrigger(null);
      setSelectedConditions([]);
      setSelectedActions([]);
    }
    setShowEditor(true);
  };

  const toggleCondition = (id: string) => {
    setSelectedConditions(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleAction = (id: string) => {
    setSelectedActions(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const canSave = ruleName.trim() && selectedTrigger && selectedActions.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const trigger = triggerOptions.find(t => t.id === selectedTrigger);
    const actions = selectedActions.map(id => actionOptions.find(a => a.id === id)!);
    const condStr = selectedConditions.map(id => {
      const opt = conditionOptions.find(c => c.id === id)!;
      const param = conditionParams[id];
      return param ? `${opt.label}: ${param}` : opt.label;
    }).join(", ");

    if (editingId) {
      setAutomations(automations.map(a => a.id === editingId ? {
        ...a, nome: ruleName,
        gatilho: trigger?.label || a.gatilho,
        gatilhoIcon: trigger?.icon || a.gatilhoIcon,
        condicao: condStr || a.condicao,
        acao: actions.map(a => a.label).join(" + "),
        acaoIcon: actions[0]?.icon || a.acaoIcon,
      } : a));
    } else {
      const newRule: Automation = {
        id: `a${Date.now()}`,
        nome: ruleName,
        gatilho: trigger?.label || "",
        gatilhoIcon: trigger?.icon || AlertTriangle,
        condicao: condStr || "sem condições",
        acao: actions.map(a => a.label).join(" + "),
        acaoIcon: actions[0]?.icon || Bell,
        ativa: true, disparos: 0, ultimoDisparo: null,
      };
      setAutomations([...automations, newRule]);
    }
    setShowEditor(false);
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
              onClick={() => openEditor()}
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
                    <div className="flex-1 space-y-3">
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
                        <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5">
                          <TriggerIcon className="h-3.5 w-3.5 text-amber-400" />
                          <div className="flex flex-col">
                            <span className="text-[8px] text-amber-400/60 font-semibold uppercase">Gatilho</span>
                            <span className="text-xs font-medium text-amber-200">{rule.gatilho}</span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                        <div className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-2.5 py-1.5">
                          <Clock className="h-3.5 w-3.5 text-blue-400" />
                          <div className="flex flex-col">
                            <span className="text-[8px] text-blue-400/60 font-semibold uppercase">Condição</span>
                            <span className="text-xs font-medium text-blue-200">{rule.condicao}</span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                        <div className="flex items-center gap-1.5 rounded-lg bg-purple-500/10 px-2.5 py-1.5">
                          <ActionIcon className="h-3.5 w-3.5 text-purple-400" />
                          <div className="flex flex-col">
                            <span className="text-[8px] text-purple-400/60 font-semibold uppercase">Ação</span>
                            <span className="text-xs font-medium text-purple-200">{rule.acao}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                        <span>{rule.disparos} disparo(s) hoje</span>
                        {rule.ultimoDisparo && <span>Último: {rule.ultimoDisparo}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditor(rule.id)}
                        className="rounded p-1.5 hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
                        title="Editar"
                      >
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

          {/* ===== VISUAL EDITOR MODAL ===== */}
          {showEditor && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
              onClick={() => setShowEditor(false)}
            >
              <div
                className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Editor header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                      <Layers className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-semibold">
                        {editingId ? "Editar Automação" : "Nova Automação"}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">Construa a regra visualmente</p>
                    </div>
                  </div>
                  <button onClick={() => setShowEditor(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Step 1: Name */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Nome da regra</label>
                    <input
                      type="text"
                      value={ruleName}
                      onChange={(e) => setRuleName(e.target.value)}
                      placeholder="Ex: Estranho no fim de semana"
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  {/* Step 2: Trigger */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/15 text-[10px] font-bold text-amber-400">1</div>
                      <h4 className="text-sm font-semibold">Gatilho</h4>
                      <span className="text-[11px] text-muted-foreground">— O que dispara esta automação?</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {triggerOptions.map((t) => {
                        const Icon = t.icon;
                        const isSelected = selectedTrigger === t.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => setSelectedTrigger(t.id)}
                            className={cn(
                              "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all",
                              isSelected
                                ? cn("border-2 ring-1 ring-current", t.bg)
                                : "border-border bg-background hover:border-primary/30"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className={cn("h-4 w-4", t.color)} />
                              <span className="text-xs font-medium">{t.label}</span>
                              {isSelected && <Check className="h-3.5 w-3.5 text-green-400 ml-auto" />}
                            </div>
                            <span className="text-[10px] text-muted-foreground">{t.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 3: Conditions */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/15 text-[10px] font-bold text-blue-400">2</div>
                      <h4 className="text-sm font-semibold">Condições</h4>
                      <span className="text-[11px] text-muted-foreground">— Filtros opcionais (selecione um ou mais)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {conditionOptions.map((c) => {
                        const Icon = c.icon;
                        const isSelected = selectedConditions.includes(c.id);
                        return (
                          <div key={c.id}>
                            <button
                              onClick={() => toggleCondition(c.id)}
                              className={cn(
                                "flex w-full items-center gap-2 rounded-lg border p-2.5 text-left transition-all",
                                isSelected
                                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                                  : "border-border bg-background hover:border-primary/30"
                              )}
                            >
                              <Icon className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                              <div className="flex-1">
                                <span className="text-xs font-medium">{c.label}</span>
                                <p className="text-[10px] text-muted-foreground">{c.desc}</p>
                              </div>
                              {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                            </button>
                            {isSelected && (
                              <input
                                type="text"
                                placeholder={`Parâmetro: ${c.label.toLowerCase()}...`}
                                value={conditionParams[c.id]}
                                onChange={(e) => setConditionParams(prev => ({ ...prev, [c.id]: e.target.value }))}
                                className="mt-1 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-mono-tech"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 4: Actions */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/15 text-[10px] font-bold text-purple-400">3</div>
                      <h4 className="text-sm font-semibold">Ações</h4>
                      <span className="text-[11px] text-muted-foreground">— O que executar quando disparar?</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {actionOptions.map((a) => {
                        const Icon = a.icon;
                        const isSelected = selectedActions.includes(a.id);
                        return (
                          <button
                            key={a.id}
                            onClick={() => toggleAction(a.id)}
                            className={cn(
                              "flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all",
                              isSelected
                                ? cn("border-2 ring-1 ring-current", a.bg)
                                : "border-border bg-background hover:border-primary/30"
                            )}
                          >
                            <Icon className={cn("h-5 w-5", a.color)} />
                            <span className="text-[10px] font-medium text-center">{a.label}</span>
                            {isSelected && <Check className="h-3 w-3 text-green-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Live preview */}
                  {(selectedTrigger || selectedActions.length > 0) && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <p className="text-[10px] font-semibold text-primary uppercase mb-2">Preview do fluxo</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {selectedTrigger && (() => {
                          const t = triggerOptions.find(t => t.id === selectedTrigger)!;
                          const Icon = t.icon;
                          return (
                            <div className={cn("flex items-center gap-1.5 rounded-lg px-2.5 py-1.5", t.bg)}>
                              <Icon className={cn("h-3.5 w-3.5", t.color)} />
                              <span className="text-xs font-medium">{t.label}</span>
                            </div>
                          );
                        })()}
                        {selectedConditions.length > 0 && (
                          <>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                            <div className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-2.5 py-1.5">
                              <span className="text-xs font-medium text-blue-200">
                                {selectedConditions.length} condição(ões)
                              </span>
                            </div>
                          </>
                        )}
                        {selectedActions.length > 0 && (
                          <>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                            <div className="flex items-center gap-1.5 rounded-lg bg-purple-500/10 px-2.5 py-1.5">
                              {selectedActions.map(id => {
                                const a = actionOptions.find(a => a.id === id)!;
                                const Icon = a.icon;
                                return <Icon key={id} className={cn("h-3.5 w-3.5", a.color)} />;
                              })}
                              <span className="text-xs font-medium text-purple-200">
                                {selectedActions.length} ação(ões)
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Editor footer */}
                <div className="sticky bottom-0 flex items-center justify-between border-t border-border bg-card px-6 py-4">
                  <span className={cn(
                    "text-xs",
                    canSave ? "text-green-400" : "text-muted-foreground"
                  )}>
                    {canSave ? (
                      <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> Pronto para salvar</span>
                    ) : (
                      "Preencha nome, gatilho e ao menos uma ação"
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowEditor(false)}
                      className="rounded-md bg-muted px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!canSave}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-medium transition-colors",
                        canSave
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-muted text-muted-foreground cursor-not-allowed"
                      )}
                    >
                      <Save className="h-3.5 w-3.5" /> {editingId ? "Salvar" : "Criar"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
