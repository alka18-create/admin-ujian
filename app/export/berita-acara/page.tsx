"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Loader2, FileText, Eye, X, Download, ScrollText } from "lucide-react";
import { formatDate, formatMonthYear } from "@/utils/dateFormatter";

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
    const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
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
            const [invRes, seatRes, schRes] = await Promise.all([
                fetch(`/api/generate/invigilators?examConfigId=${selectedConfig}`),
                fetch(`/api/generate/seats?examConfigId=${selectedConfig}`),
                fetch(`/api/schedule?type=schedules&examConfigId=${selectedConfig}`).catch(() => null),
            ]);
            const invJson = await invRes.json();
            const seatJson = await seatRes.json();
            if (schRes) {
                const schJson = await schRes.json().catch(() => null);
                if (schJson?.success) setSchedules(schJson.data as ExamSchedule[]);
            }
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

    // 1 lembar berita acara = 1 ruang pada 1 tanggal (memuat Jam Pertama/Kedua/Ketiga)
    const sheets = (() => {
        const map = new Map<string, { date: string; room: InvigilatorRow["room"] }>();
        for (const item of filteredItems) {
            const key = `${item.examSchedule.date.slice(0, 10)}|${item.room.id}`;
            if (!map.has(key)) map.set(key, { date: item.examSchedule.date, room: item.room });
        }
        return [...map.values()].sort(
            (a, b) =>
                new Date(a.date).getTime() - new Date(b.date).getTime() ||
                a.room.code.localeCompare(b.room.code)
        );
    })();

    // Jumlah lembar per tanggal (1 lembar = 1 ruang)
    const roomCountByDate = new Map<string, number>();
    {
        const sets = new Map<string, Set<string>>();
        for (const item of items) {
            const d = item.examSchedule.date.slice(0, 10);
            if (!sets.has(d)) sets.set(d, new Set());
            sets.get(d)!.add(item.room.id);
        }
        for (const [d, set] of sets) roomCountByDate.set(d, set.size);
    }
    const totalSheets = [...roomCountByDate.values()].reduce((a, b) => a + b, 0);

    const handleExportPDF = async (action: "download" | "preview" = "download") => {
        if (sheets.length === 0) return;
        setExporting(action === "download" ? "pdf" : "preview");
        setProgress({ done: 0, total: sheets.length });
        try {
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
            const academicYear = activeConfig?.academicYear || "";
            const examName = (activeConfig?.name || "UJIAN")
                .replace(/\s*\([^)]*\)\s*/g, " ")
                .trim()
                .toUpperCase();

            const { default: jsPDF } = jspdfModule ?? (await import("jspdf"));
            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const pageW = doc.internal.pageSize.getWidth();

            // Geometri mengikuti contoh "Berita Acara.pdf" (A4, satuan mm)
            const L = 22.3;      // tepi kiri teks paragraf
            const IND = 28.7;    // indentasi lanjutan butir a/b
            const LBL = 31.9;    // awal label isian
            const COL = 89;      // posisi titik dua
            const VAL = 92.3;    // awal isian
            const RIGHT = 188.5; // tepi kanan
            const BODY = 12;

            const setBody = (bold = false) => {
                doc.setFont("times", bold ? "bold" : "normal");
                doc.setFontSize(BODY);
            };

            /** Deretan titik sebagai garis isian */
            const dots = (fromX: number, toX: number, y: number) => {
                setBody();
                const unit = doc.getTextWidth(".");
                if (unit <= 0 || toX <= fromX) return;
                doc.text(".".repeat(Math.max(1, Math.ceil((toX - fromX) / unit))), fromX, y);
            };

            const rowLabel = (label: string, y: number) => {
                setBody();
                doc.text(label, LBL, y);
                const colonX = Math.max(COL, LBL + doc.getTextWidth(label) + 1.2);
                doc.text(":", colonX, y);
                return colonX;
            };

            const rowDots = (label: string, y: number, endX = RIGHT) => {
                const colonX = rowLabel(label, y);
                dots(Math.max(VAL, colonX + 2), endX, y);
            };

            /** Baris "……..orang" (isian jumlah peserta) */
            const rowOrang = (label: string, y: number) => {
                const colonX = rowLabel(label, y);
                setBody();
                const word = "orang";
                const wordX = 136.9 - doc.getTextWidth(word);
                dots(Math.max(VAL, colonX + 2), wordX - 0.15, y);
                doc.text(word, wordX, y);
            };

            /** Baris ":" + titik-titik tanpa label (lanjutan nomor peserta) */
            const extraLine = (y: number) => {
                setBody();
                doc.text(":", COL, y);
                dots(VAL, RIGHT, y);
            };

            const centerBold = (text: string, y: number, size: number) => {
                doc.setFont("times", "bold");
                let s = size;
                doc.setFontSize(s);
                while (s > 9 && doc.getTextWidth(text) > pageW - 34) {
                    s -= 0.5;
                    doc.setFontSize(s);
                }
                doc.text(text, pageW / 2, y, { align: "center" });
            };

            // Tabel tanda tangan pengawas
            const tableX = [27.8, 50.0, 103.1, 151.4, 188.5];
            const tableY = [231.0, 241.5, 250.5, 259.5, 268.4];

            let idx = 0;
            for (const sheet of sheets) {
                if (idx > 0) doc.addPage();
                idx += 1;
                if (idx % 5 === 0 || idx === sheets.length) {
                    setProgress({ done: idx, total: sheets.length });
                }
                if (idx % 10 === 0) {
                    await new Promise((r) => setTimeout(r, 0));
                }

                const dateKey = sheet.date.slice(0, 10);
                const daySchedules = schedules.filter((s) => s.date.slice(0, 10) === dateKey);
                const timeSource = daySchedules.length
                    ? daySchedules
                    : filteredItems
                          .filter((i) => i.examSchedule.date.slice(0, 10) === dateKey)
                          .map((i) => i.examSchedule);
                const startTime = timeSource.length
                    ? timeSource.reduce((min, s) => (s.startTime < min ? s.startTime : min), timeSource[0].startTime)
                    : "";
                const endTime = timeSource.length
                    ? timeSource.reduce((max, s) => (s.endTime > max ? s.endTime : max), timeSource[0].endTime)
                    : "";
                const [month, year] = formatMonthYear(sheet.date).split(" ");

                // ---------- Judul ----------
                centerBold("BERITA ACARA PENYELENGGARAAN", 22.1, 14);
                centerBold(examName, 28.6, 14);
                centerBold(schoolName.toUpperCase(), 35.0, 14);
                centerBold(`TAHUN AJARAN ${academicYear}`, 41.5, 14);

                // ---------- Pembuka ----------
                setBody();
                doc.text(
                    `Pada hari ini ..................... tanggal ......................... bulan ${month || ""} Tahun ${year || ""}`,
                    L,
                    52.5
                );

                const startDot = startTime ? startTime.replace(":", ".") : "…..";
                const endDot = endTime ? endTime.replace(":", ".") : "…..";
                const maxW = RIGHT - IND;
                const intro1 = `Telah diselenggarakan ${examName} Tahun Pelajaran ${academicYear} dari pukul ${startDot}`;
                doc.text("a.", L, 61.5);
                if (doc.getTextWidth(intro1) <= maxW) {
                    doc.text(intro1, IND, 61.5);
                    doc.text(`sampai dengan pukul ${endDot}`, IND, 66.8);
                } else {
                    const introLines = doc.splitTextToSize(`${intro1} sampai dengan pukul ${endDot}`, maxW);
                    introLines.forEach((line: string, i: number) => {
                        doc.text(line, IND, 61.5 + i * 5.3);
                    });
                }

                // ---------- Butir a ----------
                rowLabel("Pada Madrasah", 74.7);
                doc.text(schoolName, VAL, 74.7);
                rowLabel("Ruang", 80.8);
                doc.text(sheet.room.name, VAL, 80.8);

                rowDots("Mata Pelajaran Ujian Jam Pertama", 87.0, 169.6);
                rowOrang("Jumlah Peserta Seharusnya", 93.1);
                rowOrang("Jumlah Peserta yang Hadir", 99.3);
                rowOrang("Jumlah Peserta yang tidak Hadir", 105.4);
                extraLine(110.8);
                extraLine(116.1);

                rowDots("Mata Pelajaran Ujian Jam Kedua", 123.7, 169.6);
                rowOrang("Jumlah Peserta Seharusnya", 129.1);
                rowOrang("Jumlah Peserta yang Hadir", 134.5);
                rowOrang("Jumlah Peserta yang tidak Hadir", 139.8);
                extraLine(144.7);
                extraLine(149.6);

                rowDots("Mata Pelajaran Ujian Jam Ketiga", 154.9, 169.6);
                rowOrang("Jumlah Peserta Seharusnya", 160.2);
                rowOrang("Jumlah Peserta yang Hadir", 165.6);
                rowOrang("Jumlah Peserta yang tidak Hadir", 172.2);
                extraLine(178.8);
                extraLine(183.7);

                // ---------- Butir b ----------
                setBody();
                doc.text("b.", L, 189.2);
                doc.text(
                    doc.splitTextToSize(
                        `Catatan selama pelaksanaan ${examName} Tahun Pelajaran ${academicYear})`,
                        RIGHT - IND
                    ),
                    IND,
                    189.2
                );

                const notes = ["Ujian Jam Pertama", "Ujian Jam Kedua", "Ujian Jam Ketiga"];
                [201.6, 208.5, 215.4].forEach((y, i) => {
                    setBody();
                    doc.text(notes[i], LBL, y);
                    doc.text(":", 69.1, y);
                    dots(71.3, 190.5, y);
                });

                // ---------- Penutup ----------
                setBody();
                doc.text("Berita acara ini dibuat dengan sesungguhnya.", L, 222.8);
                doc.text("Pengawas yang membuat berita acara,", (tableX[0] + tableX[4]) / 2, 228.5, {
                    align: "center",
                });

                // ---------- Tabel tanda tangan ----------
                doc.setDrawColor(0);
                doc.setLineWidth(0.25);
                for (const y of tableY) doc.line(tableX[0], y, tableX[4], y);
                for (const x of tableX) doc.line(x, tableY[0], x, tableY[tableY.length - 1]);

                setBody(true);
                doc.text("UJIAN", (tableX[0] + tableX[1]) / 2, 234.4, { align: "center" });
                doc.text("JAM", (tableX[0] + tableX[1]) / 2, 239.7, { align: "center" });
                doc.text("NAMA", (tableX[1] + tableX[2]) / 2, 236.9, { align: "center" });
                doc.text("NIP.", (tableX[2] + tableX[3]) / 2, 236.9, { align: "center" });
                doc.text("TANDA TANGAN", (tableX[3] + tableX[4]) / 2, 236.9, { align: "center" });

                setBody();
                ["Pertama", "Kedua", "Ketiga"].forEach((label, i) => {
                    doc.text(label, (tableX[0] + tableX[1]) / 2, tableY[i + 1] + 5.2, { align: "center" });
                });
            }

            if (action === "download") {
                doc.save(
                    `Berita_Acara_${academicYear.replace("/", "-") || "Ujian"}${dateFilter ? "_" + dateFilter : ""}.pdf`
                );
            } else {
                const blob = doc.output("blob");
                setPreviewUrl(URL.createObjectURL(blob));
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
                        <p className="page-subtitle">Berita acara penyelenggaraan ujian per ruang per hari (3 jam ujian) dalam format PDF</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleExportPDF("preview")}
                            disabled={sheets.length === 0 || !!exporting}
                            className="btn-secondary"
                        >
                            {exporting === "preview" ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                            Preview{dateFilter ? " (filter)" : ""}
                        </button>
                        <button
                            onClick={() => handleExportPDF("download")}
                            disabled={sheets.length === 0 || !!exporting}
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
                            <option value="">Semua tanggal ({totalSheets} lembar)</option>
                            {availableDates.map((d) => (
                                <option key={d} value={d}>
                                    {formatDate(d)} ({roomCountByDate.get(d) ?? 0} lembar)
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
                                <p className="text-2xl font-bold text-[var(--text-main)]">{sheets.length}</p>
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
                                <p className="text-xs text-[var(--text-muted)]">1 lembar per ruang per hari (Jam Pertama/Kedua/Ketiga) — filter tanggal bila hanya butuh sebagian</p>
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
