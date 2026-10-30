"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Plus, Loader2, Trash2, Clock } from "lucide-react";
import { formatDate, formatDay } from "@/utils/dateFormatter";

type ExamConfig = { id: string; name: string; isActive: boolean };
type Schedule = {
    id: string;
    date: string;
    session: number;
    startTime: string;
    endTime: string;
    subject: string;
    className: string | null;
};

const SESSIONS = [1, 2, 3];

export default function ExamSchedulePage() {
    const [configs, setConfigs] = useState<ExamConfig[]>([]);
    const [selectedConfig, setSelectedConfig] = useState("");
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [form, setForm] = useState({
        date: "",
        session: "1",
        startTime: "07:30",
        endTime: "09:30",
        subject: "",
        className: "",
    });

    useEffect(() => {
        fetch("/api/schedule")
            .then((r) => r.json())
            .then((j) => {
                if (j.success) {
                    setConfigs(j.data);
                    const active = j.data.find((c: ExamConfig) => c.isActive);
                    if (active) setSelectedConfig(active.id);
                }
            });
    }, []);

    const fetchSchedules = useCallback(async () => {
        if (!selectedConfig) return;
        setLoading(true);
        const res = await fetch(
            `/api/schedule?type=schedules&examConfigId=${selectedConfig}`
        );
        const json = await res.json();
        if (json.success) setSchedules(json.data);
        setLoading(false);
    }, [selectedConfig]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh when selected exam config changes
        fetchSchedules();
    }, [fetchSchedules]);

    const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setSaving(true);
        const res = await fetch("/api/schedule", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "schedule",
                examConfigId: selectedConfig,
                ...form,
                session: parseInt(form.session),
            }),
        });
        const json = await res.json();
        setSaving(false);
        if (json.success) {
            setSuccess("Jadwal berhasil ditambahkan");
            setShowForm(false);
            setForm({ date: "", session: "1", startTime: "07:30", endTime: "09:30", subject: "", className: "" });
            fetchSchedules();
        } else {
            setError(json.error || "Gagal menyimpan");
        }
    };

    const handleDelete = async (id: string, subject: string) => {
        if (!confirm(`Hapus jadwal "${subject}"?`)) return;
        setDeleting(id);
        const res = await fetch(`/api/schedule/${id}`, { method: "DELETE" });
        const json = await res.json();
        if (json.success) fetchSchedules();
        else alert(json.error || "Gagal menghapus");
        setDeleting(null);
    };

    // Group by date
    const grouped = schedules.reduce<Record<string, Schedule[]>>((acc, s) => {
        const key = s.date;
        if (!acc[key]) acc[key] = [];
        acc[key].push(s);
        return acc;
    }, {});

    return (
        <DashboardLayout title="Jadwal Ujian">
            <div className="max-w-5xl mx-auto space-y-4">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Jadwal Ujian</h1>
                        <p className="page-subtitle">Kelola jadwal mata pelajaran ujian per sesi</p>
                    </div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        disabled={!selectedConfig}
                        className="btn-primary"
                    >
                        <Plus size={16} /> Tambah Jadwal
                    </button>
                </div>

                {/* Config selector */}
                <div className="card-glass p-4">
                    <label className="form-label">Pilih Konfigurasi Ujian</label>
                    <select
                        className="form-select max-w-sm"
                        value={selectedConfig}
                        onChange={(e) => setSelectedConfig(e.target.value)}
                    >
                        <option value="">-- Pilih Ujian --</option>
                        {configs.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name} {c.isActive ? "(Aktif)" : ""}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Add form */}
                {showForm && (
                    <div className="card-glass p-5">
                        <h3 className="text-sm font-semibold text-[var(--text-main)] mb-4">
                            Tambah Jadwal Ujian
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-lg">
                                    {error}
                                </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className="form-label">Tanggal *</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={form.date}
                                        onChange={(e) => set("date", e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Sesi *</label>
                                    <select
                                        className="form-select"
                                        value={form.session}
                                        onChange={(e) => set("session", e.target.value)}
                                    >
                                        {SESSIONS.map((s) => (
                                            <option key={s} value={s}>
                                                Sesi {s}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Mata Pelajaran *</label>
                                    <input
                                        className="form-input"
                                        value={form.subject}
                                        onChange={(e) => set("subject", e.target.value)}
                                        required
                                        placeholder="Matematika"
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Jam Mulai</label>
                                    <input
                                        type="time"
                                        className="form-input"
                                        value={form.startTime}
                                        onChange={(e) => set("startTime", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Jam Selesai</label>
                                    <input
                                        type="time"
                                        className="form-input"
                                        value={form.endTime}
                                        onChange={(e) => set("endTime", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Kelas (opsional)</label>
                                    <input
                                        className="form-input"
                                        value={form.className}
                                        onChange={(e) => set("className", e.target.value)}
                                        placeholder="XII IPA 1 (kosongkan = semua)"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" disabled={saving} className="btn-primary">
                                    {saving ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" /> Menyimpan...
                                        </>
                                    ) : (
                                        "Simpan Jadwal"
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="btn-secondary"
                                >
                                    Batal
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {success && (
                    <div className="bg-emerald-900/30 border border-emerald-700 text-emerald-300 text-sm px-4 py-3 rounded-lg">
                        {success}
                    </div>
                )}

                {/* Schedule list */}
                {!selectedConfig ? (
                    <div className="card-glass p-12 text-center text-[var(--text-muted)]">
                        Pilih konfigurasi ujian untuk melihat jadwal.
                    </div>
                ) : loading ? (
                    <div className="flex items-center justify-center h-40 text-[var(--text-muted)]">
                        <Loader2 size={20} className="animate-spin mr-2" />
                        Memuat jadwal...
                    </div>
                ) : Object.keys(grouped).length === 0 ? (
                    <div className="card-glass p-12 text-center text-[var(--text-muted)]">
                        <Clock size={40} className="mx-auto mb-3 opacity-20" />
                        <p>Belum ada jadwal. Klik &quot;Tambah Jadwal&quot; untuk memulai.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {Object.entries(grouped)
                            .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
                            .map(([date, items]) => (
                                <div key={date} className="card-glass overflow-hidden">
                                    <div className="px-4 py-3 border-b border-[var(--border)] bg-transparent">
                                        <h3 className="text-sm font-semibold text-[var(--text-main)]">
                                            📅 {formatDay(date)}, {formatDate(date)}
                                        </h3>
                                    </div>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Sesi</th>
                                                <th>Mata Pelajaran</th>
                                                <th>Waktu</th>
                                                <th>Kelas</th>
                                                <th>Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items
                                                .sort((a, b) => a.session - b.session)
                                                .map((s) => (
                                                    <tr key={s.id}>
                                                        <td>
                                                            <span className="badge badge-blue">Sesi {s.session}</span>
                                                        </td>
                                                        <td className="font-medium text-[var(--text-main)]">{s.subject}</td>
                                                        <td className="font-mono text-xs text-[var(--text-muted)]">
                                                            {s.startTime} – {s.endTime}
                                                        </td>
                                                        <td>{s.className || <span className="text-[var(--text-muted)]">Semua Kelas</span>}</td>
                                                        <td>
                                                            <button
                                                                onClick={() => handleDelete(s.id, s.subject)}
                                                                disabled={deleting === s.id}
                                                                className="btn-danger py-1 px-2 text-xs"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
