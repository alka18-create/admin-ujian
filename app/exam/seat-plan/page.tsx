"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Wand2, Loader2, Grid3X3 } from "lucide-react";

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
    MALE: "bg-blue-900/50 border-blue-700 text-blue-200",
    FEMALE: "bg-pink-900/50 border-pink-700 text-pink-200",
};

export default function SeatPlanPage() {
    const [configs, setConfigs] = useState<ExamConfig[]>([]);
    const [selectedConfig, setSelectedConfig] = useState("");
    const [deskType, setDeskType] = useState<"single" | "double">("double");
    const [roomPlans, setRoomPlans] = useState<RoomPlan[]>([]);
    const [generating, setGenerating] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [activeRoom, setActiveRoom] = useState<string>("");

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
            if (filled.length > 0) setActiveRoom(filled[0].room.id);
        }
        setLoading(false);
    }, [selectedConfig]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- clear stale plan before fetching the new config
        setRoomPlans([]);
        fetchSeatPlans();
    }, [fetchSeatPlans]);

    const handleGenerate = async () => {
        if (!selectedConfig) { setError("Pilih konfigurasi ujian"); return; }
        setError(""); setSuccess(""); setGenerating(true);
        const res = await fetch("/api/generate/seats", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ examConfigId: selectedConfig, deskType }),
        });
        const json = await res.json();
        setGenerating(false);
        if (json.success) {
            setSuccess(`Berhasil! ${json.data.total} kursi di-generate.`);
            fetchSeatPlans();
        } else {
            setError(json.error);
        }
    };

    const currentPlan = roomPlans.find((p) => p.room.id === activeRoom);

    const buildDeskRows = (seats: Seat[]) => {
        if (!seats.length) return { isDouble: true, rows: [] };
        const sorted = [...seats].sort((a, b) =>
            a.seatRow !== b.seatRow ? a.seatRow - b.seatRow : a.seatCol - b.seatCol
        );
        const maxRow = Math.max(...sorted.map((s) => s.seatRow));
        const maxCol = Math.max(...sorted.map((s) => s.seatCol));

        // If maxCol is <= 4, assume single desk layout. Otherwise double.
        const isDouble = maxCol > 4;
        const targetDesksPerRow = 4; // both single and double have 4 desks per row now

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
            <div className={`flex-1 rounded px-1.5 py-1 border text-center min-w-0 ${GENDER_BG[seat.student.gender] || "bg-[var(--bg-surface-hover)] border-gray-600 text-[var(--text-main)]"}`}>
                <p className="text-xs font-bold leading-none mb-0.5">{seat.seatLabel}</p>
                <p className="text-[var(--text-main)] font-medium leading-tight truncate" style={{ fontSize: "0.6rem" }}>
                    {seat.student.name.split(" ").slice(0, 2).join(" ")}
                </p>
                <p className="opacity-60 truncate" style={{ fontSize: "0.55rem" }}>{seat.student.className}</p>
            </div>
        ) : (
            <div className="flex-1 rounded border border-dashed border-[var(--border)] opacity-20 min-w-0 h-12" />
        );

    return (
        <DashboardLayout title="Denah Kursi">
            <div className="max-w-6xl mx-auto space-y-4">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Denah Kursi</h1>
                        <p className="page-subtitle">Pilih tipe meja lalu hasilkan denah kursi ruang ujian</p>
                    </div>
                    <button onClick={handleGenerate} disabled={generating || !selectedConfig} className="btn-success">
                        <Wand2 size={16} className={generating ? "animate-spin" : ""} />
                        {generating ? "Generating..." : "Generate Denah"}
                    </button>
                </div>

                <div className="card-glass p-4 space-y-4">
                    <div>
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
                    <div>
                        <label className="form-label">Tipe Meja</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="deskType" className="accent-blue-500" value="single" checked={deskType === "single"} onChange={() => setDeskType("single")} />
                                <span className="text-[var(--text-main)] text-sm">1 Meja 1 Siswa (4 kolom)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="deskType" className="accent-blue-500" value="double" checked={deskType === "double"} onChange={() => setDeskType("double")} />
                                <span className="text-[var(--text-main)] text-sm">1 Meja 2 Siswa (Beda Kelas)</span>
                            </label>
                        </div>
                    </div>
                </div>

                {error && <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-lg">{error}</div>}
                {success && <div className="bg-emerald-900/30 border border-emerald-700 text-emerald-300 text-sm px-4 py-3 rounded-lg">{success}</div>}

                {loading ? (
                    <div className="flex items-center justify-center h-48 text-[var(--text-muted)]">
                        <Loader2 size={20} className="animate-spin mr-2" />Memuat denah...
                    </div>
                ) : roomPlans.length === 0 ? (
                    <div className="card-glass p-12 text-center text-[var(--text-muted)]">
                        <Grid3X3 size={48} className="mx-auto mb-3 opacity-20" />
                        <p className="text-sm">Belum ada denah kursi.</p>
                        <p className="text-xs mt-1 text-[var(--text-muted)]">Klik &quot;Generate Denah&quot; untuk membuat denah otomatis.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        {/* Room selector */}
                        <div className="lg:col-span-1 space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">Pilih Ruang</p>
                            {roomPlans.map((plan) => (
                                <button
                                    key={plan.room.id}
                                    onClick={() => setActiveRoom(plan.room.id)}
                                    className={`w-full text-left p-3 rounded-lg border transition-all text-sm ${activeRoom === plan.room.id
                                        ? "border-blue-600 bg-blue-900/30 text-blue-200"
                                        : "border-[var(--border)] bg-[var(--bg-surface)]/30 text-[var(--text-muted)] hover:border-gray-600"
                                        }`}
                                >
                                    <p className="font-semibold">{plan.room.name}</p>
                                    <p className="text-xs opacity-70">{plan.room.code} · {plan.seats.length} siswa</p>
                                </button>
                            ))}
                            <div className="card-glass p-3 mt-4 space-y-2">
                                <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">Keterangan</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded border border-blue-700 bg-blue-900/40" />
                                    <span className="text-xs text-[var(--text-muted)]">Laki-laki</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded border border-pink-700 bg-pink-900/40" />
                                    <span className="text-xs text-[var(--text-muted)]">Perempuan</span>
                                </div>
                            </div>
                        </div>

                        {/* Desk grid */}
                        <div className="lg:col-span-3">
                            {currentPlan && (
                                <div className="card-glass overflow-hidden">
                                    {/* Header */}
                                    <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
                                        <div>
                                            <h2 className="text-base font-semibold text-[var(--text-main)]">{currentPlan.room.name}</h2>
                                            <p className="text-xs text-[var(--text-muted)]">
                                                {currentPlan.room.code} · Kapasitas: {currentPlan.room.capacity} · Terisi: {currentPlan.seats.length} siswa
                                            </p>
                                        </div>
                                        <div className="px-3 py-1.5 bg-[var(--bg-surface-hover)] border border-slate-600 rounded text-xs text-[var(--text-muted)] font-medium">
                                            ← DEPAN / PAPAN TULIS
                                        </div>
                                    </div>

                                    {/* Desk layout */}
                                    <div className="p-4 overflow-x-auto">
                                        {/* Column numbers */}
                                        <div className="flex items-center gap-3 mb-3 ml-6">
                                            {Array.from({ length: 4 }, (_, i) => (
                                                <div key={i} className="flex-1 text-center text-xs text-[var(--text-muted)] font-semibold">
                                                    Meja {i + 1}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="space-y-3">
                                            {buildDeskRows(currentPlan.seats).rows.map(({ rowLabel, desks }) => (
                                                <div key={rowLabel} className="flex items-stretch gap-3">
                                                    {/* Row label */}
                                                    <div className="flex items-center justify-center w-6 text-xs font-mono text-[var(--text-muted)] flex-shrink-0">
                                                        {rowLabel}
                                                    </div>
                                                    {/* Desks */}
                                                    {desks.map(({ isDouble, left, right, single, deskNo }) => (
                                                        <div
                                                            key={deskNo}
                                                            className="flex-1 flex gap-1 bg-[var(--bg-surface-hover)]/40 border border-[var(--border)]/50 rounded-lg p-1.5 min-w-0"
                                                            style={{ minWidth: 0 }}
                                                        >
                                                            {isDouble ? (
                                                                <>
                                                                    <SeatCard seat={left} />
                                                                    <div className="w-px bg-gray-700/60 flex-shrink-0" />
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
                                        <p className="text-center text-xs text-[var(--text-muted)] mt-4 tracking-widest">
                                            — BELAKANG —
                                        </p>
                                    </div>

                                    {/* Roster */}
                                    <div className="border-t border-[var(--border)] p-4">
                                        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">
                                            Daftar Peserta — {currentPlan.room.name}
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                            {currentPlan.seats
                                                .sort((a, b) => a.seatRow !== b.seatRow ? a.seatRow - b.seatRow : a.seatCol - b.seatCol)
                                                .map((seat, idx) => (
                                                    <div key={seat.id} className="flex items-center gap-2 py-1 border-b border-[var(--border)]/50">
                                                        <span className="text-xs text-[var(--text-muted)] w-6 text-right flex-shrink-0">{idx + 1}.</span>
                                                        <span className="text-xs font-mono text-[var(--text-muted)] w-7 flex-shrink-0">{seat.seatLabel}</span>
                                                        <span className="text-xs text-[var(--text-main)] flex-1 truncate">{seat.student.name}</span>
                                                        <span className="text-xs text-[var(--text-muted)] flex-shrink-0">{seat.student.className}</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
