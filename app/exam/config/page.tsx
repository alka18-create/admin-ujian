"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Plus, Loader2, CheckCircle2, Clock, Edit } from "lucide-react";
import { formatDate } from "@/utils/dateFormatter";

type ExamConfig = { id: string; name: string; academicYear: string; semester: string; startDate: string; endDate: string; isActive: boolean };

export default function ExamConfigPage() {
    const [configs, setConfigs] = useState<ExamConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState({ name: "", academicYear: "2024/2025", semester: "GANJIL", startDate: "", endDate: "", isActive: false });

    const fetchData = useCallback(async () => {
        setLoading(true);
        const res = await fetch("/api/schedule");
        const json = await res.json();
        if (json.success) setConfigs(json.data);
        setLoading(false);
    }, []);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial config fetch
    useEffect(() => { fetchData(); }, [fetchData]);

    const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
        setForm((f) => ({ ...f, [k]: v }));

    const handleEdit = (cfg: ExamConfig) => {
        setEditId(cfg.id);
        const formatForInput = (isoString: string) => {
            if (!isoString) return "";
            return isoString.split("T")[0];
        };
        setForm({
            name: cfg.name,
            academicYear: cfg.academicYear,
            semester: cfg.semester,
            startDate: formatForInput(cfg.startDate),
            endDate: formatForInput(cfg.endDate),
            isActive: cfg.isActive,
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleOpenNew = () => {
        setEditId(null);
        setForm({ name: "", academicYear: "2024/2025", semester: "GANJIL", startDate: "", endDate: "", isActive: false });
        setShowForm(true);
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError(""); setSaving(true);

        const payload = editId ? { id: editId, ...form } : form;
        const method = editId ? "PUT" : "POST";

        const res = await fetch("/api/schedule", {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        setSaving(false);
        if (json.success) {
            setShowForm(false);
            setEditId(null);
            fetchData();
        } else {
            setError(json.error || "Gagal menyimpan");
        }
    };

    return (
        <DashboardLayout title="Konfigurasi Ujian">
            <div className="max-w-4xl mx-auto space-y-4">
                <div className="page-header">
                    <div><h1 className="page-title">Konfigurasi Ujian</h1><p className="page-subtitle">Kelola konfigurasi periode ujian</p></div>
                    <button onClick={handleOpenNew} className="btn-primary"><Plus size={16} /> Konfigurasi Baru</button>
                </div>

                {showForm && (
                    <div className="card-glass p-5">
                        <h3 className="text-sm font-semibold text-[var(--text-main)] mb-4">{editId ? "Edit Konfigurasi" : "Form Konfigurasi Ujian"}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-lg">{error}</div>}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2"><label className="form-label">Nama Ujian *</label><input className="form-input" value={form.name} onChange={e => set("name", e.target.value)} required placeholder="Ujian Kenaikan Kelas 2024/2025" /></div>
                                <div><label className="form-label">Tahun Ajaran</label><input className="form-input" value={form.academicYear} onChange={e => set("academicYear", e.target.value)} required /></div>
                                <div><label className="form-label">Semester</label><select className="form-select" value={form.semester} onChange={e => set("semester", e.target.value)}><option value="GANJIL">Ganjil</option><option value="GENAP">Genap</option></select></div>
                                <div><label className="form-label">Tanggal Mulai</label><input type="date" className="form-input" value={form.startDate} onChange={e => set("startDate", e.target.value)} required /></div>
                                <div><label className="form-label">Tanggal Selesai</label><input type="date" className="form-input" value={form.endDate} onChange={e => set("endDate", e.target.value)} required /></div>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 rounded" checked={form.isActive} onChange={e => set("isActive", e.target.checked)} />
                                <span className="text-sm text-[var(--text-main)]">Jadikan ujian aktif</span>
                            </label>
                            <div className="flex gap-3 mt-6">
                                <button type="submit" disabled={saving} className="btn-primary">{saving ? <><Loader2 size={14} className="animate-spin" /> Menyimpan...</> : "Simpan"}</button>
                                <button type="button" onClick={handleCancel} className="btn-secondary">Batal</button>
                            </div>
                        </form>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center h-48 text-[var(--text-muted)]"><Loader2 size={20} className="animate-spin mr-2" />Memuat...</div>
                ) : configs.length === 0 ? (
                    <div className="card-glass p-12 text-center text-[var(--text-muted)]">Belum ada konfigurasi ujian. Buat yang pertama!</div>
                ) : (
                    <div className="space-y-3">
                        {configs.map(cfg => (
                            <div key={cfg.id} className="card-glass p-4 flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-sm font-semibold text-[var(--text-main)]">{cfg.name}</h3>
                                        {cfg.isActive ? <span className="badge badge-green"><CheckCircle2 size={10} className="mr-1" />Aktif</span> : <span className="badge badge-gray">Tidak Aktif</span>}
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)]">{cfg.academicYear} · Semester {cfg.semester}</p>
                                    <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1"><Clock size={11} />{formatDate(cfg.startDate)} — {formatDate(cfg.endDate)}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(cfg)} className="p-2 text-[var(--text-muted)] hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                                        <Edit size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
