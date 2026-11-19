/**
 * Tata letak arsitektural Denah Ruang Ujian MAN 3 Ngawi
 * Ditranskripsi 1:1 dari vektor asli "DenahRuang.pdf" (ukuran A4 Portrait: 595.32 x 841.92 pt).
 */

export const MAP_VIEWBOX = { width: 595.32, height: 841.92 } as const;

export type MapZone = "UTARA" | "SELATAN";

export type RoomSlot = {
    key: string;
    /** Nama kelas fisik pada DenahRuang.pdf (mis. "10-A", "12-IPS2") */
    pdfLabel: string;
    /** Baris teks asli pada DenahRuang.pdf */
    defaultLines: string[];
    zone: MapZone;
    x: number;
    y: number;
    w: number;
    h: number;
    vertical?: boolean;
    baseFill?: string;
};

export type ContextBlock = {
    key: string;
    lines: string[];
    x: number;
    y: number;
    w: number;
    h: number;
    fill?: string;
    innerFill?: string;
    innerInset?: number;
    vertical?: boolean;
    italic?: boolean;
    bold?: boolean;
    fontSize?: number;
    noStroke?: boolean;
    dashedTopBottom?: boolean;
    openSides?: Array<"top" | "right" | "bottom" | "left">;
};

export const GREEN_WALL_PATHS: string[] = [
    "M490.02 717.72 L126.72 718.17 L126.72 719.17 L490.02 718.72 Z M490.02 719.72 L126.72 720.17 L126.72 722.17 L490.02 721.72 Z M490.02 722.72 L126.72 723.17 L126.72 724.17 L490.02 723.72 Z",
    "M506.82 118.08 L506.52 352.18 L507.52 352.18 L507.82 118.08 Z M508.82 118.08 L508.52 352.18 L510.52 352.18 L510.82 118.08 Z M511.82 118.08 L511.52 352.18 L512.52 352.18 L512.82 118.08 Z",
    "M507.37 349.35 L487.22 379.90 L488.05 380.45 L508.20 349.90 Z M509.04 350.45 L488.89 381.00 L490.55 382.10 L510.70 351.55 Z M511.54 352.10 L491.39 382.65 L492.22 383.20 L512.37 352.65 Z",
    "M493.44 721.28 L493.44 402.48 L492.44 402.48 L492.44 721.28 Z M491.44 721.28 L491.44 402.48 L489.44 402.48 L489.44 721.28 Z M488.44 721.28 L488.44 402.48 L487.44 402.48 L487.44 721.28 Z",
    "M512.96 114.48 L155.51 115.08 L155.52 116.08 L512.97 115.48 Z M512.97 116.48 L155.52 117.08 L155.52 119.08 L512.97 118.48 Z M512.97 119.48 L155.52 120.08 L155.53 121.08 L512.97 120.48 Z",
    "M155.16 132.03 L89.91 153.23 L90.22 154.18 L155.47 132.98 Z M155.78 133.93 L90.53 155.13 L91.15 157.03 L156.40 135.83 Z M156.71 136.78 L91.46 157.98 L91.77 158.93 L157.02 137.73 Z",
    "M129.72 398.40 L129.72 722.15 L128.72 722.15 L128.72 398.40 Z M127.72 398.40 L127.72 722.15 L125.72 722.15 L125.72 398.40 Z M124.72 398.40 L124.72 722.15 L123.72 722.15 L123.72 398.40 Z",
    "M95.52 381.50 L95.52 156.00 L94.52 156.00 L94.52 381.50 Z M93.52 381.50 L93.52 156.00 L91.52 156.00 L91.52 381.50 Z M90.52 381.50 L90.52 156.00 L89.52 156.00 L89.52 381.50 Z",
    "M90.84 398.16 L128.59 398.16 L128.59 399.16 L90.84 399.16 Z M90.84 400.16 L128.59 400.16 L128.59 402.16 L90.84 402.16 Z M90.84 403.16 L128.59 403.16 L128.59 404.16 L90.84 404.16 Z",
    "M154.92 114.80 L150.67 134.20 L151.65 134.41 L155.90 115.01 Z M156.87 115.23 L152.62 134.63 L154.58 135.05 L158.83 115.65 Z M159.80 115.87 L155.55 135.27 L156.53 135.48 L160.78 116.08 Z"
];

export const DOOR_TICK_PATHS: string[] = [
    "M394.28 592.14 L388.44 597.44 L389.11 598.18 L394.95 592.88 Z M395.62 593.62 L389.79 598.92 L391.13 600.40 L396.96 595.10 Z M397.64 595.85 L391.80 601.14 L392.47 601.88 L398.31 596.59 Z",
    "M393.83 547.04 L387.99 552.34 L388.66 553.08 L394.50 547.78 Z M395.17 548.52 L389.34 553.82 L390.68 555.30 L396.51 550.01 Z M397.19 550.75 L391.35 556.04 L392.02 556.78 L397.86 551.49 Z",
    "M393.43 504.49 L387.59 509.79 L388.26 510.53 L394.10 505.23 Z M394.77 505.97 L388.94 511.27 L390.28 512.75 L396.11 507.45 Z M396.79 508.20 L390.95 513.49 L391.62 514.23 L397.46 508.94 Z",
    "M394.13 460.64 L388.29 465.94 L388.96 466.68 L394.80 461.38 Z M395.47 462.12 L389.64 467.42 L390.98 468.90 L396.81 463.61 Z M397.49 464.35 L391.65 469.64 L392.32 470.38 L398.16 465.09 Z",
    "M435.13 428.34 L429.29 433.64 L429.96 434.38 L435.80 429.08 Z M436.47 429.82 L430.64 435.12 L431.98 436.60 L437.81 431.31 Z M438.49 432.05 L432.65 437.34 L433.32 438.08 L439.16 432.79 Z",
    "M435.13 397.94 L429.29 403.24 L429.96 403.98 L435.80 398.68 Z M436.47 399.42 L430.64 404.72 L431.98 406.20 L437.81 400.91 Z M438.49 401.65 L432.65 406.94 L433.32 407.68 L439.16 402.39 Z",
    "M202.13 570.24 L196.29 575.54 L196.96 576.28 L202.80 570.98 Z M203.47 571.72 L197.64 577.02 L198.98 578.50 L204.81 573.20 Z M205.49 573.95 L199.65 579.24 L200.32 579.98 L206.16 574.69 Z",
    "M202.13 527.14 L196.29 532.44 L196.96 533.18 L202.80 527.88 Z M203.47 528.62 L197.64 533.92 L198.98 535.40 L204.81 530.10 Z M205.49 530.85 L199.65 536.14 L200.32 536.88 L206.16 531.59 Z",
    "M202.13 585.54 L196.29 590.84 L196.96 591.58 L202.80 586.28 Z M203.47 587.02 L197.64 592.32 L198.98 593.80 L204.81 588.50 Z M205.49 589.25 L199.65 594.54 L200.32 595.28 L206.16 589.99 Z",
    "M195.13 641.64 L189.29 646.94 L189.96 647.68 L195.80 642.38 Z M196.47 643.12 L190.64 648.42 L191.98 649.90 L197.81 644.60 Z M198.49 645.35 L192.65 650.64 L193.32 651.38 L199.16 646.09 Z",
    "M248.93 641.34 L243.09 646.64 L243.76 647.38 L249.60 642.08 Z M250.27 642.82 L244.44 648.12 L245.78 649.60 L251.61 644.30 Z M252.29 645.05 L246.45 650.34 L247.12 651.08 L252.96 645.79 Z",
    "M201.58 481.59 L195.74 486.89 L196.41 487.63 L202.25 482.33 Z M202.92 483.07 L197.09 488.37 L198.43 489.85 L204.26 484.56 Z M204.94 485.30 L199.10 490.59 L199.77 491.33 L205.61 486.04 Z",
    "M355.08 639.99 L349.24 645.29 L349.91 646.03 L355.75 640.73 Z M356.42 641.47 L350.59 646.77 L351.93 648.25 L357.76 642.95 Z M358.44 643.70 L352.60 648.99 L353.27 649.73 L359.11 644.44 Z",
    "M201.58 444.54 L195.74 449.84 L196.41 450.58 L202.25 445.28 Z M202.92 446.02 L197.09 451.32 L198.43 452.80 L204.26 447.51 Z M204.94 448.25 L199.10 453.54 L199.77 454.28 L205.61 448.99 Z",
    "M329.08 639.99 L323.24 645.29 L323.91 646.03 L329.75 640.73 Z M330.42 641.47 L324.59 646.77 L325.93 648.25 L331.76 642.95 Z M332.44 643.70 L326.60 648.99 L327.27 649.73 L333.11 644.44 Z",
    "M396.62 323.97 L388.24 322.05 L388.46 321.08 L396.85 322.99 Z M397.07 322.02 L388.68 320.10 L389.13 318.15 L397.52 320.07 Z M397.74 319.10 L389.35 317.18 L389.58 316.20 L397.96 318.12 Z",
    "M398.02 288.57 L389.64 286.65 L389.86 285.68 L398.25 287.59 Z M398.47 286.62 L390.08 284.70 L390.53 282.75 L398.92 284.67 Z M399.14 283.70 L390.75 281.78 L390.98 280.80 L399.36 282.72 Z",
    "M466.87 196.42 L458.49 194.50 L458.71 193.53 L467.10 195.44 Z M467.32 194.47 L458.93 192.55 L459.38 190.60 L467.77 192.52 Z M467.99 191.55 L459.60 189.63 L459.83 188.65 L468.21 190.57 Z",
    "M466.57 240.42 L458.19 238.50 L458.41 237.53 L466.80 239.44 Z M467.02 238.47 L458.63 236.55 L459.08 234.60 L467.47 236.52 Z M467.69 235.55 L459.30 233.63 L459.53 232.65 L467.91 234.57 Z",
    "M469.27 182.32 L461.55 177.49 L462.08 176.64 L469.80 181.47 Z M470.33 180.62 L462.61 175.79 L463.67 174.10 L471.39 178.93 Z M471.92 178.08 L464.20 173.25 L464.73 172.40 L472.45 177.23 Z",
    "M250.97 182.32 L243.25 177.49 L243.78 176.64 L251.50 181.47 Z M252.03 180.62 L244.31 175.79 L245.37 174.10 L253.09 178.93 Z M253.62 178.08 L245.90 173.25 L246.43 172.40 L254.15 177.23 Z",
    "M414.07 182.32 L406.35 177.49 L406.88 176.64 L414.60 181.47 Z M415.13 180.62 L407.41 175.79 L408.47 174.10 L416.19 178.93 Z M416.72 178.08 L409.00 173.25 L409.53 172.40 L417.25 177.23 Z",
    "M360.87 182.32 L353.15 177.49 L353.68 176.64 L361.40 181.47 Z M361.93 180.62 L354.21 175.79 L355.27 174.10 L362.99 178.93 Z M363.52 178.08 L355.80 173.25 L356.33 172.40 L364.05 177.23 Z",
    "M190.27 182.32 L182.55 177.49 L183.08 176.64 L190.80 181.47 Z M191.33 180.62 L183.61 175.79 L184.67 174.10 L192.39 178.93 Z M192.92 178.08 L185.20 173.25 L185.73 172.40 L193.45 177.23 Z"
];

export const NORTH_ARROW_PATH = "M498.54 535.36 L507.42 484.14 L516.30 535.36 L511.86 535.36 L511.86 690.06 L502.98 690.06 L502.98 535.36 Z";

export const MASJID_IMG = "data:image/png;base64,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";
export const NORTH_U_IMG = "data:image/png;base64,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";
export const CAR_IMG = "data:image/png;base64,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";

/**
 * 19 Slot Ruang Kelas Fisik sesuai posisi persis pada DenahRuang.pdf.
 */
export const ROOM_SLOTS: RoomSlot[] = [
    // === KOMPLEKS SELATAN (AREA DEPAN) ===
    { key: "s_10_a", pdfLabel: "10-A", defaultLines: ["RUANG", "10-A"], zone: "SELATAN", x: 392.52, y: 471.72, w: 54.12, h: 45.60 },
    { key: "s_11_b", pdfLabel: "11-B (Depan)", defaultLines: ["RUANG", "11-B"], zone: "SELATAN", x: 392.52, y: 517.32, w: 54.12, h: 43.08 },
    { key: "s_12_ips1", pdfLabel: "12-IPS1", defaultLines: ["RUANG", "12-IPS1"], zone: "SELATAN", x: 392.52, y: 560.40, w: 54.12, h: 42.96 },
    { key: "s_10_c", pdfLabel: "10-C", defaultLines: ["RUANG", "10-C"], zone: "SELATAN", x: 147.48, y: 457.56, w: 54.24, h: 41.04 },
    { key: "s_11_a", pdfLabel: "11-A", defaultLines: ["RUANG", "11-A"], zone: "SELATAN", x: 147.60, y: 498.12, w: 54.12, h: 42.00 },
    { key: "s_12_mipa1", pdfLabel: "12-MIPA1", defaultLines: ["RUANG", "12-", "MIPA1"], zone: "SELATAN", x: 147.48, y: 540.48, w: 54.24, h: 43.68 },

    // === KOMPLEKS UTARA (AREA BELAKANG) ===
    { key: "u_10_e", pdfLabel: "10-E", defaultLines: ["RUANG", "10-E"], zone: "UTARA", x: 392.40, y: 315.40, w: 58.80, h: 37.30 },
    { key: "u_11_e", pdfLabel: "11-E", defaultLines: ["RUANG", "11-E"], zone: "UTARA", x: 392.40, y: 278.80, w: 58.80, h: 36.20 },
    { key: "u_10_d", pdfLabel: "10-D", defaultLines: ["RUANG", "10-D"], zone: "UTARA", x: 462.20, y: 228.20, w: 41.30, h: 42.10 },
    { key: "u_10_f", pdfLabel: "10-F", defaultLines: ["RUANG", "10-F"], zone: "UTARA", x: 461.60, y: 185.30, w: 41.20, h: 43.00 },
    { key: "u_11_f", pdfLabel: "11-F", defaultLines: ["RUANG", "11-F"], zone: "UTARA", x: 422.50, y: 145.40, w: 54.00, h: 32.60 },
    { key: "u_11_d", pdfLabel: "11-D", defaultLines: ["RUANG", "11-D"], zone: "UTARA", x: 368.50, y: 145.40, w: 54.00, h: 32.60 },
    { key: "u_11_b", pdfLabel: "11-B (Utara)", defaultLines: ["RUANG", "11-B"], zone: "UTARA", x: 314.50, y: 145.40, w: 54.00, h: 32.60 },
    { key: "u_10_b", pdfLabel: "10-B", defaultLines: ["RUANG", "10-B"], zone: "UTARA", x: 234.10, y: 145.40, w: 63.00, h: 32.60 },
    { key: "u_12_ips2", pdfLabel: "12-IPS2", defaultLines: ["RUANG", "12-IPS2"], zone: "UTARA", x: 171.10, y: 145.40, w: 63.00, h: 32.60 },
    { key: "u_12_mipa3", pdfLabel: "12-MIPA3", defaultLines: ["12-MIPA3"], zone: "UTARA", x: 157.80, y: 191.60, w: 72.00, h: 27.00 },
    { key: "u_12_mipa2", pdfLabel: "12-MIPA2", defaultLines: ["12-MIPA2"], zone: "UTARA", x: 157.80, y: 218.60, w: 72.00, h: 27.20 },
    { key: "u_12_ips3", pdfLabel: "12-IPS3", defaultLines: ["12-IPS3"], zone: "UTARA", x: 157.80, y: 272.80, w: 72.00, h: 25.80 },
    { key: "u_12_keag", pdfLabel: "12-KEAG", defaultLines: ["12-KEAG"], zone: "UTARA", x: 98.40, y: 196.40, w: 36.60, h: 52.30, vertical: true, baseFill: "#ccf2cc" },
];

/**
 * Bangunan, fasilitas, lapangan, dan jalan di sekitar ruang ujian sesuai DenahRuang.pdf.
 */
export const CONTEXT_BLOCKS: ContextBlock[] = [
    // === KOMPLEKS UTARA ===
    { key: "parkir_utara", lines: ["Tempat Parkir Siswa"], x: 171.60, y: 125.80, w: 125.50, h: 17.00, bold: true, fontSize: 10 },
    { key: "kantin", lines: ["Kantin"], x: 314.40, y: 124.80, w: 96.50, h: 17.00, bold: true, fontSize: 10 },
    { key: "kmwc_utara", lines: ["Km/Wc"], x: 476.50, y: 145.40, w: 27.00, h: 32.60, vertical: true, fontSize: 7.5 },
    { key: "masjid_label", lines: ["Masjid"], x: 109.50, y: 181.20, w: 41.80, h: 9.40, noStroke: true, fill: "transparent", fontSize: 9 },
    { key: "ged_vokasi", lines: ["Ged. Vokasi"], x: 98.30, y: 248.80, w: 36.50, h: 60.40, fill: "#ccf2cc", vertical: true, fontSize: 8.5 },
    { key: "gudang_kiri", lines: ["Gudang"], x: 98.40, y: 309.10, w: 22.30, h: 41.90, fill: "#ccf2cc", vertical: true, fontSize: 8.5 },
    { key: "gudang_tengah", lines: ["GUDANG"], x: 158.00, y: 245.80, w: 72.00, h: 27.00, fontSize: 8.5 },
    { key: "r_bk", lines: ["R. BK"], x: 157.80, y: 298.60, w: 72.00, h: 27.00, fontSize: 9 },
    { key: "r_pert", lines: ["R. PERT."], x: 157.80, y: 326.00, w: 72.00, h: 25.80, italic: true, fontSize: 8.5 },
    { key: "lap_volly", lines: ["Lap. B. Volly"], x: 230.00, y: 191.60, w: 155.00, h: 66.10, fontSize: 11.5 },
    { key: "lap_basket", lines: ["Lap. Basket/Futsal"], x: 229.80, y: 257.60, w: 155.00, h: 94.20, fontSize: 11.5 },
    { key: "taman", lines: ["Taman"], x: 400.80, y: 197.30, w: 42.10, h: 26.00, fontSize: 8 },
    { key: "lab_ipa", lines: ["Lab.", "IPA"], x: 392.40, y: 235.20, w: 58.80, h: 26.00, fontSize: 8.5 },
    { key: "uks", lines: ["UKS"], x: 392.40, y: 261.20, w: 58.80, h: 17.00, fontSize: 9.5 },
    { key: "asrama", lines: ["ASRAMA"], x: 462.20, y: 270.40, w: 41.30, h: 83.80, vertical: true, fontSize: 8.5 },

    // === PEMBATAS TENGAH ===
    { key: "divider_tengah", lines: [], x: 147.50, y: 393.50, w: 337.30, h: 9.00, fill: "#c0c0c0", dashedTopBottom: true },

    // === KOMPLEKS SELATAN ===
    { key: "kopsis", lines: ["KOPSIS"], x: 147.50, y: 416.60, w: 54.20, h: 40.90, fontSize: 9 },
    { key: "panggung", lines: ["Panggung Pertunjukkan"], x: 214.10, y: 420.50, w: 160.90, h: 23.40, fontSize: 9.5 },
    { key: "lab_komputer", lines: ["Lab. Komputer", "R. Keterampilan"], x: 214.10, y: 447.00, w: 160.90, h: 47.50, fontSize: 10.5 },
    { key: "rumah_penjaga", lines: ["Rumah", "Penjaga"], x: 392.40, y: 401.20, w: 85.70, h: 31.80, fontSize: 9.5 },
    { key: "r_tata_boga", lines: ["R. TATA", "BOGA"], x: 392.40, y: 439.00, w: 54.00, h: 32.80, fontSize: 8 },
    { key: "parkir_timur", lines: ["Tempat Parkir Siswa"], x: 446.40, y: 439.00, w: 38.40, h: 240.40, vertical: true, fontSize: 10 },
    { key: "halaman_depan", lines: ["HALAMAN", "DEPAN"], x: 213.84, y: 503.52, w: 161.16, h: 130.44, fill: "#ffcc99", innerFill: "#c2d69b", innerInset: 3.5, fontSize: 12 },
    { key: "r_kamad", lines: ["Ruang", "KAMAD"], x: 147.60, y: 584.20, w: 54.00, h: 32.60, fontSize: 8.5 },
    { key: "kmwc_tu", lines: ["KM/WC", "TU"], x: 147.60, y: 616.80, w: 54.00, h: 28.90, fontSize: 8.5 },
    { key: "r_tu", lines: ["Ruang", "TU"], x: 147.60, y: 645.70, w: 54.00, h: 34.20, fontSize: 8.5 },
    { key: "r_ktu", lines: ["Ruang", "KTU"], x: 201.40, y: 645.70, w: 54.10, h: 34.20, fontSize: 8.5 },
    { key: "teras_tu", lines: [], x: 151.10, y: 679.90, w: 104.40, h: 9.60 },
    { key: "lobi", lines: ["LOBI"], x: 255.60, y: 645.70, w: 28.00, h: 34.20, vertical: true, bold: true, fontSize: 8, openSides: ["top", "right"] },
    { key: "r_waka", lines: ["R. WAKA"], x: 284.00, y: 645.70, w: 54.00, h: 34.20, fontSize: 8.5 },
    { key: "r_guru_1", lines: ["R GURU"], x: 338.30, y: 645.70, w: 54.10, h: 34.10, fontSize: 8.5 },
    { key: "r_guru_2", lines: ["R GURU"], x: 392.40, y: 645.50, w: 54.00, h: 34.30, fontSize: 8.5 },
    { key: "r_drumband", lines: ["Ruang", "DRUM", "BAND"], x: 392.50, y: 603.40, w: 54.10, h: 42.10, fontSize: 8 },
    { key: "kmwc_selatan", lines: ["KM/WC"], x: 446.40, y: 636.10, w: 24.50, h: 44.40, fill: "#ffffff", vertical: true, fontSize: 7.5 },
    { key: "tempat_parkir_depan", lines: ["Tempat Parkir"], x: 284.00, y: 680.00, w: 186.80, h: 16.80, fontSize: 9.5 },
    { key: "pos_jaga", lines: ["Pos", "Jaga"], x: 131.40, y: 698.90, w: 22.20, h: 16.80, fontSize: 6.5 },
    { key: "gerbang_kiri", lines: [], x: 172.80, y: 715.90, w: 54.00, h: 9.00, fill: "#ffffff" },
    { key: "gerbang_kanan", lines: [], x: 364.80, y: 715.20, w: 54.00, h: 9.00, fill: "#ffffff" },
];

export function normalizeRoomCode(value: string): string {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Menghasilkan pemetaan awal (default) slotKey -> roomId untuk daftar ruang dari database.
 * 1. Jika kode/nama ruang cocok dengan pdfLabel (mis. "10-A"), tempatkan di slot tersebut.
 * 2. Ruang sisanya ditempatkan berurutan sesuai urutan ROOM_SLOTS.
 */
export function buildDefaultSlotMap<T extends { id: string; code: string; name?: string }>(
    rooms: T[]
): Record<string, string> {
    const map: Record<string, string> = {};
    const remaining = [...rooms];

    for (const slot of ROOM_SLOTS) {
        const target = normalizeRoomCode(slot.pdfLabel);
        const idx = remaining.findIndex(
            (r) =>
                normalizeRoomCode(r.code) === target ||
                (r.name && normalizeRoomCode(r.name) === target)
        );
        if (idx >= 0) {
            map[slot.key] = remaining[idx].id;
            remaining.splice(idx, 1);
        }
    }

    for (const slot of ROOM_SLOTS) {
        if (map[slot.key]) continue;
        const next = remaining.shift();
        if (!next) break;
        map[slot.key] = next.id;
    }

    return map;
}

/**
 * Menempatkan ruang ke tiap slot berdasarkan customSlotMap (jika ada) atau default map.
 */
export function placeRooms<T extends { id: string; code: string; name?: string }>(
    rooms: T[],
    customSlotMap?: Record<string, string> | null
): {
    slots: Array<RoomSlot & { room: T | null }>;
    unplaced: T[];
    effectiveMap: Record<string, string>;
} {
    const roomById = new Map(rooms.map((r) => [r.id, r]));
    const effectiveMap: Record<string, string> =
        customSlotMap && Object.keys(customSlotMap).length > 0
            ? { ...customSlotMap }
            : buildDefaultSlotMap(rooms);

    const usedRoomIds = new Set<string>();
    const slots = ROOM_SLOTS.map((slot) => {
        const roomId = effectiveMap[slot.key];
        const room = roomId && roomById.has(roomId) ? roomById.get(roomId)! : null;
        if (room) usedRoomIds.add(room.id);
        return { ...slot, room };
    });

    const unplaced = rooms.filter((r) => !usedRoomIds.has(r.id));
    return { slots, unplaced, effectiveMap };
}
