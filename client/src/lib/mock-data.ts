import {
  CameraEvent, ConnectorStatus, CameraInfo,
  CustodyStudent, CustodyAlert, CustodyMetrics,
  ConsentRecord, ConsentMetrics,
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
