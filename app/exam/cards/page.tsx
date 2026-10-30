"use client";

import { useEffect, useState } from "react";
import ParticipantCard, { ParticipantCardProps } from "@/components/exam/ParticipantCard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Printer, Loader2, Users } from "lucide-react";

type ExamConfig = { id: string; name: string; isActive: boolean };

export default function CetakKartuPage() {
    const [configs, setConfigs] = useState<ExamConfig[]>([]);
    const [selectedConfig, setSelectedConfig] = useState<string>("");
    const [cardData, setCardData] = useState<{
        students: ParticipantCardProps["student"][];
        exam?: ParticipantCardProps["exam"];
        school?: ParticipantCardProps["school"];
    } | null>(null);
    const [fieldSettings, setFieldSettings] = useState({
        nisn: true,
        nis: true,
        kelas: true,
        ruang: true,
    });
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

    const sortedStudents = cardData ? [...cardData.students].sort((a, b) => {
        const classCompare = a.className.localeCompare(b.className);
        if (classCompare !== 0) return classCompare;
        return a.name.localeCompare(b.name);
    }) : [];

    return (
        <DashboardLayout title="Cetak Kartu Ujian">
            <div className="max-w-7xl mx-auto space-y-4 print:hidden">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Cetak Kartu Ujian</h1>
                        <p className="page-subtitle">Generate dan print kartu peserta ujian</p>
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

                <div className="card-glass p-4 flex flex-col md:flex-row gap-6 items-start md:items-end">
                    <div className="flex-1 w-full max-w-sm">
                        <label className="form-label">Pilih Konfigurasi Ujian</label>
                        <select
                            className="form-select w-full"
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

                    <div className="flex-1 flex flex-col gap-2">
                        <label className="form-label mb-0">Kolom yang Ditampilkan</label>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-300">
                            <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                                <input type="checkbox" className="form-checkbox h-4 w-4 rounded bg-gray-800 border-gray-600 checked:bg-blue-600" checked={fieldSettings.nisn} onChange={e => setFieldSettings(s => ({ ...s, nisn: e.target.checked }))} />
                                NISN
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                                <input type="checkbox" className="form-checkbox h-4 w-4 rounded bg-gray-800 border-gray-600 checked:bg-blue-600" checked={fieldSettings.nis} onChange={e => setFieldSettings(s => ({ ...s, nis: e.target.checked }))} />
                                No. Peserta
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                                <input type="checkbox" className="form-checkbox h-4 w-4 rounded bg-gray-800 border-gray-600 checked:bg-blue-600" checked={fieldSettings.kelas} onChange={e => setFieldSettings(s => ({ ...s, kelas: e.target.checked }))} />
                                Kelas
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                                <input type="checkbox" className="form-checkbox h-4 w-4 rounded bg-gray-800 border-gray-600 checked:bg-blue-600" checked={fieldSettings.ruang} onChange={e => setFieldSettings(s => ({ ...s, ruang: e.target.checked }))} />
                                Ruang
                            </label>
                        </div>
                    </div>

                    <div className="text-sm text-[var(--text-muted)] pb-1 shrink-0">
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
                        <Users size={48} className="mx-auto mb-3 opacity-20" />
                        <p>Belum ada data peserta untuk ujian ini.</p>
                        <p className="text-xs mt-1 text-[var(--text-muted)]">Pastikan denah tempat duduk (Seat Plan) sudah digenerate.</p>
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

                            /* Remove page breaks so cards flow continuously */
                            .class-group {
                                break-after: auto;
                                page-break-after: auto;
                            }
                        }
                    `}</style>

                    <div className="print-wrapper p-4 bg-[var(--bg-surface)]/40 rounded-lg border border-[var(--border)] print:border-none print:bg-transparent print:p-0 overflow-x-auto">
                        <div className="print-container flex flex-wrap justify-center print:grid print:grid-cols-2 gap-4 print:gap-x-2 print:gap-y-4 mx-auto w-full max-w-[210mm]">
                            {sortedStudents.map((student) => (
                                <ParticipantCard
                                    key={student.id + student.seatLabel}
                                    student={student}
                                    exam={cardData.exam}
                                    school={cardData.school}
                                    visibleFields={fieldSettings}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
