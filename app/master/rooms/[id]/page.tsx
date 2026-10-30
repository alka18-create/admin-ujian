"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function EditRoomPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState("");
    const [form, setForm] = useState({ code: "", name: "", capacity: "30", floor: "1", building: "" });

    useEffect(() => {
        fetch(`/api/rooms/${id}`).then(r => r.json()).then(j => {
            if (j.success) {
                const r = j.data;
                setForm({ code: r.code, name: r.name, capacity: String(r.capacity), floor: String(r.floor), building: r.building || "" });
            }
            setFetching(false);
        });
    }, [id]);

    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError(""); setLoading(true);
        const res = await fetch(`/api/rooms/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        const json = await res.json();
        setLoading(false);
        if (json.success) router.push("/master/rooms"); else setError(json.error || "Gagal menyimpan");
    };

    if (fetching) return <DashboardLayout title="Edit Ruang"><div className="flex items-center justify-center h-64 text-[var(--text-muted)]"><Loader2 size={24} className="animate-spin mr-2" /> Memuat...</div></DashboardLayout>;

    return (
        <DashboardLayout title="Edit Ruang">
            <div className="max-w-lg mx-auto space-y-4">
                <div className="flex items-center gap-3">
                    <Link href="/master/rooms" className="btn-ghost py-1.5"><ChevronLeft size={16} /></Link>
                    <div><h1 className="page-title">Edit Ruang Ujian</h1><p className="page-subtitle">Perbarui data ruang</p></div>
                </div>
                <div className="card-glass p-5">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-lg">{error}</div>}
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="form-label">Kode Ruang *</label><input className="form-input" value={form.code} onChange={e => set("code", e.target.value)} required /></div>
                            <div><label className="form-label">Nama Ruang *</label><input className="form-input" value={form.name} onChange={e => set("name", e.target.value)} required /></div>
                            <div><label className="form-label">Kapasitas *</label><input type="number" className="form-input" value={form.capacity} onChange={e => set("capacity", e.target.value)} required min="1" max="50" /></div>
                            <div><label className="form-label">Lantai</label><input type="number" className="form-input" value={form.floor} onChange={e => set("floor", e.target.value)} min="1" /></div>
                            <div className="col-span-2"><label className="form-label">Gedung</label><input className="form-input" value={form.building} onChange={e => set("building", e.target.value)} /></div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="submit" disabled={loading} className="btn-primary">{loading ? <><Loader2 size={14} className="animate-spin" /> Menyimpan...</> : "Simpan Perubahan"}</button>
                            <Link href="/master/rooms" className="btn-secondary">Batal</Link>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
