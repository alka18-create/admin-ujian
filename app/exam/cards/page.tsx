"use client";

import { useEffect, useMemo, useState } from "react";
import ParticipantCard, { ParticipantCardProps } from "@/components/exam/ParticipantCard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Printer, Loader2, Users } from "lucide-react";

type ExamConfig = { id: string; name: string; isActive: boolean };

function extractGradeLevel(className: string): string {
    const cleaned = className
        .trim()
        .toUpperCase()
        .replace(/^(KELAS|KLS)\.?\s*/i, "");

    const numMatch = cleaned.match(/^(1[0-2]|[1-9])(?:\b|[^0-9])/);
    if (numMatch) return numMatch[1];

    const romanMap: Array<[RegExp, string]> = [
        [/^XII(?:\b|[^A-Z])/, "12"],
        [/^XI(?:\b|[^A-Z])/, "11"],
        [/^IX(?:\b|[^A-Z])/, "9"],
        [/^VIII(?:\b|[^A-Z])/, "8"],
        [/^VII(?:\b|[^A-Z])/, "7"],
        [/^VI(?:\b|[^A-Z])/, "6"],
        [/^IV(?:\b|[^A-Z])/, "4"],
        [/^III(?:\b|[^A-Z])/, "3"],
        [/^II(?:\b|[^A-Z])/, "2"],
        [/^X(?:\b|[^A-Z])/, "10"],
        [/^V(?:\b|[^A-Z])/, "5"],
        [/^I(?:\b|[^A-Z])/, "1"],
    ];

    for (const [pattern, grade] of romanMap) {
        if (pattern.test(cleaned)) return grade;
    }
    return cleaned || "LAINNYA";
}

function formatGradeLabel(grade: string): string {
    const roman: Record<string, string> = { "10": "X", "11": "XI", "12": "XII" };
    return roman[grade] ? `Jenjang ${grade} (Kelas ${roman[grade]})` : `Jenjang ${grade}`;
}

export default function CetakKartuPage() {
    const [configs, setConfigs] = useState<ExamConfig[]>([]);
    const [selectedConfig, setSelectedConfig] = useState<string>("");
    const [selectedGrade, setSelectedGrade] = useState<string>("ALL");
    const [selectedClass, setSelectedClass] = useState<string>("ALL");
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
        setSelectedGrade("ALL");
        setSelectedClass("ALL");
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

    // Daftar jenjang tersedia beserta jumlah siswa
    const gradeOptions = useMemo(() => {
        if (!cardData) return [];
        const counts = new Map<string, number>();
        for (const s of cardData.students) {
            const g = extractGradeLevel(s.className);
            counts.set(g, (counts.get(g) ?? 0) + 1);
        }
        return Array.from(counts.entries())
            .sort((a, b) => {
                const na = Number(a[0]);
                const nb = Number(b[0]);
                if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
                return a[0].localeCompare(b[0], "id");
            })
            .map(([grade, count]) => ({ grade, count }));
    }, [cardData]);

    // Daftar kelas tersedia (terfilter sesuai jenjang yang dipilih)
    const classOptions = useMemo(() => {
        if (!cardData) return [];
        const counts = new Map<string, number>();
        for (const s of cardData.students) {
            if (selectedGrade !== "ALL" && extractGradeLevel(s.className) !== selectedGrade) {
                continue;
            }
            counts.set(s.className, (counts.get(s.className) ?? 0) + 1);
        }
        return Array.from(counts.entries())
            .sort((a, b) => a[0].localeCompare(b[0], "id"))
            .map(([className, count]) => ({ className, count }));
    }, [cardData, selectedGrade]);

    const sortedStudents = useMemo(() => {
        if (!cardData) return [];
        return cardData.students
            .filter((s) => {
                if (selectedGrade !== "ALL" && extractGradeLevel(s.className) !== selectedGrade) {
                    return false;
                }
                if (selectedClass !== "ALL" && s.className !== selectedClass) {
                    return false;
                }
                return true;
            })
            .sort((a, b) => {
                const classCompare = a.className.localeCompare(b.className, "id");
                if (classCompare !== 0) return classCompare;
                return a.name.localeCompare(b.name, "id");
            });
    }, [cardData, selectedGrade, selectedClass]);

    const handlePrint = () => {
        window.print();
    };

    const hasData = sortedStudents.length > 0;
    const totalAllStudents = cardData?.students.length ?? 0;

    return (
        <DashboardLayout title="Cetak Kartu Ujian">
            <div className="max-w-7xl mx-auto space-y-4 print:hidden">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Cetak Kartu Ujian</h1>
                        <p className="page-subtitle">Generate dan print kartu peserta ujian (semua, per jenjang, atau per kelas)</p>
                    </div>
                    <button
                        onClick={handlePrint}
                        disabled={loading || !hasData}
                        className="btn-success flex items-center gap-2"
                    >
                        <Printer size={16} />
                        Cetak {selectedGrade !== "ALL" ? `Jenjang ${selectedGrade}` : "ke PDF / Print"} ({sortedStudents.length})
                    </button>
                </div>

                <div className="card-glass p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
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

                        <div>
                            <label className="form-label">Filter Jenjang</label>
                            <select
                                className="form-select w-full"
                                value={selectedGrade}
                                onChange={(e) => {
                                    setSelectedGrade(e.target.value);
                                    setSelectedClass("ALL");
                                }}
                                disabled={gradeOptions.length === 0}
                            >
                                <option value="ALL">Semua Jenjang ({totalAllStudents} siswa)</option>
                                {gradeOptions.map((g) => (
                                    <option key={g.grade} value={g.grade}>
                                        {formatGradeLabel(g.grade)} — {g.count} siswa
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="form-label">Filter Kelas</label>
                            <select
                                className="form-select w-full"
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                disabled={classOptions.length === 0}
                            >
                                <option value="ALL">
                                    Semua Kelas {selectedGrade !== "ALL" ? `Jenjang ${selectedGrade}` : ""} ({
                                        selectedGrade === "ALL"
                                            ? totalAllStudents
                                            : gradeOptions.find((g) => g.grade === selectedGrade)?.count ?? 0
                                    } siswa)
                                </option>
                                {classOptions.map((c) => (
                                    <option key={c.className} value={c.className}>
                                        {c.className} — {c.count} siswa
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[var(--border)]">
                        <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-main)]">
                            <span className="text-xs font-semibold text-[var(--text-muted)]">Kolom ditampilkan:</span>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="form-checkbox h-4 w-4 rounded" checked={fieldSettings.nisn} onChange={e => setFieldSettings(s => ({ ...s, nisn: e.target.checked }))} />
                                NISN
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="form-checkbox h-4 w-4 rounded" checked={fieldSettings.nis} onChange={e => setFieldSettings(s => ({ ...s, nis: e.target.checked }))} />
                                No. Peserta
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="form-checkbox h-4 w-4 rounded" checked={fieldSettings.kelas} onChange={e => setFieldSettings(s => ({ ...s, kelas: e.target.checked }))} />
                                Kelas
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="form-checkbox h-4 w-4 rounded" checked={fieldSettings.ruang} onChange={e => setFieldSettings(s => ({ ...s, ruang: e.target.checked }))} />
                                Ruang
                            </label>
                        </div>

                        <div className="text-sm text-[var(--text-muted)] shrink-0">
                            Menampilkan: <strong className="text-[var(--text-main)]">{sortedStudents.length}</strong> dari {totalAllStudents} peserta
                        </div>
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

            {/* Area Print */}
            {hasData && !loading && (
                <div className="mt-8 print:mt-0 print:p-0">
                    <style suppressHydrationWarning>{`
                        @media print {
                            @page {
                                size: A4 portrait;
                                margin: 5mm;
                            }
                            html, body {
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                                background-color: white !important;
                                color: black !important;
                            }
                            main, .card-glass, .page-header { background: transparent !important; border: none !important; box-shadow: none !important; }
                            nav, header, footer, .sidebar, .btn-success { display: none !important; }
                            
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

                            div[class*="min-h-screen"] { min-h-screen: auto; padding: 0 !important; }
                            aside { display: none !important; }
                            
                            .print-wrapper {
                                background: transparent !important;
                                border: none !important;
                                padding: 0 !important;
                                overflow: visible !important;
                            }

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
                                    exam={cardData?.exam}
                                    school={cardData?.school}
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
