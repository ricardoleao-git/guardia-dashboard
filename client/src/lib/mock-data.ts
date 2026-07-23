import { CameraEvent, ConnectorStatus, CameraInfo } from "./types";

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
