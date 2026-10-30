"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Wand2, Loader2, Building2, AlertTriangle, CheckCircle } from "lucide-react";

type ExamConfig = { id: string; name: string; academicYear: string; isActive: boolean };
type Assignment = { id: string; room: { code: string; name: string; capacity: number }; studentCount: number };

export default function RoomAssignmentPage() {
    const [configs, setConfigs] = useState<ExamConfig[]>([]);
    const [selectedConfig, setSelectedConfig] = useState("");
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        fetch("/api/schedule").then(r => r.json()).then(j => {
            if (j.success) { setConfigs(j.data); const active = j.data.find((c: ExamConfig) => c.isActive); if (active) setSelectedConfig(active.id); }
        });
    }, []);

    const fetchAssignments = useCallback(async () => {
        if (!selectedConfig) return;
        setLoading(true);
        const res = await fetch(`/api/generate/rooms?examConfigId=${selectedConfig}`);
        const json = await res.json();
        if (json.success) setAssignments(json.data);
        setLoading(false);
    }, [selectedConfig]);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh when selected exam config changes
    useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

    const handleGenerate = async () => {
        if (!selectedConfig) { setError("Pilih konfigurasi ujian terlebih dahulu"); return; }
        setError(""); setSuccess(""); setGenerating(true);
        const res = await fetch("/api/generate/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ examConfigId: selectedConfig }) });
        const json = await res.json();
        setGenerating(false);
        if (json.success) { setSuccess(`Berhasil! ${json.data.totalStudents} siswa dialokasikan ke ${json.data.totalRooms} ruang.`); fetchAssignments(); }
        else setError(json.error);
    };

    return (
        <DashboardLayout title="Alokasi Ruang">
            <div className="max-w-5xl mx-auto space-y-4">
                <div className="page-header">
                    <div><h1 className="page-title">Alokasi Ruang Ujian</h1><p className="page-subtitle">Generate distribusi siswa ke ruang ujian secara otomatis</p></div>
                    <button onClick={handleGenerate} disabled={generating || !selectedConfig} className="btn-success"><Wand2 size={16} className={generating ? "animate-spin" : ""} />{generating ? "Generating..." : "Generate Alokasi"}</button>
                </div>

                <div className="card-glass p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex-1">
                        <label className="form-label">Pilih Konfigurasi Ujian</label>
                        <select className="form-select" value={selectedConfig} onChange={e => setSelectedConfig(e.target.value)}>
                            <option value="">-- Pilih Ujian --</option>
                            {configs.map(c => <option key={c.id} value={c.id}>{c.name} {c.isActive ? "(Aktif)" : ""}</option>)}
                        </select>
                    </div>
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
                    <div className="flex items-center justify-center h-40 text-[var(--text-muted)]"><Loader2 size={20} className="animate-spin mr-2" />Memuat data...</div>
                ) : assignments.length === 0 ? (
                    <div className="card-glass p-12 text-center text-[var(--text-muted)]">
                        <Building2 size={40} className="mx-auto mb-3 opacity-30" />
                        <p>Belum ada alokasi ruang. Klik tombol &quot;Generate Alokasi&quot; untuk memulai.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {assignments.map(a => (
                            <div key={a.id} className="card-glass p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-[var(--text-main)]">{a.room.name}</p>
                                        <p className="text-xs text-[var(--text-muted)]">Kode: {a.room.code}</p>
                                    </div>
                                    <span className="badge badge-blue">{a.room.code}</span>
                                </div>
                                <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between">
                                    <span className="text-xs text-[var(--text-muted)]">Jumlah Siswa</span>
                                    <span className="text-lg font-bold text-[var(--text-main)]">{a.studentCount}<span className="text-xs text-[var(--text-muted)]">/{a.room.capacity}</span></span>
                                </div>
                                <div className="mt-2 h-1.5 bg-[var(--bg-surface-hover)] rounded-md overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-md" style={{ width: `${Math.min(100, (a.studentCount / a.room.capacity) * 100)}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
