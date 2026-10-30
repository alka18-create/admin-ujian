"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { formatDate } from "@/utils/dateFormatter";

type ExamConfig = { id: string; name: string; isActive: boolean };
type Schedule = { id: string; date: string; session: number; subject: string; startTime: string; endTime: string; className: string | null };

export default function ExportJadwalPage() {
    const [configs, setConfigs] = useState<ExamConfig[]>([]);
    const [selectedConfig, setSelectedConfig] = useState("");
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch("/api/schedule").then(r => r.json()).then(j => {
            if (j.success) { setConfigs(j.data); const a = j.data.find((c: ExamConfig) => c.isActive); if (a) setSelectedConfig(a.id); }
        });
    }, []);

    useEffect(() => {
        if (!selectedConfig) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- show loading while fetching schedule rows
        setLoading(true);
        fetch(`/api/schedule?type=schedules&examConfigId=${selectedConfig}`).then(r => r.json()).then(j => {
            if (j.success) setSchedules(j.data);
            setLoading(false);
        });
    }, [selectedConfig]);

    const handleExportPDF = () => {
        window.print();
    };

    const handleExportExcel = async () => {
        if (schedules.length === 0) return;
        setLoading(true);
        try {
            const ExcelJS = await import("exceljs");
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Jadwal Ujian");

            const config = configs.find(c => c.id === selectedConfig);

            // Title
            worksheet.mergeCells("A1:E1");
            const titleCell = worksheet.getCell("A1");
            titleCell.value = "JADWAL UJIAN";
            titleCell.font = { name: "Arial", size: 16, bold: true };
            titleCell.alignment = { horizontal: "center" };

            worksheet.mergeCells("A2:E2");
            const subtitleCell = worksheet.getCell("A2");
            subtitleCell.value = config?.name || "Semua Ujian";
            subtitleCell.font = { name: "Arial", size: 12, bold: true };
            subtitleCell.alignment = { horizontal: "center" };

            worksheet.addRow([]); // Gap

            // Header Row
            const headerRow = worksheet.addRow(["TANGGAL", "SESI", "WAKTU", "MATA PELAJARAN", "KELAS"]);
            headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
            headerRow.eachCell((cell) => {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
                cell.alignment = { horizontal: "center", vertical: "middle" };
                cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
            });

            // Data Rows
            schedules.forEach((s) => {
                const row = worksheet.addRow([
                    formatDate(s.date),
                    `Sesi ${s.session}`,
                    `${s.startTime} – ${s.endTime}`,
                    s.subject,
                    s.className || "Semua"
                ]);
                row.eachCell((cell) => {
                    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
                    cell.alignment = { vertical: "middle" };
                });
            });

            // Column Widths
            worksheet.getColumn(1).width = 20;
            worksheet.getColumn(2).width = 10;
            worksheet.getColumn(3).width = 20;
            worksheet.getColumn(4).width = 30;
            worksheet.getColumn(5).width = 15;

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = `Jadwal_Ujian_${config?.name.replace(/\s+/g, "_") || "Export"}.xlsx`;
            anchor.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export Excel Error:", error);
            alert("Gagal mengekspor Excel.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout title="Export Jadwal">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .print\\:hidden { display: none !important; }
                    .card-glass { background: white !important; border: 1px solid #e2e8f0 !important; box-shadow: none !important; color: black !important; }
                    .page-header, .btn-primary, .btn-secondary, select, label { display: none !important; }
                    .data-table { width: 100% !important; border-collapse: collapse !important; color: black !important; }
                    .data-table th { background: #f1f5f9 !important; color: black !important; border: 1px solid #cbd5e1 !important; font-weight: bold !important; text-transform: uppercase !important; font-size: 10px !important; }
                    .data-table td { border: 1px solid #cbd5e1 !important; color: black !important; padding: 8px !important; }
                    .badge-blue { background: transparent !important; color: black !important; border: 1px solid #cbd5e1 !important; padding: 2px 4px !important; }
                    .font-mono { font-family: Courier, monospace !important; }
                    .text-[var(--text-main)] { color: black !important; font-weight: bold !important; }
                    #print-area { border: none !important; }
                    h1.print-title { display: block !important; text-align: center !important; font-size: 20px !important; font-weight: bold !important; margin-bottom: 20px !important; text-transform: uppercase !important; }
                }
                h1.print-title { display: none; }
                `
            }} />
            <div className="max-w-5xl mx-auto space-y-4">
                <h1 className="print-title">Jadwal Ujian {configs.find(c => c.id === selectedConfig)?.name}</h1>
                <div className="page-header print:hidden">
                    <div><h1 className="page-title">Export Jadwal Ujian</h1><p className="page-subtitle">Download jadwal ujian dalam format PDF atau Excel</p></div>
                    <div className="flex gap-2">
                        <button onClick={handleExportPDF} className="btn-primary" disabled={loading || schedules.length === 0}>
                            <FileText size={16} />PDF
                        </button>
                        <button onClick={handleExportExcel} className="btn-secondary" disabled={loading || schedules.length === 0}>
                            <FileSpreadsheet size={16} />Excel
                        </button>
                    </div>
                </div>

                <div className="card-glass p-4 print:hidden">
                    <label className="form-label">Pilih Konfigurasi Ujian</label>
                    <select className="form-select max-w-sm" value={selectedConfig} onChange={e => setSelectedConfig(e.target.value)}>
                        <option value="">-- Pilih Ujian --</option>
                        {configs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-40 text-[var(--text-muted)]"><Loader2 size={20} className="animate-spin mr-2" />Memuat...</div>
                ) : schedules.length === 0 ? (
                    <div className="card-glass p-12 text-center text-[var(--text-muted)]">Tidak ada jadwal untuk konfigurasi ini.</div>
                ) : (
                    <div className="card-glass overflow-hidden" id="print-area">
                        <table className="data-table">
                            <thead><tr><th>Tanggal</th><th>Sesi</th><th>Waktu</th><th>Mata Pelajaran</th><th>Kelas</th></tr></thead>
                            <tbody>
                                {schedules.map(s => (
                                    <tr key={s.id}>
                                        <td>{formatDate(s.date)}</td>
                                        <td><span className="badge badge-blue">Sesi {s.session}</span></td>
                                        <td className="font-mono text-xs">{s.startTime} – {s.endTime}</td>
                                        <td className="font-medium text-[var(--text-main)]">{s.subject}</td>
                                        <td>{s.className || "Semua"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
