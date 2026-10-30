"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Loader2, FileText, Grid3X3 } from "lucide-react";

type ExamConfig = { id: string; name: string; isActive: boolean };
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

const GENDER_BG: Record<string, string> = {
    MALE: "bg-transparent text-[var(--text-main)]",
    FEMALE: "bg-transparent text-[var(--text-main)]",
};

export default function ExportSeatPlanPage() {
    const [configs, setConfigs] = useState<ExamConfig[]>([]);
    const [selectedConfig, setSelectedConfig] = useState("");
    const [roomPlans, setRoomPlans] = useState<RoomPlan[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch("/api/schedule")
            .then((r) => r.json())
            .then((j) => {
                if (j.success) {
                    setConfigs(j.data);
                    const a = j.data.find((c: ExamConfig) => c.isActive);
                    if (a) setSelectedConfig(a.id);
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
        // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale plan before fetching the new config
        setRoomPlans([]);
        fetchSeatPlans();
    }, [fetchSeatPlans]);

    const handleExportPDF = () => {
        window.print();
    };

    const buildDeskRows = (seats: Seat[]) => {
        if (!seats.length) return { isDouble: true, rows: [] };
        const sorted = [...seats].sort((a, b) =>
            a.seatRow !== b.seatRow ? a.seatRow - b.seatRow : a.seatCol - b.seatCol
        );
        const maxRow = Math.max(...sorted.map((s) => s.seatRow));
        const maxCol = Math.max(...sorted.map((s) => s.seatCol));

        const isDouble = maxCol > 4;
        const targetDesksPerRow = 4;

        const rows = [];
        for (let r = 1; r <= maxRow; r++) {
            const rowSeats = sorted.filter((s) => s.seatRow === r);
            const desks = [];
            for (let d = 0; d < targetDesksPerRow; d++) {
                if (isDouble) {
                    const left = rowSeats.find((s) => s.seatCol === d * 2 + 1) || null;
                    const right = rowSeats.find((s) => s.seatCol === d * 2 + 2) || null;
                    desks.push({ isDouble: true, left, right, single: null, deskNo: d + 1 });
                } else {
                    const single = rowSeats.find((s) => s.seatCol === d + 1) || null;
                    desks.push({ isDouble: false, left: null, right: null, single, deskNo: d + 1 });
                }
            }
            rows.push({ rowLabel: String.fromCharCode(64 + r), desks });
        }
        return { isDouble, rows };
    };

    const SeatCard = ({ seat }: { seat: Seat | null }) =>
        seat ? (
            <div className={`flex-1 rounded-md px-1.5 py-1.5 text-center border border-[var(--border)] bg-[var(--bg-surface)] min-w-0 ${GENDER_BG[seat.student.gender] || "text-[var(--text-main)] print:border-gray-500 print:text-black"}`}>
                <p className="text-xs font-bold leading-none mb-1 text-[var(--text-main)] print-text">{seat.seatLabel}</p>
                <p className="font-semibold leading-tight truncate text-[var(--text-main)] print-text" style={{ fontSize: "0.65rem" }}>
                    {seat.student.name.split(" ").slice(0, 2).join(" ")}
                </p>
                <p className="text-[var(--text-muted)] truncate print-text mt-0.5 font-medium" style={{ fontSize: "0.55rem" }}>{seat.student.className}</p>
            </div>
        ) : (
            <div className="flex-1 rounded-md border border-dashed border-[var(--border)] bg-transparent opacity-30 min-w-0 h-14 print:border-gray-300 print:opacity-50" />
        );

    return (
        <DashboardLayout title="Export Denah Kursi">
            {/* Topbar/Controls: Hidden on Print */}
            <div className="max-w-6xl mx-auto space-y-4 print:hidden">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Export Denah Kursi</h1>
                        <p className="page-subtitle">Download denah kursi ruang ujian dalam format PDF</p>
                    </div>
                    <button onClick={handleExportPDF} className="btn-primary">
                        <FileText size={16} />Cetak PDF
                    </button>
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

                {loading && (
                    <div className="flex items-center justify-center h-48 text-[var(--text-muted)]">
                        <Loader2 size={20} className="animate-spin mr-2" />Memuat denah...
                    </div>
                )}

                {!loading && roomPlans.length === 0 && selectedConfig && (
                    <div className="card-glass p-12 text-center text-[var(--text-muted)]">
                        <Grid3X3 size={48} className="mx-auto mb-3 opacity-20" />
                        <p className="text-sm">Belum ada denah kursi untuk ujian ini.</p>
                        <p className="text-xs mt-1 opacity-70">Pastikan Anda telah meng-generate denah kursi di menu Ujian.</p>
                    </div>
                )}
            </div>

            {/* Print Area: Shown on screen mostly like regular UI, but prints perfectly */}
            {!loading && roomPlans.length > 0 && (
                <div className="max-w-6xl mx-auto mt-6 print:mt-0 print:max-w-none print:w-full space-y-8 print:space-y-0">
                    <style dangerouslySetInnerHTML={{
                        __html: `
                        @media print {
                            body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
                            .print-page-break { page-break-after: always !important; break-after: page !important; break-inside: avoid !important; }
                            .print-text { color: black !important; }
                            .card-glass { background: white !important; border-color: #e5e7eb !important; border-width: 1px; box-shadow: none !important; }
                            .border-[var(--border)] { border-color: #e5e7eb !important; }
                            .bg-[var(--bg-surface-hover)]\\/40 { background-color: transparent !important; }
                            .border-[var(--border)]\\/50 { border-color: #d1d5db !important; }
                            .bg-slate-700\\/50 { background-color: #f3f4f6 !important; border-color: #d1d5db !important; }
                            .text-[var(--text-main)] { color: black !important; }
                            .text-[var(--text-main)] { color: black !important; }
                            .text-[var(--text-main)] { color: #374151 !important; }
                            .text-[var(--text-muted)] { color: #4b5563 !important; }
                            .text-[var(--text-muted)] { color: #6b7280 !important; }
                            .text-[var(--text-muted)] { color: #9ca3af !important; }
                            
                            /* Force colored badges for gender in print */
                            .border-blue-700 { border-color: #2563eb !important; }
                            .bg-blue-900\\/50 { background-color: #eff6ff !important; color: #1e3a8a !important; }
                            .border-pink-700 { border-color: #db2777 !important; }
                            .bg-pink-900\\/50 { background-color: #fdf2f8 !important; color: #831843 !important; }
                        }
                    `}} />

                    {roomPlans.map((currentPlan) => (
                        <div key={currentPlan.room.id} className="card-glass overflow-hidden print-page-break print:border-0 print:shadow-none print:m-0 print:p-0">
                            {/* Header */}
                            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between bg-slate-50 dark:bg-transparent">
                                <div>
                                    <h2 className="text-base font-semibold text-[var(--text-main)] print-text">{currentPlan.room.name}</h2>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                        {currentPlan.room.code} · Kapasitas: {currentPlan.room.capacity} · Terisi: {currentPlan.seats.length} siswa
                                    </p>
                                </div>
                                <div className="px-3 py-1.5 bg-white dark:bg-[var(--bg-surface-hover)] border border-[var(--border)] rounded text-xs text-[var(--text-main)] dark:text-[var(--text-muted)] font-medium shadow-sm print-text print:shadow-none">
                                    ← DEPAN / PAPAN TULIS
                                </div>
                            </div>

                            {/* Desk layout */}
                            <div className="p-4 overflow-x-auto print:overflow-visible">
                                {/* Column numbers */}
                                <div className="flex items-center gap-3 mb-3 ml-6">
                                    {Array.from({ length: 4 }, (_, i) => (
                                        <div key={i} className="flex-1 text-center text-xs text-[var(--text-muted)] font-semibold print-text">
                                            Meja {i + 1}
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-3">
                                    {buildDeskRows(currentPlan.seats).rows.map(({ rowLabel, desks }) => (
                                        <div key={rowLabel} className="flex items-stretch gap-3">
                                            {/* Row label */}
                                            <div className="flex items-center justify-center w-6 text-xs font-mono text-[var(--text-main)] font-semibold flex-shrink-0 print-text">
                                                {rowLabel}
                                            </div>
                                            {/* Desks */}
                                            {desks.map(({ isDouble, left, right, single, deskNo }) => (
                                                <div
                                                    key={deskNo}
                                                    className="flex-1 flex gap-1.5 bg-slate-50 dark:bg-[var(--bg-surface-hover)] border border-[var(--border)] rounded-lg p-2 min-w-0"
                                                    style={{ minWidth: 0 }}
                                                >
                                                    {isDouble ? (
                                                        <>
                                                            <SeatCard seat={left} />
                                                            <div className="w-px bg-[var(--border)] flex-shrink-0 print:bg-gray-300" />
                                                            <SeatCard seat={right} />
                                                        </>
                                                    ) : (
                                                        <SeatCard seat={single} />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>

                                {/* Back label */}
                                <p className="text-center text-xs text-[var(--text-main)] font-semibold mt-6 tracking-widest print-text">
                                    — BELAKANG —
                                </p>
                            </div>

                            {/* Roster */}
                            <div className="border-t border-[var(--border)] p-4 mt-4 bg-slate-50 dark:bg-[var(--bg-surface-hover)] print:bg-white print:border-none">
                                <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-3 print-text">
                                    Daftar Peserta — {currentPlan.room.name}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                                    {currentPlan.seats
                                        .sort((a, b) => a.seatRow !== b.seatRow ? a.seatRow - b.seatRow : a.seatCol - b.seatCol)
                                        .map((seat, idx) => (
                                            <div key={seat.id} className="flex items-center gap-2 py-2 border-b border-[var(--border)]">
                                                <span className="text-xs text-[var(--text-muted)] w-6 text-right flex-shrink-0 print-text">{idx + 1}.</span>
                                                <span className="text-xs font-mono text-[var(--text-muted)] font-medium w-7 flex-shrink-0 print-text">{seat.seatLabel}</span>
                                                <span className="text-xs text-[var(--text-main)] font-semibold flex-1 truncate print-text">{seat.student.name}</span>
                                                <span className="text-xs text-[var(--text-muted)] flex-shrink-0 print-text">{seat.student.className}</span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
}
