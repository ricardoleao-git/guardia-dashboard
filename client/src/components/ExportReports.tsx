import { useState, useRef } from "react";
import { FileDown, FileText, Loader2, ChevronDown } from "lucide-react";
import { CameraEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ExportReportsProps {
  events: CameraEvent[];
  filters?: {
    category?: string;
    search?: string;
    operator?: string;
    cameraSerial?: string;
  };
}

const operatorLabels: Record<string, string> = {
  FaceReco: "Reconhecimento Facial",
  VehicleReco: "Reconhecimento de Veículos",
  AccessControl: "Controle de Acesso",
  MotionDetection: "Detecção de Movimento",
  Alarm: "Alarme",
};

export default function ExportReports({ events, filters }: ExportReportsProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleExportCSV = () => {
    setExporting(true);
    setOpen(false);

    try {
      const headers = [
        "ID",
        "Data/Hora",
        "Câmera",
        "Serial",
        "Operador",
        "Direção",
        "Nome",
        "Placa",
        "Score",
        "Localização",
        "Status Sync",
      ];

      const rows = events.map((e) => [
        e.id,
        new Date(e.timestamp).toLocaleString("pt-BR"),
        e.payload?.cameraName || "",
        e.camera_serial,
        operatorLabels[e.operator] || e.operator,
        e.payload?.direction || "",
        e.payload?.name || "",
        e.payload?.plateNumber || e.payload?.plate || "",
        e.payload?.matchScore ? `${e.payload.matchScore}%` : "",
        e.payload?.location || "",
        "synced",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().slice(0, 5).replace(":", "");
      link.href = url;
      link.download = `guardia_relatorio_${dateStr}_${timeStr}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao exportar CSV:", err);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = () => {
    setExporting(true);
    setOpen(false);

    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString("pt-BR");
      const timeStr = now.toLocaleTimeString("pt-BR");

      // Estatísticas por câmera
      const cameraStats: Record<string, number> = {};
      events.forEach((e) => {
        const cam = e.payload?.cameraName || e.camera_serial;
        cameraStats[cam] = (cameraStats[cam] || 0) + 1;
      });
      const cameraBars = Object.entries(cameraStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([cam, count]) => {
          const maxCount = Math.max(...Object.values(cameraStats));
          const width = Math.round((count / maxCount) * 100);
          return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <div style="width:80px;font-size:10px;color:#64748b;text-align:right">${cam}</div>
            <div style="flex:1;background:#e2e8f0;border-radius:4px;height:16px;overflow:hidden">
              <div style="width:${width}%;height:100%;background:linear-gradient(90deg,#1e40af,#0ea5e9);border-radius:4px"></div>
            </div>
            <div style="width:30px;font-size:10px;font-weight:600;color:#1e293b">${count}</div>
          </div>`;
        })
        .join("");

      // Estatísticas por hora (últimas 24h)
      const hourlyStats: number[] = new Array(24).fill(0);
      events.forEach((e) => {
        const h = new Date(e.timestamp).getHours();
        if (h >= 0 && h < 24) hourlyStats[h]++;
      });
      const maxHourly = Math.max(...hourlyStats, 1);
      const hourlyBars = hourlyStats
        .map((count, h) => {
          const height = Math.round((count / maxHourly) * 60);
          return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;gap:2px">
            <div style="font-size:8px;color:#64748b">${count || ""}</div>
            <div style="width:100%;max-width:14px;height:${height}px;background:${count > 0 ? "#1e40af" : "#e2e8f0"};border-radius:2px 2px 0 0;min-height:2px"></div>
            <div style="font-size:7px;color:#94a3b8">${h}</div>
          </div>`;
        })
        .join("");

      // Eventos críticos (stranger, blacklist, alarm)
      const criticalEvents = events.filter((e) =>
        e.payload?.faceList?.toLowerCase() === "stranger" ||
        e.payload?.faceList?.toLowerCase() === "blacklist" ||
        e.operator === "Alarm"
      );
      const warningEvents = events.filter((e) =>
        e.payload?.matchScore && e.payload.matchScore < 70 && e.payload.matchScore > 0
      );

      // Build HTML for PDF
      const filterSummary = filters
        ? Object.entries(filters)
            .filter(([, v]) => v && v !== "all")
            .map(([k, v]) => {
              const labels: Record<string, string> = {
                category: "Categoria",
                search: "Busca",
                operator: "Operador",
                cameraSerial: "Câmera",
              };
              return `<tr><td style="color:#64748b;font-size:11px;padding:2px 12px 2px 0">${labels[k] || k}:</td><td style="font-size:11px;font-weight:500">${operatorLabels[v as string] || v}</td></tr>`;
            })
            .join("")
        : "";

      const eventRows = events
        .slice(0, 100)
        .map((e, i) => {
          const time = new Date(e.timestamp).toLocaleString("pt-BR");
          const op = operatorLabels[e.operator] || e.operator;
          const name = e.payload?.name || e.payload?.plateNumber || e.payload?.plate || "—";
          const score = e.payload?.matchScore ? `${e.payload.matchScore}%` : "—";
          const dir = e.payload?.direction || "—";
          const faceList = e.payload?.faceList || "";
          const isCritical = faceList.toLowerCase() === "stranger" || faceList.toLowerCase() === "blacklist" || e.operator === "Alarm";
          const rowBg = isCritical ? "#fef2f2" : i % 2 === 0 ? "#f8fafc" : "#ffffff";
          const criticalIcon = isCritical ? "⚠" : "";
          return `
            <tr style="background:${rowBg}">
              <td style="padding:6px 8px;font-size:10px;font-family:monospace;border-bottom:1px solid #e2e8f0">${criticalIcon} ${e.id.slice(0, 12)}</td>
              <td style="padding:6px 8px;font-size:10px;border-bottom:1px solid #e2e8f0">${time}</td>
              <td style="padding:6px 8px;font-size:10px;border-bottom:1px solid #e2e8f0">${e.payload?.cameraName || e.camera_serial}</td>
              <td style="padding:6px 8px;font-size:10px;border-bottom:1px solid #e2e8f0">${op}</td>
              <td style="padding:6px 8px;font-size:10px;border-bottom:1px solid #e2e8f0">${faceList || dir}</td>
              <td style="padding:6px 8px;font-size:10px;border-bottom:1px solid #e2e8f0">${name}</td>
              <td style="padding:6px 8px;font-size:10px;font-family:monospace;text-align:center;border-bottom:1px solid #e2e8f0">${score}</td>
            </tr>`;
        })
        .join("");

      const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório GuardIA</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 30px; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e40af; padding-bottom: 16px; margin-bottom: 20px; }
  .logo { font-size: 22px; font-weight: 800; color: #1e40af; }
  .logo span { color: #0ea5e9; }
  .meta { text-align: right; font-size: 11px; color: #64748b; }
  .meta strong { color: #1e293b; }
  .summary { background: #f1f5f9; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; }
  .summary h3 { font-size: 12px; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
  .stats { display: flex; gap: 16px; margin-bottom: 20px; }
  .stat { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
  .stat .num { font-size: 22px; font-weight: 700; color: #1e40af; }
  .stat .label { font-size: 9px; color: #64748b; text-transform: uppercase; margin-top: 4px; }
  .stat.critical .num { color: #dc2626; }
  .stat.warning .num { color: #f59e0b; }
  .section-title { font-size: 13px; font-weight: 700; color: #1e293b; margin: 24px 0 12px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
  .chart-container { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
  .hourly-chart { display: flex; align-items: flex-end; gap: 2px; height: 80px; padding: 0 4px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1e40af; color: white; padding: 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; text-align: left; }
  .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; text-align: center; }
  @media print { body { padding: 15px; } .page-break { page-break-before: always; } }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">Guard<span>IA</span> — Relatório Executivo de Eventos</div>
    <div class="meta">
      Gerado em: <strong>${dateStr} às ${timeStr}</strong><br/>
      Total de registros: <strong>${events.length}</strong><br/>
      Período: <strong>${events.length > 0 ? new Date(events[events.length-1].timestamp).toLocaleDateString("pt-BR") + " — " + new Date(events[0].timestamp).toLocaleDateString("pt-BR") : "N/A"}</strong>
    </div>
  </div>

  ${filterSummary ? `
  <div class="summary">
    <h3>Filtros Aplicados</h3>
    <table>${filterSummary}</table>
  </div>` : ""}

  <div class="stats">
    <div class="stat"><div class="num">${events.length}</div><div class="label">Total de Eventos</div></div>
    <div class="stat"><div class="num">${events.filter((e) => e.operator === "FaceReco").length}</div><div class="label">Facial</div></div>
    <div class="stat"><div class="num">${events.filter((e) => e.operator === "VehicleReco").length}</div><div class="label">Veículos</div></div>
    <div class="stat critical"><div class="num">${criticalEvents.length}</div><div class="label">Críticos</div></div>
    <div class="stat warning"><div class="num">${warningEvents.length}</div><div class="label">Match Baixo</div></div>
    <div class="stat"><div class="num">${Object.keys(cameraStats).length}</div><div class="label">Câmeras</div></div>
  </div>

  <div class="section-title">Distribuição por Hora (24h)</div>
  <div class="chart-container">
    <div class="hourly-chart">${hourlyBars}</div>
  </div>

  <div class="section-title">Top Câmeras por Volume de Eventos</div>
  <div class="chart-container">${cameraBars}</div>

  ${criticalEvents.length > 0 ? `
  <div class="section-title">Eventos Críticos (${criticalEvents.length})</div>
  <div class="chart-container" style="background:#fef2f2;border-color:#fecaca">
    ${criticalEvents.slice(0, 10).map((e) => {
      const time = new Date(e.timestamp).toLocaleString("pt-BR");
      const cam = e.payload?.cameraName || e.camera_serial;
      const name = e.payload?.name || "Não identificado";
      const faceList = e.payload?.faceList || "";
      return `<div style="display:flex;gap:12px;padding:6px 0;border-bottom:1px solid #fecaca">
        <div style="font-size:10px;color:#dc2626;font-weight:600">⚠ ${faceList || e.operator}</div>
        <div style="font-size:10px;color:#64748b">${time}</div>
        <div style="font-size:10px">${cam}</div>
        <div style="font-size:10px;font-weight:500">${name}</div>
      </div>`;
    }).join("")}
    ${criticalEvents.length > 10 ? `<div style="font-size:10px;color:#64748b;margin-top:6px">+ ${criticalEvents.length - 10} eventos críticos adicionais...</div>` : ""}
  </div>` : ""}

  <div class="section-title">Lista de Eventos${events.length > 100 ? ` (Primeiros 100 de ${events.length})` : ""}</div>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Data/Hora</th>
        <th>Câmera</th>
        <th>Operador</th>
        <th>Lista/Dir</th>
        <th>Identificação</th>
        <th>Score</th>
      </tr>
    </thead>
    <tbody>
      ${eventRows}
    </tbody>
  </table>

  <div class="footer">
    GuardIA — Sistema de Monitoramento Inteligente | Zênite Tech<br/>
    Documento gerado automaticamente pelo Dashboard GuardIA em ${dateStr} às ${timeStr}<br/>
    Para suporte: atendimento@zenite.tech
  </div>
</body>
</html>`;

      const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      if (w) {
        w.onload = () => {
          setTimeout(() => {
            w.print();
          }, 500);
        };
      }
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao exportar PDF:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        disabled={exporting || events.length === 0}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {exporting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileDown className="h-3.5 w-3.5" />
        )}
        Exportar
        <ChevronDown className="h-3 w-3 opacity-50" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
            <button
              onClick={handleExportPDF}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-xs hover:bg-accent transition-colors text-left"
            >
              <FileText className="h-4 w-4 text-red-400" />
              <div>
                <p className="font-medium">Relatório PDF</p>
                <p className="text-[10px] text-muted-foreground">Imprimível com filtros e stats</p>
              </div>
            </button>
            <div className="border-t border-border" />
            <button
              onClick={handleExportCSV}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-xs hover:bg-accent transition-colors text-left"
            >
              <FileDown className="h-4 w-4 text-green-400" />
              <div>
                <p className="font-medium">Exportar CSV</p>
                <p className="text-[10px] text-muted-foreground">Planilha com todos os campos</p>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
