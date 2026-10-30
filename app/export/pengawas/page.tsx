"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FileSpreadsheet, FileText, Loader2, UserCheck, Eye, X, Download } from "lucide-react";
import { formatDate } from "@/utils/dateFormatter";

type ExamConfig = { id: string; name: string; academicYear: string; semester: string; isActive: boolean };
type InvigilatorRow = {
    id: string;
    teacher: { name: string; nip: string };
    room: { id: string; code: string; name: string };
    examSchedule: { date: string; subject: string; session: number; startTime: string; endTime: string };
};

export default function ExportPengawasPage() {
    const [configs, setConfigs] = useState<ExamConfig[]>([]);
    const [selectedConfig, setSelectedConfig] = useState("");
    const [activeConfig, setActiveConfig] = useState<ExamConfig | null>(null);
    const [data, setData] = useState<InvigilatorRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState<"pdf" | "excel" | "preview" | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/schedule")
            .then((r) => r.json())
            .then((j) => {
                if (j.success) {
                    setConfigs(j.data);
                    const active = j.data.find((c: ExamConfig) => c.isActive);
                    if (active) { setSelectedConfig(active.id); setActiveConfig(active); }
                }
            });
    }, []);

    const fetchData = useCallback(async () => {
        if (!selectedConfig) return;
        setLoading(true);
        const res = await fetch(`/api/generate/invigilators?examConfigId=${selectedConfig}`);
        const json = await res.json();
        if (json.success) setData(json.data);
        setLoading(false);
    }, [selectedConfig]);

    useEffect(() => {
        const cfg = configs.find((c) => c.id === selectedConfig);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- sync derived active config and refresh data
        setActiveConfig(cfg || null);
        fetchData();
    }, [selectedConfig, configs, fetchData]);

    // Group data by date → session
    const grouped = data.reduce<Record<string, Record<number, InvigilatorRow[]>>>((acc, row) => {
        const date = row.examSchedule.date;
        const session = row.examSchedule.session;
        if (!acc[date]) acc[date] = {};
        if (!acc[date][session]) acc[date][session] = [];
        acc[date][session].push(row);
        return acc;
    }, {});

    const handleExportPDF = async (action: "download" | "preview" = "download") => {
        if (data.length === 0) return;
        setExporting(action === "preview" ? "preview" : "pdf");
        try {
            let schoolLogo: string | null = null;
            try {
                const idRes = await fetch("/api/school-identity");
                const idJson = await idRes.json();
                if (idJson.success && idJson.data) {
                    if (idJson.data.logo) schoolLogo = idJson.data.logo;
                }
            } catch (e) {
                console.error("Failed to fetch school identity", e);
            }

            const { default: jsPDF } = await import("jspdf");
            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const pageW = doc.internal.pageSize.getWidth();

            const renderHeader = () => {
                if (schoolLogo) {
                    try {
                        const imgProps = doc.getImageProperties(schoolLogo);
                        const logoW = 20;
                        const logoH = (imgProps.height * logoW) / imgProps.width;
                        doc.addImage(schoolLogo, imgProps.fileType, 14, 12, logoW, logoH);
                    } catch (e) {
                        console.error("Failed to draw logo", e);
                    }
                }

                doc.setFontSize(14);
                doc.setFont("helvetica", "bold");
                doc.text("JADWAL PENGAWAS UJIAN", pageW / 2, 18, { align: "center" });
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                if (activeConfig) {
                    doc.text(activeConfig.name, pageW / 2, 25, { align: "center" });
                    doc.text(`Tahun Ajaran ${activeConfig.academicYear} — Semester ${activeConfig.semester}`, pageW / 2, 31, { align: "center" });
                }
                doc.setLineWidth(0.5);
                doc.line(14, 35, pageW - 14, 35);
            };

            renderHeader();

            let y = 42;
            const colX = [14, 25, 115, 160]; // No, Pengawas/NIP, Ruang, Tanda Tangan
            const colW = [11, 90, 45, 35];

            // Flatten grouped data into a list of sessions
            const sessionsList: { date: string; session: number; rows: InvigilatorRow[] }[] = [];
            const dates = Object.keys(grouped).sort();
            for (const date of dates) {
                const sessions = Object.keys(grouped[date]).map(Number).sort();
                for (const session of sessions) {
                    sessionsList.push({ date, session, rows: grouped[date][session] });
                }
            }

            let sessionCountOnPage = 0;
            let lastDate = "";

            for (let i = 0; i < sessionsList.length; i++) {
                const { date, session, rows } = sessionsList[i];

                // Check if we need a new page:
                // 1. Reached 2 sessions on current page
                // 2. New day starts (strict daily isolation)
                const isNewDay = lastDate !== "" && date !== lastDate;
                if (sessionCountOnPage >= 2 || isNewDay) {
                    doc.addPage();
                    renderHeader();
                    y = 42;
                    sessionCountOnPage = 0;
                }

                // If it's a new page OR a new date, print Date header
                if (sessionCountOnPage === 0 || date !== lastDate) {
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "bold");
                    doc.setFillColor(30, 58, 138);
                    doc.rect(14, y - 4, pageW - 28, 8, "F");
                    doc.setTextColor(255, 255, 255);
                    doc.text(`Hari: ${formatDate(date)}`, 17, y + 1.5);
                    doc.setTextColor(0, 0, 0);
                    y += 8;
                }

                const uniqueRows = Array.from(
                    new Map(rows.map((row) => [row.room.id, row])).values()
                );
                const subjects = Array.from(
                    new Set(rows.map((row) => row.examSchedule.subject).filter(Boolean))
                );
                const subject = subjects.join(" / ");
                const time = `${rows[0]?.examSchedule.startTime} – ${rows[0]?.examSchedule.endTime}`;

                // Session subheader
                doc.setFontSize(9);
                doc.setFont("helvetica", "bold");
                doc.setFillColor(225, 232, 240);
                doc.rect(14, y - 3, pageW - 28, 6, "F");
                doc.setTextColor(30, 58, 138);
                doc.text(`Sesi ${session} | ${subject} | ${time}`, 17, y + 1);
                doc.setTextColor(0, 0, 0);
                y += 7;

                // Table header
                doc.setFontSize(8);
                doc.setFont("helvetica", "bold");
                doc.setFillColor(245, 245, 245);
                doc.rect(14, y - 3, pageW - 28, 6, "F");
                const headers = ["No", "Nama Pengawas / NIP", "Ruang", "Tanda Tangan"];
                headers.forEach((h, idx) => {
                    doc.text(h, colX[idx] + 1, y + 1);
                });
                y += 6;

                // Table rows
                doc.setFont("helvetica", "normal");
                uniqueRows.forEach((row, idx) => {
                    // Internal overflow check (in case one session is extremely long)
                    if (y > 282) {                        doc.addPage();
                        renderHeader();
                        y = 42;
                        // Regrind headers if needed, but usually sessions fit in half page
                    }
                    doc.setDrawColor(200, 200, 200);
                    doc.rect(14, y - 3, pageW - 28, 7.5, "S");
                    doc.setFontSize(8);
                    doc.text(String(idx + 1), colX[0] + 2, y + 2);

                    const nipStr = row.teacher.nip ? ` (NIP: ${row.teacher.nip})` : "";
                    doc.text(`${row.teacher.name}${nipStr}`, colX[1] + 1, y + 2);

                    doc.text(`${row.room.code} - ${row.room.name}`, colX[2] + 1, y + 2);

                    // Box for signature
                    doc.setDrawColor(180, 180, 180);
                    doc.rect(colX[3] + 2, y - 2, colW[3] - 4, 5.5, "S");

                    y += 7.5;
                });

                y += 6; // Spacer between sessions
                sessionCountOnPage++;
                lastDate = date;
            }

            // Footer (Page Numbers)
            const totalPages = doc.getNumberOfPages();
            for (let p = 1; p <= totalPages; p++) {
                doc.setPage(p);
                doc.setFontSize(7);
                doc.setTextColor(150, 150, 150);
                doc.text(`Dicetak: ${new Date().toLocaleDateString("id-ID")} | Halaman ${p}/${totalPages}`, pageW / 2, 290, { align: "center" });
            }

            if (action === "download") {
                doc.save(`Jadwal_Pengawas_${activeConfig?.academicYear || "2024"}.pdf`);
            } else {
                const blob = doc.output("blob");
                const url = URL.createObjectURL(blob);
                setPreviewUrl(url);
            }
        } catch (err) {
            console.error(err);
            alert("Gagal export PDF");
        } finally {
            setExporting(null);
        }
    };

    const handleExportExcel = async () => {
        if (data.length === 0) return;
        setExporting("excel");
        try {
            const XLSX = await import("xlsx");
            const rows = data.map((row, idx) => ({
                No: idx + 1,
                Tanggal: formatDate(row.examSchedule.date),
                Sesi: `Sesi ${row.examSchedule.session}`,
                "Mata Pelajaran": row.examSchedule.subject,
                Waktu: `${row.examSchedule.startTime} – ${row.examSchedule.endTime}`,
                "Nama Pengawas": row.teacher.name,
                NIP: row.teacher.nip,
                "Kode Ruang": row.room.code,
                "Nama Ruang": row.room.name,
            }));

            const ws = XLSX.utils.json_to_sheet(rows);
            // Auto column widths
            ws["!cols"] = [
                { wch: 5 }, { wch: 18 }, { wch: 8 }, { wch: 22 }, { wch: 16 },
                { wch: 30 }, { wch: 22 }, { wch: 10 }, { wch: 16 },
            ];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Jadwal Pengawas");
            XLSX.writeFile(wb, `Jadwal_Pengawas_${activeConfig?.academicYear || "2024"}.xlsx`);
        } catch (err) {
            console.error(err);
            alert("Gagal export Excel");
        } finally {
            setExporting(null);
        }
    };

    return (
        <DashboardLayout title="Export Jadwal Pengawas">
            <div className="max-w-6xl mx-auto space-y-4">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Export Jadwal Pengawas</h1>
                        <p className="page-subtitle">Download jadwal penugasan pengawas dalam format PDF atau Excel</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleExportPDF("preview")}
                            disabled={data.length === 0 || !!exporting}
                            className="btn-secondary"
                        >
                            {exporting === "preview" ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                            Preview
                        </button>
                        <button
                            onClick={() => handleExportPDF("download")}
                            disabled={data.length === 0 || !!exporting}
                            className="btn-primary"
                        >
                            {exporting === "pdf" ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                            Simpan PDF
                        </button>
                        <button
                            onClick={handleExportExcel}
                            disabled={data.length === 0 || !!exporting}
                            className="btn-secondary"
                        >
                            {exporting === "excel" ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                            Excel
                        </button>
                    </div>
                </div>

                {/* Config Selector */}
                <div className="card-glass p-4">
                    <label className="form-label">Pilih Konfigurasi Ujian</label>
                    <select
                        className="form-select max-w-sm"
                        value={selectedConfig}
                        onChange={(e) => setSelectedConfig(e.target.value)}
                    >
                        <option value="">-- Pilih Ujian --</option>
                        {configs.map((c) => (
                            <option key={c.id} value={c.id}>{c.name} {c.isActive ? "(Aktif)" : ""}</option>
                        ))}
                    </select>
                </div>

                {/* Data Table */}
                {loading ? (
                    <div className="flex items-center justify-center h-48 text-[var(--text-muted)]">
                        <Loader2 size={20} className="animate-spin mr-2" />Memuat data...
                    </div>
                ) : data.length === 0 ? (
                    <div className="card-glass p-12 text-center text-[var(--text-muted)]">
                        <UserCheck size={48} className="mx-auto mb-3 opacity-20" />
                        <p className="text-sm">Belum ada jadwal pengawas.</p>
                        <p className="text-xs mt-1 opacity-70">Lakukan Generate Pengawas di menu Ujian → Pengawas terlebih dahulu.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Summary card */}
                        <div className="card-glass p-4 flex items-center gap-6">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-[var(--text-main)]">{data.length}</p>
                                <p className="text-xs text-[var(--text-muted)]">Total Penugasan</p>
                            </div>
                            <div className="w-px h-10 bg-[var(--border)]" />
                            <div className="text-center">
                                <p className="text-2xl font-bold text-[var(--text-main)]">{Object.keys(grouped).length}</p>
                                <p className="text-xs text-[var(--text-muted)]">Hari Ujian</p>
                            </div>
                            <div className="w-px h-10 bg-[var(--border)]" />
                            <div className="flex-1">
                                {activeConfig && (
                                    <p className="text-sm text-[var(--text-main)] font-medium">{activeConfig.name}</p>
                                )}
                                <p className="text-xs text-[var(--text-muted)]">Klik PDF / Excel untuk mengunduh</p>
                            </div>
                        </div>

                        {/* Grouped table */}
                        {Object.entries(grouped)
                            .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                            .map(([date, sessions]) => (
                                <div key={date} className="card-glass overflow-hidden">
                                    <div className="px-4 py-3 bg-blue-900/10 dark:bg-blue-900/20 border-b border-[var(--border)]">
                                        <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-300">📅 {formatDate(date)}</h3>
                                    </div>
                                    {Object.entries(sessions)
                                        .sort(([a], [b]) => Number(a) - Number(b))
                                        .map(([session, rows]) => (
                                            <div key={session}>
                                                <div className="px-4 py-2 bg-[var(--bg-surface-hover)] border-b border-[var(--border)] flex items-center gap-3">
                                                    <span className="badge badge-blue">Sesi {session}</span>
                                                    <span className="text-xs text-[var(--text-muted)]">{rows[0]?.examSchedule.subject}</span>
                                                    <span className="text-xs text-[var(--text-muted)] opacity-80 font-mono">
                                                        {rows[0]?.examSchedule.startTime} – {rows[0]?.examSchedule.endTime}
                                                    </span>
                                                </div>
                                                <table className="data-table">
                                                    <thead>
                                                        <tr>
                                                            <th>No</th>
                                                            <th>Nama Pengawas</th>
                                                            <th>NIP</th>
                                                            <th>Ruang</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {rows.map((row, idx) => (
                                                            <tr key={row.id}>
                                                                <td className="text-[var(--text-muted)]">{idx + 1}</td>
                                                                <td className="font-medium text-[var(--text-main)]">{row.teacher.name}</td>
                                                                <td className="font-mono text-xs text-[var(--text-muted)]">{row.teacher.nip || "-"}</td>
                                                                <td>
                                                                    <span className="badge badge-gray">{row.room.code}</span>
                                                                    <span className="ml-2 text-xs text-[var(--text-muted)]">{row.room.name}</span>
                                                                </td>
                                                                                                                         </tr>
                                                         ))}
                                                     </tbody>
                                                 </table>
                                             </div>
                                         ))}
                                 </div>
                             ))}
                     </div>
                 )}
             </div>

            {/* Preview Modal */}
            {previewUrl && (
                <div className="modal-overlay z-[60]">
                    <div className="modal-content h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                            <div className="flex items-center gap-2">
                                <Eye size={18} className="text-[var(--primary)]" />
                                <h2 className="text-base font-semibold text-[var(--text-main)]">Preview Jadwal Pengawas</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const link = document.createElement("a");
                                        link.href = previewUrl;
                                        link.download = `Jadwal_Pengawas_${activeConfig?.academicYear || "2024"}.pdf`;
                                        link.click();
                                    }}
                                    className="btn-primary py-1.5 px-3 text-xs"
                                >
                                    <Download size={14} /> Download PDF
                                </button>
                                <button
                                    onClick={() => {
                                        URL.revokeObjectURL(previewUrl);
                                        setPreviewUrl(null);
                                    }}
                                    className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors p-1"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 bg-[var(--bg-base)] relative">
                            <iframe
                                src={previewUrl}
                                className="w-full h-full border-0"
                                title="PDF Preview"
                            />
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
