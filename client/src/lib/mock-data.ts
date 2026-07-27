import {
  CameraEvent, ConnectorStatus, CameraInfo,
  CustodyStudent, CustodyAlert, CustodyMetrics,
  ConsentRecord, ConsentMetrics,
  PackageRecord, PackageMetrics,
  SiteSummary, OrgMetrics,
  CommonArea, Reservation, ReservationMetrics,
  Occurrence, OccurrenceMetrics,
  ValueReport,
} from "./types";

// Mock data para desenvolvimento do frontend sem Supabase configurado
// Quando o Supabase estiver configurado, o hook useEvents vai buscar dados reais

// Dados REAIS da bancada (spec 05 §1) — não inventar
const benchCameras = [
  { ch: "D1", name: "CAM01",   ip: "192.168.254.115", type: "H5AI-50", status: "offline" as const, ai: false, face: false, recording: false },
  { ch: "D2", name: "Corredor", ip: "192.168.254.206", type: "F4C-T",   status: "online"  as const, ai: true,  face: true,  recording: true  },
  { ch: "D3", name: "Recepção", ip: "192.168.254.208", type: "F4C-T",   status: "online"  as const, ai: true,  face: true,  recording: true  },
  { ch: "D4", name: "AI IPC",   ip: "192.168.254.227", type: "T5AI",    status: "online"  as const, ai: true,  face: false, recording: false },
  { ch: "D5", name: "COPA",     ip: "192.168.254.207", type: "F4C-T",   status: "online"  as const, ai: true,  face: true,  recording: true  },
  { ch: "D6", name: "AI IPC",   ip: "192.168.254.209", type: "T5AI",    status: "online"  as const, ai: true,  face: false, recording: false },
];

const operators = ["FaceReco", "AccessControl", "VehicleReco", "MotionDetection"];
const serials = benchCameras.map(c => c.ip); // usa IP como serial temporário
const names = ["Balbino", "Maria Santos", "João Pereira", "Ana Oliveira", "Carlos Souza", "Beatriz Lima"];
const locations = ["Corredor", "Recepção", "COPA", "AI IPC"];

// Imagens de captura por contexto (CCTV realista)
const captureImages = {
  FaceReco: [
    "/manus-storage/cam-facereco-school_915af75d.jpg",
    "/manus-storage/cam-facereco-student_01a30f6c.jpg",
  ],
  VehicleReco: [
    "/manus-storage/cam-vehicle-gate_4e64e4ad.jpg",
    "/manus-storage/cam-vehicle-night_cdaabcc9.jpg",
  ],
  AccessControl: [
    "/manus-storage/cam-access-door_c36513ed.jpg",
    "/manus-storage/cam-access-reception_c10934f4.jpg",
  ],
  MotionDetection: [
    "/manus-storage/cam-motion-hallway_b9f5c52a.jpg",
    "/manus-storage/cam-motion-parking_a592b70f.jpg",
  ],
};

// Fotos cadastradas (database de reconhecimento facial)
const recognizeImages = [
  "/manus-storage/cam-facereco-reco1_e2b66a4d.jpg",
  "/manus-storage/cam-facereco-reco2_f80bd372.jpg",
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Listas faciais
const faceLists = ["Lista Branca", "Lista Negra", "Estranho"];
const genders = ["M", "F"];

// Gerar iniciais para placeholder
function getInitials(name: string): string {
  const parts = name.split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function randomDate(minutesAgo: number): string {
  const date = new Date(Date.now() - Math.random() * minutesAgo * 60 * 1000);
  return date.toISOString();
}

export function generateMockEvents(count: number = 50): CameraEvent[] {
  const events: CameraEvent[] = [];

  for (let i = 0; i < count; i++) {
    const operator = randomFrom(operators);
    const cam = randomFrom(benchCameras.filter(c => c.status === "online"));
    const serial = cam.ip;
    const cameraLabel = `${cam.ch} ${cam.name}`;
    const name = randomFrom(names);
    const timestamp = randomDate(180);
    const isStranger = operator === "FaceReco" && Math.random() < 0.2;
    const faceList = isStranger ? "Estranho" : operator === "FaceReco" ? randomFrom(["Lista Branca", "Lista Negra"]) : null;
    const matchScore = operator === "FaceReco" ? (isStranger ? null : Math.floor(Math.random() * 15) + 80) : undefined;
    const gender = operator === "FaceReco" ? randomFrom(genders) : undefined;
    const age = operator === "FaceReco" ? Math.floor(Math.random() * 40) + 18 : undefined;
    const hasGlasses = operator === "FaceReco" ? Math.random() > 0.6 : undefined;
    const hasMask = operator === "FaceReco" ? Math.random() > 0.85 : undefined;

    events.push({
      id: `evt-${i}-${Date.now()}`,
      event_id: `EVT${String(i).padStart(6, "0")}`,
      camera_serial: serial,
      operator,
      payload: {
        info: {
          time: timestamp,
          serial: serial,
          operator,
          cameraLabel,
        },
        data: {
          name: operator === "FaceReco" && !isStranger ? name : undefined,
          matchScore,
          faceList,
          gender,
          age,
          glasses: hasGlasses,
          mask: hasMask,
          initials: operator === "FaceReco" ? (isStranger ? "?" : getInitials(name)) : undefined,
          plate: operator === "VehicleReco" ? `ABC${Math.floor(Math.random() * 9000) + 1000}` : undefined,
          direction: Math.random() > 0.5 ? "entry" : "exit",
        },
      },
      media_urls: operator === "FaceReco" ? {
        CaptureImage: captureImages.FaceReco[i % captureImages.FaceReco.length],
        ...(isStranger ? {} : { recognizeImage: recognizeImages[i % recognizeImages.length] }),
      } : operator === "VehicleReco" ? {
        CaptureImage: captureImages.VehicleReco[i % captureImages.VehicleReco.length],
      } : operator === "AccessControl" ? {
        CaptureImage: captureImages.AccessControl[i % captureImages.AccessControl.length],
      } : {
        CaptureImage: captureImages.MotionDetection[i % captureImages.MotionDetection.length],
      },
      annotations: null,
      connector_id: "connector-01",
      org_id: "org-001",
      timestamp,
      created_at: timestamp,
    });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export const mockConnectorStatus: ConnectorStatus = {
  online: true,
  lastSync: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  pendingEvents: 0,
  totalEvents: 1247,
};

export const mockCameras: CameraInfo[] = benchCameras.map((c) => ({
  serial: c.ip,
  model: c.type,
  location: c.name,
  online: c.status === "online",
  lastEvent: c.status === "online" ? randomDate(30) : null,
  channel: c.ch,
  ip: c.ip,
  type: c.type,
  ai: c.ai,
  face: c.face,
  recording: c.recording,
}));

export const operatorLabels: Record<string, string> = {
  FaceReco: "Reconhecimento Facial",
  AccessControl: "Controle de Acesso",
  VehicleReco: "Reconhecimento de Veículo",
  MotionDetection: "Detecção de Movimento",
  Alarm: "Alarme",
  Heartbeat: "Heartbeat",
};

export const operatorColors: Record<string, string> = {
  FaceReco: "bg-blue-100 text-blue-700 border-blue-200",
  AccessControl: "bg-green-100 text-green-700 border-green-200",
  VehicleReco: "bg-purple-100 text-purple-700 border-purple-200",
  MotionDetection: "bg-amber-100 text-amber-700 border-amber-200",
  Alarm: "bg-red-100 text-red-700 border-red-200",
  Heartbeat: "bg-gray-100 text-gray-600 border-gray-200",
};

// ===== T7 — Custódia de Aluno (mock sintético) =====
export const TURMAS = ["6A", "6B", "7A", "7B", "8A", "9A", "9B"];

export const mockStudents: CustodyStudent[] = [
  { id: "s1", faceUUID: "fuuid-001", name: "Ana Júlia Silva", turma: "6A", status: "presente", ultimoAvistamento: { horario: "07:32", canal: "D2" }, responsavel: "Marcos Silva", telefoneResponsavel: "(11) 90000-0001", autorizados: ["Marcos Silva", "Patrícia Silva"] },
  { id: "s2", faceUUID: "fuuid-002", name: "Bruno Carvalho", turma: "6A", status: "presente", ultimoAvistamento: { horario: "07:35", canal: "D2" }, responsavel: "Fernanda Carvalho", telefoneResponsavel: "(11) 90000-0002", autorizados: ["Fernanda Carvalho"] },
  { id: "s3", faceUUID: "fuuid-003", name: "Clara Beatriz Reis", turma: "6A", status: "ausente", ultimoAvistamento: null, responsavel: "Paulo Reis", telefoneResponsavel: "(11) 90000-0003", autorizados: ["Paulo Reis", "Sônia Reis"] },
  { id: "s4", faceUUID: "fuuid-004", name: "Diego Almeida", turma: "6B", status: "presente", ultimoAvistamento: { horario: "07:28", canal: "D3" }, responsavel: "Lucas Almeida", telefoneResponsavel: "(11) 90000-0004", autorizados: ["Lucas Almeida", "Juliana Almeida"] },
  { id: "s5", faceUUID: "fuuid-005", name: "Eduarda Ferreira", turma: "6B", status: "saida_irregular", ultimoAvistamento: { horario: "11:15", canal: "D2" }, responsavel: "Roberto Ferreira", telefoneResponsavel: "(11) 90000-0005", autorizados: ["Roberto Ferreira"] },
  { id: "s6", faceUUID: "fuuid-006", name: "Felipe Andrade", turma: "7A", status: "presente", ultimoAvistamento: { horario: "07:40", canal: "D2" }, responsavel: "Camila Andrade", telefoneResponsavel: "(11) 90000-0006", autorizados: ["Camila Andrade", "Rafael Andrade"] },
  { id: "s7", faceUUID: "fuuid-007", name: "Gabriela Nunes", turma: "7A", status: "presente", ultimoAvistamento: { horario: "07:38", canal: "D3" }, responsavel: "Thiago Nunes", telefoneResponsavel: "(11) 90000-0007", autorizados: ["Thiago Nunes"] },
  { id: "s8", faceUUID: "fuuid-008", name: "Heitor Pinto", turma: "7B", status: "ausente", ultimoAvistamento: null, responsavel: "Daniela Pinto", telefoneResponsavel: "(11) 90000-0008", autorizados: ["Daniela Pinto", "Marcelo Pinto"] },
  { id: "s9", faceUUID: "fuuid-009", name: "Igor Martins", turma: "7B", status: "presente", ultimoAvistamento: { horario: "07:45", canal: "D2" }, responsavel: "Sandra Martins", telefoneResponsavel: "(11) 90000-0009", autorizados: ["Sandra Martins"] },
  { id: "s10", faceUUID: "fuuid-010", name: "Júlia Castro", turma: "8A", status: "saida_autorizada", ultimoAvistamento: { horario: "10:30", canal: "D3" }, responsavel: "Eduardo Castro", telefoneResponsavel: "(11) 90000-0010", autorizados: ["Eduardo Castro", "Fernanda Castro"] },
  { id: "s11", faceUUID: "fuuid-011", name: "Kauã Ribeiro", turma: "8A", status: "presente", ultimoAvistamento: { horario: "07:42", canal: "D2" }, responsavel: "Amanda Ribeiro", telefoneResponsavel: "(11) 90000-0011", autorizados: ["Amanda Ribeiro"] },
  { id: "s12", faceUUID: "fuuid-012", name: "Lara Monteiro", turma: "8A", status: "presente", ultimoAvistamento: { horario: "07:44", canal: "D3" }, responsavel: "Gustavo Monteiro", telefoneResponsavel: "(11) 90000-0012", autorizados: ["Gustavo Monteiro", "Lívia Monteiro"] },
  { id: "s13", faceUUID: "fuuid-013", name: "Murilo Cardoso", turma: "9A", status: "ausente", ultimoAvistamento: null, responsavel: "Patrícia Cardoso", telefoneResponsavel: "(11) 90000-0013", autorizados: ["Patrícia Cardoso"] },
  { id: "s14", faceUUID: "fuuid-014", name: "Natália Gomes", turma: "9A", status: "presente", ultimoAvistamento: { horario: "07:50", canal: "D2" }, responsavel: "Ricardo Gomes", telefoneResponsavel: "(11) 90000-0014", autorizados: ["Ricardo Gomes", "Cristina Gomes"] },
  { id: "s15", faceUUID: "fuuid-015", name: "Otávio Barbosa", turma: "9A", status: "presente", ultimoAvistamento: { horario: "07:52", canal: "D3" }, responsavel: "Vanessa Barbosa", telefoneResponsavel: "(11) 90000-0015", autorizados: ["Vanessa Barbosa"] },
  { id: "s16", faceUUID: "fuuid-016", name: "Paula Rocha", turma: "9B", status: "saida_irregular", ultimoAvistamento: { horario: "11:05", canal: "D2" }, responsavel: "André Rocha", telefoneResponsavel: "(11) 90000-0016", autorizados: ["André Rocha", "Bianca Rocha"] },
  { id: "s17", faceUUID: "fuuid-017", name: "Rafael Teixeira", turma: "9B", status: "presente", ultimoAvistamento: { horario: "07:55", canal: "D2" }, responsavel: "Joana Teixeira", telefoneResponsavel: "(11) 90000-0017", autorizados: ["Joana Teixeira"] },
  { id: "s18", faceUUID: "fuuid-018", name: "Sofia Mendes", turma: "9B", status: "presente", ultimoAvistamento: { horario: "07:58", canal: "D3" }, responsavel: "Felipe Mendes", telefoneResponsavel: "(11) 90000-0018", autorizados: ["Felipe Mendes", "Carla Mendes"] },
  { id: "s19", faceUUID: "fuuid-019", name: "Théo Cavalcante", turma: "6A", status: "presente", ultimoAvistamento: { horario: "07:33", canal: "D2" }, responsavel: "Renata Cavalcante", telefoneResponsavel: "(11) 90000-0019", autorizados: ["Renata Cavalcante", "Bruno Cavalcante"] },
  { id: "s20", faceUUID: "fuuid-020", name: "Valentina Dias", turma: "7A", status: "saida_autorizada", ultimoAvistamento: { horario: "10:15", canal: "D3" }, responsavel: "Marcelo Dias", telefoneResponsavel: "(11) 90000-0020", autorizados: ["Marcelo Dias", "Aline Dias"] },
];

export const mockCustodyAlerts: CustodyAlert[] = [
  { id: "a1", studentId: "s3", studentName: "Clara Beatriz Reis", turma: "6A", type: "nao_chegada", severity: "critical", timestamp: "08:15", description: "Aluna não registrou entrada até 08:00 — turma 6A", resolved: false, resolvedBy: null, resolvedAt: null, isFalsePositive: false },
  { id: "a2", studentId: "s5", studentName: "Eduarda Ferreira", turma: "6B", type: "saida_irregular", severity: "critical", timestamp: "11:20", description: "Saída detectada sem autorização registrada — canal D2", resolved: false, resolvedBy: null, resolvedAt: null, isFalsePositive: false },
  { id: "a3", studentId: "s8", studentName: "Heitor Pinto", turma: "7B", type: "nao_chegada", severity: "warning", timestamp: "08:10", description: "Aluno não registrou entrada até 08:00 — turma 7B", resolved: false, resolvedBy: null, resolvedAt: null, isFalsePositive: false },
  { id: "a4", studentId: "s13", studentName: "Murilo Cardoso", turma: "9A", type: "nao_chegada", severity: "warning", timestamp: "08:05", description: "Aluno não registrou entrada até 08:00 — turma 9A", resolved: false, resolvedBy: null, resolvedAt: null, isFalsePositive: false },
  { id: "a5", studentId: "s16", studentName: "Paula Rocha", turma: "9B", type: "saida_irregular", severity: "critical", timestamp: "11:10", description: "Saída detectada sem autorização registrada — canal D2", resolved: false, resolvedBy: null, resolvedAt: null, isFalsePositive: false },
];

export const mockCustodyMetrics: CustodyMetrics = {
  presentes: 14,
  ausentes: 3,
  saidasIrregulares: 2,
  alertasAbertos: 5,
};

// ===== T8 — Consentimento e Conformidade (mock sintético) =====
export const mockConsentRecords: ConsentRecord[] = [
  { id: "c1", faceUUID: "fuuid-001", titular: { nome: "Ana Júlia Silva", tipo: "aluno" }, status: "ativo", baseLegal: "Art. 11, I — tutela dos pais", dataConcessao: "15/02/2026", dataRevogacao: null, dataExpiracao: "15/12/2026", dispositivos: [{ deviceId: "nvr-116", deviceName: "NVR RS-436MLJ", expurgoStatus: "concluido", expurgoData: null }, { deviceId: "cam-206", deviceName: "F4C-T Corredor", expurgoStatus: "concluido", expurgoData: null }], auditLog: [{ acao: "Concessão de consentimento", operador: "admin@guardia", timestamp: "15/02/2026 09:30" }, { acao: "Cadastro facial propagado", operador: "connector", timestamp: "15/02/2026 09:35" }] },
  { id: "c2", faceUUID: "fuuid-002", titular: { nome: "Bruno Carvalho", tipo: "aluno" }, status: "ativo", baseLegal: "Art. 11, I — tutela dos pais", dataConcessao: "15/02/2026", dataRevogacao: null, dataExpiracao: "15/12/2026", dispositivos: [{ deviceId: "nvr-116", deviceName: "NVR RS-436MLJ", expurgoStatus: "concluido", expurgoData: null }, { deviceId: "cam-206", deviceName: "F4C-T Corredor", expurgoStatus: "concluido", expurgoData: null }], auditLog: [{ acao: "Concessão de consentimento", operador: "admin@guardia", timestamp: "15/02/2026 09:40" }] },
  { id: "c3", faceUUID: "fuuid-003", titular: { nome: "Clara Beatriz Reis", tipo: "aluno" }, status: "pendente", baseLegal: "Art. 11, I — tutela dos pais", dataConcessao: "18/02/2026", dataRevogacao: null, dataExpiracao: null, dispositivos: [], auditLog: [{ acao: "Pendente — aguardando assinatura do responsável", operador: "sistema", timestamp: "18/02/2026 08:00" }] },
  { id: "c4", faceUUID: "fuuid-004", titular: { nome: "Diego Almeida", tipo: "aluno" }, status: "ativo", baseLegal: "Art. 11, I — tutela dos pais", dataConcessao: "20/02/2026", dataRevogacao: null, dataExpiracao: "20/12/2026", dispositivos: [{ deviceId: "nvr-116", deviceName: "NVR RS-436MLJ", expurgoStatus: "concluido", expurgoData: null }], auditLog: [{ acao: "Concessão de consentimento", operador: "admin@guardia", timestamp: "20/02/2026 14:00" }] },
  { id: "c5", faceUUID: "fuuid-005", titular: { nome: "Eduarda Ferreira", tipo: "aluno" }, status: "revogado", baseLegal: "Art. 11, I — tutela dos pais", dataConcessao: "15/02/2026", dataRevogacao: "10/06/2026", dataExpiracao: null, dispositivos: [{ deviceId: "nvr-116", deviceName: "NVR RS-436MLJ", expurgoStatus: "concluido", expurgoData: "10/06/2026" }, { deviceId: "cam-206", deviceName: "F4C-T Corredor", expurgoStatus: "em_andamento", expurgoData: null }], auditLog: [{ acao: "Concessão de consentimento", operador: "admin@guardia", timestamp: "15/02/2026 09:30" }, { acao: "Revogação solicitada", operador: "admin@guardia", timestamp: "10/06/2026 15:00" }, { acao: "Expurgo propagado — NVR", operador: "connector", timestamp: "10/06/2026 15:05" }, { acao: "Expurgo em andamento — F4C-T Corredor", operador: "connector", timestamp: "10/06/2026 15:06" }] },
  { id: "c6", faceUUID: "fuuid-006", titular: { nome: "Felipe Andrade", tipo: "aluno" }, status: "ativo", baseLegal: "Art. 11, I — tutela dos pais", dataConcessao: "22/02/2026", dataRevogacao: null, dataExpiracao: "22/12/2026", dispositivos: [{ deviceId: "nvr-116", deviceName: "NVR RS-436MLJ", expurgoStatus: "concluido", expurgoData: null }], auditLog: [{ acao: "Concessão de consentimento", operador: "admin@guardia", timestamp: "22/02/2026 10:00" }] },
  { id: "c7", faceUUID: "fuuid-007", titular: { nome: "Gabriela Nunes", tipo: "aluno" }, status: "ativo", baseLegal: "Art. 11, I — tutela dos pais", dataConcessao: "22/02/2026", dataRevogacao: null, dataExpiracao: "22/12/2026", dispositivos: [{ deviceId: "nvr-116", deviceName: "NVR RS-436MLJ", expurgoStatus: "concluido", expurgoData: null }], auditLog: [{ acao: "Concessão de consentimento", operador: "admin@guardia", timestamp: "22/02/2026 10:15" }] },
  { id: "c8", faceUUID: "fuuid-008", titular: { nome: "Heitor Pinto", tipo: "aluno" }, status: "pendente", baseLegal: "Art. 11, I — tutela dos pais", dataConcessao: "25/02/2026", dataRevogacao: null, dataExpiracao: null, dispositivos: [], auditLog: [{ acao: "Pendente — aguardando assinatura do responsável", operador: "sistema", timestamp: "25/02/2026 08:00" }] },
  { id: "c9", faceUUID: "fuuid-009", titular: { nome: "Igor Martins", tipo: "aluno" }, status: "ativo", baseLegal: "Art. 11, I — tutela dos pais", dataConcessao: "01/03/2026", dataRevogacao: null, dataExpiracao: "01/12/2026", dispositivos: [{ deviceId: "nvr-116", deviceName: "NVR RS-436MLJ", expurgoStatus: "concluido", expurgoData: null }], auditLog: [{ acao: "Concessão de consentimento", operador: "admin@guardia", timestamp: "01/03/2026 11:00" }] },
  { id: "c10", faceUUID: "fuuid-010", titular: { nome: "Júlia Castro", tipo: "aluno" }, status: "ativo", baseLegal: "Art. 11, I — tutela dos pais", dataConcessao: "01/03/2026", dataRevogacao: null, dataExpiracao: "01/12/2026", dispositivos: [{ deviceId: "nvr-116", deviceName: "NVR RS-436MLJ", expurgoStatus: "concluido", expurgoData: null }], auditLog: [{ acao: "Concessão de consentimento", operador: "admin@guardia", timestamp: "01/03/2026 11:30" }] },
  { id: "c11", faceUUID: "fuuid-011", titular: { nome: "Kauã Ribeiro", tipo: "aluno" }, status: "ativo", baseLegal: "Art. 11, I — tutela dos pais", dataConcessao: "03/03/2026", dataRevogacao: null, dataExpiracao: "03/12/2026", dispositivos: [{ deviceId: "nvr-116", deviceName: "NVR RS-436MLJ", expurgoStatus: "concluido", expurgoData: null }], auditLog: [{ acao: "Concessão de consentimento", operador: "admin@guardia", timestamp: "03/03/2026 09:00" }] },
  { id: "c12", faceUUID: "fuuid-012", titular: { nome: "Lara Monteiro", tipo: "aluno" }, status: "ativo", baseLegal: "Art. 11, I — tutela dos pais", dataConcessao: "03/03/2026", dataRevogacao: null, dataExpiracao: "03/12/2026", dispositivos: [{ deviceId: "nvr-116", deviceName: "NVR RS-436MLJ", expurgoStatus: "concluido", expurgoData: null }], auditLog: [{ acao: "Concessão de consentimento", operador: "admin@guardia", timestamp: "03/03/2026 09:15" }] },
  { id: "c13", faceUUID: "fuuid-013", titular: { nome: "Murilo Cardoso", tipo: "aluno" }, status: "expirado", baseLegal: "Art. 11, I — tutela dos pais", dataConcessao: "10/01/2026", dataRevogacao: null, dataExpiracao: "10/06/2026", dispositivos: [{ deviceId: "nvr-116", deviceName: "NVR RS-436MLJ", expurgoStatus: "pendente", expurgoData: null }], auditLog: [{ acao: "Concessão de consentimento", operador: "admin@guardia", timestamp: "10/01/2026 08:00" }, { acao: "Consentimento expirado", operador: "sistema", timestamp: "10/06/2026 23:59" }, { acao: "Expurgo pendente — NVR", operador: "sistema", timestamp: "10/06/2026 23:59" }] },
  { id: "c14", faceUUID: "fuuid-014", titular: { nome: "Natália Gomes", tipo: "aluno" }, status: "ativo", baseLegal: "Art. 11, I — tutela dos pais", dataConcessao: "05/03/2026", dataRevogacao: null, dataExpiracao: "05/12/2026", dispositivos: [{ deviceId: "nvr-116", deviceName: "NVR RS-436MLJ", expurgoStatus: "concluido", expurgoData: null }], auditLog: [{ acao: "Concessão de consentimento", operador: "admin@guardia", timestamp: "05/03/2026 10:00" }] },
  { id: "c15", faceUUID: "fuuid-015", titular: { nome: "Otávio Barbosa", tipo: "aluno" }, status: "ativo", baseLegal: "Art. 11, I — tutela dos pais", dataConcessao: "05/03/2026", dataRevogacao: null, dataExpiracao: "05/12/2026", dispositivos: [{ deviceId: "nvr-116", deviceName: "NVR RS-436MLJ", expurgoStatus: "concluido", expurgoData: null }], auditLog: [{ acao: "Concessão de consentimento", operador: "admin@guardia", timestamp: "05/03/2026 10:30" }] },
  { id: "c16", faceUUID: "fuuid-016", titular: { nome: "Paula Rocha", tipo: "aluno" }, status: "ativo", baseLegal: "Art. 11, I — tutela dos pais", dataConcessao: "08/03/2026", dataRevogacao: null, dataExpiracao: "08/12/2026", dispositivos: [{ deviceId: "nvr-116", deviceName: "NVR RS-436MLJ", expurgoStatus: "concluido", expurgoData: null }], auditLog: [{ acao: "Concessão de consentimento", operador: "admin@guardia", timestamp: "08/03/2026 09:00" }] },
  { id: "c17", faceUUID: "fuuid-017", titular: { nome: "Rafael Teixeira", tipo: "aluno" }, status: "ativo", baseLegal: "Art. 11, I — tutela dos pais", dataConcessao: "08/03/2026", dataRevogacao: null, dataExpiracao: "08/12/2026", dispositivos: [{ deviceId: "nvr-116", deviceName: "NVR RS-436MLJ", expurgoStatus: "concluido", expurgoData: null }], auditLog: [{ acao: "Concessão de consentimento", operador: "admin@guardia", timestamp: "08/03/2026 09:30" }] },
  { id: "c18", faceUUID: "fuuid-018", titular: { nome: "Sofia Mendes", tipo: "aluno" }, status: "ativo", baseLegal: "Art. 11, I — tutela dos pais", dataConcessao: "10/03/2026", dataRevogacao: null, dataExpiracao: "10/12/2026", dispositivos: [{ deviceId: "nvr-116", deviceName: "NVR RS-436MLJ", expurgoStatus: "concluido", expurgoData: null }], auditLog: [{ acao: "Concessão de consentimento", operador: "admin@guardia", timestamp: "10/03/2026 11:00" }] },
  { id: "c19", faceUUID: "fuuid-r1", titular: { nome: "Marcos Silva", tipo: "responsavel" }, status: "ativo", baseLegal: "Art. 7º — exercício regular de direitos", dataConcessao: "15/02/2026", dataRevogacao: null, dataExpiracao: null, dispositivos: [], auditLog: [{ acao: "Concessão de consentimento", operador: "admin@guardia", timestamp: "15/02/2026 09:30" }] },
  { id: "c20", faceUUID: "fuuid-r2", titular: { nome: "Fernanda Carvalho", tipo: "responsavel" }, status: "ativo", baseLegal: "Art. 7º — exercício regular de direitos", dataConcessao: "15/02/2026", dataRevogacao: null, dataExpiracao: null, dispositivos: [], auditLog: [{ acao: "Concessão de consentimento", operador: "admin@guardia", timestamp: "15/02/2026 09:40" }] },
  { id: "c21", faceUUID: "fuuid-f1", titular: { nome: "João Pereira", tipo: "funcionario" }, status: "ativo", baseLegal: "Art. 11, II — execução de contrato", dataConcessao: "01/02/2026", dataRevogacao: null, dataExpiracao: "01/02/2027", dispositivos: [{ deviceId: "nvr-116", deviceName: "NVR RS-436MLJ", expurgoStatus: "concluido", expurgoData: null }], auditLog: [{ acao: "Concessão de consentimento", operador: "admin@guardia", timestamp: "01/02/2026 08:00" }] },
  { id: "c22", faceUUID: "fuuid-f2", titular: { nome: "Ana Oliveira", tipo: "funcionario" }, status: "ativo", baseLegal: "Art. 11, II — execução de contrato", dataConcessao: "01/02/2026", dataRevogacao: null, dataExpiracao: "01/02/2027", dispositivos: [{ deviceId: "nvr-116", deviceName: "NVR RS-436MLJ", expurgoStatus: "concluido", expurgoData: null }], auditLog: [{ acao: "Concessão de consentimento", operador: "admin@guardia", timestamp: "01/02/2026 08:15" }] },
  { id: "c23", faceUUID: "fuuid-f3", titular: { nome: "Carlos Souza", tipo: "funcionario" }, status: "revogado", baseLegal: "Art. 11, II — execução de contrato", dataConcessao: "01/02/2026", dataRevogacao: "15/05/2026", dataExpiracao: null, dispositivos: [{ deviceId: "nvr-116", deviceName: "NVR RS-436MLJ", expurgoStatus: "concluido", expurgoData: "15/05/2026" }, { deviceId: "cam-208", deviceName: "F4C-T Recepção", expurgoStatus: "falhou", expurgoData: null }], auditLog: [{ acao: "Concessão de consentimento", operador: "admin@guardia", timestamp: "01/02/2026 08:30" }, { acao: "Revogação solicitada", operador: "admin@guardia", timestamp: "15/05/2026 14:00" }, { acao: "Expurgo propagado — NVR", operador: "connector", timestamp: "15/05/2026 14:05" }, { acao: "Falha no expurgo — F4C-T Recepção", operador: "connector", timestamp: "15/05/2026 14:06" }] },
  { id: "c24", faceUUID: "fuuid-f4", titular: { nome: "Beatriz Lima", tipo: "funcionario" }, status: "ativo", baseLegal: "Art. 11, II — execução de contrato", dataConcessao: "01/02/2026", dataRevogacao: null, dataExpiracao: "01/02/2027", dispositivos: [{ deviceId: "nvr-116", deviceName: "NVR RS-436MLJ", expurgoStatus: "concluido", expurgoData: null }], auditLog: [{ acao: "Concessão de consentimento", operador: "admin@guardia", timestamp: "01/02/2026 08:45" }] },
];

export const mockConsentMetrics: ConsentMetrics = {
  ativos: 18,
  pendentes: 2,
  revogados: 2,
  expirados: 1,
};

// ============ T1 — ENCOMENDAS (mock sintético) ============
export const mockPackages: PackageRecord[] = [
  { id: "pkg-001", trackingCode: "BR123456789", recipientName: "Ana Costa", recipientUnit: "Bloco A · Apt 101", carrier: "Correios", category: "ecommerce", status: "received", receivedAt: "2026-07-26T08:30:00-03:00", notifiedAt: "2026-07-26T08:35:00-03:00", pickedUpAt: null, pickedUpBy: null, pickupMethod: null, photoUrl: null, notes: "Caixa média — correios", expiresAt: "2026-07-29T08:30:00-03:00" },
  { id: "pkg-002", trackingCode: "AMZ987654321", recipientName: "Bruno Lima", recipientUnit: "Bloco A · Apt 302", carrier: "Amazon Logistics", category: "ecommerce", status: "notified", receivedAt: "2026-07-26T09:15:00-03:00", notifiedAt: "2026-07-26T09:20:00-03:00", pickedUpAt: null, pickedUpBy: null, pickupMethod: null, photoUrl: null, notes: "2 pacotes — envelope + caixa", expiresAt: "2026-07-29T09:15:00-03:00" },
  { id: "pkg-003", trackingCode: "MLP456789012", recipientName: "Carla Dias", recipientUnit: "Bloco B · Apt 201", carrier: "Mercado Livre", category: "ecommerce", status: "picked_up", receivedAt: "2026-07-25T14:00:00-03:00", notifiedAt: "2026-07-25T14:05:00-03:00", pickedUpAt: "2026-07-25T18:30:00-03:00", pickedUpBy: "Carla Dias", pickupMethod: "qr", photoUrl: null, notes: "Retirada via QR Code", expiresAt: "2026-07-28T14:00:00-03:00" },
  { id: "pkg-004", trackingCode: "DOC111222333", recipientName: "Diego Alves", recipientUnit: "Bloco B · Apt 501", carrier: "Sedex", category: "document", status: "picked_up", receivedAt: "2026-07-25T10:00:00-03:00", notifiedAt: "2026-07-25T10:10:00-03:00", pickedUpAt: "2026-07-25T12:00:00-03:00", pickedUpBy: "Diego Alves", pickupMethod: "biometric", photoUrl: null, notes: "Documento sigiloso — retirada biométrica", expiresAt: "2026-07-28T10:00:00-03:00" },
  { id: "pkg-005", trackingCode: "IFF777888999", recipientName: "Elaine Souza", recipientUnit: "Bloco C · Apt 102", carrier: "iFood", category: "food", status: "picked_up", receivedAt: "2026-07-26T12:00:00-03:00", notifiedAt: "2026-07-26T12:00:00-03:00", pickedUpAt: "2026-07-26T12:15:00-03:00", pickedUpBy: "Elaine Souza", pickupMethod: "signature", photoUrl: null, notes: "Refeição — retirada imediata", expiresAt: "2026-07-26T18:00:00-03:00" },
  { id: "pkg-006", trackingCode: "PHM444555666", recipientName: "Felipe Rocha", recipientUnit: "Bloco C · Apt 303", carrier: "Pharmacy Delivery", category: "medication", status: "received", receivedAt: "2026-07-26T11:00:00-03:00", notifiedAt: null, pickedUpAt: null, pickedUpBy: null, pickupMethod: null, photoUrl: null, notes: "Medicação — necessita refrigeração", expiresAt: "2026-07-27T11:00:00-03:00" },
  { id: "pkg-007", trackingCode: "BR222333444", recipientName: "Gabriela Nunes", recipientUnit: "Bloco A · Apt 401", carrier: "Correios", category: "ecommerce", status: "notified", receivedAt: "2026-07-26T07:45:00-03:00", notifiedAt: "2026-07-26T07:50:00-03:00", pickedUpAt: null, pickedUpBy: null, pickupMethod: null, photoUrl: null, notes: "Caixa grande — correios", expiresAt: "2026-07-29T07:45:00-03:00" },
  { id: "pkg-008", trackingCode: "LOG555666777", recipientName: "Heitor Pinto", recipientUnit: "Bloco B · Apt 102", carrier: "Loggi", category: "ecommerce", status: "returned", receivedAt: "2026-07-20T09:00:00-03:00", notifiedAt: "2026-07-20T09:05:00-03:00", pickedUpAt: null, pickedUpBy: null, pickupMethod: null, photoUrl: null, notes: "Devolvida — morador não retirou em 7 dias", expiresAt: "2026-07-27T09:00:00-03:00" },
  { id: "pkg-009", trackingCode: "EXP888999000", recipientName: "Igor Martins", recipientUnit: "Bloco C · Apt 201", carrier: "JadLog", category: "ecommerce", status: "expired", receivedAt: "2026-07-18T15:00:00-03:00", notifiedAt: "2026-07-18T15:10:00-03:00", pickedUpAt: null, pickedUpBy: null, pickupMethod: null, photoUrl: null, notes: "Prazo expirado — aguardando devolução", expiresAt: "2026-07-25T15:00:00-03:00" },
  { id: "pkg-010", trackingCode: "AMZ111222333", recipientName: "Juliana Reis", recipientUnit: "Bloco A · Apt 502", carrier: "Amazon Logistics", category: "ecommerce", status: "received", receivedAt: "2026-07-26T10:30:00-03:00", notifiedAt: "2026-07-26T10:35:00-03:00", pickedUpAt: null, pickedUpBy: null, pickupMethod: null, photoUrl: null, notes: "Envelope — amazon", expiresAt: "2026-07-29T10:30:00-03:00" },
  { id: "pkg-011", trackingCode: "MLP999888777", recipientName: "Lucas Almeida", recipientUnit: "Bloco B · Apt 402", carrier: "Mercado Livre", category: "ecommerce", status: "picked_up", receivedAt: "2026-07-26T08:00:00-03:00", notifiedAt: "2026-07-26T08:05:00-03:00", pickedUpAt: "2026-07-26T09:00:00-03:00", pickedUpBy: "Lucas Almeida", pickupMethod: "qr", photoUrl: null, notes: "Retirada via QR Code", expiresAt: "2026-07-29T08:00:00-03:00" },
  { id: "pkg-012", trackingCode: "DOC444555666", recipientName: "Marina Castro", recipientUnit: "Bloco C · Apt 501", carrier: "Sedex", category: "document", status: "notified", receivedAt: "2026-07-26T11:45:00-03:00", notifiedAt: "2026-07-26T11:50:00-03:00", pickedUpAt: null, pickedUpBy: null, pickupMethod: null, photoUrl: null, notes: "Contrato — sedex", expiresAt: "2026-07-29T11:45:00-03:00" },
];

export const mockPackageMetrics: PackageMetrics = {
  pending: 5,
  notified: 4,
  pickedUpToday: 3,
  returned: 1,
  expired: 1,
  totalThisMonth: 87,
};

// ============ T4 — PAINEL DA ADMINISTRADORA (mock sintético) ============
export const mockSites: SiteSummary[] = [
  { id: "site-001", name: "Residencial Parque das Flores", vertical: "condominio", status: "online", devicesOnline: 2, devicesTotal: 2, camerasOnline: 8, camerasTotal: 8, eventsToday: 142, alertsToday: 3, personsRegistered: 186, lastSeenAt: "2026-07-26T23:25:00-03:00", connectorVersion: "0.4.2", storageUsedPct: 34 },
  { id: "site-002", name: "Condomínio Vista Verde", vertical: "condominio", status: "online", devicesOnline: 1, devicesTotal: 1, camerasOnline: 6, camerasTotal: 6, eventsToday: 89, alertsToday: 1, personsRegistered: 124, lastSeenAt: "2026-07-26T23:28:00-03:00", connectorVersion: "0.4.2", storageUsedPct: 28 },
  { id: "site-003", name: "Escola Monteiro Lobato", vertical: "escola", status: "online", devicesOnline: 2, devicesTotal: 2, camerasOnline: 6, camerasTotal: 6, eventsToday: 215, alertsToday: 5, personsRegistered: 340, lastSeenAt: "2026-07-26T23:29:00-03:00", connectorVersion: "0.4.2", storageUsedPct: 52 },
  { id: "site-004", name: "Colégio Aurora", vertical: "escola", status: "degraded", devicesOnline: 1, devicesTotal: 2, camerasOnline: 4, camerasTotal: 6, eventsToday: 78, alertsToday: 2, personsRegistered: 210, lastSeenAt: "2026-07-26T22:15:00-03:00", connectorVersion: "0.4.1", storageUsedPct: 61 },
  { id: "site-005", name: "Residencial Costa Azul", vertical: "condominio", status: "online", devicesOnline: 1, devicesTotal: 1, camerasOnline: 4, camerasTotal: 4, eventsToday: 56, alertsToday: 0, personsRegistered: 92, lastSeenAt: "2026-07-26T23:27:00-03:00", connectorVersion: "0.4.2", storageUsedPct: 19 },
  { id: "site-006", name: "Condomínio Centro Médico", vertical: "misto", status: "offline", devicesOnline: 0, devicesTotal: 1, camerasOnline: 0, camerasTotal: 4, eventsToday: 0, alertsToday: 0, personsRegistered: 45, lastSeenAt: "2026-07-25T18:30:00-03:00", connectorVersion: "0.3.8", storageUsedPct: 73 },
  { id: "site-007", name: "Escola Recanto do Saber", vertical: "escola", status: "online", devicesOnline: 2, devicesTotal: 2, camerasOnline: 8, camerasTotal: 8, eventsToday: 198, alertsToday: 4, personsRegistered: 285, lastSeenAt: "2026-07-26T23:30:00-03:00", connectorVersion: "0.4.2", storageUsedPct: 44 },
  { id: "site-008", name: "Condomínio Jardim Primavera", vertical: "condominio", status: "degraded", devicesOnline: 1, devicesTotal: 2, camerasOnline: 5, camerasTotal: 8, eventsToday: 34, alertsToday: 1, personsRegistered: 156, lastSeenAt: "2026-07-26T21:45:00-03:00", connectorVersion: "0.4.0", storageUsedPct: 38 },
];

export const mockOrgMetrics: OrgMetrics = {
  totalSites: 8,
  totalDevices: 12,
  totalCameras: 50,
  totalPersons: 1438,
  eventsToday: 812,
  alertsToday: 16,
  onlineSites: 5,
  degradedSites: 2,
  offlineSites: 1,
  storageAvgPct: 44,
};

// ===== T2: Reservas de Áreas Comuns =====

export const mockCommonAreas: CommonArea[] = [
  { id: "area-01", name: "Salão de Festas", type: "salao", capacity: 80, rules: ["Música até 22h", "Proibido fumar", "Limpeza por conta do condômino"], operatingHours: { start: "08:00", end: "23:00" }, fee: 150, feeRequired: true, advanceDays: 3, maxDurationHours: 6, active: true },
  { id: "area-02", name: "Churrasqueira", type: "churrasqueira", capacity: 30, rules: ["Música até 22h", "Limpeza obrigatória", "Máximo 30 pessoas"], operatingHours: { start: "09:00", end: "22:00" }, fee: 80, feeRequired: true, advanceDays: 2, maxDurationHours: 5, active: true },
  { id: "area-03", name: "Academia", type: "academia", capacity: 15, rules: ["Toalha obrigatória", "Proibido menores de 16 sem acompanhante"], operatingHours: { start: "06:00", end: "23:00" }, fee: 0, feeRequired: false, advanceDays: 0, maxDurationHours: 2, active: true },
  { id: "area-04", name: "Quadra Poliesportiva", type: "quadra", capacity: 20, rules: ["Tênis apropriado", "Máximo 1h por reserva"], operatingHours: { start: "07:00", end: "22:00" }, fee: 0, feeRequired: false, advanceDays: 1, maxDurationHours: 1, active: true },
  { id: "area-05", name: "Piscina", type: "piscina", capacity: 40, rules: ["Touca obrigatória", "Proibido comida na borda", "Menores com responsável"], operatingHours: { start: "08:00", end: "21:00" }, fee: 0, feeRequired: false, advanceDays: 1, maxDurationHours: 3, active: true },
  { id: "area-06", name: "Sauna", type: "sauna", capacity: 6, rules: ["Máximo 30 min por sessão", "Proibido após refeições"], operatingHours: { start: "10:00", end: "20:00" }, fee: 20, feeRequired: true, advanceDays: 1, maxDurationHours: 1, active: false },
];

export const mockReservations: Reservation[] = [
  { id: "res-001", areaId: "area-01", areaName: "Salão de Festas", areaType: "salao", unitNumber: "Bloco A - Apt 302", residentName: "Ana Beatriz Cardoso", date: "28/07/2026", startTime: "18:00", endTime: "23:00", status: "pendente", recurrence: "unica", fee: 150, feePaid: false, attendees: 60, notes: "Aniversário de 15 anos da filha", createdAt: "2026-07-22T14:30:00Z", approvedBy: null, approvedAt: null, rejectedReason: null },
  { id: "res-002", areaId: "area-02", areaName: "Churrasqueira", areaType: "churrasqueira", unitNumber: "Bloco B - Apt 105", residentName: "Carlos Eduardo Martins", date: "27/07/2026", startTime: "12:00", endTime: "17:00", status: "aprovada", recurrence: "unica", fee: 80, feePaid: true, attendees: 18, notes: "Almoço de domingo com família", createdAt: "2026-07-20T10:15:00Z", approvedBy: "Síndico - Roberto Farias", approvedAt: "2026-07-21T09:00:00Z", rejectedReason: null },
  { id: "res-003", areaId: "area-04", areaName: "Quadra Poliesportiva", areaType: "quadra", unitNumber: "Bloco C - Apt 410", residentName: "Felipe Augusto Souza", date: "26/07/2026", startTime: "19:00", endTime: "20:00", status: "concluida", recurrence: "semanal", fee: 0, feePaid: false, attendees: 8, notes: "Treino de futsal semanal", createdAt: "2026-07-15T18:00:00Z", approvedBy: "Síndico - Roberto Farias", approvedAt: "2026-07-16T08:00:00Z", rejectedReason: null },
  { id: "res-004", areaId: "area-01", areaName: "Salão de Festas", areaType: "salao", unitNumber: "Bloco A - Apt 501", residentName: "Mariana Ferreira Lima", date: "02/08/2026", startTime: "20:00", endTime: "23:00", status: "pendente", recurrence: "unica", fee: 150, feePaid: false, attendees: 45, notes: "Festa de noivado", createdAt: "2026-07-24T16:45:00Z", approvedBy: null, approvedAt: null, rejectedReason: null },
  { id: "res-005", areaId: "area-02", areaName: "Churrasqueira", areaType: "churrasqueira", unitNumber: "Bloco B - Apt 220", residentName: "João Pedro Alves", date: "30/07/2026", startTime: "13:00", endTime: "18:00", status: "aprovada", recurrence: "unica", fee: 80, feePaid: true, attendees: 25, notes: "Churrasco de aniversário", createdAt: "2026-07-23T11:20:00Z", approvedBy: "Síndico - Roberto Farias", approvedAt: "2026-07-24T07:30:00Z", rejectedReason: null },
  { id: "res-006", areaId: "area-05", areaName: "Piscina", areaType: "piscina", unitNumber: "Bloco C - Apt 301", residentName: "Patrícia Gomes Rocha", date: "25/07/2026", startTime: "14:00", endTime: "17:00", status: "concluida", recurrence: "unica", fee: 0, feePaid: false, attendees: 12, notes: "Festa infantil - 8 anos", createdAt: "2026-07-18T13:00:00Z", approvedBy: "Síndico - Roberto Farias", approvedAt: "2026-07-19T09:00:00Z", rejectedReason: null },
  { id: "res-007", areaId: "area-01", areaName: "Salão de Festas", areaType: "salao", unitNumber: "Bloco D - Apt 102", residentName: "Ricardo Silva Mendes", date: "20/07/2026", startTime: "18:00", endTime: "23:00", status: "rejeitada", recurrence: "unica", fee: 150, feePaid: false, attendees: 100, notes: "Festa corporativa", createdAt: "2026-07-15T15:00:00Z", approvedBy: "Síndico - Roberto Farias", approvedAt: "2026-07-16T10:00:00Z", rejectedReason: "Excede capacidade máxima de 80 pessoas" },
  { id: "res-008", areaId: "area-04", areaName: "Quadra Poliesportiva", areaType: "quadra", unitNumber: "Bloco A - Apt 302", residentName: "Ana Beatriz Cardoso", date: "01/08/2026", startTime: "18:00", endTime: "19:00", status: "aprovada", recurrence: "semanal", fee: 0, feePaid: false, attendees: 6, notes: "Aulas de tênis", createdAt: "2026-07-22T17:00:00Z", approvedBy: "Síndico - Roberto Farias", approvedAt: "2026-07-23T08:00:00Z", rejectedReason: null },
  { id: "res-009", areaId: "area-02", areaName: "Churrasqueira", areaType: "churrasqueira", unitNumber: "Bloco C - Apt 410", residentName: "Felipe Augusto Souza", date: "03/08/2026", startTime: "11:00", endTime: "16:00", status: "cancelada", recurrence: "unica", fee: 80, feePaid: false, attendees: 15, notes: "Cancelada por motivo de saúde", createdAt: "2026-07-21T14:00:00Z", approvedBy: null, approvedAt: null, rejectedReason: null },
  { id: "res-010", areaId: "area-03", areaName: "Academia", areaType: "academia", unitNumber: "Bloco B - Apt 105", residentName: "Carlos Eduardo Martins", date: "26/07/2026", startTime: "06:00", endTime: "07:00", status: "concluida", recurrence: "semanal", fee: 0, feePaid: false, attendees: 1, notes: "Treino matinal", createdAt: "2026-07-10T19:00:00Z", approvedBy: "Auto-aprovado", approvedAt: "2026-07-10T19:00:00Z", rejectedReason: null },
  { id: "res-011", areaId: "area-01", areaName: "Salão de Festas", areaType: "salao", unitNumber: "Bloco D - Apt 205", residentName: "Juliana Ramos Barbosa", date: "10/08/2026", startTime: "19:00", endTime: "23:00", status: "pendente", recurrence: "unica", fee: 150, feePaid: false, attendees: 70, notes: "Bodas de prata", createdAt: "2026-07-25T20:30:00Z", approvedBy: null, approvedAt: null, rejectedReason: null },
  { id: "res-012", areaId: "area-05", areaName: "Piscina", areaType: "piscina", unitNumber: "Bloco A - Apt 501", residentName: "Mariana Ferreira Lima", date: "05/08/2026", startTime: "10:00", endTime: "13:00", status: "aprovada", recurrence: "mensal", fee: 0, feePaid: false, attendees: 20, notes: "Encontro mensal dos vizinhos", createdAt: "2026-07-23T12:00:00Z", approvedBy: "Síndico - Roberto Farias", approvedAt: "2026-07-24T08:00:00Z", rejectedReason: null },
];

export const mockReservationMetrics: ReservationMetrics = {
  total: 12,
  pendentes: 3,
  aprovadas: 4,
  rejeitadas: 1,
  canceladas: 1,
  concluidas: 3,
  receitaMes: 460,
  taxaAprovacao: 80,
};

// ===== T6: Livro de Ocorrências =====

export const mockOccurrences: Occurrence[] = [
  { id: "occ-001", protocol: "OC-2026-0042", type: "invasao", severity: "critica", status: "em_andamento", title: "Tentativa de invasão pela guarita", description: "Indivíduo não identificado tentou forçar a catraca da guarita 2 às 03:20. Câmera D2 registrou o evento. Segurança acionada.", location: "Guarita 2 - Entrada Norte", unitNumber: null, reportedBy: "Operador - Marcos Silva", reportedAt: "2026-07-26T03:25:00Z", resolvedAt: null, resolvedBy: null, resolution: null, attachments: [{ name: "snapshot_d2_0320.jpg", type: "image/jpeg", url: "" }], linkedEvents: ["evt-001", "evt-002"], linkedCameras: ["D2"], witnesses: ["Marcos Silva"], policeReport: true, policeReportNumber: "BO-2026-01578", notified: ["Síndico", "Administradora", "Polícia Militar"] },
  { id: "occ-002", protocol: "OC-2026-0041", type: "vandalismo", severity: "alta", status: "aberta", title: "Vandalismo no elevador do Bloco B", description: "Porta do elevador do Bloco B riscada com objeto pontiagudo. Detectado na ronda das 06h.", location: "Bloco B - Elevador", unitNumber: "Bloco B", reportedBy: "Operador - João Costa", reportedAt: "2026-07-26T06:15:00Z", resolvedAt: null, resolvedBy: null, resolution: null, attachments: [{ name: "foto_elevador_b.jpg", type: "image/jpeg", url: "" }], linkedEvents: [], linkedCameras: ["D5"], witnesses: [], policeReport: false, policeReportNumber: null, notified: ["Síndico", "Administradora"] },
  { id: "occ-003", protocol: "OC-2026-0040", type: "ruido", severity: "baixa", status: "resolvida", title: "Barulho excessivo no Bloco C", description: "Morador do Apt 410 reclamou de barulho no apartamento acima após 23h. Verificado e orientado.", location: "Bloco C - Apt 420", unitNumber: "Bloco C - Apt 420", reportedBy: "Operador - Marcos Silva", reportedAt: "2026-07-25T23:30:00Z", resolvedAt: "2026-07-26T00:15:00Z", resolvedBy: "Operador - Marcos Silva", resolution: "Morador orientado e barulho cessou. Registrado advertência verbal.", attachments: [], linkedEvents: [], linkedCameras: [], witnesses: ["Apt 410"], policeReport: false, policeReportNumber: null, notified: ["Síndico"] },
  { id: "occ-004", protocol: "OC-2026-0039", type: "veiculo_irregular", severity: "media", status: "resolvida", title: "Veículo estacionado em vaga de deficiente", description: "Veículo prata, placa ABC1D23, estacionado na vaga 12 (deficiente) sem credencial. Proprietário localizado e veículo removido.", location: "Estacionamento - Vaga 12", unitNumber: null, reportedBy: "Operador - João Costa", reportedAt: "2026-07-25T15:40:00Z", resolvedAt: "2026-07-25T16:20:00Z", resolvedBy: "Operador - João Costa", resolution: "Proprietário do Apt 201 localizado. Veículo removido após orientação.", attachments: [{ name: "veiculo_vaga12.jpg", type: "image/jpeg", url: "" }], linkedEvents: ["evt-003"], linkedCameras: ["D4"], witnesses: [], policeReport: false, policeReportNumber: null, notified: ["Síndico", "Administradora"] },
  { id: "occ-005", protocol: "OC-2026-0038", type: "manutencao", severity: "media", status: "em_andamento", title: "Vazamento de água na área de lazer", description: "Vazamento identificado na rede de água próxima à piscina. Equipe de manutenção acionada.", location: "Área de Lazer - Piscina", unitNumber: null, reportedBy: "Operador - Marcos Silva", reportedAt: "2026-07-25T10:00:00Z", resolvedAt: null, resolvedBy: null, resolution: null, attachments: [{ name: "vazamento_piscina.jpg", type: "image/jpeg", url: "" }], linkedEvents: [], linkedCameras: ["D3"], witnesses: [], policeReport: false, policeReportNumber: null, notified: ["Síndico", "Manutenção"] },
  { id: "occ-006", protocol: "OC-2026-0037", type: "conflito", severity: "media", status: "resolvida", title: "Conflito entre moradores na academia", description: "Dois moradores tiveram desentendimento sobre uso do aparelho. Mediação realizada pelo operador.", location: "Academia", unitNumber: null, reportedBy: "Operador - João Costa", reportedAt: "2026-07-24T18:30:00Z", resolvedAt: "2026-07-24T19:00:00Z", resolvedBy: "Operador - João Costa", resolution: "Mediação realizada. Ambos orientados sobre regras de uso.", attachments: [], linkedEvents: [], linkedCameras: [], witnesses: ["Apt 302", "Apt 105"], policeReport: false, policeReportNumber: null, notified: ["Síndico"] },
  { id: "occ-007", protocol: "OC-2026-0036", type: "animal_solto", severity: "baixa", status: "arquivada", title: "Cão solto nas áreas comuns", description: "Cão de porte médio encontrado solto no corredor do Bloco A. Dono localizado no Apt 501.", location: "Bloco A - Corredor Térreo", unitNumber: "Bloco A - Apt 501", reportedBy: "Operador - Marcos Silva", reportedAt: "2026-07-24T08:15:00Z", resolvedAt: "2026-07-24T08:30:00Z", resolvedBy: "Operador - Marcos Silva", resolution: "Dono localizado e orientado. Animal recolhido.", attachments: [], linkedEvents: [], linkedCameras: ["D2"], witnesses: [], policeReport: false, policeReportNumber: null, notified: ["Síndico"] },
  { id: "occ-008", protocol: "OC-2026-0035", type: "acidente", severity: "alta", status: "resolvida", title: "Acidente no estacionamento", description: "Colisão entre dois veículos no estacionamento do Bloco D. Sem vítimas. Boletim registrado.", location: "Estacionamento - Bloco D", unitNumber: null, reportedBy: "Operador - João Costa", reportedAt: "2026-07-23T19:45:00Z", resolvedAt: "2026-07-23T21:00:00Z", resolvedBy: "Operador - João Costa", resolution: "Boletim de ocorrência registrado. Seguradoras notificadas pelos envolvidos.", attachments: [{ name: "acidente_bloco_d.jpg", type: "image/jpeg", url: "" }, { name: "acidente_bloco_d_2.jpg", type: "image/jpeg", url: "" }], linkedEvents: ["evt-004"], linkedCameras: ["D4", "D6"], witnesses: ["Apt D-102", "Apt D-205"], policeReport: true, policeReportNumber: "BO-2026-01542", notified: ["Síndico", "Polícia Militar"] },
  { id: "occ-009", protocol: "OC-2026-0034", type: "incendio", severity: "critica", status: "arquivada", title: "Princípio de incêndio na churrasqueira", description: "Fogo fora da área designada na churrasqueira. Extintor utilizado rapidamente. Sem danos estruturais.", location: "Churrasqueira - Área de Lazer", unitNumber: null, reportedBy: "Operador - Marcos Silva", reportedAt: "2026-07-22T20:30:00Z", resolvedAt: "2026-07-22T20:45:00Z", resolvedBy: "Operador - Marcos Silva", resolution: "Extintor utilizado. Área isolada e inspecionada. Sem danos estruturais.", attachments: [{ name: "churrasqueira_incendio.jpg", type: "image/jpeg", url: "" }], linkedEvents: [], linkedCameras: ["D3"], witnesses: ["Bloco B-105"], policeReport: false, policeReportNumber: null, notified: ["Síndico", "Bombeiros"] },
  { id: "occ-010", protocol: "OC-2026-0033", type: "roubo", severity: "alta", status: "em_andamento", title: "Furto de bicicleta na bike rack", description: "Bicicleta mountain bike preta furtada da bike rack do Bloco C. Câmera D6 registrou indivíduo suspeito.", location: "Bike Rack - Bloco C", unitNumber: "Bloco C - Apt 301", reportedBy: "Operador - João Costa", reportedAt: "2026-07-26T07:00:00Z", resolvedAt: null, resolvedBy: null, resolution: null, attachments: [{ name: "snapshot_d6_0645.jpg", type: "image/jpeg", url: "" }], linkedEvents: ["evt-005"], linkedCameras: ["D6"], witnesses: [], policeReport: true, policeReportNumber: "BO-2026-01580", notified: ["Síndico", "Polícia Civil"] },
  { id: "occ-011", protocol: "OC-2026-0032", type: "enchente", severity: "media", status: "resolvida", title: "Alagamento no subsolo após chuva", description: "Água da chuva acumulou no subsolo do Bloco A. Bombas de drenagem acionadas manualmente.", location: "Subsolo - Bloco A", unitNumber: "Bloco A", reportedBy: "Operador - Marcos Silva", reportedAt: "2026-07-20T16:00:00Z", resolvedAt: "2026-07-20T18:30:00Z", resolvedBy: "Manutenção - Pedro Santos", resolution: "Bombas de drenagem acionadas. Água removida. Equipe técnica verificou sistema.", attachments: [{ name: "alagamento_subsolo.jpg", type: "image/jpeg", url: "" }], linkedEvents: [], linkedCameras: [], witnesses: [], policeReport: false, policeReportNumber: null, notified: ["Síndico", "Manutenção", "Administradora"] },
  { id: "occ-012", protocol: "OC-2026-0031", type: "outro", severity: "baixa", status: "aberta", title: "Lâmpada queimada no corredor do Bloco C", description: "Lâmpada do corredor do 3º andar do Bloco C queimada. Solicitação de substituição.", location: "Bloco C - Corredor 3º andar", unitNumber: "Bloco C", reportedBy: "Operador - João Costa", reportedAt: "2026-07-26T09:00:00Z", resolvedAt: null, resolvedBy: null, resolution: null, attachments: [], linkedEvents: [], linkedCameras: [], witnesses: [], policeReport: false, policeReportNumber: null, notified: ["Manutenção"] },
];

export const mockOccurrenceMetrics: OccurrenceMetrics = {
  total: 12,
  abertas: 2,
  emAndamento: 3,
  resolvidas: 5,
  arquivadas: 2,
  criticas: 2,
  tempoMedioResolucao: "1h 42min",
  comBoletim: 3,
};

// ===== T9: Relatório de Valor =====

export const mockValueReport: ValueReport = {
  period: "mes",
  periodLabel: "Julho 2026",
  generatedAt: "2026-07-26T10:00:00Z",
  siteName: "Condomínio Alphaville Residencial",
  siteType: "Condomínio",

  securityMetrics: [
    { label: "Tentativas de invasão bloqueadas", value: 14, unit: "eventos", trend: 27, benchmark: "Média do setor: 8/mês" },
    { label: "Tempo médio de resposta", value: 42, unit: "segundos", trend: -15, benchmark: "SLA contratado: <60s" },
    { label: "Vandalismo detectado", value: 3, unit: "ocorrências", trend: -40, benchmark: "Média do setor: 5/mês" },
    { label: "Furtos preventidos", value: 7, unit: "eventos", trend: 12, benchmark: "Média do setor: 3/mês" },
    { label: "Acessos irregulares bloqueados", value: 22, unit: "eventos", trend: 8, benchmark: "Média do setor: 15/mês" },
  ],
  blockedAttempts: 14,
  blockedTrend: 27,

  patrolRecords: [
    { date: "26/07", route: "Ronda Noturna - Perímetro", scheduled: 4, completed: 4, missed: 0, coveragePct: 100 },
    { date: "25/07", route: "Ronda Diurna - Estacionamento", scheduled: 6, completed: 6, missed: 0, coveragePct: 100 },
    { date: "24/07", route: "Ronda Noturna - Perímetro", scheduled: 4, completed: 3, missed: 1, coveragePct: 75 },
    { date: "23/07", route: "Ronda Diurna - Áreas Comuns", scheduled: 6, completed: 6, missed: 0, coveragePct: 100 },
    { date: "22/07", route: "Ronda Noturna - Perímetro", scheduled: 4, completed: 4, missed: 0, coveragePct: 100 },
    { date: "21/07", route: "Ronda Diurna - Estacionamento", scheduled: 6, completed: 5, missed: 1, coveragePct: 83 },
    { date: "20/07", route: "Ronda Noturna - Perímetro", scheduled: 4, completed: 4, missed: 0, coveragePct: 100 },
  ],
  patrolCoverage: 94,
  patrolTrend: 5,

  eventSummaries: [
    { category: "Estranho em área restrita", total: 38, blocked: 38, resolved: 38, avgResponseTime: "38s" },
    { category: "Veículo não autorizado", total: 22, blocked: 22, resolved: 22, avgResponseTime: "45s" },
    { category: "Pessoa na lista de acesso negado", total: 8, blocked: 8, resolved: 8, avgResponseTime: "12s" },
    { category: "Movimento fora de horário", total: 15, blocked: 0, resolved: 15, avgResponseTime: "1min 20s" },
    { category: "Porta/permanência aberta", total: 11, blocked: 0, resolved: 11, avgResponseTime: "2min 05s" },
  ],
  totalEvents: 812,
  eventsTrend: 18,

  complianceItems: [
    { label: "LGPD — Consentimento de biometria", status: "conforme", detail: "98% dos moradores com consentimento ativo" },
    { label: "LGPD — Retenção de snapshots (24h)", status: "conforme", detail: "Política de expurgo automático configurada" },
    { label: "LGPD — Log de acesso a dado biométrico", status: "conforme", detail: "Todas as consultas registradas com timestamp e operador" },
    { label: "LGPD — Alternativa não-biométrica", status: "conforme", detail: "Tag RFID e QR Code disponíveis como alternativa" },
    { label: "RIPD — Relatório de Impacto", status: "pendente", detail: "Atualização trimestral em revisão pelo DPO" },
    { label: "ECA — Proteção de menores (escola)", status: "nao_aplicavel", detail: "Não aplicável — unidade é condomínio" },
  ],
  complianceScore: 83,

  highlights: [
    "14 tentativas de invasão bloqueadas pelo GuardIA Percebe — 27% acima do mês anterior",
    "Tempo médio de resposta reduziu 15%, ficando em 42 segundos (SLA: <60s)",
    "94% de cobertura de rondas — 5% acima do mês anterior",
    "7 furtos preventidos pela detecção de estranhos no estacionamento",
    "98% de conformidade LGPD com consentimento ativo",
  ],
  recommendations: [
    "Revisar RIPD trimestral — vence em 15 dias",
    "Considerar expansão de IA para câmera D6 (bike rack) — 1 furto registrado sem cobertura",
    "Ronda noturna de 24/07 teve 1 ponto perdido — investigar causa raiz",
    "Porta/permanência aberta tem tempo de resposta de 2min — criar automação de alerta prioritário",
  ],
};
