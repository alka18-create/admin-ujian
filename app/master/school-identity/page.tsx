"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Image from "next/image";
import { Save, Loader2, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/useToast";

export default function SchoolIdentityPage() {
    const { success, error } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        npsn: "",
        nsm: "",
        address: "",
        headmasterName: "",
        headmasterNip: "",
    });

    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoFile, setLogoFile] = useState<File | null>(null);

    const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
    const [signatureFile, setSignatureFile] = useState<File | null>(null);

    const [stampPreview, setStampPreview] = useState<string | null>(null);
    const [stampFile, setStampFile] = useState<File | null>(null);

    useEffect(() => {
        fetch("/api/school-identity", { cache: 'no-store' })
            .then(res => res.json())
            .then(res => {
                if (res.success && res.data) {
                    setFormData({
                        name: res.data.name || "",
                        npsn: res.data.npsn || "",
                        nsm: res.data.nsm || "",
                        address: res.data.address || "",
                        headmasterName: res.data.headmasterName || "",
                        headmasterNip: res.data.headmasterNip || "",
                    });
                    setLogoPreview(res.data.logo || null);
                    setSignaturePreview(res.data.signature || null);
                    setStampPreview(res.data.stamp || null);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'signature' | 'stamp') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== "image/png") {
            error(`File harus berformat PNG`);
            return;
        }

        if (file.size > 1024 * 1024) {
            error(`Ukuran file maksimal 1MB`);
            return;
        }

        const previewUrl = URL.createObjectURL(file);

        if (type === 'logo') {
            setLogoFile(file);
            setLogoPreview(previewUrl);
        } else if (type === 'signature') {
            setSignatureFile(file);
            setSignaturePreview(previewUrl);
        } else {
            setStampFile(file);
            setStampPreview(previewUrl);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const data = new FormData();
        data.append("name", formData.name);
        data.append("npsn", formData.npsn);
        data.append("nsm", formData.nsm);
        data.append("address", formData.address);
        data.append("headmasterName", formData.headmasterName);
        data.append("headmasterNip", formData.headmasterNip);

        if (logoFile) data.append("logo", logoFile);
        if (signatureFile) data.append("signature", signatureFile);
        if (stampFile) data.append("stamp", stampFile);

        try {
            const res = await fetch("/api/school-identity", {
                method: "POST",
                body: data,
            });
            const json = await res.json();

            if (json.success) {
                success("Identitas madrasah berhasil disimpan");
            } else {
                error(json.error || "Gagal menyimpan identitas");
            }
        } catch (err) {
            error(err instanceof Error ? err.message : "Terjadi kesalahan sistem");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout title="Identitas Madrasah">
                <div className="flex justify-center items-center h-40">
                    <Loader2 className="animate-spin text-[var(--text-muted)]" size={24} />
                    <span className="ml-2 text-[var(--text-muted)]">Memuat data...</span>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Identitas Madrasah">
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Identitas Madrasah</h1>
                        <p className="page-subtitle">Kelola informasi sekolah/madrasah untuk keperluan cetak</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="card-glass p-5 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="form-label" htmlFor="name">Nama Madrasah/Sekolah *</label>
                            <input
                                required
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="Cth: MTs Negeri 1 Kota"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="form-label" htmlFor="npsn">NPSN</label>
                                <input
                                    type="text"
                                    id="npsn"
                                    name="npsn"
                                    value={formData.npsn}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="Cth: 12345678"
                                />
                            </div>
                            <div>
                                <label className="form-label" htmlFor="nsm">NSM</label>
                                <input
                                    type="text"
                                    id="nsm"
                                    name="nsm"
                                    value={formData.nsm}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="Cth: 1211123456789"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="form-label" htmlFor="address">Alamat</label>
                            <textarea
                                id="address"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                className="form-input min-h-[80px]"
                                placeholder="Alamat lengkap madrasah/sekolah"
                            />
                        </div>
                    </div>

                    <hr className="border-[var(--border)]" />
                    <h3 className="text-sm font-semibold text-[var(--text-main)]">Kepala Madrasah</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="form-label" htmlFor="headmasterName">Nama Lengkap & Gelar</label>
                            <input
                                type="text"
                                id="headmasterName"
                                name="headmasterName"
                                value={formData.headmasterName}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="Cth: H. Fulan, S.Pd., M.Ag"
                            />
                        </div>
                        <div>
                            <label className="form-label" htmlFor="headmasterNip">NIP</label>
                            <input
                                type="text"
                                id="headmasterNip"
                                name="headmasterNip"
                                value={formData.headmasterNip}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="Cth: 19800101 200501 1 001"
                            />
                        </div>
                    </div>

                    <hr className="border-[var(--border)]" />
                    <h3 className="text-sm font-semibold text-[var(--text-main)]">Berkas Pendukung</h3>
                    <p className="text-xs text-[var(--text-muted)] mb-4">Hanya file PNG, ukuran maksimal 1MB.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Logo Upload */}
                        <div className="space-y-2">
                            <label className="form-label">Logo Madrasah</label>
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 bg-[var(--bg-surface)] border border-[var(--border)]/50 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                                    {logoPreview ? (
                                        <Image src={logoPreview} alt="Logo" width={80} height={80} unoptimized className="w-full h-full object-contain p-2" />
                                    ) : (
                                        <ImageIcon className="text-gray-600" size={24} />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        accept="image/png"
                                        id="logoInput"
                                        className="hidden"
                                        onChange={(e) => handleFileChange(e, 'logo')}
                                    />
                                    <label
                                        htmlFor="logoInput"
                                        className="btn-secondary text-xs px-3 py-1.5 inline-block cursor-pointer"
                                    >
                                        Pilih File PNG
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Signature Upload */}
                        <div className="space-y-2">
                            <label className="form-label">Tanda Tangan Kepala</label>
                            <div className="flex items-center gap-4">
                                <div className="w-28 h-20 bg-[var(--bg-surface)] border border-[var(--border)]/50 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                                    {signaturePreview ? (
                                        <Image src={signaturePreview} alt="Signature" width={112} height={80} unoptimized className="w-full h-full object-contain p-2" />
                                    ) : (
                                        <ImageIcon className="text-gray-600" size={24} />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        accept="image/png"
                                        id="signatureInput"
                                        className="hidden"
                                        onChange={(e) => handleFileChange(e, 'signature')}
                                    />
                                    <label
                                        htmlFor="signatureInput"
                                        className="btn-secondary text-xs px-3 py-1.5 inline-block cursor-pointer"
                                    >
                                        Pilih File PNG
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Stamp Upload */}
                        <div className="space-y-2">
                            <label className="form-label">Stempel Madrasah</label>
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 bg-[var(--bg-surface)] border border-[var(--border)]/50 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                                    {stampPreview ? (
                                        <Image src={stampPreview} alt="Stamp" width={80} height={80} unoptimized className="w-full h-full object-contain p-2" />
                                    ) : (
                                        <ImageIcon className="text-gray-600" size={24} />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        accept="image/png"
                                        id="stampInput"
                                        className="hidden"
                                        onChange={(e) => handleFileChange(e, 'stamp')}
                                    />
                                    <label
                                        htmlFor="stampInput"
                                        className="btn-secondary text-xs px-3 py-1.5 inline-block cursor-pointer"
                                    >
                                        Pilih File PNG
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button type="submit" disabled={saving} className="btn-primary w-full md:w-auto">
                            {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                            {saving ? "Menyimpan..." : "Simpan Identitas"}
                        </button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
