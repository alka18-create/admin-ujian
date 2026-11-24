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
    const [selectedRoomId, setSelectedRoomId] = useState("ALL");
    const [showRoster, setShowRoster] = useState(true);
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
        setSelectedRoomId("ALL");
        fetchSeatPlans();
    }, [fetchSeatPlans]);

    const handleExportPDF = () => {
        window.print();
    };

    const visiblePlans =
        selectedRoomId === "ALL"
            ? roomPlans
            : roomPlans.filter((p) => p.room.id === selectedRoomId);

    const activeConfigObj = configs.find((c) => c.id === selectedConfig);

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
            <div
                className={`flex-1 rounded-md px-1.5 py-1.5 print:px-1 print:py-1 text-center border border-[var(--border)] bg-[var(--bg-surface)] min-w-0 ${
                    GENDER_BG[seat.student.gender] || "text-[var(--text-main)]"
                } print:border-gray-400 print:text-black`}
            >
                <p className="text-xs print:text-[10px] font-bold leading-none mb-1 print:mb-0.5 text-[var(--text-main)] print-text">
                    {seat.seatLabel}
                </p>
                <p
                    className="font-semibold leading-tight truncate text-[var(--text-main)] print-text print:text-[8.5px]"
                    style={{ fontSize: "0.65rem" }}
                >
                    {seat.student.name.split(" ").slice(0, 2).join(" ")}
                </p>
                <p
                    className="text-[var(--text-muted)] truncate print-text mt-0.5 print:mt-0 font-medium print:text-[7.5px]"
                    style={{ fontSize: "0.55rem" }}
                >
                    {seat.student.className}
                </p>
            </div>
        ) : (
            <div className="flex-1 rounded-md border border-dashed border-[var(--border)] bg-transparent opacity-30 min-w-0 h-14 print:h-10 print:border-gray-300 print:opacity-50" />
        );

    return (
        <DashboardLayout title="Export Denah Kursi">
            {/* Topbar/Controls: Hidden on Print */}
            <div className="max-w-6xl mx-auto space-y-4 print:hidden">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Export Denah Kursi</h1>
                        <p className="page-subtitle">Download denah kursi ruang ujian dalam format PDF (1 halaman A4 per ruang)</p>
                    </div>
                    <button onClick={handleExportPDF} disabled={visiblePlans.length === 0} className="btn-primary">
                        <FileText size={16} />Cetak PDF
                    </button>
                </div>

                <div className="card-glass p-4 flex flex-col sm:flex-row sm:items-end gap-4">
                    <div className="flex-1 max-w-sm">
                        <label className="form-label">Pilih Konfigurasi Ujian</label>
                        <select
                            className="form-select"
                            value={selectedConfig}
                            onChange={(e) => setSelectedConfig(e.target.value)}
                        >
                            <option value="">-- Pilih Ujian --</option>
                            {configs.map((c) => (
                                <option key={c.id} value={c.id}>{c.name} {c.isActive ? "(Aktif)" : ""}</option>
                            ))}
                        </select>
                    </div>
                    {roomPlans.length > 0 && (
                        <div className="w-full sm:w-52">
                            <label className="form-label">Filter Ruang</label>
                            <select
                                className="form-select"
                                value={selectedRoomId}
                                onChange={(e) => setSelectedRoomId(e.target.value)}
                            >
                                <option value="ALL">Semua Ruang ({roomPlans.length})</option>
                                {roomPlans.map((p) => (
                                    <option key={p.room.id} value={p.room.id}>
                                        {p.room.name} ({p.seats.length} siswa)
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <label className="flex items-center gap-2 text-xs text-[var(--text-main)] cursor-pointer select-none pb-2">
                        <input
                            type="checkbox"
                            checked={showRoster}
                            onChange={(e) => setShowRoster(e.target.checked)}
                            className="rounded border-[var(--border-strong)]"
                        />
                        Sertakan Daftar Peserta
                    </label>
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

            {/* Print Area: 1 Ruang = 1 Lembar A4 Portrait */}
            {!loading && visiblePlans.length > 0 && (
                <div className="max-w-6xl mx-auto mt-6 print:mt-0 print:max-w-none print:w-full space-y-8 print:space-y-0">
                    <style dangerouslySetInnerHTML={{
                        __html: `
                        @media print {
                            @page { size: A4 portrait; margin: 8mm; }
                            html, body {
                                background: white !important;
                                color: black !important;
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                                margin: 0 !important;
                                padding: 0 !important;
                            }
                            .seat-plan-sheet {
                                break-inside: avoid !important;
                                page-break-inside: avoid !important;
                                background: white !important;
                                border: 1px solid #d1d5db !important;
                                border-radius: 6px !important;
                                box-shadow: none !important;
                                margin: 0 !important;
                                padding: 0 !important;
                                max-height: 280mm !important;
                                overflow: hidden !important;
                            }
                            .seat-plan-sheet:not(:last-child) {
                                page-break-after: always !important;
                                break-after: page !important;
                            }
                            .print-text { color: black !important; }
                            .print-muted { color: #374151 !important; }
                        }
                    `}} />

                    {visiblePlans.map((currentPlan) => {
                        const sortedSeats = [...currentPlan.seats].sort((a, b) =>
                            a.seatRow !== b.seatRow ? a.seatRow - b.seatRow : a.seatCol - b.seatCol
                        );
                        return (
                            <div
                                key={currentPlan.room.id}
                                className="seat-plan-sheet card-glass overflow-hidden"
                            >
                                {/* Header */}
                                <div className="px-5 py-4 print:px-3 print:py-2 border-b border-[var(--border)] print:border-gray-300 flex items-center justify-between bg-slate-50 dark:bg-transparent print:bg-white">
                                    <div>
                                        <h2 className="text-base print:text-sm font-bold text-[var(--text-main)] print-text leading-tight">
                                            DENAH KURSI — {currentPlan.room.name}
                                        </h2>
                                        <p className="text-xs print:text-[10px] text-[var(--text-muted)] print-muted mt-0.5">
                                            {activeConfigObj ? `${activeConfigObj.name} · ` : ""}
                                            {currentPlan.room.code} · Kapasitas: {currentPlan.room.capacity} · Terisi: {currentPlan.seats.length} siswa
                                        </p>
                                    </div>
                                    <div className="px-3 py-1.5 print:px-2 print:py-1 bg-white dark:bg-[var(--bg-surface-hover)] border border-[var(--border)] print:border-gray-400 rounded text-xs print:text-[10px] text-[var(--text-main)] dark:text-[var(--text-muted)] font-semibold shadow-sm print-text print:shadow-none">
                                        ← DEPAN / PAPAN TULIS
                                    </div>
                                </div>

                                {/* Desk layout */}
                                <div className="p-4 print:px-3 print:py-2 overflow-x-auto print:overflow-visible">
                                    {/* Column numbers */}
                                    <div className="flex items-center gap-3 print:gap-1.5 mb-3 print:mb-1 ml-6 print:ml-5">
                                        {Array.from({ length: 4 }, (_, i) => (
                                            <div key={i} className="flex-1 text-center text-xs print:text-[10px] text-[var(--text-muted)] font-semibold print-text">
                                                Meja {i + 1}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-3 print:space-y-1.5">
                                        {buildDeskRows(currentPlan.seats).rows.map(({ rowLabel, desks }) => (
                                            <div key={rowLabel} className="flex items-stretch gap-3 print:gap-1.5">
                                                {/* Row label */}
                                                <div className="flex items-center justify-center w-6 print:w-5 text-xs print:text-[10px] font-mono text-[var(--text-main)] font-semibold flex-shrink-0 print-text">
                                                    {rowLabel}
                                                </div>
                                                {/* Desks */}
                                                {desks.map(({ isDouble, left, right, single, deskNo }) => (
                                                    <div
                                                        key={deskNo}
                                                        className="flex-1 flex gap-1.5 print:gap-1 bg-slate-50 dark:bg-[var(--bg-surface-hover)] print:bg-gray-50 border border-[var(--border)] print:border-gray-400 rounded-lg print:rounded p-2 print:p-1 min-w-0"
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
                                    <p className="text-center text-xs print:text-[9px] text-[var(--text-main)] font-semibold mt-5 print:mt-2 tracking-widest print-text">
                                        — BELAKANG —
                                    </p>
                                </div>

                                {/* Roster (compact 2-column grid in print so 32-40 students fit easily on 1 A4 page) */}
                                {showRoster && (
                                    <div className="border-t border-[var(--border)] print:border-gray-300 p-4 print:px-3 print:py-2 mt-2 print:mt-0 bg-slate-50 dark:bg-[var(--bg-surface-hover)] print:bg-white">
                                        <p className="text-xs print:text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2.5 print:mb-1 print-text">
                                            Daftar Peserta — {currentPlan.room.name} ({currentPlan.seats.length} Siswa)
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-8 print:gap-x-4 gap-y-0.5 print:gap-y-0">
                                            {sortedSeats.map((seat, idx) => (
                                                <div
                                                    key={seat.id}
                                                    className="flex items-center gap-2 print:gap-1.5 py-1.5 print:py-[2.5px] border-b border-[var(--border)] print:border-gray-200"
                                                >
                                                    <span className="text-xs print:text-[9px] text-[var(--text-muted)] print-muted w-6 print:w-5 text-right flex-shrink-0">
                                                        {idx + 1}.
                                                    </span>
                                                    <span className="text-xs print:text-[9px] font-mono text-[var(--text-muted)] print-text font-semibold w-7 print:w-6 flex-shrink-0">
                                                        {seat.seatLabel}
                                                    </span>
                                                    <span className="text-xs print:text-[9.5px] text-[var(--text-main)] font-semibold flex-1 truncate print-text">
                                                        {seat.student.name}
                                                    </span>
                                                    <span className="text-xs print:text-[9px] text-[var(--text-muted)] print-muted flex-shrink-0">
                                                        {seat.student.className}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </DashboardLayout>
    );
}
