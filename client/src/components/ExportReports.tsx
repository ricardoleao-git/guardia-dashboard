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
        .map((e, i) => {
          const time = new Date(e.timestamp).toLocaleString("pt-BR");
          const op = operatorLabels[e.operator] || e.operator;
          const name = e.payload?.name || e.payload?.plateNumber || e.payload?.plate || "—";
          const score = e.payload?.matchScore ? `${e.payload.matchScore}%` : "—";
          const dir = e.payload?.direction || "—";
          const rowBg = i % 2 === 0 ? "#f8fafc" : "#ffffff";
          return `
            <tr style="background:${rowBg}">
              <td style="padding:6px 8px;font-size:10px;font-family:monospace;border-bottom:1px solid #e2e8f0">${e.id}</td>
              <td style="padding:6px 8px;font-size:10px;border-bottom:1px solid #e2e8f0">${time}</td>
              <td style="padding:6px 8px;font-size:10px;border-bottom:1px solid #e2e8f0">${e.payload?.cameraName || e.camera_serial}</td>
              <td style="padding:6px 8px;font-size:10px;border-bottom:1px solid #e2e8f0">${op}</td>
              <td style="padding:6px 8px;font-size:10px;border-bottom:1px solid #e2e8f0">${dir}</td>
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
  .stats { display: flex; gap: 24px; margin-bottom: 20px; }
  .stat { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
  .stat .num { font-size: 24px; font-weight: 700; color: #1e40af; }
  .stat .label { font-size: 10px; color: #64748b; text-transform: uppercase; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1e40af; color: white; padding: 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; text-align: left; }
  .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">Guard<span>IA</span> — Relatório de Eventos</div>
    <div class="meta">
      Gerado em: <strong>${dateStr} às ${timeStr}</strong><br/>
      Total de registros: <strong>${events.length}</strong>
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
    <div class="stat"><div class="num">${events.filter((e) => e.operator === "AccessControl").length}</div><div class="label">Acesso</div></div>
    <div class="stat"><div class="num">${events.filter((e) => e.operator === "Alarm").length}</div><div class="label">Alarmes</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Data/Hora</th>
        <th>Câmera</th>
        <th>Operador</th>
        <th>Direção</th>
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
    Documento gerado automaticamente pelo Dashboard GuardIA
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
