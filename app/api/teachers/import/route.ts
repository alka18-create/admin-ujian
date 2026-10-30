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

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2; // Excel row number (1-indexed + header)

            const nip = String(row["NIP"] || "").trim() || null;
            const code = String(row["Kode Guru"] || "").trim() || null;
            const name = String(row["Nama"] || "").trim();
            const genderRaw = String(row["Jenis Kelamin (MALE/FEMALE)"] || "").trim().toUpperCase();
            const subject = String(row["Mata Pelajaran"] || "").trim() || null;
            const phone = String(row["No. HP"] || "").trim() || null;
            const email = String(row["Email"] || "").trim() || null;
            const address = String(row["Alamat"] || "").trim() || null;

            // Validation
            if (!name) {
                errors.push(`Baris ${rowNum}: Nama wajib diisi`);
                skipped++;
                continue;
            }

            const gender = genderRaw === "MALE" || genderRaw === "FEMALE" ? genderRaw : null;
            if (!gender) {
                errors.push(`Baris ${rowNum}: Jenis Kelamin harus MALE atau FEMALE (ditemukan: "${genderRaw}")`);
                skipped++;
                continue;
            }

            // Check duplicate NIP
            if (nip) {
                const existing = await prisma.teacher.findUnique({ where: { nip } });
                if (existing) {
                    errors.push(`Baris ${rowNum}: NIP "${nip}" sudah digunakan oleh "${existing.name}", baris dilewati`);
                    skipped++;
                    continue;
                }
            }

            // Check duplicate Code
            if (code) {
                const existing = await prisma.teacher.findUnique({ where: { code } });
                if (existing) {
                    errors.push(`Baris ${rowNum}: Kode Guru "${code}" sudah digunakan oleh "${existing.name}", baris dilewati`);
                    skipped++;
                    continue;
                }
            }

            // Check duplicate email
            if (email) {
                const existing = await prisma.teacher.findFirst({ where: { email } });
                if (existing) {
                    errors.push(`Baris ${rowNum}: Email "${email}" sudah digunakan, baris dilewati`);
                    skipped++;
                    continue;
                }
            }

            await prisma.teacher.create({
                data: {
                    nip,
                    code,
                    name,
                    gender,
                    subject,
                    phone,
                    email,
                    address,
                },
            });
            created++;
        }

        return NextResponse.json({
            success: true,
            data: {
                created,
                skipped,
                errors: errors.slice(0, 20), // limit error messages
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
