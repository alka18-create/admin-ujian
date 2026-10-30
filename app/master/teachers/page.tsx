"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DataTable from "@/components/tables/DataTable";
import { Plus, Pencil, Trash2, Upload, Download, X, CheckCircle, AlertTriangle, Loader2, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { GENDER_LABELS } from "@/lib/constants";
import { useSession } from "next-auth/react";

type Teacher = {
    id: string;
    nip: string | null;
    code: string | null;
    name: string;
    gender: string;
    subject: string | null;
    phone: string | null;
    email: string | null;
    isActive: boolean;
};

export default function TeachersPage() {
    const { data: session } = useSession();
    const isSuperAdmin = (session?.user as { role?: string } | undefined)?.role === "SUPERADMIN";
    const [data, setData] = useState<Teacher[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [deletingAll, setDeletingAll] = useState(false);

    // Import state
    const [showImport, setShowImport] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importResult, setImportResult] = useState<{
        created: number;
        skipped: number;
        errors: string[];
    } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(page), search });
        const res = await fetch(`/api/teachers?${params}`);
        const json = await res.json();
        if (json.success) {
            setData(json.data.data);
            setTotal(json.data.total);
            setTotalPages(json.data.totalPages);
        }
        setLoading(false);
    }, [page, search]);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh list when page/search changes
    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Hapus guru "${name}"?`)) return;
        setDeleting(id);
        const res = await fetch(`/api/teachers/${id}`, { method: "DELETE" });
        const json = await res.json();
        if (json.success) fetchData();
        else alert(json.error || "Gagal menghapus");
        setDeleting(null);
    };

    const handleDeleteAll = async () => {
        if (!confirm("PERINGATAN! Anda yakin ingin menghapus SEMUA data guru? Tindakan ini tidak dapat dibatalkan.")) return;
        setDeletingAll(true);
        try {
            const res = await fetch("/api/teachers", { method: "DELETE" });
            const json = await res.json();
            if (json.success) {
                alert("Semua data guru berhasil dihapus.");
                fetchData();
            } else {
                alert(json.error || "Gagal menghapus semua guru");
            }
        } catch {
            alert("Terjadi kesalahan saat menghubungi server");
        } finally {
            setDeletingAll(false);
        }
    };

    const handleToggleStatus = async (teacher: Teacher) => {
        try {
            const res = await fetch(`/api/teachers/${teacher.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...teacher,
                    isActive: !teacher.isActive
                }),
            });
            const json = await res.json();
            if (json.success) {
                setData(prev => prev.map(t => t.id === teacher.id ? { ...t, isActive: !t.isActive } : t));
            } else {
                alert(json.error || "Gagal mengubah status");
            }
        } catch {
            alert("Gagal menghubungi server");
        }
    };

    const handleDownloadTemplate = () => {
        window.open("/api/teachers/template", "_blank");
    };

    const handleImport = async () => {
        if (!importFile) return;
        setImporting(true);
        setImportResult(null);

        const formData = new FormData();
        formData.append("file", importFile);

        try {
            const res = await fetch("/api/teachers/import", { method: "POST", body: formData });
            const json = await res.json();
            if (json.success) {
                setImportResult(json.data);
                fetchData();
            } else {
                setImportResult({ created: 0, skipped: 0, errors: [json.error || "Gagal mengimpor"] });
            }
        } catch {
            setImportResult({ created: 0, skipped: 0, errors: ["Gagal terhubung ke server"] });
        } finally {
            setImporting(false);
        }
    };

    const handleCloseImport = () => {
        setShowImport(false);
        setImportFile(null);
        setImportResult(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleExportExcel = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ all: "true", search });
            const res = await fetch(`/api/teachers?${params}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);

            const teachers = json.data as Teacher[];
            const ExcelJS = await import("exceljs");
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Data Guru");

            const headerRow = worksheet.addRow(["NIP", "KODE", "NAMA", "L/P", "MAPEL", "NO HP", "EMAIL", "STATUS"]);
            headerRow.font = { bold: true };
            headerRow.eachCell(cell => {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
                cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
            });

            teachers.forEach(t => {
                const row = worksheet.addRow([
                    t.nip || "-",
                    t.code || "-",
                    t.name,
                    GENDER_LABELS[t.gender] || t.gender,
                    t.subject || "-",
                    t.phone || "-",
                    t.email || "-",
                    t.isActive ? "AKTIF" : "NONAKTIF"
                ]);
                row.eachCell(cell => {
                    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
                });
            });

            worksheet.getColumn(1).width = 20;
            worksheet.getColumn(2).width = 10;
            worksheet.getColumn(3).width = 30;
            worksheet.getColumn(4).width = 10;
            worksheet.getColumn(5).width = 25;
            worksheet.getColumn(6).width = 15;
            worksheet.getColumn(7).width = 25;
            worksheet.getColumn(8).width = 15;

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Data_Guru_${new Date().toISOString().split("T")[0]}.xlsx`;
            a.click();
        } catch (error) {
            alert("Gagal export: " + (error instanceof Error ? error.message : "Terjadi kesalahan"));
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { label: "NIP", key: "nip" as keyof Teacher, render: (r: Teacher) => r.nip || "-" },
        { label: "Kode", render: (r: Teacher) => r.code || "-" },
        { label: "Nama", key: "name" as keyof Teacher },
        { label: "L/P", render: (r: Teacher) => GENDER_LABELS[r.gender] || r.gender },
        { label: "Mata Pelajaran", render: (r: Teacher) => r.subject || "-" },
        {
            label: "Status",
            render: (r: Teacher) => (
                <button
                    onClick={() => handleToggleStatus(r)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider transition-all border ${r.isActive
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                        }`}
                >
                    <span className={`w-1.5 h-1.5 rounded-full ${r.isActive ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`}></span>
                    {r.isActive ? "AKTIF" : "NONAKTIF"}
                </button>
            )
        },
        {
            label: "Aksi",
            render: (r: Teacher) => (
                <div className="flex items-center gap-1">
                    <Link href={`/master/teachers/${r.id}`} className="btn-ghost py-1 px-2 text-xs">
                        <Pencil size={13} />
                    </Link>
                    <button
                        onClick={() => handleDelete(r.id, r.name)}
                        disabled={deleting === r.id}
                        className="btn-danger py-1 px-2 text-xs"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <DashboardLayout title="Data Guru">
            <div className="max-w-6xl mx-auto space-y-4">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Data Guru</h1>
                        <p className="page-subtitle">Kelola data guru / pengawas ujian</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isSuperAdmin && (
                            <>
                                <button
                                    onClick={handleDeleteAll}
                                    disabled={deletingAll || data.length === 0}
                                    className="btn-danger flex items-center gap-1.5 opacity-90 hover:opacity-100"
                                >
                                    {deletingAll ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    Hapus Semua
                                </button>
                                <div className="w-px h-6 bg-gray-700 mx-1"></div>
                            </>
                        )}
                        <button onClick={handleExportExcel} className="btn-secondary" title="Export ke Excel">
                            <Download size={16} /> Export Excel
                        </button>
                        <button onClick={() => setShowImport(true)} className="btn-secondary">
                            <Upload size={16} /> Import Excel
                        </button>
                        <Link href="/master/teachers/create" className="btn-primary">
                            <Plus size={16} /> Tambah Guru
                        </Link>
                    </div>
                </div>

                <DataTable
                    columns={columns}
                    data={data}
                    total={total}
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    onSearch={(q) => { setSearch(q); setPage(1); }}
                    searchPlaceholder="Cari nama, NIP..."
                    isLoading={loading}
                    emptyMessage="Belum ada data guru"
                />
            </div>

            {/* Import Modal */}
            {showImport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg shadow-2xl w-full max-w-lg mx-4">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                            <div className="flex items-center gap-2">
                                <FileSpreadsheet size={18} className="text-emerald-400" />
                                <h2 className="text-base font-semibold text-[var(--text-main)]">Import Data Guru via Excel</h2>
                            </div>
                            <button onClick={handleCloseImport} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 space-y-4">
                            {/* Download Template */}
                            <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-4">
                                <p className="text-sm font-medium text-blue-300 mb-1">
                                    📥 Langkah 1: Download Template
                                </p>
                                <p className="text-xs text-[var(--text-muted)] mb-3">
                                    Gunakan template berikut untuk mengisi data guru. Jangan ubah nama kolom.
                                </p>
                                <button onClick={handleDownloadTemplate} className="btn-secondary text-xs py-1.5">
                                    <Download size={13} /> Download Template Excel
                                </button>
                            </div>

                            {/* Kolom yang tersedia */}
                            <div className="bg-[var(--bg-surface-hover)]/40 rounded-lg p-3">
                                <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">Kolom Template:</p>
                                <div className="grid grid-cols-2 gap-1">
                                    {["NIP", "Kode Guru", "Nama *", "Jenis Kelamin (MALE/FEMALE) *", "Mata Pelajaran", "No. HP", "Email", "Alamat"].map(col => (
                                        <span key={col} className={`text-xs px-2 py-0.5 rounded font-mono ${col.includes("*") ? "bg-amber-900/40 text-amber-300 border border-amber-800" : "bg-gray-700/50 text-[var(--text-muted)]"}`}>
                                            {col}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-xs text-amber-400 mt-2">* wajib diisi</p>
                            </div>

                            {/* Upload File */}
                            <div>
                                <p className="text-sm font-medium text-[var(--text-main)] mb-2">
                                    📤 Langkah 2: Upload File Excel
                                </p>
                                <div
                                    className="border-2 border-dashed border-[var(--border)] rounded-lg p-5 text-center cursor-pointer hover:border-blue-600 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls"
                                        className="hidden"
                                        onChange={(e) => {
                                            setImportFile(e.target.files?.[0] || null);
                                            setImportResult(null);
                                        }}
                                    />
                                    {importFile ? (
                                        <div className="flex items-center justify-center gap-2 text-emerald-400">
                                            <FileSpreadsheet size={20} />
                                            <span className="text-sm font-medium">{importFile.name}</span>
                                        </div>
                                    ) : (
                                        <div className="text-[var(--text-muted)]">
                                            <Upload size={28} className="mx-auto mb-2 opacity-40" />
                                            <p className="text-sm">Klik untuk pilih file .xlsx / .xls</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Import Result */}
                            {importResult && (
                                <div className={`rounded-xl p-4 flex flex-col gap-3 ${importResult.created > 0 ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${importResult.created > 0 ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
                                            {importResult.created > 0 ? (
                                                <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
                                            ) : (
                                                <AlertTriangle size={18} className="text-red-600 dark:text-red-400" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-[var(--text-main)]">Hasil Import</p>
                                            <p className="text-xs text-[var(--text-muted)]">
                                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{importResult.created} berhasil</span>
                                                {importResult.skipped > 0 && <span className="text-amber-600 dark:text-amber-400"> · {importResult.skipped} dilewati</span>}
                                            </p>
                                        </div>
                                    </div>
                                    {importResult.errors.length > 0 && (
                                        <div className="bg-red-500/5 dark:bg-black/20 rounded-lg p-3 space-y-1 max-h-32 overflow-y-auto border border-red-500/10">
                                            <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Daftar Error:</p>
                                            {importResult.errors.map((err, i) => (
                                                <p key={i} className="text-xs text-red-700 dark:text-red-300 flex items-start gap-1.5 leading-relaxed">
                                                    <span className="shrink-0 mt-1 w-1 h-1 rounded-full bg-red-400" />
                                                    {err}
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[var(--border)]">
                            <button onClick={handleCloseImport} className="btn-ghost text-sm">
                                {importResult?.created ? "Tutup" : "Batal"}
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={!importFile || importing}
                                className="btn-success text-sm"
                            >
                                {importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                                {importing ? "Mengimpor..." : "Import Data"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
