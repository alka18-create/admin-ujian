"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function CreateStudentPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState({ nis: "", nisn: "", name: "", gender: "MALE", className: "", major: "MIPA", phone: "" });
    const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError(""); setLoading(true);
        const res = await fetch("/api/students", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        const json = await res.json();
        setLoading(false);
        if (json.success) router.push("/master/students"); else setError(json.error || "Gagal menyimpan");
    };

    return (
        <DashboardLayout title="Tambah Siswa">
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center gap-3">
                    <Link href="/master/students" className="btn-ghost py-1.5"><ChevronLeft size={16} /></Link>
                    <div><h1 className="page-title">Tambah Siswa</h1><p className="page-subtitle">Isi data peserta ujian</p></div>
                </div>
                <div className="card-glass p-5">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-lg">{error}</div>}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label className="form-label">NIS <span className="text-red-400">*</span></label><input className="form-input" value={form.nis} onChange={(e) => set("nis", e.target.value)} required placeholder="12345" /></div>
                            <div><label className="form-label">NISN</label><input className="form-input" value={form.nisn} onChange={(e) => set("nisn", e.target.value)} placeholder="9876543210" /></div>
                            <div className="sm:col-span-2"><label className="form-label">Nama Lengkap <span className="text-red-400">*</span></label><input className="form-input" value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="Nama siswa" /></div>
                            <div><label className="form-label">Jenis Kelamin <span className="text-red-400">*</span></label><select className="form-select" value={form.gender} onChange={(e) => set("gender", e.target.value)}><option value="MALE">Laki-laki</option><option value="FEMALE">Perempuan</option></select></div>
                            <div><label className="form-label">Kelas <span className="text-red-400">*</span></label><input className="form-input" value={form.className} onChange={(e) => set("className", e.target.value)} required placeholder="XII IPA 1" /></div>
                            <div><label className="form-label">Jurusan</label><select className="form-select" value={form.major} onChange={(e) => set("major", e.target.value)}><option value="MIPA">MIPA</option><option value="IPS">IPS</option><option value="KEAGAMAAN">Keagamaan</option></select></div>
                            <div><label className="form-label">No. HP</label><input className="form-input" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="08xx..." /></div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="submit" disabled={loading} className="btn-primary">{loading ? <><Loader2 size={14} className="animate-spin" /> Menyimpan...</> : "Simpan Siswa"}</button>
                            <Link href="/master/students" className="btn-secondary">Batal</Link>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
