import { CameraEvent } from "./types";

/**
 * Lógica de classificação de eventos críticos.
 * Define quais eventos disparam notificações toast imediatas.
 */

export type CriticalLevel = "critical" | "warning" | "info";

export interface CriticalAlert {
  level: CriticalLevel;
  title: string;
  message: string;
  event: CameraEvent;
}

/**
 * Avalia se um evento é crítico e retorna o alerta correspondente.
 * Retorna null se o evento não for crítico.
 */
export function evaluateCriticalEvent(event: CameraEvent): CriticalAlert | null {
  const data = event.payload?.data;
  const operator = event.operator;

  // Alarme → sempre crítico
  if (operator === "Alarm") {
    return {
      level: "critical",
      title: "Alarme Disparado",
      message: `Câmera ${event.camera_serial} disparou alarme`,
      event,
    };
  }

  // Reconhecimento facial — Stranger (pessoa não cadastrada)
  if (operator === "FaceReco") {
    const faceList = data?.faceList || event.payload?.data?.faceList;
    const personName = data?.name || event.payload?.data?.name;
    const score = data?.matchScore ?? data?.score;

    // Stranger detectado — sempre crítico
    if (faceList === "Stranger" || (faceList && faceList.toLowerCase() === "stranger") || (!personName && !score)) {
      return {
        level: "critical",
        title: "Estranho Detectado",
        message: `Pessoa NÃO cadastrada na câmera ${event.camera_serial}${personName ? ` (${personName})` : ""}. Score: ${score ?? "N/A"}%`,
        event,
      };
    }

    // BlackList — crítico com prioridade máxima
    if (faceList === "BlackList" || (faceList && faceList.toLowerCase() === "blacklist")) {
      return {
        level: "critical",
        title: "Pessoa em Lista Negra",
        message: `${personName || "Suspeito"} detectado na câmera ${event.camera_serial}. LISTA NEGRA.`,
        event,
      };
    }

    // Match baixo (pessoa cadastrada mas baixa confiança)
    if (score != null && score < 50) {
      return {
        level: "critical",
        title: "Rosto Não Reconhecido",
        message: `Pessoa não identificada na câmera ${event.camera_serial}. Score: ${score}%`,
        event,
      };
    }
    if (score != null && score < 70) {
      return {
        level: "warning",
        title: "Match Baixo",
        message: `${personName || "Pessoa"} identificada com baixa confiança (${score}%) em ${event.camera_serial}`,
        event,
      };
    }
  }

  // Detecção de movimento fora de horário comercial (22h às 6h)
  if (operator === "MotionDetection") {
    const hour = new Date(event.timestamp).getHours();
    if (hour >= 22 || hour < 6) {
      return {
        level: "warning",
        title: "Movimento Fora de Horário",
        message: `Movimento detectado às ${hour}h na câmera ${event.camera_serial}`,
        event,
      };
    }
  }

  // Veículo não cadastrado (sem placa reconhecida)
  if (operator === "VehicleReco" && !data?.plate) {
    return {
      level: "warning",
      title: "Veículo Não Identificado",
      message: `Veículo sem placa reconhecível na câmera ${event.camera_serial}`,
      event,
    }
  }

  // AccessControl negado
  if (operator === "AccessControl" && data?.access === "denied") {
    return {
      level: "critical",
      title: "Acesso Negado",
      message: `Tentativa de acesso negada na câmera ${event.camera_serial}`,
      event,
    };
  }

  return null;
}

/**
 * Configuração visual por nível de criticidade.
 */
export const criticalConfig: Record<
  CriticalLevel,
  { color: string; icon: string; duration: number }
> = {
  critical: {
    color: "destructive",
    icon: "AlertTriangle",
    duration: 8000, // 8 segundos — fica mais tempo na tela
  },
  warning: {
    color: "warning",
    icon: "AlertCircle",
    duration: 5000, // 5 segundos
  },
  info: {
    color: "info",
    icon: "Info",
    duration: 3000, // 3 segundos
  },
};
