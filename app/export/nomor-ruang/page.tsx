"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import type { RoomMapData, RoomMapRoom } from "@/features/room-map/roomMap.service";
import {
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Download,
    Hash,
    Loader2,
    Palette,
    Printer,
    RotateCcw,
    Settings2,
    Type,
} from "lucide-react";

type ExamConfig = {
    id: string;
    name: string;
    academicYear: string;
    semester: string;
    isActive: boolean;
};

type NumberFormat = "3digit" | "2digit" | "code";
type RoomScope = "active" | "all";

const COLOR_PRESETS: Array<{ name: string; hex: string }> = [
    { name: "Hijau (Default)", hex: "#6CD45A" },
    { name: "Biru Langit", hex: "#38BDF8" },
    { name: "Indigo", hex: "#6366F1" },
    { name: "Tosca", hex: "#14B8A6" },
    { name: "Kuning Cerah", hex: "#FACC15" },
    { name: "Oranye", hex: "#FB923C" },
    { name: "Merah Muda", hex: "#F472B6" },
    { name: "Merah", hex: "#EF4444" },
];

function formatRoomNumber(room: RoomMapRoom, index: number, format: NumberFormat): string {
    const numMatch = room.code.match(/(\d+)/) || room.name.match(/(\d+)/);
    const num = numMatch ? Number.parseInt(numMatch[1], 10) : index + 1;

    if (format === "code") return room.code.toUpperCase();
    if (format === "2digit") return String(num).padStart(2, "0");
    return String(num).padStart(3, "0");
}

function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function drawFittedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    centerX: number,
    y: number,
    maxWidth: number,
    initialFontSize: number,
    fontFamily: string,
    weight = "900"
) {
    let size = initialFontSize;
    ctx.font = `${weight} ${size}px ${fontFamily}`;
    while (ctx.measureText(text).width > maxWidth && size > 18) {
        size -= 2;
        ctx.font = `${weight} ${size}px ${fontFamily}`;
    }
    ctx.fillText(text, centerX, y);
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

export default function NomorRuangPage() {
    const [configs, setConfigs] = useState<ExamConfig[]>([]);
    const [selectedConfig, setSelectedConfig] = useState("");
    const [data, setData] = useState<RoomMapData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Pengaturan tampilan nomor ruang
    const [schoolTitle, setSchoolTitle] = useState("MAN 3 NGAWI");
    const [examTitle, setExamTitle] = useState("SUMATIF AKHIR SEMESTER");
    const [yearTitle, setYearTitle] = useState("TAHUN PELAJARAN 2026/2027");
    const [footerText, setFooterText] = useState("Harap Tenang Sedang ada Ujian di Dalam Kelas!");
    const [bgColor, setBgColor] = useState("#6CD45A");
    const [numberFormat, setNumberFormat] = useState<NumberFormat>("3digit");
    const [roomScope, setRoomScope] = useState<RoomScope>("active");
    const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>("ALL");

    // Skala ukuran font (dalam persen, 100 = default)
    const [headerFontScale, setHeaderFontScale] = useState(100);
    const [labelFontScale, setLabelFontScale] = useState(100);
    const [numberFontScale, setNumberFontScale] = useState(100);
    const [footerFontScale, setFooterFontScale] = useState(100);

    // Preview & export state
    const [previewIndex, setPreviewIndex] = useState(0);
    const [exporting, setExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState<{ done: number; total: number } | null>(null);
    const [logoUrl, setLogoUrl] = useState<string>("/api/school-identity/logo");

    useEffect(() => {
        fetch("/api/schedule")
            .then((r) => r.json())
            .then((json) => {
                if (!json.success) return;
                setConfigs(json.data);
                const active = json.data.find((c: ExamConfig) => c.isActive);
                setSelectedConfig(active?.id ?? json.data[0]?.id ?? "");
            })
            .catch(() => setError("Gagal memuat daftar konfigurasi ujian."));

        fetch("/api/school-identity")
            .then((r) => r.json())
            .then((json) => {
                if (json.success && json.data?.name) {
                    setSchoolTitle(String(json.data.name).toUpperCase());
                    if (json.data.updatedAt) {
                        setLogoUrl(`/api/school-identity/logo?v=${new Date(json.data.updatedAt).getTime()}`);
                    }
                }
            })
            .catch(() => {});
    }, []);

    const fetchRoomData = useCallback(async () => {
        if (!selectedConfig) return;
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/rooms/map?examConfigId=${selectedConfig}`);
            const json = await res.json();
            if (json.success) {
                const mapData = json.data as RoomMapData;
                setData(mapData);
                setExamTitle(mapData.configName.toUpperCase());
                setYearTitle(`TAHUN PELAJARAN ${mapData.academicYear}`);
                setSelectedRoomFilter("ALL");
                setPreviewIndex(0);
            } else {
                setError(json.error || "Gagal memuat data ruang ujian.");
            }
        } catch {
            setError("Gagal memuat data ruang ujian.");
        } finally {
            setLoading(false);
        }
    }, [selectedConfig]);

    useEffect(() => {
        setData(null);
        fetchRoomData();
    }, [fetchRoomData]);

    const roomsInScope = useMemo(() => {
        if (!data) return [];
        const base =
            roomScope === "active"
                ? data.rooms.filter((r) => r.status === "AKTIF")
                : data.rooms;
        return base.length > 0 ? base : data.rooms;
    }, [data, roomScope]);

    const roomsToPrint = useMemo(() => {
        if (selectedRoomFilter === "ALL") return roomsInScope;
        return roomsInScope.filter((r) => r.id === selectedRoomFilter);
    }, [roomsInScope, selectedRoomFilter]);

    useEffect(() => {
        if (previewIndex >= roomsToPrint.length) {
            setPreviewIndex(0);
        }
    }, [roomsToPrint.length, previewIndex]);

    const currentPreviewRoom = roomsToPrint[previewIndex] ?? null;

    const handleDownloadPdf = async () => {
        if (roomsToPrint.length === 0) return;
        setExporting(true);
        setExportProgress({ done: 0, total: roomsToPrint.length });

        try {
            const [jspdfMod, logoImg, studentImg] = await Promise.all([
                import("jspdf"),
                loadImage(logoUrl),
                loadImage("/images/student-exam.png"),
            ]);

            const jsPDF = jspdfMod.default;
            const pdf = new jsPDF({
                orientation: "landscape",
                unit: "mm",
                format: "a4",
                compress: true,
            });

            // Resolusi kanvas A4 Landscape (~200 DPI, tajam dan cepat)
            const W = 2338;
            const H = 1654;
            const canvas = document.createElement("canvas");
            canvas.width = W;
            canvas.height = H;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas tidak tersedia");

            const fontSans = '"Arial Rounded MT Bold", "Trebuchet MS", "Public Sans", Arial, sans-serif';
            const fontHeavy = '"Arial Black", "Public Sans", Impact, Arial, sans-serif';

            const marginX = Math.round(W * (16.44 / 841.89));
            const boxW = W - marginX * 2;
            const radius = 52;

            const topY = Math.round(H * (21.83 / 595.28));
            const topH = Math.round(H * (147.16 / 595.28));

            const midY = Math.round(H * (183.86 / 595.28));
            const midH = Math.round(H * (323.71 / 595.28));

            const botY = Math.round(H * (520.67 / 595.28));
            const botH = Math.round(H * (57.55 / 595.28));

            for (let i = 0; i < roomsToPrint.length; i++) {
                const room = roomsToPrint[i];
                const roomIndexInScope = roomsInScope.findIndex((r) => r.id === room.id);
                const numberText = formatRoomNumber(
                    room,
                    roomIndexInScope >= 0 ? roomIndexInScope : i,
                    numberFormat
                );

                // 1. Background penuh
                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, W, H);

                // 2. Tiga panel putih bersudut melengkung
                ctx.fillStyle = "#FFFFFF";
                drawRoundedRect(ctx, marginX, topY, boxW, topH, radius);
                ctx.fill();
                drawRoundedRect(ctx, marginX, midY, boxW, midH, radius);
                ctx.fill();
                drawRoundedRect(ctx, marginX, botY, boxW, botH, radius * 0.72);
                ctx.fill();

                // 3. Panel Atas: Logo + 3 baris header
                const logoBoxSize = Math.round(topH * 0.78);
                const logoX = marginX + 56;
                const logoY = topY + Math.round((topH - logoBoxSize) / 2);

                if (logoImg) {
                    const ratio = Math.min(logoBoxSize / logoImg.width, logoBoxSize / logoImg.height);
                    const dw = logoImg.width * ratio;
                    const dh = logoImg.height * ratio;
                    ctx.drawImage(
                        logoImg,
                        logoX + (logoBoxSize - dw) / 2,
                        logoY + (logoBoxSize - dh) / 2,
                        dw,
                        dh
                    );
                }

                const headerTextLeft = logoImg ? logoX + logoBoxSize + 36 : marginX + 60;
                const headerTextMaxW = marginX + boxW - headerTextLeft - 50;
                const headerCenterX = headerTextLeft + headerTextMaxW / 2;

                ctx.fillStyle = "#111111";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                const hScale = headerFontScale / 100;
                const lScale = labelFontScale / 100;
                const nScale = numberFontScale / 100;
                const fScale = footerFontScale / 100;

                drawFittedText(ctx, schoolTitle.trim() || "MAN 3 NGAWI", headerCenterX, topY + topH * 0.25, headerTextMaxW, Math.round(88 * hScale), fontHeavy, "900");
                drawFittedText(ctx, examTitle.trim() || "SUMATIF AKHIR SEMESTER", headerCenterX, topY + topH * 0.52, headerTextMaxW, Math.round(86 * hScale), fontHeavy, "900");
                drawFittedText(ctx, yearTitle.trim() || "TAHUN PELAJARAN", headerCenterX, topY + topH * 0.79, headerTextMaxW, Math.round(84 * hScale), fontHeavy, "900");

                // 4. Panel Tengah: Ilustrasi Siswi (kiri) + NOMOR RUANG UJIAN + Angka Besar (kanan)
                const illusMaxW = Math.round(boxW * 0.27);
                const illusMaxH = Math.round(midH * 0.86);
                const illusAreaX = marginX + 52;
                const illusAreaY = midY + Math.round((midH - illusMaxH) / 2);

                if (studentImg) {
                    const ratio = Math.min(illusMaxW / studentImg.width, illusMaxH / studentImg.height);
                    const dw = studentImg.width * ratio;
                    const dh = studentImg.height * ratio;
                    ctx.drawImage(
                        studentImg,
                        illusAreaX + (illusMaxW - dw) / 2,
                        illusAreaY + (illusMaxH - dh) / 2,
                        dw,
                        dh
                    );
                }

                const numAreaLeft = illusAreaX + illusMaxW + 24;
                const numAreaMaxW = marginX + boxW - numAreaLeft - 48;
                const numCenterX = numAreaLeft + numAreaMaxW / 2;

                ctx.fillStyle = "#111111";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                // Label "NOMOR RUANG UJIAN"
                drawFittedText(ctx, "NOMOR RUANG UJIAN", numCenterX, midY + midH * 0.16, numAreaMaxW, Math.round(106 * lScale), fontSans, "800");

                // Angka Nomor Ruang Raksasa
                drawFittedText(ctx, numberText, numCenterX, midY + midH * 0.62, numAreaMaxW, Math.round(640 * nScale), fontHeavy, "900");

                // 5. Panel Bawah: Footer Banner
                ctx.fillStyle = "#111111";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                drawFittedText(
                    ctx,
                    footerText.trim() || "Harap Tenang Sedang ada Ujian di Dalam Kelas!",
                    W / 2,
                    botY + botH / 2 + 2,
                    boxW - 100,
                    Math.round(72 * fScale),
                    fontHeavy,
                    "900"
                );

                if (i > 0) pdf.addPage("a4", "landscape");
                const imgData = canvas.toDataURL("image/jpeg", 0.92);
                pdf.addImage(imgData, "JPEG", 0, 0, 297, 210, undefined, "FAST");

                setExportProgress({ done: i + 1, total: roomsToPrint.length });
                // Beri napas event loop agar UI progress ter-update mulus
                await new Promise((r) => setTimeout(r, 0));
            }

            const safeExam = (examTitle || "Ujian").replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
            pdf.save(`Nomor_Ruang_${safeExam}.pdf`);
        } catch (err) {
            console.error(err);
            alert("Gagal membuat file PDF. Anda juga dapat menggunakan tombol Cetak.");
        } finally {
            setExporting(false);
            setExportProgress(null);
        }
    };

    const renderPosterCard = (room: RoomMapRoom, index: number, isPrint = false) => {
        const roomIndexInScope = roomsInScope.findIndex((r) => r.id === room.id);
        const numberText = formatRoomNumber(
            room,
            roomIndexInScope >= 0 ? roomIndexInScope : index,
            numberFormat
        );
        const hScale = headerFontScale / 100;
        const lScale = labelFontScale / 100;
        const nScale = numberFontScale / 100;
        const fScale = footerFontScale / 100;

        return (
            <div
                key={room.id}
                className={isPrint ? "nomor-ruang-sheet" : "w-full rounded-lg shadow-lg overflow-hidden border border-[var(--border)]"}
                style={{
                    backgroundColor: bgColor,
                    aspectRatio: "297 / 210",
                    padding: "2.6% 2%",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2.4%",
                    fontFamily: '"Arial Rounded MT Bold", "Public Sans", system-ui, sans-serif',
                }}
            >
                {/* Panel Atas: Logo & Header */}
                <div
                    style={{
                        backgroundColor: "#ffffff",
                        borderRadius: "2.2% / 9%",
                        height: "25.5%",
                        display: "flex",
                        alignItems: "center",
                        padding: "0 3%",
                        gap: "2.5%",
                    }}
                >
                    <div
                        style={{
                            height: "78%",
                            aspectRatio: "1 / 1",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                        }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={logoUrl}
                            alt="Logo Madrasah"
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                            onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                        />
                    </div>
                    <div
                        style={{
                            flex: 1,
                            textAlign: "center",
                            color: "#111111",
                            lineHeight: 1.15,
                            minWidth: 0,
                        }}
                    >
                        <div style={{ fontWeight: 900, fontSize: isPrint ? `${(24 * hScale).toFixed(1)}pt` : `calc(clamp(12px, 2.2vw, 24px) * ${hScale})`, letterSpacing: "0.02em" }}>
                            {schoolTitle || "MAN 3 NGAWI"}
                        </div>
                        <div style={{ fontWeight: 900, fontSize: isPrint ? `${(22 * hScale).toFixed(1)}pt` : `calc(clamp(11px, 2vw, 22px) * ${hScale})`, letterSpacing: "0.02em" }}>
                            {examTitle || "SUMATIF AKHIR SEMESTER"}
                        </div>
                        <div style={{ fontWeight: 900, fontSize: isPrint ? `${(21 * hScale).toFixed(1)}pt` : `calc(clamp(10px, 1.9vw, 21px) * ${hScale})`, letterSpacing: "0.02em" }}>
                            {yearTitle || "TAHUN PELAJARAN"}
                        </div>
                    </div>
                </div>

                {/* Panel Tengah: Ilustrasi + Nomor Ruang */}
                <div
                    style={{
                        backgroundColor: "#ffffff",
                        borderRadius: "2.2% / 4%",
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        padding: "2% 3.5%",
                        gap: "2%",
                        minHeight: 0,
                    }}
                >
                    <div
                        style={{
                            width: "29%",
                            height: "92%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                        }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/images/student-exam.png"
                            alt="Ilustrasi Siswa Ujian"
                            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                        />
                    </div>
                    <div
                        style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            textAlign: "center",
                            color: "#111111",
                            minWidth: 0,
                        }}
                    >
                        <div
                            style={{
                                fontWeight: 800,
                                fontSize: isPrint ? `${(28 * lScale).toFixed(1)}pt` : `calc(clamp(13px, 2.5vw, 28px) * ${lScale})`,
                                letterSpacing: "0.06em",
                                marginBottom: "1%",
                            }}
                        >
                            NOMOR RUANG UJIAN
                        </div>
                        <div
                            style={{
                                fontWeight: 900,
                                fontSize: isPrint ? `${(175 * nScale).toFixed(1)}pt` : `calc(clamp(58px, 14vw, 156px) * ${nScale})`,
                                lineHeight: 0.9,
                                letterSpacing: "-0.02em",
                                fontFamily: '"Arial Black", "Public Sans", Impact, sans-serif',
                            }}
                        >
                            {numberText}
                        </div>
                    </div>
                </div>

                {/* Panel Bawah: Footer */}
                <div
                    style={{
                        backgroundColor: "#ffffff",
                        borderRadius: "2% / 22%",
                        height: "10.5%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 3%",
                        color: "#111111",
                        fontWeight: 900,
                        fontSize: isPrint ? `${(19 * fScale).toFixed(1)}pt` : `calc(clamp(10px, 1.75vw, 19px) * ${fScale})`,
                        textAlign: "center",
                    }}
                >
                    {footerText || "Harap Tenang Sedang ada Ujian di Dalam Kelas!"}
                </div>
            </div>
        );
    };

    return (
        <DashboardLayout title="Nomor Ruang Ujian">
            <style
                dangerouslySetInnerHTML={{
                    __html: `
                    @media print {
                        @page { size: A4 landscape; margin: 0; }
                        html, body {
                            background: #ffffff !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        .no-print, nav, header, aside { display: none !important; }
                        .print-only-sheets { display: block !important; }
                        .nomor-ruang-sheet {
                            width: 297mm !important;
                            height: 210mm !important;
                            break-inside: avoid !important;
                            page-break-inside: avoid !important;
                        }
                        .nomor-ruang-sheet:not(:last-child) {
                            break-after: page !important;
                            page-break-after: always !important;
                        }
                    }
                `,
                }}
            />

            <div className="max-w-7xl mx-auto space-y-4 no-print">
                {/* Header */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Nomor Ruang Ujian</h1>
                        <p className="page-subtitle">
                            Buat dan export poster Nomor Ruang Ujian (A4 Landscape) sesuai jumlah ruang ujian
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => window.print()}
                            disabled={roomsToPrint.length === 0 || exporting}
                            className="btn-secondary"
                        >
                            <Printer size={16} /> Cetak
                        </button>
                        <button
                            onClick={handleDownloadPdf}
                            disabled={roomsToPrint.length === 0 || exporting}
                            className="btn-primary"
                        >
                            {exporting ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Download size={16} />
                            )}
                            {exportProgress
                                ? `Membuat PDF (${exportProgress.done}/${exportProgress.total})...`
                                : `Download PDF (${roomsToPrint.length} Ruang)`}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-[var(--danger-soft)] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] text-[var(--danger-text)] text-sm px-4 py-3 rounded-[var(--radius-sm)] flex items-center gap-2">
                        <AlertTriangle size={18} />
                        {error}
                    </div>
                )}

                {loading && (
                    <div className="flex items-center justify-center h-64 text-[var(--text-muted)]">
                        <Loader2 size={20} className="animate-spin mr-2" />
                        Memuat data ruang ujian...
                    </div>
                )}

                {!loading && data && (
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                        {/* PANEL PENGATURAN (KIRI) */}
                        <div className="xl:col-span-4 space-y-4">
                            <div className="card-glass p-4 space-y-3.5">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                                        <Settings2 size={16} className="text-[var(--primary-text)]" />
                                        Pengaturan Ujian & Ruang
                                    </h2>
                                    <span className="badge badge-indigo">
                                        {roomsToPrint.length} Halaman
                                    </span>
                                </div>

                                <div>
                                    <label className="form-label">Konfigurasi Ujian</label>
                                    <select
                                        className="form-select"
                                        value={selectedConfig}
                                        onChange={(e) => setSelectedConfig(e.target.value)}
                                    >
                                        {configs.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} {c.isActive ? "(Aktif)" : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="form-label">Sumber Ruang</label>
                                        <select
                                            className="form-select"
                                            value={roomScope}
                                            onChange={(e) => {
                                                setRoomScope(e.target.value as RoomScope);
                                                setSelectedRoomFilter("ALL");
                                            }}
                                        >
                                            <option value="active">
                                                Ruang Dipakai ({data.summary.aktif})
                                            </option>
                                            <option value="all">
                                                Semua Master ({data.summary.totalRuang})
                                            </option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="form-label">Format Nomor</label>
                                        <select
                                            className="form-select"
                                            value={numberFormat}
                                            onChange={(e) => setNumberFormat(e.target.value as NumberFormat)}
                                        >
                                            <option value="3digit">3 Digit (001)</option>
                                            <option value="2digit">2 Digit (01)</option>
                                            <option value="code">Kode Ruang (R01)</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="form-label">Filter Ruang yang Dicetak</label>
                                    <select
                                        className="form-select"
                                        value={selectedRoomFilter}
                                        onChange={(e) => setSelectedRoomFilter(e.target.value)}
                                    >
                                        <option value="ALL">Semua ({roomsInScope.length} ruang)</option>
                                        {roomsInScope.map((r, idx) => (
                                            <option key={r.id} value={r.id}>
                                                Nomor {formatRoomNumber(r, idx, numberFormat)} — {r.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Warna Background */}
                            <div className="card-glass p-4 space-y-3">
                                <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                                    <Palette size={16} className="text-[var(--primary-text)]" />
                                    Warna Background
                                </h2>
                                <div className="grid grid-cols-4 gap-2">
                                    {COLOR_PRESETS.map((preset) => {
                                        const isSelected = bgColor.toLowerCase() === preset.hex.toLowerCase();
                                        return (
                                            <button
                                                key={preset.hex}
                                                type="button"
                                                onClick={() => setBgColor(preset.hex)}
                                                className={`flex flex-col items-center gap-1 p-1.5 rounded-[var(--radius-sm)] border transition-all cursor-pointer ${
                                                    isSelected
                                                        ? "border-[var(--primary)] bg-[var(--primary-soft)] ring-1 ring-[var(--primary)]"
                                                        : "border-[var(--border)] hover:border-[var(--border-strong)]"
                                                }`}
                                                title={preset.name}
                                            >
                                                <span
                                                    className="w-7 h-7 rounded-full border border-black/15 shadow-inner"
                                                    style={{ backgroundColor: preset.hex }}
                                                />
                                                <span className="text-[10px] text-[var(--text-muted)] truncate w-full text-center">
                                                    {preset.name.split(" ")[0]}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex items-center gap-3 pt-1">
                                    <label className="text-xs font-medium text-[var(--text-muted)] shrink-0">
                                        Warna Kustom:
                                    </label>
                                    <input
                                        type="color"
                                        value={bgColor}
                                        onChange={(e) => setBgColor(e.target.value)}
                                        className="w-9 h-8 rounded border border-[var(--border)] cursor-pointer bg-transparent"
                                    />
                                    <input
                                        type="text"
                                        value={bgColor}
                                        onChange={(e) => setBgColor(e.target.value)}
                                        className="form-input text-xs font-mono uppercase"
                                        style={{ padding: "0.35rem 0.6rem" }}
                                        maxLength={7}
                                    />
                                </div>
                            </div>

                            {/* Kustomisasi Teks */}
                            <div className="card-glass p-4 space-y-2.5">
                                <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                                    <Hash size={16} className="text-[var(--primary-text)]" />
                                    Teks Poster (Bisa Diedit)
                                </h2>
                                <div>
                                    <label className="form-label text-xs">Nama Madrasah / Sekolah</label>
                                    <input
                                        type="text"
                                        className="form-input text-xs"
                                        value={schoolTitle}
                                        onChange={(e) => setSchoolTitle(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="form-label text-xs">Jenis Ujian</label>
                                    <input
                                        type="text"
                                        className="form-input text-xs"
                                        value={examTitle}
                                        onChange={(e) => setExamTitle(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="form-label text-xs">Tahun Pelajaran</label>
                                    <input
                                        type="text"
                                        className="form-input text-xs"
                                        value={yearTitle}
                                        onChange={(e) => setYearTitle(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="form-label text-xs">Pesan Footer</label>
                                    <input
                                        type="text"
                                        className="form-input text-xs"
                                        value={footerText}
                                        onChange={(e) => setFooterText(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Pengaturan Ukuran Font */}
                            <div className="card-glass p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                                        <Type size={16} className="text-[var(--primary-text)]" />
                                        Ukuran Font
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setHeaderFontScale(100);
                                            setLabelFontScale(100);
                                            setNumberFontScale(100);
                                            setFooterFontScale(100);
                                        }}
                                        className="btn-ghost py-1 px-2 text-xs"
                                        title="Kembalikan semua ukuran font ke 100%"
                                    >
                                        <RotateCcw size={12} /> Reset
                                    </button>
                                </div>

                                {[
                                    { label: "Judul Header (Sekolah / Ujian / Tahun)", value: headerFontScale, setValue: setHeaderFontScale, min: 60, max: 150 },
                                    { label: "Label \"NOMOR RUANG UJIAN\"", value: labelFontScale, setValue: setLabelFontScale, min: 60, max: 150 },
                                    { label: "Angka Nomor Ruang (001)", value: numberFontScale, setValue: setNumberFontScale, min: 60, max: 140 },
                                    { label: "Teks Footer", value: footerFontScale, setValue: setFooterFontScale, min: 60, max: 150 },
                                ].map((item) => (
                                    <div key={item.label} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-[var(--text-muted)] font-medium">{item.label}</span>
                                            <span className="font-mono font-bold text-[var(--text-main)]">{item.value}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={item.min}
                                            max={item.max}
                                            step={5}
                                            value={item.value}
                                            onChange={(e) => item.setValue(Number(e.target.value))}
                                            className="w-full accent-[var(--primary)] cursor-pointer"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* PREVIEW A4 LANDSCAPE (KANAN) */}
                        <div className="xl:col-span-8 space-y-3">
                            <div className="card-glass p-3 sm:p-4 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-bold text-[var(--text-main)]">
                                            Preview Nomor Ruang (A4 Landscape)
                                        </p>
                                        <p className="text-xs text-[var(--text-muted)]">
                                            {currentPreviewRoom
                                                ? `Menampilkan ${currentPreviewRoom.name} (${currentPreviewRoom.code}) — Halaman ${previewIndex + 1} dari ${roomsToPrint.length}`
                                                : "Tidak ada ruang tersedia"}
                                        </p>
                                    </div>
                                    {roomsToPrint.length > 1 && (
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setPreviewIndex((p) => Math.max(0, p - 1))}
                                                disabled={previewIndex === 0}
                                                className="btn-secondary py-1 px-2 text-xs"
                                            >
                                                <ChevronLeft size={14} /> Sebelumnya
                                            </button>
                                            <span className="text-xs font-semibold text-[var(--text-muted)] px-1.5">
                                                {previewIndex + 1} / {roomsToPrint.length}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setPreviewIndex((p) => Math.min(roomsToPrint.length - 1, p + 1))
                                                }
                                                disabled={previewIndex >= roomsToPrint.length - 1}
                                                className="btn-secondary py-1 px-2 text-xs"
                                            >
                                                Berikutnya <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {currentPreviewRoom ? (
                                    renderPosterCard(currentPreviewRoom, previewIndex, false)
                                ) : (
                                    <div className="p-12 text-center text-sm text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-lg">
                                        Belum ada ruang ujian yang dialokasikan untuk konfigurasi ini.
                                    </div>
                                )}

                                {/* Navigasi cepat nomor ruang */}
                                {roomsToPrint.length > 1 && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {roomsToPrint.map((room, idx) => {
                                            const numStr = formatRoomNumber(room, idx, numberFormat);
                                            const active = idx === previewIndex;
                                            return (
                                                <button
                                                    key={room.id}
                                                    type="button"
                                                    onClick={() => setPreviewIndex(idx)}
                                                    className={`px-2.5 py-1 rounded text-xs font-bold border transition-colors cursor-pointer ${
                                                        active
                                                            ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                                                            : "bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-main)]"
                                                    }`}
                                                >
                                                    {numStr}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Area Khusus Print Browser (semua ruang tercetak 1 ruang per halaman A4 Landscape) */}
            <div className="hidden print-only-sheets">
                {roomsToPrint.map((room, idx) => renderPosterCard(room, idx, true))}
            </div>
        </DashboardLayout>
    );
}

