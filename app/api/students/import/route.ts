import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

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
        const rows = utils.sheet_to_json<Record<string, string>>(sheet);

        if (!rows.length) {
            return NextResponse.json({ success: false, error: "File Excel kosong atau tidak ada data" }, { status: 400 });
        }

        let created = 0;
        let skipped = 0;
        const errors: string[] = [];
        const seenNis = new Set<string>();
        const seenNisn = new Set<string>();

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;

            const nis = String(row["NIS"] || "").trim();
            const nisn = String(row["NISN"] || "").trim();
            const name = String(row["Nama"] || "").trim();
            const genderRaw = String(row["Jenis Kelamin (L/P)"] || "").trim().toUpperCase();
            const className = String(row["Kelas"] || "").trim();
            const majorRaw = String(row["Jurusan (MIPA/IPS/KEAGAMAAN)"] || "").trim().toUpperCase();
            const phone = String(row["No. HP"] || "").trim() || null;

            // Validations
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

            // Map L/P to MALE/FEMALE
            const genderMap: Record<string, "MALE" | "FEMALE"> = { L: "MALE", P: "FEMALE" };
            const gender = genderMap[genderRaw] ?? null;
            if (!gender) {
                errors.push(`Baris ${rowNum}: Jenis Kelamin harus L atau P (ditemukan: "${genderRaw}")`);
                skipped++;
                continue;
            }

            // Validate major if provided
            const validMajors = ["MIPA", "IPS", "KEAGAMAAN"];
            const major = majorRaw && validMajors.includes(majorRaw) ? majorRaw : null;
            if (majorRaw && !major) {
                errors.push(`Baris ${rowNum}: Jurusan harus MIPA, IPS, atau KEAGAMAAN (ditemukan: "${majorRaw}")`);
                skipped++;
                continue;
            }

            // Check duplicate NIS within this file
            if (seenNis.has(nis)) {
                errors.push(`Baris ${rowNum}: NIS "${nis}" duplikat dalam file, baris dilewati`);
                skipped++;
                continue;
            }

            // Check duplicate NISN within this file
            if (seenNisn.has(nisn)) {
                errors.push(`Baris ${rowNum}: NISN "${nisn}" duplikat dalam file, baris dilewati`);
                skipped++;
                continue;
            }

            // Check duplicate NIS in database
            const existingNis = await prisma.student.findUnique({ where: { nis } });
            if (existingNis) {
                errors.push(`Baris ${rowNum}: NIS "${nis}" sudah digunakan oleh "${existingNis.name}", baris dilewati`);
                skipped++;
                continue;
            }

            // Check duplicate NISN in database
            const existing = await prisma.student.findFirst({ where: { nisn } });
            if (existing) {
                errors.push(`Baris ${rowNum}: NISN "${nisn}" sudah digunakan oleh "${existing.name}", baris dilewati`);
                skipped++;
                continue;
            }

            await prisma.student.create({
                data: {
                    nis,
                    nisn: nisn || null,
                    name,
                    gender,
                    className,
                    major,
                    phone,
                },
            });
            seenNis.add(nis);
            seenNisn.add(nisn);
            created++;
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
