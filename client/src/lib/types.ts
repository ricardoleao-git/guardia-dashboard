export interface CameraEvent {
  id: string;
  event_id: string;
  camera_serial: string;
  operator: string;
  payload: Record<string, any>;
  media_urls: Record<string, string> | null;
  annotations: any[] | null;
  connector_id: string | null;
  org_id: string | null;
  timestamp: string;
  created_at: string;
}

export interface ConnectorStatus {
  online: boolean;
  lastSync: string | null;
  pendingEvents: number;
  totalEvents: number;
}

export type OperatorType =
  | "FaceReco"
  | "AccessControl"
  | "VehicleReco"
  | "MotionDetection"
  | "Alarm"
  | "Heartbeat"
  | string;

export interface FilterState {
  cameraSerial: string | null;
  operator: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  search: string | null;
}

export interface CameraInfo {
  serial: string;
  model: string;
  location: string;
  online: boolean;
  lastEvent: string | null;
  // Bancada real fields
  channel: string;       // D1, D2, D3, D4, D5, D6
  ip: string;            // 192.168.254.xxx
  type: string;          // H5AI-50, F4C-T, T5AI
  ai: boolean;           // tem IA integrada
  face: boolean;         // faz reconhecimento facial
  recording: boolean;    // está gravando
}

// ===== T7 — Custódia de Aluno =====
export type CustodyStatus =
  | "presente"
  | "ausente"
  | "saida_irregular"
  | "saida_autorizada";

export interface CustodyStudent {
  id: string;
  faceUUID: string;       // FaceUUID do GuardIA (CLAUDE.md §5)
  name: string;           // sintético — nunca dado real
  turma: string;          // GroupID2 do GuardIA
  status: CustodyStatus;
  ultimoAvistamento: {
    horario: string;      // HH:mm
    canal: string;        // D1, D2, etc.
  } | null;
  responsavel: string;    // nome sintético
  telefoneResponsavel: string; // formato sintético
  autorizados: string[];  // nomes sintéticos autorizados a buscar
}

export interface CustodyAlert {
  id: string;
  studentId: string;
  studentName: string;
  turma: string;
  type: "nao_chegada" | "saida_irregular" | "autorizado_nao_encontrado";
  severity: "critical" | "warning"; // 2 níveis — CORE-03 semântica
  timestamp: string;
  description: string;
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  isFalsePositive: boolean;
}

export interface CustodyMetrics {
  presentes: number;
  ausentes: number;
  saidasIrregulares: number;
  alertasAbertos: number;
}

// ===== T8 — Consentimento e Conformidade =====
export type ConsentStatus =
  | "ativo"
  | "pendente"
  | "revogado"
  | "expirado";

export type ExpurgoStatus =
  | "pendente"
  | "em_andamento"
  | "concluido"
  | "falhou";

export interface ConsentRecord {
  id: string;
  faceUUID: string;          // FaceUUID do GuardIA
  titular: {
    nome: string;            // sintético
    tipo: "aluno" | "responsavel" | "funcionario";
  };
  status: ConsentStatus;
  baseLegal: string;         // LGPD Art. 11, inciso
  dataConcessao: string;     // dd/mm/YYYY
  dataRevogacao: string | null;
  dataExpiracao: string | null;
  dispositivos: {
    deviceId: string;
    deviceName: string;
    expurgoStatus: ExpurgoStatus;
    expurgoData: string | null;
  }[];
  auditLog: {
    acao: string;
    operador: string;
    timestamp: string;
  }[];
}

export interface ConsentMetrics {
  ativos: number;
  pendentes: number;
  revogados: number;
  expirados: number;
}

// ============ T1 — ENCOMENDAS ============
export type PackageStatus =
  | "received"      // recebida na portaria
  | "notified"      // morador notificado
  | "picked_up"     // retirada por morador/autorizado
  | "returned"      // devolvida ao transportador
  | "expired";      // prazo de retirada expirado

export type PackageCategory =
  | "ecommerce"
  | "document"
  | "food"
  | "medication"
  | "other";

export interface PackageRecord {
  id: string;
  trackingCode: string;          // código de rastreio do transportador
  recipientName: string;         // nome do morador (sintético)
  recipientUnit: string;         // bloco/apartamento
  carrier: string;               // transportadora
  category: PackageCategory;
  status: PackageStatus;
  receivedAt: string;            // ISO timestamp
  notifiedAt: string | null;
  pickedUpAt: string | null;
  pickedUpBy: string | null;     // nome de quem retirou
  pickupMethod: "qr" | "signature" | "biometric" | null;
  photoUrl: string | null;       // foto do pacote na chegada
  notes: string;
  expiresAt: string;             // prazo de retirada
}

export interface PackageMetrics {
  pending: number;               // recebidas + não retiradas
  notified: number;
  pickedUpToday: number;
  returned: number;
  expired: number;
  totalThisMonth: number;
}

// ============ T4 — PAINEL DA ADMINISTRADORA ============
export type SiteStatus = "online" | "degraded" | "offline";

export interface SiteSummary {
  id: string;
  name: string;                  // nome do condomínio/escola
  vertical: "condominio" | "escola" | "camara_fria" | "misto";
  status: SiteStatus;
  devicesOnline: number;
  devicesTotal: number;
  camerasOnline: number;
  camerasTotal: number;
  eventsToday: number;
  alertsToday: number;
  personsRegistered: number;
  lastSeenAt: string | null;
  connectorVersion: string | null;
  storageUsedPct: number;        // % disco usado
}

export interface OrgMetrics {
  totalSites: number;
  totalDevices: number;
  totalCameras: number;
  totalPersons: number;
  eventsToday: number;
  alertsToday: number;
  onlineSites: number;
  degradedSites: number;
  offlineSites: number;
  storageAvgPct: number;
}
