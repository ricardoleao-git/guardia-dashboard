/**
 * Automations — Lista de regras + editor visual com drag-and-drop.
 *
 * Aprimorado: Editor visual com fluxo construído por arrastar e soltar.
 * - Gatilho, condições e ações aparecem como blocos arrastáveis no fluxo
 * - Reordenação por drag-and-drop nativo HTML5
 * - Remoção de itens ao arrastar para zona de descarte
 * - Preview do fluxo em tempo real com indicadores visuais de drop
 * - Validação e salvamento
 */
import { useState, useRef, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import {
  Zap, Plus, Bell, MessageSquare, Siren, DoorOpen, Volume2,
  Clock, Camera, UserX, AlertTriangle, Activity, Power,
  Trash2, Edit2, ChevronRight, X, Check, Mail, Smartphone,
  ScanFace, Car, PersonStanding, Fence, MoveRight, Users2,
  TimerOff, Save, ArrowRight, Layers, GripVertical, Trash,
  Eye, EyeOff, Sparkles, Copy, Calendar, Moon, Sun,
  Building2, GraduationCap, ShieldAlert, Wrench
} from "lucide-react";
import { cn } from "@/lib/utils";

// ===== Types =====
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

type FlowItemType = "trigger" | "condition" | "action";

interface FlowItem {
  uid: string;
  type: FlowItemType;
  optionId: string;
  label: string;
  icon: typeof Bell;
  color: string;
  bg: string;
  param?: string;
}

// ===== Mock Data =====
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

// ===== Editor Options =====
const triggerOptions = [
  { id: "facial-estranho", label: "Facial: Estranho", icon: UserX, color: "text-amber-400", bg: "bg-amber-500/10", desc: "Rosto não cadastrado" },
  { id: "facial-negra", label: "Facial: Lista Negra", icon: ScanFace, color: "text-red-400", bg: "bg-red-500/10", desc: "Rosto da lista negra" },
  { id: "facial-branca", label: "Facial: Lista Branca", icon: ScanFace, color: "text-green-400", bg: "bg-green-500/10", desc: "Pessoa cadastrada" },
  { id: "movimento", label: "Movimento", icon: PersonStanding, color: "text-blue-400", bg: "bg-blue-500/10", desc: "Movimento na área" },
  { id: "off-duty", label: "Fora de Horário", icon: TimerOff, color: "text-orange-400", bg: "bg-orange-500/10", desc: "Fora do horário comercial" },
  { id: "ausencia", label: "Ausência Facial", icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10", desc: "Pessoa não apareceu" },
  { id: "veiculo", label: "Veículo Detectado", icon: Car, color: "text-purple-400", bg: "bg-purple-500/10", desc: "Placa reconhecida" },
  { id: "cerca", label: "Cerca Eletrônica", icon: Fence, color: "text-cyan-400", bg: "bg-cyan-500/10", desc: "Invasão de área" },
  { id: "linha", label: "Travessia de Linha", icon: MoveRight, color: "text-indigo-400", bg: "bg-indigo-500/10", desc: "Linha direcional" },
];

const conditionOptions = [
  { id: "horario", label: "Horário", icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10", desc: "Horário ou intervalo" },
  { id: "camera", label: "Câmera", icon: Camera, color: "text-blue-400", bg: "bg-blue-500/10", desc: "Câmera(s) específica(s)" },
  { id: "duracao", label: "Duração mín.", icon: TimerOff, color: "text-blue-400", bg: "bg-blue-500/10", desc: "Persiste por X min" },
  { id: "pessoa", label: "Pessoa", icon: Users2, color: "text-blue-400", bg: "bg-blue-500/10", desc: "Pessoa(s) específica(s)" },
  { id: "zona", label: "Zona/Região", icon: Fence, color: "text-blue-400", bg: "bg-blue-500/10", desc: "Zona no frame" },
];

const actionOptions = [
  { id: "whatsapp", label: "WhatsApp", icon: MessageSquare, color: "text-green-400", bg: "bg-green-500/10" },
  { id: "push", label: "Push", icon: Smartphone, color: "text-blue-400", bg: "bg-blue-500/10" },
  { id: "email", label: "Email", icon: Mail, color: "text-amber-400", bg: "bg-amber-500/10" },
  { id: "sirene", label: "Sirene", icon: Siren, color: "text-red-400", bg: "bg-red-500/10" },
  { id: "porta", label: "Abrir Porta", icon: DoorOpen, color: "text-green-400", bg: "bg-green-500/10" },
  { id: "tts", label: "TTS (Voz)", icon: Volume2, color: "text-purple-400", bg: "bg-purple-500/10" },
  { id: "snapshot", label: "Snapshot", icon: Camera, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { id: "gravar", label: "Gravação", icon: Activity, color: "text-indigo-400", bg: "bg-indigo-500/10" },
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

// ===== Pre-configured Templates =====
interface AutomationTemplate {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  icon: typeof Bell;
  triggerId: string;
  conditions: { id: string; param?: string }[];
  actions: string[];
}

const automationTemplates: AutomationTemplate[] = [
  {
    id: "tpl-ausencia-aluno",
    nome: "Ausência de Aluno",
    descricao: "Avisa responsável quando aluno não chega até horário limite",
    categoria: "Educação",
    icon: GraduationCap,
    triggerId: "ausencia",
    conditions: [{ id: "horario", param: "até 08h00" }, { id: "pessoa", param: "turma 6A" }],
    actions: ["whatsapp", "email"],
  },
  {
    id: "tpl-atraso-manha",
    nome: "Atraso Matutino",
    descricao: "Alerta quando funcionário chega após 08h15",
    categoria: "Presença",
    icon: Clock,
    triggerId: "facial-branca",
    conditions: [{ id: "horario", param: "após 08h15" }, { id: "camera", param: "D3 Recepção" }],
    actions: ["push", "email"],
  },
  {
    id: "tpl-estranho-noturno",
    nome: "Estranho Fora de Horário",
    descricao: "Detecta rosto desconhecido no período noturno",
    categoria: "Segurança",
    icon: ShieldAlert,
    triggerId: "facial-estranho",
    conditions: [{ id: "horario", param: "18h00-07h00" }, { id: "duracao", param: "30s" }],
    actions: ["whatsapp", "snapshot", "sirene"],
  },
  {
    id: "tpl-lista-negra",
    nome: "Lista Negra Detectada",
    descricao: "Pessoa da lista negra reconhecida em qualquer câmera",
    categoria: "Segurança",
    icon: ScanFace,
    triggerId: "facial-negra",
    conditions: [],
    actions: ["whatsapp", "push", "sirene", "snapshot"],
  },
  {
    id: "tpl-portaria-vazia",
    nome: "Portaria Vazia",
    descricao: "Sem movimento na portaria por mais de 5 minutos",
    categoria: "Operacional",
    icon: Building2,
    triggerId: "off-duty",
    conditions: [{ id: "camera", param: "D3 Recepção" }, { id: "duracao", param: "5min" }],
    actions: ["push", "email"],
  },
  {
    id: "tpl-entrada-fora-horario",
    nome: "Entrada Fora de Horário",
    descricao: "Movimento detectado fora do expediente",
    categoria: "Segurança",
    icon: Moon,
    triggerId: "movimento",
    conditions: [{ id: "horario", param: "após 19h00" }, { id: "camera", param: "D2 Corredor" }],
    actions: ["whatsapp", "snapshot", "gravar"],
  },
  {
    id: "tpl-cerca-eletronica",
    nome: "Invasão de Cerca",
    descricao: "Pessoa atravessa cerca eletrônica virtual",
    categoria: "Segurança",
    icon: Fence,
    triggerId: "cerca",
    conditions: [{ id: "camera", param: "D1 Estacionamento" }],
    actions: ["sirene", "whatsapp", "snapshot"],
  },
  {
    id: "tpl-veiculo-estacionamento",
    nome: "Veículo no Estacionamento",
    descricao: "Veículo detectado no estacionamento fora do horário",
    categoria: "Operacional",
    icon: Car,
    triggerId: "veiculo",
    conditions: [{ id: "horario", param: "22h00-06h00" }, { id: "camera", param: "D1 Estacionamento" }],
    actions: ["snapshot", "push"],
  },
  {
    id: "tpl-saida-antecipada",
    nome: "Saída Antecipada",
    descricao: "Funcionário sai antes do horário de saída",
    categoria: "Presença",
    icon: Sun,
    triggerId: "facial-branca",
    conditions: [{ id: "horario", param: "antes de 17h30" }, { id: "camera", param: "D3 Recepção" }],
    actions: ["push", "email"],
  },
  {
    id: "tpl-manutencao",
    nome: "Manutenção Programada",
    descricao: "Lembrete de manutenção por detecção de movimento em sala técnica",
    categoria: "Operacional",
    icon: Wrench,
    triggerId: "movimento",
    conditions: [{ id: "camera", param: "D6 Sala Téc" }, { id: "horario", param: "janela 06h-07h" }],
    actions: ["push", "email"],
  },
];

// ===== Helper to create flow items =====
let uidCounter = 0;
function makeUid() { return `fi_${++uidCounter}_${Date.now()}`; }

function triggerToFlowItem(optionId: string): FlowItem | null {
  const t = triggerOptions.find(t => t.id === optionId);
  if (!t) return null;
  return { uid: makeUid(), type: "trigger", optionId: t.id, label: t.label, icon: t.icon, color: t.color, bg: t.bg };
}

function conditionToFlowItem(optionId: string, param?: string): FlowItem | null {
  const c = conditionOptions.find(c => c.id === optionId);
  if (!c) return null;
  return { uid: makeUid(), type: "condition", optionId: c.id, label: c.label, icon: c.icon, color: c.color, bg: c.bg, param };
}

function actionToFlowItem(optionId: string): FlowItem | null {
  const a = actionOptions.find(a => a.id === optionId);
  if (!a) return null;
  return { uid: makeUid(), type: "action", optionId: a.id, label: a.label, icon: a.icon, color: a.color, bg: a.bg };
}

// ===== Main Component =====
export default function Automations() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [automations, setAutomations] = useState(mockAutomations);
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Editor state
  const [ruleName, setRuleName] = useState("");
  const [flowItems, setFlowItems] = useState<FlowItem[]>([]);
  const [conditionParams, setConditionParams] = useState<Record<string, string>>({});
  const [showFlowBuilder, setShowFlowBuilder] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);

  // Drag-and-drop state
  const [draggedUid, setDraggedUid] = useState<string | null>(null);
  const [dragOverUid, setDragOverUid] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverTrash, setDragOverTrash] = useState(false);
  const dragCounter = useRef(0);

  // Palette drag state (drag from palette to canvas)
  const [paletteDragType, setPaletteDragType] = useState<string | null>(null); // "trigger" | "condition" | "action"
  const [paletteDragId, setPaletteDragId] = useState<string | null>(null);
  const [canvasDragOver, setCanvasDragOver] = useState(false);

  const toggleAutomation = (id: string) => {
    setAutomations(automations.map(a => a.id === id ? { ...a, ativa: !a.ativa } : a));
  };

  const applyTemplate = (tpl: AutomationTemplate) => {
    setEditingId(null);
    setRuleName(tpl.nome);
    const items: FlowItem[] = [];
    const trig = triggerToFlowItem(tpl.triggerId);
    if (trig) items.push(trig);
    tpl.conditions.forEach(c => {
      const item = conditionToFlowItem(c.id, c.param);
      if (item) items.push(item);
    });
    tpl.actions.forEach(a => {
      const item = actionToFlowItem(a);
      if (item) items.push(item);
    });
    setFlowItems(items);
    setShowTemplates(false);
    setShowEditor(true);
  };

  const openEditor = (id?: string) => {
    if (id) {
      const rule = automations.find(a => a.id === id);
      if (rule) {
        setEditingId(id);
        setRuleName(rule.nome);
        // Reconstruct flow from existing rule
        const items: FlowItem[] = [];
        const trig = triggerOptions.find(t => t.label === rule.gatilho);
        if (trig) items.push(triggerToFlowItem(trig.id)!);
        // Parse conditions
        rule.condicao.split(", ").forEach(cond => {
          const parts = cond.split(": ");
          const opt = conditionOptions.find(c => c.label === parts[0]);
          if (opt) items.push(conditionToFlowItem(opt.id, parts[1])!);
        });
        // Parse actions
        rule.acao.split(" + ").forEach(act => {
          const opt = actionOptions.find(a => a.label === act);
          if (opt) items.push(actionToFlowItem(opt.id)!);
        });
        setFlowItems(items);
      }
    } else {
      setEditingId(null);
      setRuleName("");
      setFlowItems([]);
    }
    setConditionParams({});
    setShowEditor(true);
  };

  // ===== Flow item management =====
  const addTrigger = (optionId: string) => {
    // Replace existing trigger (only one allowed)
    const existing = flowItems.find(i => i.type === "trigger");
    if (existing) {
      setFlowItems(prev => prev.map(i => i.type === "trigger" ? triggerToFlowItem(optionId)! : i));
    } else {
      const item = triggerToFlowItem(optionId);
      if (item) setFlowItems(prev => [item, ...prev]);
    }
  };

  const addCondition = (optionId: string) => {
    // Toggle: if already in flow, remove; otherwise add
    const existing = flowItems.find(i => i.type === "condition" && i.optionId === optionId);
    if (existing) {
      removeFlowItem(existing.uid);
    } else {
      const item = conditionToFlowItem(optionId, conditionParams[optionId]);
      if (item) {
        // Insert after trigger (and after existing conditions), before actions
        setFlowItems(prev => {
          const triggerIdx = prev.findIndex(i => i.type === "trigger");
          const lastCondIdx = prev.map(i => i.type).lastIndexOf("condition");
          const insertIdx = lastCondIdx >= 0 ? lastCondIdx + 1 : (triggerIdx >= 0 ? triggerIdx + 1 : 0);
          const newArr = [...prev];
          newArr.splice(insertIdx, 0, item);
          return newArr;
        });
      }
    }
  };

  const addAction = (optionId: string) => {
    const existing = flowItems.find(i => i.type === "action" && i.optionId === optionId);
    if (existing) {
      removeFlowItem(existing.uid);
    } else {
      const item = actionToFlowItem(optionId);
      if (item) setFlowItems(prev => [...prev, item]);
    }
  };

  const removeFlowItem = (uid: string) => {
    setFlowItems(prev => prev.filter(i => i.uid !== uid));
  };

  const updateFlowItemParam = (uid: string, param: string) => {
    setFlowItems(prev => prev.map(i => i.uid === uid ? { ...i, param } : i));
  };

  // ===== Drag-and-drop handlers =====
  const handleDragStart = useCallback((e: React.DragEvent, uid: string) => {
    setDraggedUid(uid);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", uid);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedUid(null);
    setDragOverUid(null);
    setIsDragging(false);
    setDragOverTrash(false);
    dragCounter.current = 0;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, uid: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (uid !== draggedUid) setDragOverUid(uid);
  }, [draggedUid]);

  const handleDragOverTrashZone = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverTrash(true);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetUid: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedUid || draggedUid === targetUid) return;

    const draggedItem = flowItems.find(i => i.uid === draggedUid);
    const targetItem = flowItems.find(i => i.uid === targetUid);
    if (!draggedItem || !targetItem) return;

    // Enforce ordering: trigger can't move past conditions/actions
    if (draggedItem.type === "trigger" && targetItem.type !== "trigger") return;
    if (targetItem.type === "trigger" && draggedItem.type !== "trigger") return;

    setFlowItems(prev => {
      const newArr = [...prev];
      const fromIdx = newArr.findIndex(i => i.uid === draggedUid);
      const toIdx = newArr.findIndex(i => i.uid === targetUid);
      const [moved] = newArr.splice(fromIdx, 1);
      newArr.splice(toIdx, 0, moved);
      return newArr;
    });

    handleDragEnd();
  }, [draggedUid, flowItems, handleDragEnd]);

  const handleDropToTrash = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedUid) return;
    const item = flowItems.find(i => i.uid === draggedUid);
    if (item && item.type !== "trigger") {
      removeFlowItem(draggedUid);
    }
    handleDragEnd();
  }, [draggedUid, flowItems, handleDragEnd]);

  // ===== Palette drag handlers (palette → canvas) =====
  const handlePaletteDragStart = useCallback((e: React.DragEvent, type: string, optionId: string) => {
    setPaletteDragType(type);
    setPaletteDragId(optionId);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", `palette:${type}:${optionId}`);
  }, []);

  const handlePaletteDragEnd = useCallback(() => {
    setPaletteDragType(null);
    setPaletteDragId(null);
    setIsDragging(false);
    setCanvasDragOver(false);
  }, []);

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    // Only show canvas highlight if dragging from palette
    if (paletteDragType) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setCanvasDragOver(true);
    }
  }, [paletteDragType]);

  const handleCanvasDragLeave = useCallback(() => {
    setCanvasDragOver(false);
  }, []);

  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    if (!paletteDragType || !paletteDragId) return;
    e.preventDefault();
    e.stopPropagation();
    if (paletteDragType === "trigger") {
      addTrigger(paletteDragId);
    } else if (paletteDragType === "condition") {
      addCondition(paletteDragId);
    } else if (paletteDragType === "action") {
      addAction(paletteDragId);
    }
    handlePaletteDragEnd();
  }, [paletteDragType, paletteDragId, addTrigger, addCondition, addAction, handlePaletteDragEnd]);

  // ===== Save =====
  const triggerItem = flowItems.find(i => i.type === "trigger");
  const conditionItems = flowItems.filter(i => i.type === "condition");
  const actionItems = flowItems.filter(i => i.type === "action");
  const canSave = ruleName.trim() && triggerItem && actionItems.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const condStr = conditionItems.map(c => c.param ? `${c.label}: ${c.param}` : c.label).join(", ");
    const actionStr = actionItems.map(a => a.label).join(" + ");

    if (editingId) {
      setAutomations(automations.map(a => a.id === editingId ? {
        ...a, nome: ruleName,
        gatilho: triggerItem!.label,
        gatilhoIcon: triggerItem!.icon,
        condicao: condStr || "sem condições",
        acao: actionStr,
        acaoIcon: actionItems[0].icon,
      } : a));
    } else {
      const newRule: Automation = {
        id: `a${Date.now()}`,
        nome: ruleName,
        gatilho: triggerItem!.label,
        gatilhoIcon: triggerItem!.icon,
        condicao: condStr || "sem condições",
        acao: actionStr,
        acaoIcon: actionItems[0].icon,
        ativa: true, disparos: 0, ultimoDisparo: null,
      };
      setAutomations([...automations, newRule]);
    }
    setShowEditor(false);
  };

  const activeCount = automations.filter(a => a.ativa).length;
  const totalDisparos = automations.reduce((acc, a) => acc + a.disparos, 0);

  // Check if option is in flow
  const isInFlow = (type: FlowItemType, optionId: string) =>
    flowItems.some(i => i.type === type && i.optionId === optionId);

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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTemplates(true)}
                className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" /> Templates
              </button>
              <button
                onClick={() => openEditor()}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Nova Automação
              </button>
            </div>
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

          {/* ===== TEMPLATES MODAL ===== */}
          {showTemplates && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
              onClick={() => setShowTemplates(false)}
            >
              <div
                className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl border border-border bg-card shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Templates header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
                      <Sparkles className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-semibold">Templates de Automação</h3>
                      <p className="text-[11px] text-muted-foreground">Clique para criar uma regra pré-configurada</p>
                    </div>
                  </div>
                  <button onClick={() => setShowTemplates(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Templates grid */}
                <div className="p-6">
                  {/* Category filter chips */}
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    {Array.from(new Set(automationTemplates.map(t => t.categoria))).map(cat => (
                      <span key={cat} className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                        {cat}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {automationTemplates.map((tpl) => {
                      const Icon = tpl.icon;
                      const trigOpt = triggerOptions.find(t => t.id === tpl.triggerId);
                      const actOpts = tpl.actions.map(a => actionOptions.find(o => o.id === a)!).filter(Boolean);
                      return (
                        <button
                          key={tpl.id}
                          onClick={() => applyTemplate(tpl)}
                          className="group flex flex-col gap-3 rounded-xl border border-border bg-background p-4 text-left transition-all hover:border-primary/40 hover:shadow-md"
                        >
                          {/* Template header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", trigOpt?.bg || "bg-muted")}>
                                <Icon className={cn("h-4.5 w-4.5", trigOpt?.color || "text-muted-foreground")} />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold">{tpl.nome}</span>
                                <span className="text-[10px] text-muted-foreground">{tpl.categoria}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[9px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                              <Copy className="h-3 w-3" /> USAR
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{tpl.descricao}</p>

                          {/* Flow preview */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {trigOpt && (
                              <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-medium", trigOpt.bg, trigOpt.color)}>
                                {trigOpt.label}
                              </span>
                            )}
                            {tpl.conditions.map(c => {
                              const opt = conditionOptions.find(o => o.id === c.id);
                              return opt ? (
                                <span key={c.id} className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-medium text-blue-300">
                                  {opt.label}{c.param ? `: ${c.param}` : ""}
                                </span>
                              ) : null;
                            })}
                            <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
                            {actOpts.map(a => (
                              <span key={a.id} className={cn("rounded px-1.5 py-0.5 text-[9px] font-medium", a.bg, a.color)}>
                                {a.label}
                              </span>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Footer hint */}
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <p className="text-[11px] text-muted-foreground">
                      Ao clicar em um template, o editor visual abre com todos os campos pré-preenchidos. Você pode ajustar parâmetros antes de salvar.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== VISUAL EDITOR MODAL WITH DRAG-AND-DROP ===== */}
          {showEditor && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
              onClick={() => setShowEditor(false)}
            >
              <div
                className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-xl border border-border bg-card shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Editor header */}
                <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                      <Layers className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-semibold">
                        {editingId ? "Editar Automação" : "Nova Automação"}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">Arraste os blocos para montar o fluxo</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowFlowBuilder(!showFlowBuilder)}
                      className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-accent transition-colors"
                      title="Alternar visualização do fluxo"
                    >
                      {showFlowBuilder ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      Fluxo
                    </button>
                    <button onClick={() => setShowEditor(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-5">
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

                  {/* ===== FLOW BUILDER (DRAG-AND-DROP) ===== */}
                  {showFlowBuilder && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">F</div>
                        <h4 className="text-sm font-semibold">Fluxo Construído</h4>
                        <span className="text-[11px] text-muted-foreground">— Arraste para reordenar. Arraste para a lixeira para remover.</span>
                      </div>

                      {/* Flow canvas with snap-grid and palette drop target */}
                      <div
                        onDragOver={handleCanvasDragOver}
                        onDragLeave={handleCanvasDragLeave}
                        onDrop={handleCanvasDrop}
                        className={cn(
                          "min-h-[80px] rounded-xl border-2 border-dashed p-4 transition-all flow-snap-grid",
                          canvasDragOver
                            ? "border-primary/60 bg-primary/10 scale-[1.01]"
                            : isDragging
                              ? "border-primary/50 bg-primary/5"
                              : "border-border bg-background"
                        )}
                      >
                        {flowItems.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <Layers className={cn("h-8 w-8 mb-2 transition-colors", canvasDragOver ? "text-primary/60" : "text-muted-foreground/30")} />
                            <p className="text-xs text-muted-foreground">
                              {canvasDragOver
                                ? "Solte aqui para adicionar ao fluxo"
                                : "Arraste um gatilho, condições e ações abaixo para montar o fluxo"}
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-0 flex-wrap">
                            {flowItems.map((item, idx) => {
                              const Icon = item.icon;
                              const isDragged = draggedUid === item.uid;
                              const isDragOver = dragOverUid === item.uid;
                              const typeLabel = item.type === "trigger" ? "Gatilho" : item.type === "condition" ? "Condição" : "Ação";
                              const typeColor = item.type === "trigger" ? "text-amber-400/60" : item.type === "condition" ? "text-blue-400/60" : "text-purple-400/60";

                              return (
                                <div key={item.uid} className="flex items-center gap-0">
                                  {/* Animated connector between items */}
                                  {idx > 0 && (
                                    <div className={cn(
                                      "flow-connector",
                                      isDragged && "opacity-30"
                                    )} />
                                  )}

                                  {/* Draggable flow block with snap */}
                                  <div
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, item.uid)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={(e) => handleDragOver(e, item.uid)}
                                    onDrop={(e) => handleDrop(e, item.uid)}
                                    className={cn(
                                      "flow-block-snap group relative flex items-center gap-2 rounded-lg border px-3 py-2 cursor-grab active:cursor-grabbing",
                                      item.bg,
                                      isDragged && "dragging opacity-40",
                                      isDragOver && "snap-over ring-2 ring-primary/50",
                                      !isDragged && !isDragOver && "hover:shadow-md"
                                    )}
                                  >
                                    {/* Drag handle */}
                                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />

                                    {/* Icon */}
                                    <Icon className={cn("h-4 w-4 shrink-0", item.color)} />

                                    {/* Label + type */}
                                    <div className="flex flex-col min-w-0">
                                      <span className={cn("text-[8px] font-semibold uppercase", typeColor)}>{typeLabel}</span>
                                      <span className="text-xs font-medium truncate">{item.label}</span>
                                      {item.param && (
                                        <span className="text-[9px] text-muted-foreground font-mono-tech truncate">{item.param}</span>
                                      )}
                                    </div>

                                    {/* Param input for conditions */}
                                    {item.type === "condition" && (
                                      <input
                                        type="text"
                                        placeholder="parâmetro..."
                                        value={item.param || ""}
                                        onChange={(e) => updateFlowItemParam(item.uid, e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-20 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono-tech"
                                      />
                                    )}

                                    {/* Remove button (not for trigger) */}
                                    {item.type !== "trigger" && (
                                      <button
                                        onClick={() => removeFlowItem(item.uid)}
                                        className="ml-1 rounded p-0.5 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                                        title="Remover"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Trash drop zone */}
                            {isDragging && (
                              <div
                                onDragOver={handleDragOverTrashZone}
                                onDragLeave={() => setDragOverTrash(false)}
                                onDrop={handleDropToTrash}
                                className={cn(
                                  "flex items-center gap-1.5 rounded-lg border-2 border-dashed px-3 py-2 transition-all ml-2",
                                  dragOverTrash
                                    ? "border-destructive bg-destructive/10 scale-105"
                                    : "border-destructive/30 bg-destructive/5"
                                )}
                              >
                                <Trash className={cn("h-4 w-4", dragOverTrash ? "text-destructive" : "text-destructive/50")} />
                                <span className={cn("text-[10px] font-medium", dragOverTrash ? "text-destructive" : "text-destructive/50")}>
                                  Descartar
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Flow stats */}
                      {flowItems.length > 0 && (
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <div className="h-2 w-2 rounded-full bg-amber-400" />
                            {flowItems.filter(i => i.type === "trigger").length} gatilho
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="h-2 w-2 rounded-full bg-blue-400" />
                            {conditionItems.length} condição(ões)
                          </span>
                          <span className="flex items-center gap-1">
                            <div className="h-2 w-2 rounded-full bg-purple-400" />
                            {actionItems.length} ação(ões)
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Divider */}
                  <div className="h-px bg-border" />

                  {/* Step 2: Trigger selection */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/15 text-[10px] font-bold text-amber-400">1</div>
                      <h4 className="text-sm font-semibold">Gatilho</h4>
                      <span className="text-[11px] text-muted-foreground">— Arraste para o fluxo ou clique para adicionar</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {triggerOptions.map((t) => {
                        const Icon = t.icon;
                        const isSelected = isInFlow("trigger", t.id);
                        const isPaletteDrag = paletteDragType === "trigger" && paletteDragId === t.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => addTrigger(t.id)}
                            draggable
                            onDragStart={(e) => handlePaletteDragStart(e, "trigger", t.id)}
                            onDragEnd={handlePaletteDragEnd}
                            className={cn(
                              "palette-draggable flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all",
                              isPaletteDrag && "dragging",
                              isSelected
                                ? cn("border-2 ring-1 ring-current", t.bg)
                                : "border-border bg-background hover:border-primary/30"
                            )}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <Icon className={cn("h-4 w-4", t.color)} />
                              <span className="text-xs font-medium flex-1">{t.label}</span>
                              {isSelected && <Check className="h-3.5 w-3.5 text-green-400" />}
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
                      <span className="text-[11px] text-muted-foreground">— Arraste para o fluxo ou clique para adicionar/remover</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {conditionOptions.map((c) => {
                        const Icon = c.icon;
                        const isSelected = isInFlow("condition", c.id);
                        const isPaletteDrag = paletteDragType === "condition" && paletteDragId === c.id;
                        return (
                          <button
                            key={c.id}
                            onClick={() => addCondition(c.id)}
                            draggable
                            onDragStart={(e) => handlePaletteDragStart(e, "condition", c.id)}
                            onDragEnd={handlePaletteDragEnd}
                            className={cn(
                              "palette-draggable flex items-center gap-2 rounded-lg border p-2.5 text-left transition-all",
                              isPaletteDrag && "dragging",
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
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 4: Actions */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/15 text-[10px] font-bold text-purple-400">3</div>
                      <h4 className="text-sm font-semibold">Ações</h4>
                      <span className="text-[11px] text-muted-foreground">— Arraste para o fluxo ou clique para adicionar/remover</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {actionOptions.map((a) => {
                        const Icon = a.icon;
                        const isSelected = isInFlow("action", a.id);
                        const isPaletteDrag = paletteDragType === "action" && paletteDragId === a.id;
                        return (
                          <button
                            key={a.id}
                            onClick={() => addAction(a.id)}
                            draggable
                            onDragStart={(e) => handlePaletteDragStart(e, "action", a.id)}
                            onDragEnd={handlePaletteDragEnd}
                            className={cn(
                              "palette-draggable flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all",
                              isPaletteDrag && "dragging",
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
                </div>

                {/* Editor footer */}
                <div className="sticky bottom-0 z-20 flex items-center justify-between border-t border-border bg-card px-6 py-4">
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
