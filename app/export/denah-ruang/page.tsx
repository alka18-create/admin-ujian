"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
    CAR_IMG,
    CONTEXT_BLOCKS,
    DOOR_TICK_PATHS,
    GREEN_WALL_PATHS,
    MAP_VIEWBOX,
    MASJID_IMG,
    NORTH_ARROW_PATH,
    NORTH_U_IMG,
    ROOM_SLOTS,
    buildDefaultSlotMap,
    placeRooms,
    type ContextBlock,
    type RoomSlot,
} from "@/features/room-map/buildingLayout";
import type { RoomMapData, RoomMapRoom } from "@/features/room-map/roomMap.service";
import {
    AlertTriangle,
    CheckCircle2,
    Download,
    Loader2,
    MapPin,
    Printer,
    RotateCcw,
    Settings2,
    Sparkles,
} from "lucide-react";

type ExamConfig = { id: string; name: string; academicYear: string; semester: string; isActive: boolean };
type LabelMode = "both" | "exam" | "pdf";

const STORAGE_PREFIX = "denah_ruang_man3_v2_";

function formatExamRoomUpper(room: RoomMapRoom): string {
    const cleanName = room.name.trim();
    if (/^ruang\s*/i.test(cleanName)) {
        return cleanName.toUpperCase();
    }
    return `RUANG ${room.code.toUpperCase()}`;
}

function formatExamRoomShort(room: RoomMapRoom): string {
    const m = room.name.match(/(\d+)/) || room.code.match(/(\d+)/);
    if (m) {
        return `R.${m[1].padStart(2, "0")}`;
    }
    return room.code.toUpperCase();
}

export default function DenahRuangPage() {
    const [configs, setConfigs] = useState<ExamConfig[]>([]);
    const [selectedConfig, setSelectedConfig] = useState("");
    const [data, setData] = useState<RoomMapData | null>(null);
    const [loading, setLoading] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);
    const [error, setError] = useState("");

    // Pengaturan tampilan denah
    const [labelMode, setLabelMode] = useState<LabelMode>("both");
    const [showStudentCount, setShowStudentCount] = useState(false);
    const [highlightExamRooms, setHighlightExamRooms] = useState(false);

    // Judul dokumen (3 baris seperti DenahRuang.pdf)
    const [titleLine1, setTitleLine1] = useState("DENAH RUANG STS & PTS SEMESTER GANJIL");
    const [titleLine2, setTitleLine2] = useState("MADRASAH ALIYAH NEGERI 3 NGAWI");
    const [titleLine3, setTitleLine3] = useState("TAHUN PELAJARAN 2025/2026");

    // Pemetaan slotKey -> roomId
    const [slotMap, setSlotMap] = useState<Record<string, string>>({});
    const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);

    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        fetch("/api/schedule")
            .then((r) => r.json())
            .then((json) => {
                if (!json.success) return;
                setConfigs(json.data);
                const active = json.data.find((c: ExamConfig) => c.isActive);
                setSelectedConfig(active?.id ?? json.data[0]?.id ?? "");
            })
            .catch(() => setError("Gagal memuat konfigurasi ujian."));
    }, []);

    const fetchMap = useCallback(async () => {
        if (!selectedConfig) return;
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/rooms/map?examConfigId=${selectedConfig}`);
            const json = await res.json();
            if (json.success) {
                const mapData = json.data as RoomMapData;
                setData(mapData);

                // Set default header dari ExamConfig & SchoolIdentity
                const cfgNameUpper = mapData.configName.toUpperCase();
                const semUpper = mapData.semester.toUpperCase();
                const hasSemesterWord = cfgNameUpper.includes("SEMESTER");
                setTitleLine1(
                    hasSemesterWord
                        ? `DENAH RUANG ${cfgNameUpper}`
                        : `DENAH RUANG ${cfgNameUpper} SEMESTER ${semUpper}`
                );
                setTitleLine2(mapData.schoolName || "MADRASAH ALIYAH NEGERI 3 NGAWI");
                setTitleLine3(`TAHUN PELAJARAN ${mapData.academicYear}`);

                // Muat pemetaan ruang dari localStorage atau gunakan default
                try {
                    const savedRaw = localStorage.getItem(`${STORAGE_PREFIX}${selectedConfig}`);
                    if (savedRaw) {
                        const parsed = JSON.parse(savedRaw);
                        if (parsed && typeof parsed === "object") {
                            if (parsed.slotMap) setSlotMap(parsed.slotMap);
                            if (parsed.labelMode) setLabelMode(parsed.labelMode);
                            if (typeof parsed.showStudentCount === "boolean") setShowStudentCount(parsed.showStudentCount);
                            if (typeof parsed.highlightExamRooms === "boolean") setHighlightExamRooms(parsed.highlightExamRooms);
                            if (parsed.titleLine1) setTitleLine1(parsed.titleLine1);
                            if (parsed.titleLine2) setTitleLine2(parsed.titleLine2);
                            if (parsed.titleLine3) setTitleLine3(parsed.titleLine3);
                            return;
                        }
                    }
                } catch {
                    // abaikan error localStorage
                }
                setSlotMap(buildDefaultSlotMap(mapData.rooms));
            } else {
                setError(json.error || "Gagal memuat denah ruang.");
            }
        } catch {
            setError("Gagal memuat denah ruang.");
        } finally {
            setLoading(false);
        }
    }, [selectedConfig]);

    useEffect(() => {
        setData(null);
        setSelectedSlotKey(null);
        fetchMap();
    }, [fetchMap]);

    // Simpan perubahan konfigurasi tampilan & pemetaan ke localStorage
    useEffect(() => {
        if (!selectedConfig || !data) return;
        try {
            localStorage.setItem(
                `${STORAGE_PREFIX}${selectedConfig}`,
                JSON.stringify({
                    slotMap,
                    labelMode,
                    showStudentCount,
                    highlightExamRooms,
                    titleLine1,
                    titleLine2,
                    titleLine3,
                })
            );
        } catch {
            // abaikan error localStorage
        }
    }, [selectedConfig, data, slotMap, labelMode, showStudentCount, highlightExamRooms, titleLine1, titleLine2, titleLine3]);

    const placed = useMemo(() => {
        if (!data) return null;
        return placeRooms(data.rooms, slotMap);
    }, [data, slotMap]);

    const handleAssignSlot = (slotKey: string, roomId: string) => {
        setSlotMap((prev) => {
            const next = { ...prev };
            // Jika roomId sudah dipakai di slot lain, kosongkan slot lama agar tidak ganda
            if (roomId) {
                for (const k of Object.keys(next)) {
                    if (next[k] === roomId) {
                        delete next[k];
                    }
                }
                next[slotKey] = roomId;
            } else {
                delete next[slotKey];
            }
            return next;
        });
    };

    const handleAutoAssignSequential = () => {
        if (!data) return;
        setSlotMap(buildDefaultSlotMap(data.rooms));
    };

    const handleClearAssignments = () => {
        setSlotMap({});
        setLabelMode("pdf");
    };

    const handleDownloadPdf = async () => {
        if (!svgRef.current) return;
        setExportingPdf(true);
        try {
            const svgEl = svgRef.current;
            const clone = svgEl.cloneNode(true) as SVGSVGElement;
            clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            clone.setAttribute("width", String(MAP_VIEWBOX.width));
            clone.setAttribute("height", String(MAP_VIEWBOX.height));

            // Hilangkan ring seleksi interaktif pada hasil PDF
            clone.querySelectorAll("[data-selected-ring]").forEach((el) => el.remove());

            const svgString = new XMLSerializer().serializeToString(clone);
            const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(svgBlob);

            const img = new Image();
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = (e) => reject(e);
                img.src = url;
            });

            // Render 3x scale (~220-300 DPI) untuk hasil cetak tajam
            const scale = 3;
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(MAP_VIEWBOX.width * scale);
            canvas.height = Math.round(MAP_VIEWBOX.height * scale);
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas context tidak tersedia");

            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);

            const imgData = canvas.toDataURL("image/png");
            const jspdfMod = await import("jspdf");
            const jsPDF = jspdfMod.default;
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
                compress: true,
            });

            pdf.addImage(imgData, "PNG", 0, 0, 210, 297, undefined, "FAST");
            const safeName = (data?.configName || "Denah_Ruang")
                .replace(/[^a-zA-Z0-9_-]+/g, "_")
                .replace(/^_+|_+$/g, "");
            pdf.save(`Denah_Ruang_${safeName}.pdf`);
        } catch (err) {
            console.error(err);
            alert("Gagal membuat file PDF. Anda juga dapat menggunakan tombol Cetak.");
        } finally {
            setExportingPdf(false);
        }
    };

    const selectedSlot = useMemo(
        () => placed?.slots.find((s) => s.key === selectedSlotKey) ?? null,
        [placed, selectedSlotKey]
    );

    const mappedCount = useMemo(
        () => placed?.slots.filter((s) => s.room != null).length ?? 0,
        [placed]
    );

    return (
        <DashboardLayout title="Denah Ruang Ujian">
            <style
                dangerouslySetInnerHTML={{
                    __html: `
                    @media print {
                        @page { size: A4 portrait; margin: 0; }
                        html, body {
                            background: #ffffff !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        .no-print, nav, header, aside { display: none !important; }
                        .print-page-wrapper {
                            margin: 0 !important;
                            padding: 0 !important;
                            box-shadow: none !important;
                            border: none !important;
                            width: 210mm !important;
                            height: 297mm !important;
                            max-width: none !important;
                        }
                        .print-selection-ring { display: none !important; }
                    }
                `,
                }}
            />

            <div className="max-w-7xl mx-auto space-y-4">
                {/* Header Halaman */}
                <div className="page-header no-print">
                    <div>
                        <h1 className="page-title">Denah Ruang Ujian</h1>
                        <p className="page-subtitle">
                            Denah lokasi gedung & ruang ujian sesuai format blanko MAN 3 Ngawi (A4 Portrait)
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => window.print()}
                            disabled={!data}
                            className="btn-secondary"
                        >
                            <Printer size={16} /> Cetak
                        </button>
                        <button
                            onClick={handleDownloadPdf}
                            disabled={!data || exportingPdf}
                            className="btn-primary"
                        >
                            {exportingPdf ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Download size={16} />
                            )}
                            Download PDF
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-[var(--danger-soft)] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] text-[var(--danger-text)] text-sm px-4 py-3 rounded-[var(--radius-sm)] flex items-center gap-2 no-print">
                        <AlertTriangle size={18} />
                        {error}
                    </div>
                )}

                {loading && (
                    <div className="flex items-center justify-center h-64 text-[var(--text-muted)] no-print">
                        <Loader2 size={20} className="animate-spin mr-2" />
                        Memuat denah ruang...
                    </div>
                )}

                {!loading && data && placed && (
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                        {/* PANEL PENGATURAN (KIRI / ATAS, TIDAK TERCETAK) */}
                        <div className="xl:col-span-5 space-y-4 no-print">
                            {/* Pilih Ujian & Mode Tampilan */}
                            <div className="card-glass p-4 space-y-3.5">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                                        <Settings2 size={16} className="text-[var(--primary-text)]" />
                                        Pengaturan Denah & Label
                                    </h2>
                                    <span className="badge badge-indigo">
                                        {mappedCount} / {data.rooms.length} Ruang Terpasang
                                    </span>
                                </div>

                                <div>
                                    <label className="form-label">Konfigurasi Ujian</label>
                                    <select
                                        className="form-select"
                                        value={selectedConfig}
                                        onChange={(e) => setSelectedConfig(e.target.value)}
                                    >
                                        {configs.map((cfg) => (
                                            <option key={cfg.id} value={cfg.id}>
                                                {cfg.name} {cfg.isActive ? "(Aktif)" : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="form-label">Tampilan Label Kotak Kelas</label>
                                    <select
                                        className="form-select"
                                        value={labelMode}
                                        onChange={(e) => setLabelMode(e.target.value as LabelMode)}
                                    >
                                        <option value="both">
                                            Ruang Ujian + Nama Kelas (mis. RUANG 01 / 10-A)
                                        </option>
                                        <option value="exam">
                                            Ruang Ujian Saja (mis. RUANG 01)
                                        </option>
                                        <option value="pdf">
                                            Nama Kelas Asli Sesuai PDF (mis. RUANG 10-A)
                                        </option>
                                    </select>
                                </div>

                                <div className="space-y-2 pt-1">
                                    <label className="flex items-center gap-2 text-xs text-[var(--text-main)] cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={showStudentCount}
                                            onChange={(e) => setShowStudentCount(e.target.checked)}
                                            className="rounded border-[var(--border-strong)]"
                                        />
                                        Tampilkan jumlah siswa di kotak ruang ujian
                                    </label>
                                    <label className="flex items-center gap-2 text-xs text-[var(--text-main)] cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={highlightExamRooms}
                                            onChange={(e) => setHighlightExamRooms(e.target.checked)}
                                            className="rounded border-[var(--border-strong)]"
                                        />
                                        Beri warna sorot hijau muda pada ruang yang dipakai ujian
                                    </label>
                                </div>

                                <div className="border-t border-[var(--border)] pt-3 space-y-2">
                                    <p className="text-xs font-semibold text-[var(--text-main)]">
                                        Judul Header Denah (Bisa Diedit)
                                    </p>
                                    <input
                                        type="text"
                                        className="form-input text-xs"
                                        value={titleLine1}
                                        onChange={(e) => setTitleLine1(e.target.value)}
                                        placeholder="Baris 1: DENAH RUANG ..."
                                    />
                                    <input
                                        type="text"
                                        className="form-input text-xs"
                                        value={titleLine2}
                                        onChange={(e) => setTitleLine2(e.target.value)}
                                        placeholder="Baris 2: MADRASAH ALIYAH NEGERI 3 NGAWI"
                                    />
                                    <input
                                        type="text"
                                        className="form-input text-xs"
                                        value={titleLine3}
                                        onChange={(e) => setTitleLine3(e.target.value)}
                                        placeholder="Baris 3: TAHUN PELAJARAN ..."
                                    />
                                </div>
                            </div>

                            {/* Penempatan Ruang Ujian ke Kotak Kelas */}
                            <div className="card-glass p-4 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                                            <MapPin size={16} className="text-[var(--primary-text)]" />
                                            Penempatan Ruang Ujian di Denah
                                        </h2>
                                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                                            Klik kotak ruang langsung pada gambar denah atau atur dari daftar di bawah.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={handleAutoAssignSequential}
                                            className="btn-secondary py-1 px-2.5 text-xs"
                                            title="Tempatkan Ruang 01, Ruang 02, dst. secara otomatis"
                                        >
                                            <Sparkles size={13} /> Isi Otomatis
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleClearAssignments}
                                            className="btn-ghost py-1 px-2 text-xs"
                                            title="Kosongkan penempatan dan tampilkan kelas asli sesuai PDF"
                                        >
                                            <RotateCcw size={13} /> Reset PDF
                                        </button>
                                    </div>
                                </div>

                                {selectedSlot && (
                                    <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--primary-soft)] border border-[color-mix(in_srgb,var(--primary)_30%,transparent)] space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-[var(--primary-text)]">
                                                Kotak Terpilih: Kelas {selectedSlot.pdfLabel}
                                            </span>
                                            <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">
                                                Area {selectedSlot.zone === "SELATAN" ? "Depan" : "Belakang"}
                                            </span>
                                        </div>
                                        <select
                                            className="form-select text-xs"
                                            value={slotMap[selectedSlot.key] || ""}
                                            onChange={(e) => handleAssignSlot(selectedSlot.key, e.target.value)}
                                        >
                                            <option value="">-- Tidak dipakai ujian (Tampilkan {selectedSlot.pdfLabel}) --</option>
                                            {data.rooms.map((r) => (
                                                <option key={r.id} value={r.id}>
                                                    {r.name} ({r.code}) — {r.studentCount}/{r.capacity} siswa
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2">
                                    {placed.slots.map((slot) => {
                                        const isSelected = slot.key === selectedSlotKey;
                                        return (
                                            <div
                                                key={slot.key}
                                                onClick={() => setSelectedSlotKey(slot.key)}
                                                className={`flex items-center gap-3 p-2.5 rounded-[var(--radius-sm)] border transition-colors cursor-pointer ${
                                                    isSelected
                                                        ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                                                        : "border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)]"
                                                }`}
                                            >
                                                <div className="w-[108px] shrink-0">
                                                    <p className="text-xs font-bold text-[var(--text-main)] leading-snug">
                                                        {slot.pdfLabel}
                                                    </p>
                                                    <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-muted)] text-[var(--text-muted)]">
                                                        {slot.zone === "SELATAN" ? "Depan" : "Belakang"}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <select
                                                        className="form-select"
                                                        style={{ padding: "0.375rem 0.625rem", fontSize: "0.75rem" }}
                                                        value={slotMap[slot.key] || ""}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => {
                                                            setSelectedSlotKey(slot.key);
                                                            handleAssignSlot(slot.key, e.target.value);
                                                        }}
                                                    >
                                                        <option value="">(Kelas {slot.pdfLabel})</option>
                                                        {data.rooms.map((r) => (
                                                            <option key={r.id} value={r.id}>
                                                                {r.name} ({r.code}) · {r.studentCount} siswa
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {placed.unplaced.length > 0 ? (
                                    <div className="text-xs text-[var(--warning-text)] bg-[var(--warning-soft)] px-3 py-2 rounded-[var(--radius-sm)]">
                                        <strong>Belum ditempatkan di denah:</strong>{" "}
                                        {placed.unplaced.map((r) => `${r.name} (${r.code})`).join(", ")}
                                    </div>
                                ) : (
                                    <div className="text-xs text-[var(--success-text)] bg-[var(--success-soft)] px-3 py-2 rounded-[var(--radius-sm)] flex items-center gap-1.5">
                                        <CheckCircle2 size={14} />
                                        Seluruh {data.rooms.length} ruang ujian sudah ditempatkan pada denah.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* LEMBAR DENAH A4 PORTRAIT (KANAN, 1:1 DENGAN DenahRuang.pdf) */}
                        <div className="xl:col-span-7 flex justify-center">
                            <div
                                className="print-page-wrapper bg-white border border-[var(--border)] shadow-lg rounded-md overflow-hidden w-full max-w-[720px]"
                                style={{ aspectRatio: `${MAP_VIEWBOX.width} / ${MAP_VIEWBOX.height}` }}
                            >
                                <svg
                                    ref={svgRef}
                                    viewBox={`0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
                                    className="w-full h-full block select-none"
                                    style={{
                                        backgroundColor: "#ffffff",
                                        fontFamily: '"Times New Roman", Times, Georgia, serif',
                                    }}
                                    role="img"
                                    aria-label="Denah Ruang Ujian MAN 3 Ngawi"
                                >
                                    {/* Latar putih kertas A4 */}
                                    <rect
                                        x={0}
                                        y={0}
                                        width={MAP_VIEWBOX.width}
                                        height={MAP_VIEWBOX.height}
                                        fill="#ffffff"
                                    />

                                    {/* 1. HEADER DOKUMEN (3 BARIS) */}
                                    <g textAnchor="middle" fill="#000000" fontWeight="bold">
                                        <text x={316} y={53} fontSize={14}>
                                            {titleLine1}
                                        </text>
                                        <text x={316} y={71.5} fontSize={14}>
                                            {titleLine2}
                                        </text>
                                        <text x={316} y={90} fontSize={14}>
                                            {titleLine3}
                                        </text>
                                    </g>

                                    {/* 2. TEMBOK PAGAR KELILING GARIS GANDA HIJAU */}
                                    <g fill="#339966">
                                        {GREEN_WALL_PATHS.map((d, idx) => (
                                            <path key={`wall-${idx}`} d={d} />
                                        ))}
                                    </g>

                                    {/* 3. JALAN RAYA DI BAGIAN BAWAH (Jl. Raya Solo No. 353) */}
                                    <g>
                                        <rect
                                            x={100.2}
                                            y={733.6}
                                            width={354.1}
                                            height={34.9}
                                            fill="#d8d8d8"
                                        />
                                        <line
                                            x1={98.28}
                                            y1={732.48}
                                            x2={462.33}
                                            y2={732.48}
                                            stroke="#555555"
                                            strokeWidth={0.8}
                                            strokeDasharray="3 2 1 2"
                                        />
                                        <line
                                            x1={96.36}
                                            y1={770.76}
                                            x2={460.41}
                                            y2={770.76}
                                            stroke="#555555"
                                            strokeWidth={0.8}
                                            strokeDasharray="3 2 1 2"
                                        />
                                        {/* Marka putih putus-putus tengah jalan */}
                                        {[
                                            100.2, 123.0, 145.8, 168.6, 191.3, 214.1, 236.8, 259.6,
                                            282.0, 304.7, 327.5, 350.3, 372.6, 395.4, 418.2, 439.9,
                                        ].map((rx, i) => (
                                            <rect
                                                key={`road-dash-${i}`}
                                                x={rx}
                                                y={749.8}
                                                width={20.5}
                                                height={3.6}
                                                fill="#ffffff"
                                            />
                                        ))}
                                        <text
                                            x={280.5}
                                            y={755.3}
                                            textAnchor="middle"
                                            fill="#000000"
                                            fontWeight="bold"
                                            fontSize={12}
                                        >
                                            Jl. Raya Solo No. 353
                                        </text>
                                    </g>

                                    {/* 4. BANGUNAN & AREA KONTEKS (NON-RUANG UJIAN) */}
                                    {CONTEXT_BLOCKS.map((block) => (
                                        <ContextBlockSvg key={block.key} block={block} />
                                    ))}

                                    {/* 5. 19 KOTAK RUANG KELAS FISIK */}
                                    {placed.slots.map((slot) => (
                                        <ClassroomSlotSvg
                                            key={slot.key}
                                            slot={slot}
                                            room={slot.room}
                                            labelMode={labelMode}
                                            showStudentCount={showStudentCount}
                                            highlightExamRooms={highlightExamRooms}
                                            selected={slot.key === selectedSlotKey}
                                            onSelect={() => setSelectedSlotKey(slot.key)}
                                        />
                                    ))}

                                    {/* 6. SIMBOL TANDA PINTU (///) */}
                                    <g fill="#000000" style={{ pointerEvents: "none" }}>
                                        {DOOR_TICK_PATHS.map((d, idx) => (
                                            <path key={`door-${idx}`} d={d} />
                                        ))}
                                    </g>

                                    {/* 7. PANAH ARAH UTARA & ILUSTRASI (MASJID, SIMBOL U, MOBIL) */}
                                    <path
                                        d={NORTH_ARROW_PATH}
                                        fill="#ffffff"
                                        stroke="#000000"
                                        strokeWidth={2.28}
                                    />
                                    <image
                                        href={NORTH_U_IMG}
                                        x={489.96}
                                        y={405.12}
                                        width={36.12}
                                        height={58.08}
                                    />
                                    <image
                                        href={MASJID_IMG}
                                        x={109.32}
                                        y={138.20}
                                        width={41.80}
                                        height={41.90}
                                    />
                                    <image
                                        href={CAR_IMG}
                                        x={463.80}
                                        y={735.50}
                                        width={62.40}
                                        height={33.00}
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

/* ------------------------------------------------------------------ */
/* Komponen SVG Bangunan Konteks                                       */
/* ------------------------------------------------------------------ */

function ContextBlockSvg({ block }: { block: ContextBlock }) {
    const cx = block.x + block.w / 2;
    const cy = block.y + block.h / 2;
    const fontSize = block.fontSize ?? 9;
    const lineHeight = fontSize * 1.18;

    return (
        <g>
            {/* Kotak utama */}
            {block.openSides ? (
                <>
                    <rect
                        x={block.x}
                        y={block.y}
                        width={block.w}
                        height={block.h}
                        fill={block.fill ?? "#ffffff"}
                        stroke="none"
                    />
                    {!block.openSides.includes("top") && (
                        <line x1={block.x} y1={block.y} x2={block.x + block.w} y2={block.y} stroke="#000" strokeWidth={0.75} />
                    )}
                    {!block.openSides.includes("right") && (
                        <line x1={block.x + block.w} y1={block.y} x2={block.x + block.w} y2={block.y + block.h} stroke="#000" strokeWidth={0.75} />
                    )}
                    {!block.openSides.includes("bottom") && (
                        <line x1={block.x} y1={block.y + block.h} x2={block.x + block.w} y2={block.y + block.h} stroke="#000" strokeWidth={0.75} />
                    )}
                    {!block.openSides.includes("left") && (
                        <line x1={block.x} y1={block.y} x2={block.x} y2={block.y + block.h} stroke="#000" strokeWidth={0.75} />
                    )}
                </>
            ) : block.dashedTopBottom ? (
                <>
                    <rect
                        x={block.x}
                        y={block.y}
                        width={block.w}
                        height={block.h}
                        fill={block.fill ?? "#c0c0c0"}
                        stroke="none"
                    />
                    <line
                        x1={block.x}
                        y1={block.y}
                        x2={block.x + block.w}
                        y2={block.y}
                        stroke="#555555"
                        strokeWidth={0.75}
                        strokeDasharray="3 2"
                    />
                    <line
                        x1={block.x}
                        y1={block.y + block.h}
                        x2={block.x + block.w}
                        y2={block.y + block.h}
                        stroke="#555555"
                        strokeWidth={0.75}
                        strokeDasharray="3 2"
                    />
                </>
            ) : (
                <rect
                    x={block.x}
                    y={block.y}
                    width={block.w}
                    height={block.h}
                    fill={block.fill ?? "#ffffff"}
                    stroke={block.noStroke ? "none" : "#000000"}
                    strokeWidth={block.noStroke ? 0 : 0.75}
                />
            )}

            {/* Lapisan dalam (khusus HALAMAN DEPAN) */}
            {block.innerFill && (
                <rect
                    x={block.x + (block.innerInset ?? 3)}
                    y={block.y + (block.innerInset ?? 3)}
                    width={block.w - (block.innerInset ?? 3) * 2}
                    height={block.h - (block.innerInset ?? 3) * 2}
                    fill={block.innerFill}
                    stroke="none"
                />
            )}

            {/* Teks label */}
            {block.lines.length > 0 && (
                <g
                    transform={block.vertical ? `rotate(-90 ${cx} ${cy})` : undefined}
                    textAnchor="middle"
                    fill="#000000"
                    fontSize={fontSize}
                    fontWeight={block.bold ? "bold" : "normal"}
                    fontStyle={block.italic ? "italic" : "normal"}
                >
                    {block.lines.map((line, i) => {
                        const offset = (i - (block.lines.length - 1) / 2) * lineHeight;
                        return (
                            <text
                                key={i}
                                x={cx}
                                y={cy + offset}
                                dominantBaseline="central"
                            >
                                {line}
                            </text>
                        );
                    })}
                </g>
            )}
        </g>
    );
}

/* ------------------------------------------------------------------ */
/* Komponen SVG Kotak Ruang Kelas                                      */
/* ------------------------------------------------------------------ */

function ClassroomSlotSvg({
    slot,
    room,
    labelMode,
    showStudentCount,
    highlightExamRooms,
    selected,
    onSelect,
}: {
    slot: RoomSlot;
    room: RoomMapRoom | null;
    labelMode: LabelMode;
    showStudentCount: boolean;
    highlightExamRooms: boolean;
    selected: boolean;
    onSelect: () => void;
}) {
    const cx = slot.x + slot.w / 2;
    const cy = slot.y + slot.h / 2;

    // Susun baris teks sesuai mode label
    let lines: Array<{ text: string; bold?: boolean; size?: number; muted?: boolean }> = [];

    if (labelMode === "pdf" || !room) {
        lines = slot.defaultLines.map((t) => ({
            text: t,
            bold: true,
            size: slot.vertical ? 8.5 : 8.5,
        }));
    } else if (labelMode === "exam") {
        if (slot.vertical) {
            lines = [{ text: formatExamRoomUpper(room), bold: true, size: 8 }];
        } else {
            const parts = formatExamRoomUpper(room).split(/\s+/);
            if (parts.length === 2) {
                lines = [
                    { text: parts[0], bold: true, size: 8.5 },
                    { text: parts[1], bold: true, size: 9 },
                ];
            } else {
                lines = [{ text: formatExamRoomUpper(room), bold: true, size: 8.5 }];
            }
        }
    } else {
        // mode "both": Ruang Ujian + Nama Kelas fisik
        if (slot.vertical) {
            lines = [
                { text: `${formatExamRoomShort(room)} (${slot.pdfLabel})`, bold: true, size: 7.5 },
            ];
        } else {
            lines = [
                { text: formatExamRoomUpper(room), bold: true, size: 8 },
                { text: `(${slot.pdfLabel})`, bold: false, size: 7, muted: true },
            ];
        }
    }

    if (room && showStudentCount && labelMode !== "pdf") {
        lines.push({
            text: `${room.studentCount} Siswa`,
            bold: false,
            size: 6.5,
            muted: true,
        });
    }

    const fill =
        highlightExamRooms && room
            ? "#dcfce7"
            : slot.baseFill ?? "#ffffff";

    const lineHeight = slot.vertical ? 8.5 : lines.length >= 3 ? 8.2 : 9.5;

    return (
        <g
            onClick={onSelect}
            style={{ cursor: "pointer" }}
            role="button"
            tabIndex={0}
            aria-label={`Slot kelas ${slot.pdfLabel}`}
        >
            <title>
                {room
                    ? `Kelas ${slot.pdfLabel} → ${room.name} (${room.code})\nPeserta: ${room.studentCount}/${room.capacity} siswa\nKlik untuk mengubah penempatan ruang`
                    : `Kelas ${slot.pdfLabel} (Tidak dipakai ruang ujian)\nKlik untuk menempatkan ruang ujian di sini`}
            </title>

            <rect
                x={slot.x}
                y={slot.y}
                width={slot.w}
                height={slot.h}
                fill={fill}
                stroke="#000000"
                strokeWidth={0.75}
            />

            {selected && (
                <rect
                    data-selected-ring="true"
                    className="print-selection-ring"
                    x={slot.x + 1}
                    y={slot.y + 1}
                    width={slot.w - 2}
                    height={slot.h - 2}
                    fill="none"
                    stroke="#5548e0"
                    strokeWidth={2}
                />
            )}

            <g
                transform={slot.vertical ? `rotate(-90 ${cx} ${cy})` : undefined}
                textAnchor="middle"
            >
                {lines.map((line, i) => {
                    const offset = (i - (lines.length - 1) / 2) * lineHeight;
                    return (
                        <text
                            key={i}
                            x={cx}
                            y={cy + offset}
                            dominantBaseline="central"
                            fill={line.muted ? "#333333" : "#000000"}
                            fontWeight={line.bold ? "bold" : "normal"}
                            fontSize={line.size ?? 8.5}
                        >
                            {line.text}
                        </text>
                    );
                })}
            </g>
        </g>
    );
}
