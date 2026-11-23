import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

type ValidStudentRow = {
    rowNum: number;
    nis: string;
    nisn: string;
    name: string;
    gender: "MALE" | "FEMALE";
    className: string;
    major: string | null;
    phone: string | null;
};

export async function POST(req: NextRequest) {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ success: false, error: "File tidak ditemukan" }, { status: 400 });
        }

        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!["xlsx", "xls"].includes(ext || "")) {
            return NextResponse.json({ success: false, error: "Format file harus .xlsx atau .xls" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const { read, utils } = await import("xlsx");
        const workbook = read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = utils.sheet_to_json<Record<string, unknown>>(sheet);

        if (!rows.length) {
            return NextResponse.json({ success: false, error: "File Excel kosong atau tidak ada data" }, { status: 400 });
        }

        let skipped = 0;
        const errors: string[] = [];
        const seenNis = new Set<string>();
        const seenNisn = new Set<string>();
        const candidates: ValidStudentRow[] = [];

        const genderMap: Record<string, "MALE" | "FEMALE"> = {
            L: "MALE",
            P: "FEMALE",
            MALE: "MALE",
            FEMALE: "FEMALE",
            "LAKI-LAKI": "MALE",
            PEREMPUAN: "FEMALE",
        };
        const validMajors = ["MIPA", "IPS", "KEAGAMAAN"];

        // Tahap 1: Validasi seluruh baris di memori (tanpa query DB per baris)
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;

            const nis = String(row["NIS"] ?? "").trim();
            const nisn = String(row["NISN"] ?? "").trim();
            const name = String(row["Nama"] ?? "").trim();
            const genderRaw = String(row["Jenis Kelamin (L/P)"] ?? "").trim().toUpperCase();
            const className = String(row["Kelas"] ?? "").trim();
            const majorRaw = String(row["Jurusan (MIPA/IPS/KEAGAMAAN)"] ?? "").trim().toUpperCase();
            const phone = String(row["No. HP"] ?? "").trim() || null;

            // Lewati baris yang benar-benar kosong
            if (!nis && !nisn && !name && !className && !genderRaw) {
                continue;
            }

            if (!nis) {
                errors.push(`Baris ${rowNum}: NIS wajib diisi`);
                skipped++;
                continue;
            }
            if (!nisn) {
                errors.push(`Baris ${rowNum}: NISN wajib diisi`);
                skipped++;
                continue;
            }
            if (!name) {
                errors.push(`Baris ${rowNum}: Nama wajib diisi`);
                skipped++;
                continue;
            }
            if (!className) {
                errors.push(`Baris ${rowNum}: Kelas wajib diisi`);
                skipped++;
                continue;
            }

            const gender = genderMap[genderRaw] ?? null;
            if (!gender) {
                errors.push(`Baris ${rowNum}: Jenis Kelamin harus L atau P (ditemukan: "${genderRaw}")`);
                skipped++;
                continue;
            }

            const major = majorRaw && validMajors.includes(majorRaw) ? majorRaw : null;
            if (majorRaw && !major) {
                errors.push(`Baris ${rowNum}: Jurusan harus MIPA, IPS, atau KEAGAMAAN (ditemukan: "${majorRaw}")`);
                skipped++;
                continue;
            }

            if (seenNis.has(nis)) {
                errors.push(`Baris ${rowNum}: NIS "${nis}" duplikat dalam file, baris dilewati`);
                skipped++;
                continue;
            }

            if (seenNisn.has(nisn)) {
                errors.push(`Baris ${rowNum}: NISN "${nisn}" duplikat dalam file, baris dilewati`);
                skipped++;
                continue;
            }

            seenNis.add(nis);
            seenNisn.add(nisn);
            candidates.push({ rowNum, nis, nisn, name, gender, className, major, phone });
        }

        // Tahap 2: Cek duplikat NIS & NISN di database dalam 1 query batch
        const toInsert: Array<{
            nis: string;
            nisn: string | null;
            name: string;
            gender: string;
            className: string;
            major: string | null;
            phone: string | null;
        }> = [];

        if (candidates.length > 0) {
            const candidateNis = candidates.map((c) => c.nis);
            const candidateNisn = candidates.map((c) => c.nisn);

            const existingStudents = await prisma.student.findMany({
                where: {
                    OR: [
                        { nis: { in: candidateNis } },
                        { nisn: { in: candidateNisn } },
                    ],
                },
                select: { nis: true, nisn: true, name: true },
            });

            const existingByNis = new Map<string, string>();
            const existingByNisn = new Map<string, string>();
            for (const s of existingStudents) {
                existingByNis.set(s.nis, s.name);
                if (s.nisn) existingByNisn.set(s.nisn, s.name);
            }

            for (const item of candidates) {
                const dupNisName = existingByNis.get(item.nis);
                if (dupNisName) {
                    errors.push(`Baris ${item.rowNum}: NIS "${item.nis}" sudah digunakan oleh "${dupNisName}", baris dilewati`);
                    skipped++;
                    continue;
                }

                const dupNisnName = existingByNisn.get(item.nisn);
                if (dupNisnName) {
                    errors.push(`Baris ${item.rowNum}: NISN "${item.nisn}" sudah digunakan oleh "${dupNisnName}", baris dilewati`);
                    skipped++;
                    continue;
                }

                toInsert.push({
                    nis: item.nis,
                    nisn: item.nisn || null,
                    name: item.name,
                    gender: item.gender,
                    className: item.className,
                    major: item.major,
                    phone: item.phone,
                });
            }
        }

        // Tahap 3: Insert massal dalam batch (chunk per 500 baris)
        let created = 0;
        const BATCH_SIZE = 500;
        for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
            const chunk = toInsert.slice(i, i + BATCH_SIZE);
            const result = await prisma.student.createMany({
                data: chunk,
                skipDuplicates: true,
            });
            created += result.count;
        }

        return NextResponse.json({
            success: true,
            data: {
                created,
                skipped,
                errors: errors.slice(0, 20),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
