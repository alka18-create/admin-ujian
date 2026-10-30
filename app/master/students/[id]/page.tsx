"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function EditStudentPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState("");
    const [form, setForm] = useState({ nis: "", nisn: "", name: "", gender: "MALE", className: "", major: "MIPA", phone: "" });

    useEffect(() => {
        fetch(`/api/students/${id}`).then(r => r.json()).then(j => {
            if (j.success) {
                const s = j.data;
                setForm({ nis: s.nis, nisn: s.nisn || "", name: s.name, gender: s.gender, className: s.className, major: s.major || "MIPA", phone: s.phone || "" });
            }
            setFetching(false);
        });
    }, [id]);

    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError(""); setLoading(true);
        const res = await fetch(`/api/students/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        const json = await res.json();
        setLoading(false);
        if (json.success) router.push("/master/students"); else setError(json.error || "Gagal menyimpan");
    };

    if (fetching) return <DashboardLayout title="Edit Siswa"><div className="flex items-center justify-center h-64 text-[var(--text-muted)]"><Loader2 size={24} className="animate-spin mr-2" /> Memuat...</div></DashboardLayout>;

    return (
        <DashboardLayout title="Edit Siswa">
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center gap-3">
                    <Link href="/master/students" className="btn-ghost py-1.5"><ChevronLeft size={16} /></Link>
                    <div><h1 className="page-title">Edit Siswa</h1><p className="page-subtitle">Perbarui data siswa</p></div>
                </div>
                <div className="card-glass p-5">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-lg">{error}</div>}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label className="form-label">NIS *</label><input className="form-input" value={form.nis} onChange={e => set("nis", e.target.value)} required /></div>
                            <div><label className="form-label">NISN</label><input className="form-input" value={form.nisn} onChange={e => set("nisn", e.target.value)} /></div>
                            <div className="sm:col-span-2"><label className="form-label">Nama Lengkap *</label><input className="form-input" value={form.name} onChange={e => set("name", e.target.value)} required /></div>
                            <div><label className="form-label">Jenis Kelamin</label><select className="form-select" value={form.gender} onChange={e => set("gender", e.target.value)}><option value="MALE">Laki-laki</option><option value="FEMALE">Perempuan</option></select></div>
                            <div><label className="form-label">Kelas *</label><input className="form-input" value={form.className} onChange={e => set("className", e.target.value)} required /></div>
                            <div><label className="form-label">Jurusan</label><select className="form-select" value={form.major} onChange={e => set("major", e.target.value)}><option value="MIPA">MIPA</option><option value="IPS">IPS</option><option value="KEAGAMAAN">Keagamaan</option></select></div>
                            <div><label className="form-label">No. HP</label><input className="form-input" value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="submit" disabled={loading} className="btn-primary">{loading ? <><Loader2 size={14} className="animate-spin" /> Menyimpan...</> : "Simpan Perubahan"}</button>
                            <Link href="/master/students" className="btn-secondary">Batal</Link>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
