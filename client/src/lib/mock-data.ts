import { CameraEvent, ConnectorStatus, CameraInfo } from "./types";

// Mock data para desenvolvimento do frontend sem Supabase configurado
// Quando o Supabase estiver configurado, o hook useEvents vai buscar dados reais

const operators = ["FaceReco", "AccessControl", "VehicleReco", "MotionDetection"];
const serials = ["I320F6958", "I320F6959", "I320F6960", "I320F6961"];
const names = ["João Silva", "Maria Santos", "Pedro Costa", "Ana Oliveira", "Carlos Souza", "Beatriz Lima", "Rafael Ferreira", "Juliana Alves"];
const locations = ["Portão Principal", "Entrada Bloco A", "Sala de Professores", "Estacionamento", "Refeitório", "Biblioteca"];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(minutesAgo: number): string {
  const date = new Date(Date.now() - Math.random() * minutesAgo * 60 * 1000);
  return date.toISOString();
}

export function generateMockEvents(count: number = 50): CameraEvent[] {
  const events: CameraEvent[] = [];

  for (let i = 0; i < count; i++) {
    const operator = randomFrom(operators);
    const serial = randomFrom(serials);
    const name = randomFrom(names);
    const timestamp = randomDate(180);

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
        },
        data: {
          name: operator === "FaceReco" ? name : undefined,
          matchScore: operator === "FaceReco" ? Math.floor(Math.random() * 20) + 80 : undefined,
          plate: operator === "VehicleReco" ? `ABC${Math.floor(Math.random() * 9000) + 1000}` : undefined,
          direction: Math.random() > 0.5 ? "entry" : "exit",
        },
      },
      media_urls: operator === "FaceReco" ? {
        CaptureImage: `https://picsum.photos/seed/${i}capture/400/300`,
        recognizeImage: `https://picsum.photos/seed/${i}reco/200/200`,
      } : {
        CaptureImage: `https://picsum.photos/seed/${i}capture/400/300`,
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

export const mockCameras: CameraInfo[] = serials.map((serial, i) => ({
  serial,
  model: "F4C-T",
  location: randomFrom(locations),
  online: Math.random() > 0.2,
  lastEvent: randomDate(30),
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
