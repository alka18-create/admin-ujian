"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DataTable from "@/components/tables/DataTable";
import AturPesertaDialog from "@/components/dialogs/AturPesertaDialog";
import { Plus, Pencil, Trash2, Upload, Download, X, CheckCircle, AlertTriangle, Loader2, FileSpreadsheet, Images, Trash, Users } from "lucide-react";
import Link from "next/link";
import { GENDER_LABELS } from "@/lib/constants";
import { useSession } from "next-auth/react";

type Student = { id: string; nis: string; nisn: string | null; name: string; gender: string; className: string; major: string | null };

export default function StudentsPage() {
    const { data: session } = useSession();
    const isSuperAdmin = (session?.user as { role?: string } | undefined)?.role === "SUPERADMIN";
    const [data, setData] = useState<Student[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

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

    // Photo Upload state
    const [showPhotoUpload, setShowPhotoUpload] = useState(false);
    const [uploadingPhotos, setUploadingPhotos] = useState(false);
    const [photoFiles, setPhotoFiles] = useState<File[]>([]);
    const [photoUploadResult, setPhotoUploadResult] = useState<{
        uploaded: number;
        errors: string[];
    } | null>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);

    // Delete All state
    const [deletingAll, setDeletingAll] = useState(false);

    // Atur Peserta state
    const [showAturPeserta, setShowAturPeserta] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const res = await fetch(`/api/students?page=${page}&search=${search}`);
        const json = await res.json();
        if (json.success) { setData(json.data.data); setTotal(json.data.total); setTotalPages(json.data.totalPages); }
        setLoading(false);
    }, [page, search]);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh list when page/search changes
    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Hapus siswa "${name}"?`)) return;
        setDeleting(id);
        const res = await fetch(`/api/students/${id}`, { method: "DELETE" });
        const json = await res.json();
        if (json.success) fetchData(); else alert(json.error || "Gagal menghapus");
        setDeleting(null);
    };

    const handleDeleteAll = async () => {
        if (!confirm("PERINGATAN! Anda yakin ingin menghapus SEMUA data siswa? Tindakan ini tidak dapat dibatalkan.")) return;
        setDeletingAll(true);
        try {
            const res = await fetch("/api/students", { method: "DELETE" });
            const json = await res.json();
            if (json.success) {
                alert("Semua data siswa berhasil dihapus.");
                fetchData();
            } else {
                alert(json.error || "Gagal menghapus semua siswa");
            }
        } catch {
            alert("Terjadi kesalahan saat menghubungi server");
        } finally {
            setDeletingAll(false);
        }
    };

    const handleDownloadTemplate = () => {
        window.open("/api/students/template", "_blank");
    };

    const handleImport = async () => {
        if (!importFile) return;
        setImporting(true);
        setImportResult(null);

        const formData = new FormData();
        formData.append("file", importFile);

        try {
            const res = await fetch("/api/students/import", { method: "POST", body: formData });
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

    const handlePhotoUpload = async () => {
        if (photoFiles.length === 0) return;
        setUploadingPhotos(true);
        setPhotoUploadResult(null);

        const formData = new FormData();
        photoFiles.forEach(file => {
            formData.append("photos", file);
        });

        try {
            const res = await fetch("/api/students/upload-photos", { method: "POST", body: formData });
            const json = await res.json();
            if (json.success) {
                setPhotoUploadResult(json.data);
            } else {
                setPhotoUploadResult({ uploaded: 0, errors: [json.error || "Gagal mengunggah foto"] });
            }
        } catch {
            setPhotoUploadResult({ uploaded: 0, errors: ["Gagal terhubung ke server"] });
        } finally {
            setUploadingPhotos(false);
        }
    };

    const handleClosePhotoUpload = () => {
        setShowPhotoUpload(false);
        setPhotoFiles([]);
        setPhotoUploadResult(null);
        if (photoInputRef.current) photoInputRef.current.value = "";
    };

    const handleExportExcel = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ all: "true", search });
            const res = await fetch(`/api/students?${params}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);

            const studentsList = json.data as Student[];
            const ExcelJS = await import("exceljs");
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Data Siswa");

            const headerRow = worksheet.addRow(["NIS", "NISN", "NAMA", "L/P", "KELAS", "JURUSAN"]);
            headerRow.font = { bold: true };
            headerRow.eachCell(cell => {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
                cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
            });

            studentsList.forEach(s => {
                const row = worksheet.addRow([
                    s.nis,
                    s.nisn || "-",
                    s.name,
                    GENDER_LABELS[s.gender] || s.gender,
                    s.className,
                    s.major || "-"
                ]);
                row.eachCell(cell => {
                    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
                });
            });

            worksheet.getColumn(1).width = 15;
            worksheet.getColumn(2).width = 15;
            worksheet.getColumn(3).width = 30;
            worksheet.getColumn(4).width = 10;
            worksheet.getColumn(5).width = 15;
            worksheet.getColumn(6).width = 15;

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Data_Siswa_${new Date().toISOString().split("T")[0]}.xlsx`;
            a.click();
        } catch (error) {
            alert("Gagal export: " + (error instanceof Error ? error.message : "Terjadi kesalahan"));
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { label: "NIS", key: "nis" as keyof Student },
        { label: "Nama", key: "name" as keyof Student },
        { label: "L/P", render: (r: Student) => GENDER_LABELS[r.gender] },
        { label: "Kelas", key: "className" as keyof Student },
        { label: "Jurusan", render: (r: Student) => r.major || "-" },
        {
            label: "Aksi", render: (r: Student) => (
                <div className="flex items-center gap-1">
                    <Link href={`/master/students/${r.id}`} className="btn-ghost py-1 px-2 text-xs"><Pencil size={13} /></Link>
                    <button onClick={() => handleDelete(r.id, r.name)} disabled={deleting === r.id} className="btn-danger py-1 px-2 text-xs"><Trash2 size={13} /></button>
                </div>
            )
        },
    ];

    return (
        <DashboardLayout title="Data Siswa">
            <div className="max-w-6xl mx-auto space-y-4">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Data Siswa</h1>
                        <p className="page-subtitle">Kelola data peserta ujian</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isSuperAdmin && (
                            <>
                                <button onClick={handleDeleteAll} disabled={deletingAll || data.length === 0} className="btn-danger flex items-center gap-1.5 opacity-90 hover:opacity-100">
                                    {deletingAll ? <Loader2 size={16} className="animate-spin" /> : <Trash size={16} />}
                                    Hapus Semua
                                </button>
                                <div className="w-px h-6 bg-gray-700 mx-1"></div>
                            </>
                        )}
                        <button onClick={handleExportExcel} className="btn-secondary" title="Export ke Excel">
                            <Download size={16} /> Export Excel
                        </button>
                        <button onClick={() => setShowPhotoUpload(true)} className="btn-secondary">
                            <Images size={16} /> Upload Foto
                        </button>
                        <button onClick={() => setShowAturPeserta(true)} className="btn-secondary" title="Pilih kelas peserta ujian aktif">
                            <Users size={16} /> Atur Peserta
                        </button>
                        <button onClick={() => setShowImport(true)} className="btn-secondary">
                            <Upload size={16} /> Import Excel
                        </button>
                        <Link href="/master/students/create" className="btn-primary">
                            <Plus size={16} /> Tambah Siswa
                        </Link>
                    </div>
                </div>

                <DataTable columns={columns} data={data} total={total} page={page} totalPages={totalPages}
                    onPageChange={setPage} onSearch={(q) => { setSearch(q); setPage(1); }}
                    searchPlaceholder="Cari nama, NIS, NISN..." isLoading={loading} emptyMessage="Belum ada data siswa" />
            </div>

            {/* Import Modal */}
            {showImport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg shadow-2xl w-full max-w-lg mx-4">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                            <div className="flex items-center gap-2">
                                <FileSpreadsheet size={18} className="text-emerald-400" />
                                <h2 className="text-base font-semibold text-[var(--text-main)]">Import Data Siswa via Excel</h2>
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
                                    Gunakan template berikut untuk mengisi data siswa. Jangan ubah nama kolom.
                                </p>
                                <button onClick={handleDownloadTemplate} className="btn-secondary text-xs py-1.5">
                                    <Download size={13} /> Download Template Excel
                                </button>
                            </div>

                            {/* Kolom template */}
                            <div className="bg-[var(--bg-surface-hover)]/40 rounded-lg p-3">
                                <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">Kolom Template:</p>
                                <div className="grid grid-cols-2 gap-1">
                                    {[
                                        "NIS *",
                                        "NISN *",
                                        "Nama *",
                                        "Jenis Kelamin (L/P) *",
                                        "Kelas *",
                                        "Jurusan (MIPA/IPS/KEAGAMAAN)",
                                        "No. HP",
                                    ].map(col => (
                                        <span
                                            key={col}
                                            className={`text-xs px-2 py-0.5 rounded font-mono ${col.includes("*") ? "bg-amber-900/40 text-amber-300 border border-amber-800" : "bg-gray-700/50 text-[var(--text-muted)]"}`}
                                        >
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

            {/* Photo Upload Modal */}
            {showPhotoUpload && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg shadow-2xl w-full max-w-lg mx-4">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                            <div className="flex items-center gap-2">
                                <Images size={18} className="text-blue-400" />
                                <h2 className="text-base font-semibold text-[var(--text-main)]">Upload Foto Siswa Massal</h2>
                            </div>
                            <button onClick={handleClosePhotoUpload} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 space-y-4">
                            <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-4">
                                <p className="text-sm font-medium text-blue-300 mb-2">Informasi Penting:</p>
                                <ul className="text-xs text-[var(--text-main)] list-disc list-inside space-y-1">
                                    <li>Nama file foto harus menggunakan <strong>NISN siswa</strong> dan berekstensi <strong>.jpg / .jpeg</strong></li>
                                    <li>Contoh: <code className="bg-[var(--bg-surface-hover)] px-1 py-0.5 rounded text-blue-300">0012345678.jpg</code></li>
                                    <li>Anda bisa memilih banyak file foto sekaligus.</li>
                                    <li>Foto yang berhasil diunggah akan otomatis ditampilkan di fitur Cetak Kartu Peserta Ujian.</li>
                                </ul>
                            </div>

                            {/* Upload Area */}
                            <div>
                                <div
                                    className="border-2 border-dashed border-[var(--border)] rounded-lg p-5 text-center cursor-pointer hover:border-blue-600 transition-colors"
                                    onClick={() => photoInputRef.current?.click()}
                                >
                                    <input
                                        ref={photoInputRef}
                                        type="file"
                                        accept="image/jpeg,image/jpg"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => {
                                            const files = Array.from(e.target.files || []);
                                            // Ensure only JPGs are selected
                                            const validFiles = files.filter(f => f.name.toLowerCase().endsWith('.jpg') || f.name.toLowerCase().endsWith('.jpeg'));
                                            if (validFiles.length !== files.length) {
                                                alert("Beberapa file diabaikan karena bukan berformat JPG/JPEG.");
                                            }
                                            setPhotoFiles(validFiles);
                                            setPhotoUploadResult(null);
                                        }}
                                    />
                                    {photoFiles.length > 0 ? (
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="flex items-center gap-2 text-blue-400 font-medium">
                                                <Images size={20} />
                                                <span>{photoFiles.length} foto terpilih</span>
                                            </div>
                                            <p className="text-xs text-[var(--text-muted)]">Klik lagi untuk membatalkan / memilih ulang</p>
                                        </div>
                                    ) : (
                                        <div className="text-[var(--text-muted)]">
                                            <Upload size={28} className="mx-auto mb-2 opacity-40" />
                                            <p className="text-sm">Klik untuk pilih banyak foto (.jpg/.jpeg)</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Upload Result */}
                            {photoUploadResult && (
                                <div className={`rounded-xl p-4 flex flex-col gap-3 ${photoUploadResult.uploaded > 0 ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${photoUploadResult.uploaded > 0 ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
                                            {photoUploadResult.uploaded > 0 ? (
                                                <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
                                            ) : (
                                                <AlertTriangle size={18} className="text-red-600 dark:text-red-400" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-[var(--text-main)]">Hasil Upload Foto</p>
                                            <p className="text-xs text-[var(--text-muted)]">
                                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{photoUploadResult.uploaded} foto berhasil</span>
                                                {photoUploadResult.errors.length > 0 && <span className="text-red-600 dark:text-red-400"> · {photoUploadResult.errors.length} gagal</span>}
                                            </p>
                                        </div>
                                    </div>
                                    {photoUploadResult.errors.length > 0 && (
                                        <div className="bg-red-500/5 dark:bg-black/20 rounded-lg p-3 space-y-1 max-h-32 overflow-y-auto border border-red-500/10">
                                            {photoUploadResult.errors.map((err, i) => (
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
                            <button onClick={handleClosePhotoUpload} className="btn-ghost text-sm">
                                {photoUploadResult?.uploaded ? "Tutup" : "Batal"}
                            </button>
                            <button
                                onClick={handlePhotoUpload}
                                disabled={photoFiles.length === 0 || uploadingPhotos}
                                className="btn-blue text-sm"
                            >
                                {uploadingPhotos ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                                {uploadingPhotos ? "Mengunggah..." : `Upload ${photoFiles.length > 0 ? photoFiles.length + " Foto" : ""}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AturPesertaDialog
                isOpen={showAturPeserta}
                onClose={() => setShowAturPeserta(false)}
                onSuccess={() => {
                    setShowAturPeserta(false);
                    alert("Status peserta ujian berhasil diperbarui");
                }}
            />
        </DashboardLayout>
    );
}
