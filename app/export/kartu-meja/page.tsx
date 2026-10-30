"use client";

import { useEffect, useState } from "react";
import TableCard, { TableCardProps } from "@/components/exam/TableCard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Printer, Loader2, Grid3X3 } from "lucide-react";

type ExamConfig = { id: string; name: string; isActive: boolean };

export default function CetakKartuMejaPage() {
    const [configs, setConfigs] = useState<ExamConfig[]>([]);
    const [selectedConfig, setSelectedConfig] = useState<string>("");
    const [cardData, setCardData] = useState<{
        students: TableCardProps["student"][];
        exam?: TableCardProps["exam"];
        school?: TableCardProps["school"];
    } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Fetch active exam configs to select from
        fetch("/api/schedule").then(r => r.json()).then(j => {
            if (j.success) {
                setConfigs(j.data);
                const active = j.data.find((c: ExamConfig) => c.isActive);
                if (active) {
                    setSelectedConfig(active.id);
                }
            }
        });
    }, []);

    useEffect(() => {
        if (!selectedConfig) return;

        // eslint-disable-next-line react-hooks/set-state-in-effect -- show loading while fetching card data
        setLoading(true);
        fetch(`/api/exam/cards?examConfigId=${selectedConfig}`)
            .then((res) => res.json())
            .then((resData) => {
                if (resData.success) {
                    setCardData({
                        students: resData.data.students,
                        exam: resData.data.exam,
                        school: resData.data.school,
                    });
                }
            })
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, [selectedConfig]);

    const handlePrint = () => {
        window.print();
    };

    const hasData = cardData && cardData.students.length > 0;

    return (
        <DashboardLayout title="Cetak Kartu Meja">
            <div className="max-w-7xl mx-auto space-y-4 print:hidden">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Cetak Kartu Meja</h1>
                        <p className="page-subtitle">Generate dan print kartu meja peserta untuk verifikasi nomor kursi</p>
                    </div>
                    <button
                        onClick={handlePrint}
                        disabled={loading || !hasData}
                        className="btn-success flex items-center gap-2"
                    >
                        <Printer size={16} />
                        Cetak ke PDF / Print
                    </button>
                </div>

                <div className="card-glass p-4 flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="form-label">Pilih Konfigurasi Ujian</label>
                        <select
                            className="form-select w-full max-w-sm"
                            value={selectedConfig}
                            onChange={(e) => setSelectedConfig(e.target.value)}
                        >
                            <option value="">-- Pilih Ujian --</option>
                            {configs.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name} {c.isActive ? "(Aktif)" : ""}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="text-sm text-[var(--text-muted)] pb-2">
                        Total Peserta Ditemukan: <strong className="text-white">{cardData?.students.length || 0}</strong>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-40 text-[var(--text-muted)]">
                        <Loader2 size={24} className="animate-spin mr-2" />
                        Memuat data peserta...
                    </div>
                ) : !hasData ? (
                    <div className="card-glass p-12 text-center text-[var(--text-muted)]">
                        <Grid3X3 size={48} className="mx-auto mb-3 opacity-20" />
                        <p>Belum ada data peserta untuk kartu meja ini.</p>
                        <p className="text-xs mt-1 text-[var(--text-muted)]">Pastikan denah tempat duduk (Seat Plan) sudah digenerate di menu Ujian.</p>
                    </div>
                ) : null}
            </div>

            {/* Area Print: Only visible when printing or in a specific preview mode */}
            {hasData && !loading && (
                <div className="mt-8 print:mt-0 print:p-0">
                    <style suppressHydrationWarning>{`
                        @media print {
                            @page {
                                size: A4 portrait;
                                margin: 5mm; /* Atur margin kertas agar kartu muat */
                            }
                            html, body {
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                                background-color: white !important;
                                color: black !important;
                            }
                            main, .card-glass, .page-header { background: transparent !important; border: none !important; box-shadow: none !important; }
                            nav, header, footer, .sidebar, .btn-success { display: none !important; }
                            
                            /* Layout Grid A4 (2 columns x 4 rows) */
                            .print-container { 
                                display: grid !important;
                                grid-template-columns: repeat(2, 1fr) !important;
                                gap: 2mm !important; 
                                row-gap: 5mm !important;
                                align-items: start;
                                justify-items: center;
                                width: 100% !important;
                                max-width: none !important;
                            }

                            /* Menyembunyikan sidebar dan dashboard layout wrappers */
                            div[class*="min-h-screen"] { min-h-screen: auto; padding: 0 !important; }
                            aside { display: none !important; }
                            
                            /* Remove scrollable box backgrounds in print */
                            .print-wrapper {
                                background: transparent !important;
                                border: none !important;
                                padding: 0 !important;
                                overflow: visible !important;
                            }
                        }
                    `}</style>

                    <div className="print-wrapper p-4 bg-[var(--bg-surface)]/40 rounded-lg border border-[var(--border)] print:border-none print:bg-transparent print:p-0 overflow-x-auto">
                        <div className="print-container flex flex-wrap justify-center print:grid print:grid-cols-2 gap-4 print:gap-x-2 print:gap-y-4 mx-auto w-full max-w-[210mm]">
                            {cardData?.students.map((student) => (
                                <TableCard
                                    key={student.id + student.seatLabel}
                                    student={student}
                                    exam={cardData.exam}
                                    school={cardData.school}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
