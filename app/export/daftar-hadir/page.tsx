"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Loader2, FileText, Users, Eye, X, Download } from "lucide-react";

type ExamConfig = { id: string; name: string; academicYear: string; semester: string; isActive: boolean };
type Seat = {
    id: string;
    seatRow: number;
    seatCol: number;
    seatLabel: string;
    student: { name: string; nis: string; className: string; gender: string };
};
type RoomPlan = {
    room: { id: string; code: string; name: string; capacity: number };
    studentCount: number;
    seats: Seat[];
};

export default function ExportDaftarHadirPage() {
    const [configs, setConfigs] = useState<ExamConfig[]>([]);
    const [selectedConfig, setSelectedConfig] = useState("");
    const [activeConfig, setActiveConfig] = useState<ExamConfig | null>(null);
    const [roomPlans, setRoomPlans] = useState<RoomPlan[]>([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState<"pdf" | "preview" | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/schedule")
            .then((r) => r.json())
            .then((j) => {
                if (j.success) {
                    setConfigs(j.data);
                    const active = j.data.find((c: ExamConfig) => c.isActive);
                    if (active) {
                        setSelectedConfig(active.id);
                        setActiveConfig(active);
                    }
                }
            });
    }, []);

    const fetchSeatPlans = useCallback(async () => {
        if (!selectedConfig) return;
        setLoading(true);
        const res = await fetch(`/api/generate/seats?examConfigId=${selectedConfig}`);
        const json = await res.json();
        if (json.success) {
            const plans = json.data as RoomPlan[];
            const filled = plans.filter((p) => p.seats.length > 0);
            setRoomPlans(filled);
        }
        setLoading(false);
    }, [selectedConfig]);

    useEffect(() => {
        const cfg = configs.find((c) => c.id === selectedConfig);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- sync derived active config and refresh data
        setActiveConfig(cfg || null);
        fetchSeatPlans();
    }, [selectedConfig, configs, fetchSeatPlans]);

    const handleExportPDF = async (action: "download" | "preview" = "download") => {
        if (roomPlans.length === 0) return;
        setExporting(action === "download" ? "pdf" : "preview");
        
        try {
            // Retrieve identity if possible, for header
            let schoolName = "MADRASAH";
            let schoolLogo: string | null = null;
            const academicYear = activeConfig?.academicYear || "";
            try {
                const idRes = await fetch("/api/school-identity");
                const idJson = await idRes.json();
                if (idJson.success && idJson.data) {
                    if (idJson.data.name) schoolName = idJson.data.name;
                    if (idJson.data.logo) schoolLogo = idJson.data.logo;
                }
            } catch (e) {
                console.error("Failed to fetch school identity", e);
            }

            const { default: jsPDF } = await import("jspdf");
            const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();

            let firstPage = true;

            const renderHeader = (roomName: string) => {
                if (schoolLogo) {
                    try {
                        // The logo is a data URI (e.g. data:image/png;base64,.....)
                        // Add to top-left of the page
                        const imgProps = doc.getImageProperties(schoolLogo);
                        const logoW = 18;
                        const logoH = (imgProps.height * logoW) / imgProps.width;
                        doc.addImage(schoolLogo, imgProps.fileType, 15, 10, logoW, logoH);
                    } catch (e) {
                        console.error("Failed to draw logo", e);
                    }
                }
                
                doc.setFontSize(12);
                doc.setFont("helvetica", "bold");
                doc.text("DAFTAR HADIR PESERTA", pageW / 2, 15, { align: "center" });
                
                const title = activeConfig ? `${activeConfig.name.toUpperCase()} ${schoolName.toUpperCase()}` : `UJIAN MADRASAH (UM) ${schoolName.toUpperCase()}`;
                doc.text(title, pageW / 2, 21, { align: "center" });
                doc.text(`TAHUN AJARAN ${academicYear}`, pageW / 2, 27, { align: "center" });
                
                // Form Fields
                doc.setFontSize(10);
                doc.setFont("helvetica", "normal");
                
                // Hari / Tanggal line
                doc.text("Hari", 14, 38);
                doc.text(":", 25, 38);
                doc.line(30, 39, 65, 39); // Underline for manual entry
                
                doc.text("/", 68, 38);
                
                doc.text("Tanggal", 72, 38);
                doc.text(":", 88, 38);
                doc.line(92, 39, 140, 39); // Underline for manual entry
                
                doc.text("Ruang :", 150, 38);
                doc.setFont("helvetica", "bold");
                doc.text(roomName, 165, 38);

                doc.setFont("helvetica", "normal");
            };

            for (const plan of roomPlans) {
                if (!firstPage) doc.addPage();
                firstPage = false;

                const sortedSeats = [...plan.seats].sort((a, b) => {
                    if (a.student.className !== b.student.className) {
                        return a.student.className.localeCompare(b.student.className);
                    }
                    return a.student.name.localeCompare(b.student.name);
                });

                renderHeader(plan.room.name);

                let startY = 44;

                const jamW = 22; 
                const kelasW = 18;
                const noW = 10;
                const availableForNisAndName = 195 - (noW + kelasW + jamW * 3); // ~101

                // Determine dynamic width for No. Pes
                let maxNisW = doc.getTextWidth("No. Pes") + 4; // minimum based on header
                sortedSeats.forEach(s => {
                    const textW = doc.getTextWidth(s.student.nis);
                    if (textW > maxNisW) maxNisW = textW;
                });
                maxNisW += 2; // small padding

                // Determine max name length to calculate dynamic width
                let maxNameW = 35; // minimum width
                sortedSeats.forEach(s => {
                    const textW = doc.getTextWidth(s.student.name);
                    if (textW > maxNameW) maxNameW = textW;
                });
                maxNameW += 5;
                
                // Cap name width so it doesn't destroy the table
                if (maxNameW > availableForNisAndName - maxNisW) {
                    maxNameW = availableForNisAndName - maxNisW;
                }

                const cols = [
                    { header: "No", w: noW },
                    { header: "No. Pes", w: maxNisW },
                    { header: "Nama", w: maxNameW },
                    { header: "Kelas", w: kelasW },
                    { header: "Jam Ke 1", w: jamW },
                    { header: "Jam Ke 2", w: jamW },
                    { header: "Jam Ke 3", w: jamW }
                ];
                
                const tableW = cols.reduce((sum, c) => sum + c.w, 0);
                const startX = (pageW - tableW) / 2; // Center horizontally
                
                let curX = startX;

                // Headers row
                doc.setDrawColor(0);
                doc.setLineWidth(0.3);
                
                const rowH = 6;
                cols.forEach(col => {
                    doc.rect(curX, startY, col.w, rowH);
                    doc.text(col.header, curX + col.w / 2, startY + 4, { align: "center" });
                    curX += col.w;
                });
                
                startY += rowH;

                // Calculate dynamic row height
                // Available height = pageH - startY (44) - bottom Margin (15) - Signature Margin (25)
                // We leave about 40mm for bottom & signature. 
                // Available space for rows = pageH - startY - 40.
                const availableHeight = pageH - startY - 40;
                let dynamicH = availableHeight / Math.max(sortedSeats.length, 1);
                
                // Set boundaries for row height: 
                // Minimum 6mm to ensure text fits, maximum 18mm so rows aren't absurdly large.
                if (dynamicH < 6) dynamicH = 6;
                if (dynamicH > 18) dynamicH = 18;
                
                // Rows
                doc.setFontSize(8);
                doc.setFont("helvetica", "normal");
                
                sortedSeats.forEach((seat, i) => {
                    if (startY > pageH - 22) {
                        doc.addPage();
                        renderHeader(plan.room.name + " (Lanjutan)");
                        startY = 44;
                        
                        // Redraw headers
                        doc.setFont("helvetica", "bold");
                        curX = startX;
                        cols.forEach(col => {
                            doc.rect(curX, startY, col.w, rowH);
                            doc.text(col.header, curX + col.w / 2, startY + 4, { align: "center" });
                            curX += col.w;
                        });
                        startY += rowH;
                        doc.setFontSize(8);
                        doc.setFont("helvetica", "normal");
                    }

                    curX = startX;
                    const h = dynamicH;
                    
                    // No
                    doc.rect(curX, startY, cols[0].w, h);
                    doc.text(String(i + 1), curX + cols[0].w / 2, startY + (h / 2) + 1.5, { align: "center" });
                    curX += cols[0].w;
                    
                    // No. Pes (NIS)
                    doc.rect(curX, startY, cols[1].w, h);
                    doc.text(seat.student.nis, curX + 2, startY + (h / 2) + 1.5);
                    curX += cols[1].w;
                    
                    // Nama
                    doc.rect(curX, startY, cols[2].w, h);
                    let name = seat.student.name;
                    // truncate if it still exceeds the dynamically capped width
                    if (doc.getTextWidth(name) > cols[2].w - 2) {
                        while (name.length > 0 && doc.getTextWidth(name + "...") > cols[2].w - 3) {
                            name = name.slice(0, -1);
                        }
                        name += "...";
                    }
                    doc.text(name, curX + 2, startY + (h / 2) + 1.5);
                    curX += cols[2].w;
                    
                    // Kelas
                    doc.rect(curX, startY, cols[3].w, h);
                    doc.text(seat.student.className, curX + cols[3].w / 2, startY + (h / 2) + 1.5, { align: "center" });
                    curX += cols[3].w;

                    // Jam Ke 1
                    doc.rect(curX, startY, cols[4].w, h);
                    curX += cols[4].w;
                    
                    // Jam Ke 2
                    doc.rect(curX, startY, cols[5].w, h);
                    curX += cols[5].w;
                    
                    // Jam Ke 3
                    doc.rect(curX, startY, cols[6].w, h);
                    curX += cols[6].w;

                    startY += h;
                });

                // Signature Block for Pengawas Ruang
                let signatureY = startY + 10;
                if (signatureY > pageH - 25) {
                    doc.addPage();
                    renderHeader(plan.room.name + " (Lanjutan)");
                    signatureY = 44;
                }
                
                doc.setFontSize(9);
                doc.setFont("helvetica", "normal");
                
                const colWidth = pageW / 3;
                
                // Pengawas 1 (Left)
                doc.text("Pengawas 1,", colWidth / 2, signatureY, { align: "center" });
                doc.line((colWidth / 2) - 20, signatureY + 15, (colWidth / 2) + 20, signatureY + 15);
                
                // Pengawas 2 (Center)
                doc.text("Pengawas 2,", pageW / 2, signatureY, { align: "center" });
                doc.line((pageW / 2) - 20, signatureY + 15, (pageW / 2) + 20, signatureY + 15);
                
                // Pengawas 3 (Right)
                doc.text("Pengawas 3,", pageW - (colWidth / 2), signatureY, { align: "center" });
                doc.line(pageW - (colWidth / 2) - 20, signatureY + 15, pageW - (colWidth / 2) + 20, signatureY + 15);
            }

            if (action === "download") {
                doc.save(`Daftar_Hadir_${activeConfig?.academicYear?.replace("/", "-") || "Ujian"}.pdf`);
            } else {
                const blob = doc.output("blob");
                const url = URL.createObjectURL(blob);
                setPreviewUrl(url);
            }
        } catch (err) {
            console.error(err);
            alert("Gagal export PDF");
        } finally {
            setExporting(null);
        }
    };

    return (
        <DashboardLayout title="Export Daftar Hadir">
            <div className="max-w-6xl mx-auto space-y-4">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Export Daftar Hadir</h1>
                        <p className="page-subtitle">Download daftar hadir peserta per ruang ujian dalam format PDF</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleExportPDF("preview")}
                            disabled={roomPlans.length === 0 || !!exporting}
                            className="btn-secondary"
                        >
                            {exporting === "preview" ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                            Preview
                        </button>
                        <button
                            onClick={() => handleExportPDF("download")}
                            disabled={roomPlans.length === 0 || !!exporting}
                            className="btn-primary"
                        >
                            {exporting === "pdf" ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                            Simpan PDF
                        </button>
                    </div>
                </div>

                <div className="card-glass p-4">
                    <label className="form-label">Pilih Konfigurasi Ujian</label>
                    <select
                        className="form-select max-w-sm"
                        value={selectedConfig}
                        onChange={(e) => setSelectedConfig(e.target.value)}
                    >
                        <option value="">-- Pilih Ujian --</option>
                        {configs.map((c) => (
                            <option key={c.id} value={c.id}>{c.name} {c.isActive ? "(Aktif)" : ""}</option>
                        ))}
                    </select>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-48 text-[var(--text-muted)]">
                        <Loader2 size={20} className="animate-spin mr-2" />Memuat data daftar hadir...
                    </div>
                ) : roomPlans.length === 0 ? (
                    <div className="card-glass p-12 text-center text-[var(--text-muted)]">
                        <Users size={48} className="mx-auto mb-3 opacity-20" />
                        <p className="text-sm">Belum ada data siswa untuk daftar hadir.</p>
                        <p className="text-xs mt-1 text-[var(--text-muted)]">Pastikan Anda telah meng-generate denah kursi untuk ruang ujian terlebih dahulu.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="card-glass p-4 flex items-center gap-6">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-[var(--text-main)]">{roomPlans.length}</p>
                                <p className="text-xs text-[var(--text-muted)]">Total Ruang</p>
                            </div>
                            <div className="w-px h-10 bg-gray-700" />
                            <div className="text-center">
                                <p className="text-2xl font-bold text-[var(--text-main)]">
                                    {roomPlans.reduce((sum, p) => sum + p.seats.length, 0)}
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">Total Siswa</p>
                            </div>
                            <div className="w-px h-10 bg-gray-700" />
                            <div className="flex-1">
                                {activeConfig && (
                                    <p className="text-sm text-[var(--text-main)] font-medium">{activeConfig.name}</p>
                                )}
                                <p className="text-xs text-[var(--text-muted)]">Klik Simpan PDF untuk mengunduh daftar hadir semua ruang</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {roomPlans.map((plan) => (
                                <div key={plan.room.id} className="card-glass p-4 hover:border-blue-500/30 transition-colors">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-sm font-semibold text-[var(--text-main)]">
                                            {plan.room.name}
                                        </h3>
                                        <span className="badge badge-gray">{plan.room.code}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                        <Users size={14} />
                                        <span>{plan.seats.length} Peserta (Kapasitas: {plan.room.capacity})</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            {previewUrl && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                            <div className="flex items-center gap-2">
                                <Eye size={18} className="text-blue-400" />
                                <h2 className="text-base font-semibold text-[var(--text-main)]">Preview Daftar Hadir</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const link = document.createElement("a");
                                        link.href = previewUrl;
                                        link.download = `Daftar_Hadir_${activeConfig?.academicYear?.replace("/", "-") || "Ujian"}.pdf`;
                                        link.click();
                                    }}
                                    className="btn-primary py-1.5 px-3 text-xs"
                                >
                                    <Download size={14} /> Download PDF
                                </button>
                                <button
                                    onClick={() => {
                                        URL.revokeObjectURL(previewUrl);
                                        setPreviewUrl(null);
                                    }}
                                    className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors p-1"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 bg-[var(--bg-surface-hover)] relative">
                            <iframe
                                src={previewUrl}
                                className="w-full h-full border-0"
                                title="PDF Preview"
                            />
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
