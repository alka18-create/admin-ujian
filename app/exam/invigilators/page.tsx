"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Wand2, Loader2, UserCheck, BarChart3, CheckCircle, AlertTriangle } from "lucide-react";
import { formatDate } from "@/utils/dateFormatter";

type ExamConfig = { id: string; name: string; isActive: boolean };
type InvigilatorData = {
    id: string;
    teacher: { id: string; name: string; code: string | null };
    room: { id: string; code: string; name: string; classes?: string[] };
    examSchedule: { id: string; date: string; subject: string; session: number; startTime?: string | null; endTime?: string | null };
};
type RecapItem = {
    teacher: { id: string; name: string; maxSessions: number | null };
    count: number;
};

export default function InvigilatorsPage() {
    const [configs, setConfigs] = useState<ExamConfig[]>([]);
    const [selectedConfig, setSelectedConfig] = useState("");
    const [data, setData] = useState<InvigilatorData[]>([]);
    const [recap, setRecap] = useState<RecapItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [activeTab, setActiveTab] = useState<"schedule" | "recap">("schedule");

    useEffect(() => {
        fetch("/api/schedule").then(r => r.json()).then(j => {
            if (j.success) {
                setConfigs(j.data);
                const a = j.data.find((c: ExamConfig) => c.isActive);
                if (a) setSelectedConfig(a.id);
            }
        });
    }, []);

    const fetchData = useCallback(async () => {
        if (!selectedConfig) return;
        setLoading(true);
        const [d1, d2] = await Promise.all([
            fetch(`/api/generate/invigilators?examConfigId=${selectedConfig}`).then(r => r.json()),
            fetch(`/api/generate/invigilators?examConfigId=${selectedConfig}&recap=1`).then(r => r.json()),
        ]);
        if (d1.success) setData(d1.data);
        if (d2.success) setRecap(d2.data);
        setLoading(false);
    }, [selectedConfig]);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh when selected exam config changes
    useEffect(() => { fetchData(); }, [fetchData]);

    const handleGenerate = async () => {
        if (!selectedConfig) { setError("Pilih konfigurasi ujian terlebih dahulu"); return; }
        setError(""); setSuccess(""); setGenerating(true);
        const res = await fetch("/api/generate/invigilators", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ examConfigId: selectedConfig }),
        });
        const json = await res.json();
        setGenerating(false);
        if (json.success) {
            setSuccess(`Berhasil! ${json.data.total} penugasan pengawas dibuat.`);
            fetchData();
        } else {
            setError(json.error);
        }
    };

    const maxCount = recap.length > 0 ? Math.max(...recap.map(r => r.count)) : 1;

    return (
        <DashboardLayout title="Penugasan Pengawas">
            <div className="max-w-5xl mx-auto space-y-4">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Penugasan Pengawas</h1>
                        <p className="page-subtitle">Generate jadwal pengawas ujian secara otomatis</p>
                    </div>
                    <button onClick={handleGenerate} disabled={generating || !selectedConfig} className="btn-success">
                        <Wand2 size={16} className={generating ? "animate-spin" : ""} />
                        {generating ? "Generating..." : "Generate Pengawas"}
                    </button>
                </div>

                <div className="card-glass p-4">
                    <label className="form-label">Pilih Konfigurasi Ujian</label>
                    <select className="form-select max-w-sm" value={selectedConfig} onChange={e => setSelectedConfig(e.target.value)}>
                        <option value="">-- Pilih Ujian --</option>
                        {configs.map(c => <option key={c.id} value={c.id}>{c.name} {c.isActive ? "(Aktif)" : ""}</option>)}
                    </select>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                        <AlertTriangle size={18} />
                        {error}
                    </div>
                )}
                {success && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm shadow-emerald-500/5">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="font-medium tracking-tight">{success}</p>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center h-40 text-[var(--text-muted)]"><Loader2 size={20} className="animate-spin mr-2" />Memuat...</div>
                ) : data.length === 0 ? (
                    <div className="card-glass p-12 text-center text-[var(--text-muted)]">
                        <UserCheck size={48} className="mx-auto mb-3 opacity-20" />
                        <p>Belum ada penugasan pengawas.</p>
                        <p className="text-xs mt-1 text-[var(--text-muted)]">Klik &quot;Generate Pengawas&quot; untuk membuat jadwal otomatis.</p>
                    </div>
                ) : (
                    <>
                        {/* Tab switcher */}
                        <div className="flex gap-1 p-1 bg-[var(--bg-surface)]/50 rounded-lg border border-[var(--border)] w-fit">
                            <button
                                onClick={() => setActiveTab("schedule")}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "schedule" ? "bg-blue-600 text-white" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}
                            >
                                <UserCheck size={14} /> Jadwal Pengawas
                            </button>
                            <button
                                onClick={() => setActiveTab("recap")}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "recap" ? "bg-blue-600 text-white" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"}`}
                            >
                                <BarChart3 size={14} /> Rekap Per Guru
                                <span className="bg-blue-900/50 text-blue-300 text-xs px-1.5 py-0.5 rounded">{recap.length}</span>
                            </button>
                        </div>

                        {/* Schedule Table (Cetak Format) */}
                        {activeTab === "schedule" && (() => {
                            // 1. Get unique rooms and sort by code
                            const allRoomsMap = new Map<string, { id: string; code: string; name: string; classes?: string[] }>();
                            data.forEach(d => allRoomsMap.set(d.room.id, d.room));
                            const uniqueRooms = Array.from(allRoomsMap.values()).sort((a, b) => a.code.localeCompare(b.code));

                            // 2. Extract Teacher Codes from the DB output.
                            // To follow Master Data order (creation order), we'll sort them by ID or a proxy for creation.
                            const teacherMap = new Map<string, { name: string; code: string }>();
                            data.forEach(d => {
                                if (d.teacher && !teacherMap.has(d.teacher.id)) {
                                    teacherMap.set(d.teacher.id, { name: d.teacher.name, code: d.teacher.code || "-" });
                                }
                            });

                            // Sort unique teachers by their ID (proxy for creation order in CUID/Auto-inc)
                            // or better yet, just follow the order they were inserted.
                            const uniqueTeacherIds = Array.from(teacherMap.keys()).sort();
                            const teacherCodeMap = new Map<string, string>(); // name -> code
                            const uniqueTeachers: string[] = [];

                            uniqueTeacherIds.forEach(id => {
                                const t = teacherMap.get(id)!;
                                uniqueTeachers.push(t.name);
                                teacherCodeMap.set(t.name, t.code);
                            });

                            // 3. Group by schedule (Date + Time + Subject) -> Rows
                            const scheduleGroups = new Map<string, {
                                scheduleId: string;
                                date: string;
                                time: string;
                                subject: string;
                                session: number;
                                assignments: Record<string, string>; // roomId -> teacher code
                            }>();

                            data.forEach(d => {
                                const schedKey = d.examSchedule.id || `${d.examSchedule.date}-${d.examSchedule.session}`;
                                if (!scheduleGroups.has(schedKey)) {
                                    // Extract time if format contains time, or just use session for now.
                                    // The examSchedule in DB has startTime and endTime. If included in API, we can use it.
                                    // For now we'll mock time based on session if not provided.
                                    const timeStr = d.examSchedule.startTime
                                        ? d.examSchedule.startTime
                                        : (d.examSchedule.session === 1 ? "07:30" : "10:00");

                                    scheduleGroups.set(schedKey, {
                                        scheduleId: schedKey,
                                        date: formatDate(d.examSchedule.date),
                                        time: timeStr,
                                        subject: d.examSchedule.subject,
                                        session: d.examSchedule.session,
                                        assignments: {}
                                    });
                                }
                                scheduleGroups.get(schedKey)!.assignments[d.room.id] = d.teacher ? teacherCodeMap.get(d.teacher.name)! : "-";
                            });

                            const rows = Array.from(scheduleGroups.values());

                            return (
                                <div className="space-y-6">
                                    <div className="flex flex-col sm:flex-row justify-end gap-2 pr-2 md:pr-0">
                                        <a
                                            href={`/api/export/invigilators?examConfigId=${selectedConfig}`}
                                            className="btn-success text-xs flex items-center gap-2 px-4 py-2"
                                            target="_blank"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            Export Excel
                                        </a>
                                        <button onClick={() => window.print()} className="btn-secondary text-xs flex items-center gap-2 px-4 py-2">
                                            🖨 Cetak Jadwal
                                        </button>
                                    </div>
                                    <div className="card-glass overflow-x-auto print:shadow-none print:border-black print:text-black">
                                        <style>{`
                                            @media print {
                                                body { background: white; color: black; }
                                                .card-glass { background: white; border: none; }
                                                .page-header, .form-label, .form-select, .btn-success, .btn-secondary, nav { display: none !important; }
                                                .data-table th, .data-table td { border-color: #333 !important; color: black !important; }
                                                .data-table th { background: #f0f0f0 !important; color: black !important; -webkit-print-color-adjust: exact; }
                                                table { width: 100%; border-collapse: collapse; }
                                                td, th { padding: 8px; border: 1px solid #000; font-size: 12px; }
                                                h1.page-title { display: block !important; margin-bottom: 20px; color: black !important; }
                                            }
                                        `}</style>

                                        <div className="hidden print:block mb-6 text-center">
                                            <h2 className="text-xl font-bold uppercase">Jadwal Pengawas Ujian</h2>
                                            <p className="text-sm">Tahun Ajaran 2024/2025</p>
                                        </div>

                                        <table className="data-table min-w-full print:border-black">
                                            <thead>
                                                <tr>
                                                    <th className="w-10 text-center">No</th>
                                                    <th>Mata Pelajaran</th>
                                                    <th>Hari / Tanggal</th>
                                                    <th>Waktu</th>
                                                    {uniqueRooms.map(r => (
                                                        <th key={r.id} className="text-center min-w-[60px]">
                                                            <div className="text-[10px] font-normal text-[var(--text-muted)] leading-tight print:hidden">
                                                                {r.name}
                                                            </div>
                                                            <div className="mt-0.5">{r.code}</div>
                                                            {r.classes && r.classes.length > 0 && (
                                                                <div className="text-[9px] font-medium text-blue-500/80 dark:text-blue-400 capitalize mt-0.5 print:text-black leading-[1.1]">
                                                                    {r.classes.join(", ")}
                                                                </div>
                                                            )}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rows.map((row, idx) => (
                                                    <tr key={row.scheduleId}>
                                                        <td className="text-center text-[var(--text-muted)] print:text-black">{idx + 1}</td>
                                                        <td className="font-medium text-[var(--text-main)] print:text-black">{row.subject}</td>
                                                        <td className="text-[var(--text-main)] print:text-black">{row.date}</td>
                                                        <td className="text-[var(--text-muted)] print:text-black font-mono text-xs">{row.time}</td>
                                                        {uniqueRooms.map(r => (
                                                            <td key={r.id} className="text-center font-bold text-blue-600 dark:text-blue-400 print:text-black">
                                                                {row.assignments[r.id] || "-"}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Footer Legend */}
                                    <div className="card-glass p-4 print:shadow-none print:border-black">
                                        <h3 className="text-sm font-bold text-[var(--text-main)] print:text-black mb-3 border-b border-[var(--border)] print:border-black pb-2">
                                            Daftar Kode Guru
                                        </h3>
                                        <div className="columns-2 md:columns-4 lg:columns-5 gap-4">
                                            {uniqueTeachers.map(name => (
                                                <div key={name} className="flex gap-2 text-sm break-inside-avoid mb-2">
                                                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 print:text-black shrink-0">{teacherCodeMap.get(name)}</span>
                                                    <span className="text-[var(--text-main)] print:text-black truncate">{name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Recap Tab */}
                        {activeTab === "recap" && (
                            <div className="card-glass overflow-hidden">
                                <div className="px-5 py-4 border-b border-[var(--border)]">
                                    <h2 className="text-sm font-semibold text-[var(--text-main)]">Rekap Jumlah Pengawasan per Guru</h2>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">Diurutkan dari yang paling banyak mengawas</p>
                                </div>
                                <div className="divide-y divide-gray-800/60">
                                    {recap.map((item, idx) => {
                                        const pct = Math.round((item.count / maxCount) * 100);
                                        const isOverLimit = item.teacher.maxSessions !== null && item.count > item.teacher.maxSessions;
                                        const isAtLimit = item.teacher.maxSessions !== null && item.count === item.teacher.maxSessions;
                                        return (
                                            <div key={item.teacher.id} className="flex items-center gap-4 px-5 py-3">
                                                <span className="text-xs text-[var(--text-muted)] w-6 text-right flex-shrink-0">{idx + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <p className="text-sm font-medium text-[var(--text-main)] truncate">{item.teacher.name}</p>
                                                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                            {isOverLimit && <span className="text-xs text-red-400 font-medium">⚠ Melebihi batas</span>}
                                                            {isAtLimit && <span className="text-xs text-amber-400 font-medium">✓ Batas tercapai</span>}
                                                            <span className={`text-sm font-bold ${isOverLimit ? "text-red-400" : "text-[var(--text-main)]"}`}>
                                                                {item.count}× {item.teacher.maxSessions !== null ? <span className="text-xs text-[var(--text-muted)] font-normal">/ maks {item.teacher.maxSessions}</span> : ""}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {/* Progress bar */}
                                                    <div className="h-1.5 bg-[var(--bg-surface-hover)] rounded-md overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-md transition-all ${isOverLimit ? "bg-red-500" : isAtLimit ? "bg-amber-500" : "bg-blue-500"}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--bg-surface)]/30 flex items-center justify-between">
                                    <p className="text-xs text-[var(--text-muted)]">Total penugasan: <span className="text-[var(--text-main)] font-medium">{data.length}</span></p>
                                    <p className="text-xs text-[var(--text-muted)]">Rata-rata per guru: <span className="text-[var(--text-main)] font-medium">{recap.length > 0 ? (data.length / recap.length).toFixed(1) : 0}×</span></p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
