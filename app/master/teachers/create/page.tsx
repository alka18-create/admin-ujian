"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ChevronLeft, Loader2, CalendarDays, Hash } from "lucide-react";
import Link from "next/link";

const DAYS = [
    { label: "Senin", value: 1 },
    { label: "Selasa", value: 2 },
    { label: "Rabu", value: 3 },
    { label: "Kamis", value: 4 },
    { label: "Jumat", value: 5 },
    { label: "Sabtu", value: 6 },
];

export default function CreateTeacherPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        nip: "", code: "", name: "", gender: "MALE", subject: "", phone: "", email: "", address: "",
        isActive: true,
        availableDays: "",
        maxSessions: "",
    });

    const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
        setForm((f) => ({ ...f, [k]: v }));

    const toggleDay = (val: number) => {
        const current = form.availableDays ? form.availableDays.split(",").map(Number) : [];
        const next = current.includes(val)
            ? current.filter((d) => d !== val)
            : [...current, val].sort();
        set("availableDays", next.join(","));
    };

    const isChecked = (val: number) => {
        if (!form.availableDays) return false;
        return form.availableDays.split(",").map(Number).includes(val);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        const payload = {
            ...form,
            availableDays: form.availableDays || null,
            maxSessions: form.maxSessions ? parseInt(form.maxSessions) : null,
        };
        const res = await fetch("/api/teachers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const json = await res.json();
        setLoading(false);
        if (json.success) router.push("/master/teachers");
        else setError(json.error || "Gagal menyimpan data");
    };

    return (
        <DashboardLayout title="Tambah Guru">
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center gap-3">
                    <Link href="/master/teachers" className="btn-ghost py-1.5">
                        <ChevronLeft size={16} />
                    </Link>
                    <div>
                        <h1 className="page-title">Tambah Guru</h1>
                        <p className="page-subtitle">Isi data guru / pengawas ujian</p>
                    </div>
                </div>

                <div className="card-glass p-5">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Informasi Dasar</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">NIP <span className="text-[var(--text-muted)] font-normal">(opsional)</span></label>
                                    <input className="form-input" value={form.nip} onChange={(e) => set("nip", e.target.value)} placeholder="123456789" />
                                </div>
                                <div>
                                    <label className="form-label">Kode Guru <span className="text-[var(--text-muted)] font-normal">(opsional)</span></label>
                                    <input className="form-input" value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="G01" />
                                </div>
                                <div>
                                    <label className="form-label">Nama Lengkap <span className="text-red-400">*</span></label>
                                    <input className="form-input" value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="Nama guru" />
                                </div>
                                <div>
                                    <label className="form-label">Jenis Kelamin <span className="text-red-400">*</span></label>
                                    <select className="form-select" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                                        <option value="MALE">Laki-laki</option>
                                        <option value="FEMALE">Perempuan</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Mata Pelajaran</label>
                                    <input className="form-input" value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Matematika" />
                                </div>
                                <div>
                                    <label className="form-label">Status Guru</label>
                                    <div className="mt-2.5">
                                        <button
                                            type="button"
                                            onClick={() => set("isActive", !form.isActive)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${form.isActive
                                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                                : "bg-red-500/10 border-red-500/30 text-red-400"
                                                }`}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${form.isActive ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-red-400"}`}></div>
                                            <span className="text-xs font-bold uppercase tracking-wider">{form.isActive ? "Aktif" : "Nonaktif"}</span>
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="form-label">No. HP</label>
                                    <input className="form-input" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="08xx..." />
                                </div>
                                <div>
                                    <label className="form-label">Email</label>
                                    <input type="email" className="form-input" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="guru@sekolah.ac.id" />
                                </div>
                            </div>

                            <div>
                                <label className="form-label">Alamat</label>
                                <textarea className="form-input min-h-20 resize-none" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Alamat lengkap..." />
                            </div>
                        </div>

                        {/* Supervision Constraints */}
                        <div className="border-t border-[var(--border)] pt-5 space-y-4">
                            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Pengaturan Pengawasan</p>

                            <div>
                                <label className="form-label flex items-center gap-2">
                                    <CalendarDays size={14} className="text-blue-400" />
                                    Hari yang Tersedia untuk Mengawas
                                </label>
                                <p className="text-xs text-[var(--text-muted)] mb-3">Kosongkan semua = bisa mengawas setiap hari</p>
                                <div className="flex flex-wrap gap-2">
                                    {DAYS.map((d) => (
                                        <button
                                            key={d.value}
                                            type="button"
                                            onClick={() => toggleDay(d.value)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${isChecked(d.value)
                                                ? "bg-blue-600 border-blue-500 text-white"
                                                : "bg-[var(--bg-surface-hover)]/50 border-[var(--border)] text-[var(--text-muted)] hover:border-gray-500"
                                                }`}
                                        >
                                            {d.label}
                                        </button>
                                    ))}
                                    {form.availableDays && (
                                        <button
                                            type="button"
                                            onClick={() => set("availableDays", "")}
                                            className="px-3 py-1.5 rounded-lg text-xs text-[var(--text-muted)] border border-dashed border-[var(--border)] hover:border-red-700 hover:text-red-400 transition-all"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="max-w-xs">
                                <label className="form-label flex items-center gap-2">
                                    <Hash size={14} className="text-amber-400" />
                                    Maks. Jumlah Pengawasan
                                </label>
                                <p className="text-xs text-[var(--text-muted)] mb-2">Kosongkan = tidak ada batas</p>
                                <input
                                    type="number"
                                    min={1}
                                    className="form-input"
                                    placeholder="Contoh: 6"
                                    value={form.maxSessions}
                                    onChange={(e) => set("maxSessions", e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="submit" disabled={loading} className="btn-primary">
                                {loading ? <><Loader2 size={14} className="animate-spin" /> Menyimpan...</> : "Simpan Guru"}
                            </button>
                            <Link href="/master/teachers" className="btn-secondary">Batal</Link>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
