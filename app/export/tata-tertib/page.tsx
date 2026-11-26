"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
    FileText,
    Loader2,
    Printer,
    RotateCcw,
    ScrollText,
    Settings2,
    ShieldCheck,
    Users,
} from "lucide-react";

type ExamConfig = {
    id: string;
    name: string;
    academicYear: string;
    semester: string;
    isActive: boolean;
};

type SchoolIdentity = {
    name: string;
    headmasterName: string | null;
    headmasterNip: string | null;
    signature: string | null;
    stamp: string | null;
};

type RuleTab = "pengawas" | "peserta";
type PrintScope = "current" | "both";

const STORAGE_KEY_PENGAWAS = "tata_tertib_pengawas_v1";
const STORAGE_KEY_PESERTA = "tata_tertib_peserta_v1";

const DEFAULT_PENGAWAS_RULES = `1. Pengawas ruang telah hadir di lokasi Madrasah pelaksana ujian minimal lima belas (15) menit sebelum ujian dimulai, untuk menerima penjelasan dan pengarahan dari Ketua Panitia.
2. Pengawas masuk ke dalam ruang ujian 10 menit sebelum waktu pelaksanaan.
3. Pengawas melakukan tugas pengawasan secara berurutan sebagai berikut:
   a. memeriksa kesiapan ruang ujian;
   b. mempersilakan peserta ujian untuk memasuki ruang dengan menunjukkan kartu peserta ujian dan meletakkan tas di bagian depan serta menempati tempat duduk sesuai dengan nomor yang telah ditentukan;
   c. memeriksa dan memastikan setiap peserta ujian hanya membawa HP atau laptop dan pulpen yang akan dipergunakan ke tempat duduk masing-masing;
   d. membacakan tata tertib ujian;
   e. mewajibkan peserta untuk mengisi username dan password dengan benar pada sistem ujian madrasah;
   f. memastikan peserta ujian telah mengisi identitas dengan benar sesuai dengan kartu peserta;
   g. memastikan peserta ujian menandatangani daftar hadir;
   h. mengingatkan peserta agar terlebih dahulu membaca petunjuk cara menjawab soal;
   i. mempersilakan peserta ujian untuk mulai mengerjakan soal;
   j. lima menit sebelum waktu ujian selesai, pengawas ruang ujian memberi peringatan kepada peserta ujian bahwa waktu tinggal lima menit;
   k. setelah waktu ujian selesai, pengawas ruang ujian mempersilakan peserta ujian untuk berhenti mengerjakan soal;
4. Selama ujian berlangsung, pengawas ruang ujian wajib:
   a. menjaga ketertiban dan ketenangan suasana sekitar ruang ujian;
   b. memberi peringatan dan sanksi kepada peserta yang melakukan kecurangan; serta
   c. melarang orang memasuki ruang ujian selain peserta ujian.
5. Pengawas ruang ujian dilarang merokok di ruang ujian, memberi isyarat, petunjuk, dan bantuan apapun kepada peserta berkaitan dengan jawaban dari soal ujian yang diujikan.`;

function buildDefaultPesertaRules(examLabel: string): string {
    const label = examLabel.trim() || "UJIAN MADRASAH";
    return `1. Peserta ${label} memasuki ruangan setelah tanda masuk dibunyikan, yakni 5 (lima) menit sebelum ${label} dimulai.
2. Peserta ${label} yang terlambat hadir hanya diperkenankan mengikuti ujian setelah mendapat izin dari Ketua Pelaksana ujian ${label} Tingkat Madrasah, tanpa diberi perpanjangan waktu.
3. Peserta ujian dilarang membawa lebih dari satu smartphone dan kalkulator atau alat bantu lainnya ke dalam ruang ujian.
4. Tas, buku, dan catatan dalam bentuk apapun dikumpulkan di dalam ruang kelas di bagian depan.
5. Peserta tes membawa alat tulis menulis berupa ballpoint dan kartu tanda peserta ujian.
6. Peserta tes mengisi daftar hadir dengan menggunakan pulpen.
7. Peserta ujian mengisi username dan password pada sistem ujian secara lengkap dan benar.
8. Peserta ujian yang memerlukan penjelasan tentang username dan password pada sistem ujian dapat bertanya kepada pengawas ruang ujian dengan cara mengacungkan tangan terlebih dahulu.
9. Peserta ujian diberi kesempatan untuk mengecek ketepatan naskah dan isi naskah serta mengecek kelengkapan soal.
10. Peserta ujian yang memperoleh naskah soal ujian yang tidak sesuai, segera konfirmasi dengan pengawas ruang ujian.
11. Peserta ujian mulai mengerjakan soal setelah ada tanda waktu mulai ujian.
12. Selama ujian berlangsung, peserta ujian hanya dapat meninggalkan ruangan dengan izin dan pengawasan dari pengawas ruang ujian.
13. Peserta ujian yang meninggalkan ruangan setelah membaca soal dan tidak kembali lagi sampai tanda selesai dibunyikan, dinyatakan telah selesai menempuh / mengikuti ujian pada mata pelajaran yang terkait.
14. Peserta ujian yang telah selesai mengerjakan soal sebelum waktu ujian berakhir diperbolehkan meninggalkan ruangan sebelum berakhirnya waktu ujian.
15. Peserta ujian berhenti mengerjakan soal setelah ada tanda berakhirnya waktu ujian.
16. Selama ujian berlangsung, peserta ujian dilarang:
   a. menanyakan jawaban soal kepada siapa pun;
   b. bekerjasama dengan peserta lain;
   c. memberi atau menerima bantuan dalam menjawab soal;
   d. memperlihatkan pekerjaan sendiri kepada peserta lain atau melihat pekerjaan peserta lain;
   e. membawa laptop/smartphone keluar dari ruang ujian;
   f. menggantikan atau digantikan oleh orang lain.`;
}

function formatIndonesianDate(date: Date): string {
    const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatNip(nip: string | null | undefined): string {
    if (!nip) return "";
    const trimmed = nip.trim();
    if (!trimmed) return "";
    if (/^nip\.?/i.test(trimmed)) return trimmed;
    const digits = trimmed.replace(/\s+/g, "");
    if (/^\d{18}$/.test(digits)) {
        return `NIP. ${digits.slice(0, 8)} ${digits.slice(8, 14)} ${digits.slice(14, 15)} ${digits.slice(15)}`;
    }
    return `NIP. ${trimmed}`;
}

type ParsedRuleLine = {
    type: "number" | "sub" | "plain";
    marker: string;
    text: string;
};

function parseRuleLines(raw: string): ParsedRuleLine[] {
    return raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
            const numMatch = line.match(/^(\d+\.?)\s+(.*)$/);
            if (numMatch) {
                const marker = numMatch[1].endsWith(".") ? numMatch[1] : `${numMatch[1]}.`;
                return { type: "number", marker, text: numMatch[2] };
            }
            const subMatch = line.match(/^([a-zA-Z]\.)\s+(.*)$/);
            if (subMatch) {
                return { type: "sub", marker: subMatch[1], text: subMatch[2] };
            }
            return { type: "plain", marker: "", text: line };
        });
}

export default function TataTertibPage() {
    const [configs, setConfigs] = useState<ExamConfig[]>([]);
    const [selectedConfig, setSelectedConfig] = useState("");
    const [school, setSchool] = useState<SchoolIdentity | null>(null);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<RuleTab>("pengawas");
    const [printScope, setPrintScope] = useState<PrintScope>("current");

    // Header (otomatis dari identitas & ujian aktif, bisa diedit)
    const [examHeader, setExamHeader] = useState("UJIAN MADRASAH");
    const [schoolHeader, setSchoolHeader] = useState("MADRASAH ALIYAH NEGERI 3 NGAWI");
    const [yearHeader, setYearHeader] = useState("TAHUN AJARAN 2025/2026");

    // Tempat & tanggal tanda tangan (bisa diedit)
    const [placeText, setPlaceText] = useState("Mantingan");
    const [dateText, setDateText] = useState(() => formatIndonesianDate(new Date()));
    const [showSignature, setShowSignature] = useState(true);
    const [showStamp, setShowStamp] = useState(true);

    // Isi tata tertib (bisa diedit)
    const [pengawasText, setPengawasText] = useState(DEFAULT_PENGAWAS_RULES);
    const [pesertaText, setPesertaText] = useState(() => buildDefaultPesertaRules("UJIAN MADRASAH"));
    const [hasCustomPeserta, setHasCustomPeserta] = useState(false);

    useEffect(() => {
        // Muat tersimpan dari localStorage jika ada
        try {
            const savedPengawas = localStorage.getItem(STORAGE_KEY_PENGAWAS);
            if (savedPengawas) setPengawasText(savedPengawas);
            const savedPeserta = localStorage.getItem(STORAGE_KEY_PESERTA);
            if (savedPeserta) {
                setPesertaText(savedPeserta);
                setHasCustomPeserta(true);
            }
        } catch {
            // abaikan
        }

        Promise.all([
            fetch("/api/schedule").then((r) => r.json()).catch(() => null),
            fetch("/api/school-identity").then((r) => r.json()).catch(() => null),
        ])
            .then(([schJson, idJson]) => {
                if (schJson?.success) {
                    const list = schJson.data as ExamConfig[];
                    setConfigs(list);
                    const active = list.find((c) => c.isActive) ?? list[0];
                    if (active) {
                        setSelectedConfig(active.id);
                    }
                }
                if (idJson?.success && idJson.data) {
                    const idData = idJson.data as SchoolIdentity;
                    setSchool(idData);
                    const rawName = (idData.name || "").trim();
                    if (rawName) {
                        setSchoolHeader(
                            rawName.toUpperCase() === "MAN 3 NGAWI"
                                ? "MADRASAH ALIYAH NEGERI 3 NGAWI"
                                : rawName.toUpperCase()
                        );
                    }
                }
            })
            .finally(() => setLoading(false));
    }, []);

    // Sinkronkan header ujian & tahun ajaran ketika konfigurasi ujian berubah
    useEffect(() => {
        const cfg = configs.find((c) => c.id === selectedConfig);
        if (!cfg) return;
        const examUpper = cfg.name.toUpperCase();
        setExamHeader(examUpper);
        setYearHeader(`TAHUN AJARAN ${cfg.academicYear}`);
        if (!hasCustomPeserta) {
            setPesertaText(buildDefaultPesertaRules(examUpper));
        }
    }, [selectedConfig, configs, hasCustomPeserta]);

    // Simpan otomatis editan ke localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY_PENGAWAS, pengawasText);
        } catch {
            // abaikan
        }
    }, [pengawasText]);

    useEffect(() => {
        if (!hasCustomPeserta) return;
        try {
            localStorage.setItem(STORAGE_KEY_PESERTA, pesertaText);
        } catch {
            // abaikan
        }
    }, [pesertaText, hasCustomPeserta]);

    const parsedPengawas = useMemo(() => parseRuleLines(pengawasText), [pengawasText]);
    const parsedPeserta = useMemo(() => parseRuleLines(pesertaText), [pesertaText]);

    const handleResetRules = () => {
        if (activeTab === "pengawas") {
            setPengawasText(DEFAULT_PENGAWAS_RULES);
            try {
                localStorage.removeItem(STORAGE_KEY_PENGAWAS);
            } catch {
                // abaikan
            }
        } else {
            setHasCustomPeserta(false);
            setPesertaText(buildDefaultPesertaRules(examHeader));
            try {
                localStorage.removeItem(STORAGE_KEY_PESERTA);
            } catch {
                // abaikan
            }
        }
    };

    const handlePrint = (scope: PrintScope) => {
        setPrintScope(scope);
        setTimeout(() => {
            window.print();
        }, 60);
    };

    const headmasterName = school?.headmasterName?.trim() || "Kepala Madrasah";
    const headmasterNipText = formatNip(school?.headmasterNip);

    const renderDocumentSheet = (kind: RuleTab, isPrint = false) => {
        const title = kind === "pengawas" ? "TATA TERTIB PENGAWAS" : "TATA TERTIB PESERTA";
        const lines = kind === "pengawas" ? parsedPengawas : parsedPeserta;
        const isPeserta = kind === "peserta";

        return (
            <div
                key={kind}
                className={
                    isPrint
                        ? "tata-tertib-sheet"
                        : "bg-white text-black shadow-lg rounded-md border border-[var(--border)] mx-auto w-full max-w-[740px]"
                }
                style={{
                    aspectRatio: isPrint ? undefined : "210 / 297",
                    padding: isPrint ? "7mm 10mm" : "5.5% 6.5%",
                    fontFamily: '"Times New Roman", Times, Georgia, serif',
                    color: "#000000",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {/* Bingkai garis hitam tebal sesuai PDF asli */}
                <div
                    style={{
                        border: "2.2px solid #000000",
                        flex: 1,
                        padding: isPrint
                            ? isPeserta
                                ? "6mm 8.5mm 5mm 8.5mm"
                                : "8.5mm 10mm 7.5mm 10mm"
                            : "4.2% 4.8% 3.8% 4.8%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-start",
                        boxSizing: "border-box",
                        overflow: "hidden",
                    }}
                >
                    <div>
                        {/* Header 4 Baris */}
                        <div
                            style={{
                                textAlign: "center",
                                marginBottom: isPrint ? (isPeserta ? "4mm" : "6mm") : "3.2%",
                                lineHeight: 1.22,
                            }}
                        >
                            <div
                                style={{
                                    fontWeight: 700,
                                    fontSize: isPrint ? "15.5pt" : "clamp(13px, 1.9vw, 18px)",
                                    letterSpacing: "0.02em",
                                }}
                            >
                                {title}
                            </div>
                            <div
                                style={{
                                    fontSize: isPrint ? "12pt" : "clamp(10.5px, 1.35vw, 14px)",
                                    marginTop: "2px",
                                }}
                            >
                                {examHeader}
                            </div>
                            <div
                                style={{
                                    fontSize: isPrint ? "12pt" : "clamp(10.5px, 1.35vw, 14px)",
                                }}
                            >
                                {schoolHeader}
                            </div>
                            <div
                                style={{
                                    fontSize: isPrint ? "12pt" : "clamp(10.5px, 1.35vw, 14px)",
                                }}
                            >
                                {yearHeader}
                            </div>
                        </div>

                        {/* Daftar Poin Tata Tertib */}
                        <div
                            style={{
                                fontSize: isPrint
                                    ? "10.5pt"
                                    : isPeserta
                                      ? "clamp(8.5px, 1.05vw, 11.5px)"
                                      : "clamp(9px, 1.1vw, 12px)",
                                lineHeight: isPrint ? (isPeserta ? 1.24 : 1.38) : isPeserta ? 1.34 : 1.4,
                                textAlign: "justify",
                            }}
                        >
                            {lines.map((item, idx) => {
                                if (item.type === "number") {
                                    return (
                                        <div
                                            key={idx}
                                            style={{
                                                display: "flex",
                                                alignItems: "flex-start",
                                                gap: isPrint ? "2.5mm" : "6px",
                                                marginBottom: isPrint ? (isPeserta ? "0.6mm" : "1.5mm") : "4px",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    width: isPrint ? "5.5mm" : "18px",
                                                    flexShrink: 0,
                                                    textAlign: "right",
                                                }}
                                            >
                                                {item.marker}
                                            </span>
                                            <span style={{ flex: 1 }}>{item.text}</span>
                                        </div>
                                    );
                                }
                                if (item.type === "sub") {
                                    return (
                                        <div
                                            key={idx}
                                            style={{
                                                display: "flex",
                                                alignItems: "flex-start",
                                                gap: isPrint ? "2mm" : "5px",
                                                paddingLeft: isPrint ? "8mm" : "24px",
                                                marginBottom: isPrint ? (isPeserta ? "0.35mm" : "1mm") : "2.5px",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    width: isPrint ? "4mm" : "14px",
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {item.marker}
                                            </span>
                                            <span style={{ flex: 1 }}>{item.text}</span>
                                        </div>
                                    );
                                }
                                return (
                                    <p
                                        key={idx}
                                        style={{
                                            marginBottom: isPrint ? "1mm" : "4px",
                                        }}
                                    >
                                        {item.text}
                                    </p>
                                );
                            })}
                        </div>
                    </div>

                    {/* Blok Tanda Tangan & Stempel Kepala Madrasah (Kanan Bawah) */}
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            marginTop: isPrint ? (isPeserta ? "4mm" : "10mm") : isPeserta ? "14px" : "24px",
                            paddingRight: isPrint ? "4mm" : "12px",
                            breakInside: "avoid",
                            pageBreakInside: "avoid",
                        }}
                    >
                        <div
                            style={{
                                position: "relative",
                                minWidth: isPrint ? "60mm" : "210px",
                                fontSize: isPrint ? "11pt" : "clamp(9.5px, 1.15vw, 12.5px)",
                                lineHeight: 1.3,
                            }}
                        >
                            {/* Stempel menimpa sisi kiri tanda tangan */}
                            {showStamp && school?.stamp && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={school.stamp}
                                    alt="Stempel Madrasah"
                                    style={{
                                        position: "absolute",
                                        left: isPrint ? "-16mm" : "-52px",
                                        top: isPrint ? "1mm" : "4px",
                                        width: isPrint ? "28mm" : "92px",
                                        height: isPrint ? "28mm" : "92px",
                                        objectFit: "contain",
                                        opacity: 0.88,
                                        pointerEvents: "none",
                                    }}
                                />
                            )}

                            <div>
                                {placeText.trim() ? `${placeText.trim()}, ` : ""}
                                {dateText.trim()}
                            </div>
                            <div>Kepala Madrasah</div>

                            {/* Ruang Tanda Tangan */}
                            <div
                                style={{
                                    height: isPrint ? "15mm" : "52px",
                                    display: "flex",
                                    alignItems: "center",
                                    position: "relative",
                                }}
                            >
                                {showSignature && school?.signature && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={school.signature}
                                        alt="Tanda Tangan Kepala Madrasah"
                                        style={{
                                            maxHeight: isPrint ? "17mm" : "58px",
                                            maxWidth: isPrint ? "44mm" : "140px",
                                            objectFit: "contain",
                                        }}
                                    />
                                )}
                            </div>

                            <div style={{ fontWeight: 700 }}>
                                {headmasterName}
                            </div>
                            {headmasterNipText && <div>{headmasterNipText}</div>}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const sheetsToPrint: RuleTab[] =
        printScope === "both" ? ["pengawas", "peserta"] : [activeTab];

    return (
        <DashboardLayout title="Tata Tertib Ujian">
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
                        .print-only-rules { display: block !important; }
                        .tata-tertib-sheet {
                            width: 210mm !important;
                            height: 288mm !important;
                            max-height: 288mm !important;
                            overflow: hidden !important;
                            background: #ffffff !important;
                            break-inside: avoid !important;
                            page-break-inside: avoid !important;
                        }
                        .tata-tertib-sheet:not(:last-child) {
                            break-after: page !important;
                            page-break-after: always !important;
                        }
                    }
                `,
                }}
            />

            <div className="max-w-7xl mx-auto space-y-4 no-print">
                {/* Header Halaman */}
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Tata Tertib Ujian</h1>
                        <p className="page-subtitle">
                            Edit dan cetak Tata Tertib Pengawas & Peserta Ujian (A4 Portrait) dengan tanda tangan Kepala Madrasah
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => handlePrint("both")}
                            disabled={loading}
                            className="btn-secondary"
                        >
                            <FileText size={16} /> Cetak Keduanya (2 Hal)
                        </button>
                        <button
                            onClick={() => handlePrint("current")}
                            disabled={loading}
                            className="btn-primary"
                        >
                            <Printer size={16} /> Cetak / PDF ({activeTab === "pengawas" ? "Pengawas" : "Peserta"})
                        </button>
                    </div>
                </div>

                {/* Tab Pengawas / Peserta */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab("pengawas")}
                        className={`px-4 py-2 rounded-[var(--radius-sm)] text-sm font-semibold flex items-center gap-2 border transition-colors cursor-pointer ${
                            activeTab === "pengawas"
                                ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                                : "bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-main)]"
                        }`}
                    >
                        <ShieldCheck size={16} /> Tata Tertib Pengawas
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("peserta")}
                        className={`px-4 py-2 rounded-[var(--radius-sm)] text-sm font-semibold flex items-center gap-2 border transition-colors cursor-pointer ${
                            activeTab === "peserta"
                                ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                                : "bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-main)]"
                        }`}
                    >
                        <Users size={16} /> Tata Tertib Peserta
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64 text-[var(--text-muted)]">
                        <Loader2 size={20} className="animate-spin mr-2" />
                        Memuat data ujian & identitas madrasah...
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                        {/* PANEL PENGATURAN & EDITOR (KIRI, SCROLLABLE) */}
                        <div className="lg:col-span-5 space-y-4 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto lg:pr-1.5">
                            {/* Header & Ujian */}
                            <div className="card-glass p-4 space-y-3">
                                <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                                    <Settings2 size={16} className="text-[var(--primary-text)]" />
                                    Header & Konfigurasi Ujian
                                </h2>

                                <div>
                                    <label className="form-label text-xs">Pilih Konfigurasi Ujian</label>
                                    <select
                                        className="form-select text-xs"
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

                                <div>
                                    <label className="form-label text-xs">Nama Ujian (Baris 2)</label>
                                    <input
                                        type="text"
                                        className="form-input text-xs"
                                        value={examHeader}
                                        onChange={(e) => setExamHeader(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="form-label text-xs">Nama Madrasah (Baris 3)</label>
                                    <input
                                        type="text"
                                        className="form-input text-xs"
                                        value={schoolHeader}
                                        onChange={(e) => setSchoolHeader(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="form-label text-xs">Tahun Ajaran (Baris 4)</label>
                                    <input
                                        type="text"
                                        className="form-input text-xs"
                                        value={yearHeader}
                                        onChange={(e) => setYearHeader(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Tempat, Tanggal & Tanda Tangan */}
                            <div className="card-glass p-4 space-y-3">
                                <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                                    <ScrollText size={16} className="text-[var(--primary-text)]" />
                                    Tempat, Tanggal & Pengesahan
                                </h2>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="form-label text-xs">Tempat</label>
                                        <input
                                            type="text"
                                            className="form-input text-xs"
                                            value={placeText}
                                            onChange={(e) => setPlaceText(e.target.value)}
                                            placeholder="Mantingan"
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label text-xs">Tanggal</label>
                                        <input
                                            type="text"
                                            className="form-input text-xs"
                                            value={dateText}
                                            onChange={(e) => setDateText(e.target.value)}
                                            placeholder="9 Februari 2026"
                                        />
                                    </div>
                                </div>

                                <div className="text-xs text-[var(--text-muted)] bg-[var(--bg-muted)] rounded-[var(--radius-sm)] px-3 py-2">
                                    <p className="font-semibold text-[var(--text-main)]">
                                        Kepala Madrasah: {headmasterName}
                                    </p>
                                    {headmasterNipText && <p>{headmasterNipText}</p>}
                                    <p className="text-[11px] mt-0.5">
                                        Diambil otomatis dari menu <em>Master Data → Identitas Madrasah</em>.
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-4 pt-1">
                                    <label className="flex items-center gap-2 text-xs text-[var(--text-main)] cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={showSignature}
                                            onChange={(e) => setShowSignature(e.target.checked)}
                                            className="rounded border-[var(--border-strong)]"
                                        />
                                        Tampilkan Tanda Tangan
                                    </label>
                                    <label className="flex items-center gap-2 text-xs text-[var(--text-main)] cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={showStamp}
                                            onChange={(e) => setShowStamp(e.target.checked)}
                                            className="rounded border-[var(--border-strong)]"
                                        />
                                        Tampilkan Stempel
                                    </label>
                                </div>
                            </div>

                            {/* Editor Isi Tata Tertib */}
                            <div className="card-glass p-4 space-y-2.5">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <h2 className="text-sm font-bold text-[var(--text-main)]">
                                            Edit Isi {activeTab === "pengawas" ? "Tata Tertib Pengawas" : "Tata Tertib Peserta"}
                                        </h2>
                                        <p className="text-[11px] text-[var(--text-muted)]">
                                            Awali baris dengan angka (<code>1.</code>) untuk poin utama, atau huruf (<code>a.</code>) untuk sub-poin.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleResetRules}
                                        className="btn-ghost py-1 px-2 text-xs shrink-0"
                                        title="Kembalikan teks ke bawaan PDF"
                                    >
                                        <RotateCcw size={13} /> Reset
                                    </button>
                                </div>

                                <textarea
                                    rows={16}
                                    className="form-input text-xs leading-relaxed font-mono"
                                    value={activeTab === "pengawas" ? pengawasText : pesertaText}
                                    onChange={(e) => {
                                        if (activeTab === "pengawas") {
                                            setPengawasText(e.target.value);
                                        } else {
                                            setHasCustomPeserta(true);
                                            setPesertaText(e.target.value);
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* PREVIEW A4 PORTRAIT (KANAN, TETAP DIAM / STICKY) */}
                        <div className="lg:col-span-7 lg:sticky lg:top-0">
                            {renderDocumentSheet(activeTab, false)}
                        </div>
                    </div>
                )}
            </div>

            {/* Area Khusus Cetak Browser (1 lembar A4 Portrait per tata tertib) */}
            <div className="hidden print-only-rules">
                {sheetsToPrint.map((kind) => renderDocumentSheet(kind, true))}
            </div>
        </DashboardLayout>
    );
}

