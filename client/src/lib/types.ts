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
