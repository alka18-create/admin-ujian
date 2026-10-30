"use client";

/* eslint-disable @next/next/no-img-element -- print cards use base64/blob images sized by print CSS */

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FileText, Loader2, CreditCard, School } from "lucide-react";

type ExamConfig = { id: string; name: string; academicYear: string; semester: string; isActive: boolean };
type SchoolIdentity = { name: string; npsn: string | null; address: string | null; headmasterName: string | null; headmasterNip: string | null; logo: string | null; signature: string | null; stamp: string | null };
type StudentData = {
    id: string;
    student: { name: string; nis: string; nisn: string | null; className: string };
    room: { code: string; name: string };
    seatLabel: string;
};
type SeatPlanResponse = {
    room: StudentData["room"];
    seats: { id: string; seatLabel: string; student: StudentData["student"] }[];
};

export default function ExportKartuPage() {
    const [configs, setConfigs] = useState<ExamConfig[]>([]);
    const [selectedConfig, setSelectedConfig] = useState("");
    const [schoolInfo, setSchoolInfo] = useState<SchoolIdentity | null>(null);
    const [students, setStudents] = useState<StudentData[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Fetch configs
        fetch("/api/schedule").then(r => r.json()).then(j => {
            if (j.success) {
                setConfigs(j.data);
                const active = j.data.find((c: ExamConfig) => c.isActive);
                if (active) setSelectedConfig(active.id);
            }
        });
        // Fetch school identity
        fetch("/api/school-identity").then(r => r.json()).then(j => {
            if (j.success) setSchoolInfo(j.data);
        });
    }, []);

    const fetchStudents = useCallback(async () => {
        if (!selectedConfig) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/generate/seats?examConfigId=${selectedConfig}`);
            const json = await res.json();
            if (json.success) {
                // Flatten seat plans to get students
                const allStudents: StudentData[] = [];
                json.data.forEach((plan: SeatPlanResponse) => {
                    plan.seats.forEach((seat) => {
                        allStudents.push({
                            id: seat.id,
                            student: seat.student,
                            room: plan.room,
                            seatLabel: seat.seatLabel
                        });
                    });
                });
                setStudents(allStudents.sort((a, b) => a.student.className.localeCompare(b.student.className) || a.student.name.localeCompare(b.student.name)));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [selectedConfig]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh when selected exam config changes
        fetchStudents();
    }, [fetchStudents]);

    const handlePrint = () => window.print();

    const activeConfig = configs.find(c => c.id === selectedConfig);

    const groupedStudents = students.reduce((acc, student) => {
        const className = student.student.className;
        if (!acc[className]) acc[className] = [];
        acc[className].push(student);
        return acc;
    }, {} as Record<string, StudentData[]>);

    return (
        <DashboardLayout title="Kartu Peserta Ujian">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { size: A4; margin: 10mm; }
                    body { background: white !important; color: black !important; }
                    .print\\:hidden, .page-header, .card-glass:not(.print-card-container), .sidebar, .topbar { display: none !important; }
                    .main-content { padding: 0 !important; margin: 0 !important; background: white !important; }
                    .print-card-container {
                        display: grid !important;
                        grid-template-columns: 1fr 1fr !important;
                        gap: 10px !important;
                        background: transparent !important;
                        border: none !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                    }
                    .kartu {
                        border: 2px solid #000 !important;
                        width: 90mm;
                        height: 55mm;
                        position: relative;
                        box-sizing: border-box;
                        padding: 5px;
                        overflow: hidden;
                        page-break-inside: avoid;
                    }
                    .class-group {
                        break-after: page;
                        page-break-after: always;
                    }
                    .class-group:last-child {
                        break-after: auto;
                        page-break-after: auto;
                    }
                }
                .kartu {
                    background: white;
                    color: black;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 12px;
                    width: 340px;
                    height: 210px;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                    position: relative;
                }
                .kartu-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    border-bottom: 2px solid #1e3a8a;
                    padding-bottom: 6px;
                    margin-bottom: 8px;
                }
                .kartu-logo {
                    width: 40px;
                    height: 40px;
                    object-fit: contain;
                }
                .kartu-school-info {
                    flex: 1;
                    text-align: center;
                }
                .kartu-school-name {
                    font-size: 11px;
                    font-weight: 800;
                    text-transform: uppercase;
                    line-height: 1.1;
                }
                .kartu-exam-name {
                    font-size: 9px;
                    font-weight: 600;
                    color: #1e3a8a;
                    margin-top: 2px;
                }
                .kartu-body {
                    display: flex;
                    gap: 12px;
                    flex: 1;
                }
                .kartu-photo {
                    width: 50px;
                    height: 65px;
                    border: 1px solid #cbd5e1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 8px;
                    color: #94a3b8;
                    background: #f8fafc;
                    position: relative;
                    overflow: hidden;
                }
                .kartu-fields {
                    flex: 1;
                    font-size: 10px;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .kartu-field {
                    display: grid;
                    grid-template-columns: 50px 8px 1fr;
                }
                .kartu-label { font-weight: 600; }
                .kartu-value { font-weight: 700; }
                .kartu-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    font-size: 8px;
                    margin-top: auto;
                }
                .kartu-signature {
                    text-align: center;
                    width: 100px;
                    position: relative;
                }
                .kartu-sign-img {
                    height: 30px;
                    object-fit: contain;
                    margin: 0 auto;
                    position: relative;
                    z-index: 10;
                }
                .kartu-stamp-img {
                    position: absolute;
                    bottom: 10px;
                    left: -20px;
                    height: 60px;
                    width: 60px;
                    object-fit: contain;
                    opacity: 0.85;
                    z-index: 20;
                    pointer-events: none;
                }
                `
            }} />

            <div className="max-w-6xl mx-auto space-y-4">
                <div className="page-header print:hidden">
                    <div>
                        <h1 className="page-title">Kartu Peserta Ujian</h1>
                        <p className="page-subtitle">Cetak kartu peserta ujian untuk siswa</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrint}
                            disabled={students.length === 0}
                            className="btn-primary"
                        >
                            <FileText size={16} />Cetak / PDF
                        </button>
                    </div>
                </div>

                <div className="card-glass p-4 print:hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="form-label">Pilih Konfigurasi Ujian</label>
                            <select
                                className="form-select"
                                value={selectedConfig}
                                onChange={e => setSelectedConfig(e.target.value)}
                            >
                                <option value="">-- Pilih Ujian --</option>
                                {configs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        {students.length > 0 && (
                            <div className="flex items-end text-sm text-[var(--text-muted)]">
                                Total: {students.length} Siswa
                            </div>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-48 text-[var(--text-muted)]">
                        <Loader2 size={24} className="animate-spin mr-2" />Memuat data siswa...
                    </div>
                ) : students.length === 0 ? (
                    <div className="card-glass p-12 text-center text-[var(--text-muted)] print:hidden">
                        <CreditCard size={48} className="mx-auto mb-3 opacity-20" />
                        <p className="text-sm">Belum ada data siswa untuk ujian ini.</p>
                        <p className="text-xs text-[var(--text-muted)] mt-2">Pastikan sudah melakukan Generate Denah Kursi terlebih dahulu.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-8 print:gap-0">
                        {Object.entries(groupedStudents).map(([className, classStudents]) => (
                            <div key={className} className="class-group">
                                <div className="print:hidden mb-4 border-b border-slate-200 pb-2">
                                    <h3 className="text-lg font-bold">Kelas: {className}</h3>
                                    <p className="text-sm text-slate-500">{classStudents.length} Peserta</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 print-card-container">
                                    {classStudents.map(s => (
                                        <div key={s.id} className="kartu mx-auto">
                                            <div className="kartu-header">
                                                {schoolInfo?.logo ? (
                                                    <img src={schoolInfo.logo} alt="Logo" className="kartu-logo" />
                                                ) : (
                                                    <div className="kartu-logo bg-slate-100 flex items-center justify-center rounded-md"><School size={20} className="text-[var(--text-muted)]" /></div>
                                                )}
                                                <div className="kartu-school-info">
                                                    <h2 className="kartu-school-name">{schoolInfo?.name || "NAMA MADRASAH / SEKOLAH"}</h2>
                                                    <p className="kartu-exam-name">{activeConfig?.name || "UJIAN MADRASAH"}</p>
                                                </div>
                                            </div>
                                            <div className="kartu-body">
                                                <div className="kartu-photo">
                                                    <div className="absolute inset-0 flex items-end justify-center z-0">
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-slate-300 translate-y-2">
                                                            <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                    {s.student.nisn && (
                                                        <img
                                                            src={`/uploads/photos/${s.student.nisn}.jpg`}
                                                            alt="Foto"
                                                            className="w-full h-full object-cover z-10 relative bg-[#f8fafc]"
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none';
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                                <div className="kartu-fields">
                                                    <div className="kartu-field">
                                                        <span className="kartu-label">Nama</span>
                                                        <span>:</span>
                                                        <span className="kartu-value uppercase">{s.student.name}</span>
                                                    </div>
                                                    <div className="kartu-field">
                                                        <span className="kartu-label">NIS</span>
                                                        <span>:</span>
                                                        <span className="kartu-value font-mono">{s.student.nis}</span>
                                                    </div>
                                                    <div className="kartu-field">
                                                        <span className="kartu-label">Kelas</span>
                                                        <span>:</span>
                                                        <span className="kartu-value">{s.student.className}</span>
                                                    </div>
                                                    <div className="kartu-field">
                                                        <span className="kartu-label">Ruang</span>
                                                        <span>:</span>
                                                        <span className="kartu-value">{s.room.name} ({s.room.code})</span>
                                                    </div>
                                                    <div className="kartu-field">
                                                        <span className="kartu-label">No. Meja</span>
                                                        <span>:</span>
                                                        <span className="kartu-value">{s.seatLabel}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="kartu-footer">
                                                <div className="text-[7px] text-[var(--text-muted)] italic">
                                                    *Kartu ini harus dibawa saat ujian
                                                </div>
                                                <div className="kartu-signature">
                                                    <p>Kepala Madrasah,</p>
                                                    <div className="relative flex items-center justify-center my-1" style={{ height: '35px' }}>
                                                        {schoolInfo?.signature ? (
                                                            <img src={schoolInfo.signature} alt="Sign" className="kartu-sign-img" />
                                                        ) : (
                                                            <div className="h-[30px]" />
                                                        )}
                                                        {schoolInfo?.stamp && (
                                                            <img src={schoolInfo.stamp} alt="Stamp" className="kartu-stamp-img" />
                                                        )}
                                                    </div>
                                                    <p className="font-bold underline uppercase">{schoolInfo?.headmasterName || "..........................."}</p>
                                                    <p className="text-[7px] mt-0.5">NIP. {schoolInfo?.headmasterNip || "..........................."}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
