"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Loader2, FileText, Eye, X, Download, ScrollText } from "lucide-react";
import { formatDate, formatDay, formatDateShort } from "@/utils/dateFormatter";

type ExamConfig = { id: string; name: string; academicYear: string; semester: string; isActive: boolean };
type ExamSchedule = { id: string; date: string; session: number; subject: string; startTime: string; endTime: string };
type InvigilatorRow = {
    id: string;
    examScheduleId: string;
    teacher: { name: string; nip: string | null; code: string | null };
    room: { id: string; code: string; name: string };
    examSchedule: ExamSchedule;
};
type RoomPlan = {
    room: { id: string; code: string; name: string; capacity: number };
    studentCount: number;
    seats: { id: string }[];
};
type SchoolIdentity = {
    name: string | null;
    address: string | null;
    headmasterName: string | null;
    headmasterNip: string | null;
    logo: string | null;
};

type BeritaAcaraItem = InvigilatorRow & { participantCount: number };

export default function ExportBeritaAcaraPage() {
    const [configs, setConfigs] = useState<ExamConfig[]>([]);
    const [selectedConfig, setSelectedConfig] = useState("");
    const [activeConfig, setActiveConfig] = useState<ExamConfig | null>(null);
    const [items, setItems] = useState<BeritaAcaraItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState<"pdf" | "preview" | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [dateFilter, setDateFilter] = useState<string>("");
    const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
    const [schoolCache, setSchoolCache] = useState<SchoolIdentity | null>(null);
    const [jspdfModule, setJspdfModule] = useState<{ default: typeof import("jspdf").default } | null>(null);

    useEffect(() => {
        fetch("/api/schedule")
            .then((r) => r.json())
            .then((j) => {
                if (j.success) {
                    setConfigs(j.data);
                    const active = j.data.find((c: ExamConfig) => c.isActive);
                    if (active) {
                        setSelectedConfig(active.id);
                        setActiveConfig(active);
                    }
                }
            });
        // Preload jsPDF + identitas sekolah di background agar klik Export langsung jalan
        import("jspdf").then((m) => setJspdfModule(m)).catch(() => {});
        fetch("/api/school-identity")
            .then((r) => r.json())
            .then((j) => {
                if (j.success && j.data) setSchoolCache(j.data);
            })
            .catch(() => {});
    }, []);

    const fetchData = useCallback(async () => {
        if (!selectedConfig) return;
        setLoading(true);
        try {
            const [invRes, seatRes] = await Promise.all([
                fetch(`/api/generate/invigilators?examConfigId=${selectedConfig}`),
                fetch(`/api/generate/seats?examConfigId=${selectedConfig}`),
            ]);
            const invJson = await invRes.json();
            const seatJson = await seatRes.json();
            if (invJson.success && seatJson.success) {
                const plans = seatJson.data as RoomPlan[];
                const countMap = new Map<string, number>();
                plans.forEach((p) => countMap.set(p.room.id, p.seats.length));
                const joined: BeritaAcaraItem[] = (invJson.data as InvigilatorRow[]).map((inv) => ({
                    ...inv,
                    participantCount: countMap.get(inv.room.id) ?? 0,
                }));
                joined.sort((a, b) => {
                    const d = new Date(a.examSchedule.date).getTime() - new Date(b.examSchedule.date).getTime();
                    if (d !== 0) return d;
                    if (a.examSchedule.session !== b.examSchedule.session) return a.examSchedule.session - b.examSchedule.session;
                    return a.room.code.localeCompare(b.room.code);
                });
                setItems(joined);
            }
        } finally {
            setLoading(false);
        }
    }, [selectedConfig]);

    useEffect(() => {
        const cfg = configs.find((c) => c.id === selectedConfig);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- sync derived active config and refresh data
        setActiveConfig(cfg || null);
        fetchData();
    }, [selectedConfig, configs, fetchData]);

    // Group by date -> session for display (respect date filter)
    const filteredItems = dateFilter ? items.filter((i) => i.examSchedule.date.slice(0, 10) === dateFilter) : items;
    const availableDates = Array.from(new Set(items.map((i) => i.examSchedule.date.slice(0, 10)))).sort();
    const grouped = filteredItems.reduce<Record<string, Record<number, BeritaAcaraItem[]>>>((acc, row) => {
        const date = row.examSchedule.date;
        const session = row.examSchedule.session;
        if (!acc[date]) acc[date] = {};
        if (!acc[date][session]) acc[date][session] = [];
        acc[date][session].push(row);
        return acc;
    }, {});
    const totalDays = Object.keys(grouped).length;

    const handleExportPDF = async (action: "download" | "preview" = "download") => {
        if (filteredItems.length === 0) return;
        setExporting(action === "download" ? "pdf" : "preview");
        setProgress({ done: 0, total: filteredItems.length });
        try {
            // Pakai cache; fallback fetch hanya jika cache belum siap
            let school: SchoolIdentity | null = schoolCache;
            if (!school) {
                try {
                    const idRes = await fetch("/api/school-identity");
                    const idJson = await idRes.json();
                    if (idJson.success && idJson.data) {
                        school = idJson.data;
                        setSchoolCache(idJson.data);
                    }
                } catch (e) {
                    console.error("Failed to fetch school identity", e);
                }
            }

            const schoolName = school?.name || "MADRASAH";
            const schoolAddress = school?.address || "";
            const headmasterName = school?.headmasterName || "( ............................................. )";
            const headmasterNip = school?.headmasterNip || "";
            const schoolLogo = school?.logo || null;
            const academicYear = activeConfig?.academicYear || "";
            const examName = activeConfig?.name || "UJIAN";

            const { default: jsPDF } = jspdfModule ?? await import("jspdf");
            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            const margin = 15;

            const renderKop = () => {
                let y = 14;
                if (schoolLogo) {
                    try {
                        const imgProps = doc.getImageProperties(schoolLogo);
                        const logoW = 20;
                        const logoH = (imgProps.height * logoW) / imgProps.width;
                        doc.addImage(schoolLogo, imgProps.fileType, margin, 10, logoW, logoH);
                    } catch (e) {
                        console.error("Failed to draw logo", e);
                    }
                }
                doc.setFont("helvetica", "bold");
                doc.setFontSize(13);
                doc.text(schoolName.toUpperCase(), pageW / 2, y, { align: "center" });
                y += 5;
                if (schoolAddress) {
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(9);
                    const addrLines = doc.splitTextToSize(schoolAddress, pageW - margin * 2 - 44);
                    doc.text(addrLines, pageW / 2, y, { align: "center" });
                    y += addrLines.length * 4;
                }
                y += 2;
                doc.setLineWidth(0.8);
                doc.line(margin, y, pageW - margin, y);
                doc.setLineWidth(0.3);
                doc.line(margin, y + 1.2, pageW - margin, y + 1.2);
                return y + 7;
            };

            let firstPage = true;
            let idx = 0;
            for (const item of filteredItems) {
                if (!firstPage) doc.addPage();
                firstPage = false;
                idx += 1;
                // Yield ke event loop tiap 10 halaman agar UI/progress tidak macet
                if (idx % 5 === 0 || idx === filteredItems.length) {
                    setProgress({ done: idx, total: filteredItems.length });
                }
                if (idx % 10 === 0) {
                    await new Promise((r) => setTimeout(r, 0));
                }

                let y = renderKop();

                // Title
                doc.setFont("helvetica", "bold");
                doc.setFontSize(12);
                doc.text("BERITA ACARA PELAKSANAAN UJIAN", pageW / 2, y, { align: "center" });
                y += 5;
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                doc.text(`${examName} — Tahun Ajaran ${academicYear}`, pageW / 2, y, { align: "center" });
                y += 8;

                // Identity table
                doc.setFontSize(10);
                const labelX = margin;
                const colonX = margin + 38;
                const valueX = margin + 42;
                const rowH = 6;
                const sched = item.examSchedule;
                const dayName = formatDay(sched.date);
                const dateLong = formatDate(sched.date);
                const teacherLabel = item.teacher.nip
                    ? `${item.teacher.name} (NIP: ${item.teacher.nip})`
                    : item.teacher.name;

                const rows: [string, string][] = [
                    ["Hari / Tanggal", `${dayName} / ${dateLong}`],
                    ["Sesi", `Sesi ${sched.session} (${sched.startTime} – ${sched.endTime})`],
                    ["Mata Pelajaran", sched.subject],
                    ["Ruang", `${item.room.code} — ${item.room.name}`],
                    ["Pengawas", teacherLabel],
                    ["Jumlah Peserta", `${item.participantCount} orang`],
                ];
                for (const [label, value] of rows) {
                    doc.setFont("helvetica", "normal");
                    doc.text(label, labelX, y);
                    doc.text(":", colonX, y);
                    doc.setFont("helvetica", label === "Mata Pelajaran" ? "bold" : "normal");
                    const wrapped = doc.splitTextToSize(value, pageW - valueX - margin);
                    doc.text(wrapped, valueX, y);
                    y += Math.max(1, wrapped.length) * rowH - (wrapped.length > 1 ? 2 : 0);
                }
                y += 3;

                // Statement
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                const statement = `Pada hari ini, ${dayName.toLowerCase()} tanggal ${formatDateShort(sched.date)}, telah diselenggarakan ujian mata pelajaran ${sched.subject} sesi ${sched.session} di ruang ${item.room.name} dari pukul ${sched.startTime} sampai pukul ${sched.endTime} dengan ketentuan sebagai berikut:`;
                const stLines = doc.splitTextToSize(statement, pageW - margin * 2);
                doc.text(stLines, margin, y);
                y += stLines.length * 5 + 2;

                // Counts (manual fill)
                doc.setFontSize(10);
                const countRows: [string, string][] = [
                    ["1.", `Jumlah peserta seharusnya : ${item.participantCount} orang`],
                    ["2.", "Jumlah peserta hadir      : ............ orang"],
                    ["3.", "Jumlah peserta tidak hadir : ............ orang"],
                ];
                for (const [no, text] of countRows) {
                    doc.text(no, margin + 2, y);
                    doc.text(text, margin + 10, y);
                    y += 6;
                }

                // Absent numbers
                doc.text("4.  Nomor peserta yang tidak hadir:", margin + 2, y);
                y += 6;
                for (let i = 0; i < 2; i++) {
                    doc.setDrawColor(150);
                    doc.line(margin + 10, y, pageW - margin, y);
                    y += 7;
                }
                doc.setDrawColor(0);

                // Notes box
                doc.text("5.  Catatan / kejadian khusus:", margin + 2, y);
                y += 5;
                const boxH = 28;
                const boxTop = y;
                // clamp so signatures still fit
                const minSigSpace = 55;
                let noteH = boxH;
                if (boxTop + noteH > pageH - minSigSpace) {
                    noteH = pageH - minSigSpace - boxTop;
                }
                doc.setDrawColor(0);
                doc.setLineWidth(0.4);
                doc.rect(margin + 2, boxTop, pageW - margin * 2 - 2, Math.max(noteH, 18));
                // dotted guide lines inside box
                doc.setDrawColor(200);
                doc.setLineWidth(0.2);
                for (let ly = boxTop + 7; ly < boxTop + Math.max(noteH, 18) - 2; ly += 7) {
                    doc.line(margin + 5, ly, pageW - margin - 3, ly);
                }
                doc.setDrawColor(0);
                doc.setLineWidth(0.3);
                y = boxTop + Math.max(noteH, 18) + 6;

                doc.setFont("helvetica", "normal");
                doc.text("Demikian berita acara ini dibuat dengan sebenarnya.", margin, y);
                y += 8;

                // Signatures
                if (y > pageH - 50) {
                    doc.addPage();
                    y = renderKop();
                    doc.setFontSize(10);
                    doc.text(`(Lanjutan berita acara — ${item.room.name}, Sesi ${sched.session})`, margin, y);
                    y += 8;
                }
                const leftX = margin + 30;
                const rightX = pageW - margin - 30;
                doc.setFontSize(10);
                doc.text("Pengawas,", leftX, y, { align: "center" });
                doc.text("Ketua Panitia,", rightX, y, { align: "center" });
                y += 20;
                doc.setFont("helvetica", "bold");
                doc.text(item.teacher.name, leftX, y, { align: "center" });
                doc.text(headmasterName, rightX, y, { align: "center" });
                y += 5;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                if (item.teacher.nip) doc.text(`NIP. ${item.teacher.nip}`, leftX, y, { align: "center" });
                if (headmasterNip) doc.text(`NIP. ${headmasterNip}`, rightX, y, { align: "center" });
            }

            // Page numbers
            const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
            for (let p = 1; p <= totalPages; p++) {
                doc.setPage(p);
                doc.setFontSize(7);
                doc.setTextColor(150, 150, 150);
                doc.text(
                    `Dicetak: ${new Date().toLocaleDateString("id-ID")} | Halaman ${p}/${totalPages}`,
                    pageW / 2,
                    pageH - 8,
                    { align: "center" }
                );
                doc.setTextColor(0, 0, 0);
            }

            if (action === "download") {
                doc.save(`Berita_Acara_${activeConfig?.academicYear?.replace("/", "-") || "Ujian"}.pdf`);
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
            setProgress(null);
        }
    };

    return (
        <DashboardLayout title="Export Berita Acara">
            <div className="max-w-6xl mx-auto space-y-4">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Export Berita Acara</h1>
                        <p className="page-subtitle">Berita acara pelaksanaan ujian per ruang per sesi dalam format PDF</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleExportPDF("preview")}
                            disabled={filteredItems.length === 0 || !!exporting}
                            className="btn-secondary"
                        >
                            {exporting === "preview" ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                            Preview{dateFilter ? " (filter)" : ""}
                        </button>
                        <button
                            onClick={() => handleExportPDF("download")}
                            disabled={filteredItems.length === 0 || !!exporting}
                            className="btn-primary"
                        >
                            {exporting === "pdf" ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                            Simpan PDF{dateFilter ? " (filter)" : ""}
                        </button>
                    </div>
                </div>

                {progress && (
                    <div className="card-glass p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-[var(--text-main)] font-medium">
                                Menyusun PDF... {progress.done}/{progress.total} lembar
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                                {Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%
                            </p>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--bg-surface-hover)] overflow-hidden">
                            <div
                                className="h-full bg-blue-500 transition-all"
                                style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                <div className="card-glass p-4 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <label className="form-label">Pilih Konfigurasi Ujian</label>
                        <select
                            className="form-select max-w-sm"
                            value={selectedConfig}
                            onChange={(e) => { setSelectedConfig(e.target.value); setDateFilter(""); }}
                        >
                            <option value="">-- Pilih Ujian --</option>
                            {configs.map((c) => (
                                <option key={c.id} value={c.id}>{c.name} {c.isActive ? "(Aktif)" : ""}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="form-label">Filter Tanggal (opsional — export lebih cepat)</label>
                        <select
                            className="form-select max-w-sm"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                        >
                            <option value="">Semua tanggal ({items.length} lembar)</option>
                            {availableDates.map((d) => (
                                <option key={d} value={d}>
                                    {formatDate(d)} ({items.filter((i) => i.examSchedule.date.slice(0, 10) === d).length} lembar)
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-48 text-[var(--text-muted)]">
                        <Loader2 size={20} className="animate-spin mr-2" />Memuat data berita acara...
                    </div>
                ) : items.length === 0 ? (
                    <div className="card-glass p-12 text-center text-[var(--text-muted)]">
                        <ScrollText size={48} className="mx-auto mb-3 opacity-20" />
                        <p className="text-sm">Belum ada data berita acara.</p>
                        <p className="text-xs mt-1 opacity-70">Lakukan Generate Pengawas & Denah Kursi terlebih dahulu.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="card-glass p-4 flex items-center gap-6">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-[var(--text-main)]">{filteredItems.length}</p>
                                <p className="text-xs text-[var(--text-muted)]">Lembar{dateFilter ? " (filter)" : ""}</p>
                            </div>
                            <div className="w-px h-10 bg-[var(--border)]" />
                            <div className="text-center">
                                <p className="text-2xl font-bold text-[var(--text-main)]">{totalDays}</p>
                                <p className="text-xs text-[var(--text-muted)]">Hari Ujian</p>
                            </div>
                            <div className="w-px h-10 bg-[var(--border)]" />
                            <div className="flex-1">
                                {activeConfig && (
                                    <p className="text-sm text-[var(--text-main)] font-medium">{activeConfig.name}</p>
                                )}
                                <p className="text-xs text-[var(--text-muted)]">1 lembar per ruang per sesi — filter tanggal bila hanya butuh sebagian</p>
                            </div>
                        </div>

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
                                                            <th>Ruang</th>
                                                            <th>Pengawas</th>
                                                            <th>Peserta</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {rows.map((row) => (
                                                            <tr key={row.id}>
                                                                <td>
                                                                    <span className="badge badge-gray">{row.room.code}</span>
                                                                    <span className="ml-2 text-xs text-[var(--text-muted)]">{row.room.name}</span>
                                                                </td>
                                                                <td className="font-medium text-[var(--text-main)]">{row.teacher.name}</td>
                                                                <td className="text-[var(--text-muted)]">{row.participantCount} orang</td>
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

            {previewUrl && (
                <div className="modal-overlay z-[60]">
                    <div className="modal-content h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                            <div className="flex items-center gap-2">
                                <Eye size={18} className="text-[var(--primary)]" />
                                <h2 className="text-base font-semibold text-[var(--text-main)]">Preview Berita Acara</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const link = document.createElement("a");
                                        link.href = previewUrl;
                                        link.download = `Berita_Acara_${activeConfig?.academicYear?.replace("/", "-") || "Ujian"}.pdf`;
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
                            <iframe src={previewUrl} className="w-full h-full border-0" title="PDF Preview" />
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
