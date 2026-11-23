import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

type ValidTeacherRow = {
    rowNum: number;
    nip: string | null;
    code: string | null;
    name: string;
    gender: "MALE" | "FEMALE";
    subject: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
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
        const seenNip = new Set<string>();
        const seenCode = new Set<string>();
        const seenEmail = new Set<string>();
        const candidates: ValidTeacherRow[] = [];

        const genderMap: Record<string, "MALE" | "FEMALE"> = {
            MALE: "MALE",
            FEMALE: "FEMALE",
            L: "MALE",
            P: "FEMALE",
        };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2;

            const nip = String(row["NIP"] ?? "").trim() || null;
            const code = String(row["Kode Guru"] ?? "").trim() || null;
            const name = String(row["Nama"] ?? "").trim();
            const genderRaw = String(row["Jenis Kelamin (MALE/FEMALE)"] ?? "").trim().toUpperCase();
            const subject = String(row["Mata Pelajaran"] ?? "").trim() || null;
            const phone = String(row["No. HP"] ?? "").trim() || null;
            const email = String(row["Email"] ?? "").trim() || null;
            const address = String(row["Alamat"] ?? "").trim() || null;

            if (!nip && !code && !name && !genderRaw) {
                continue;
            }

            if (!name) {
                errors.push(`Baris ${rowNum}: Nama wajib diisi`);
                skipped++;
                continue;
            }

            const gender = genderMap[genderRaw] ?? null;
            if (!gender) {
                errors.push(`Baris ${rowNum}: Jenis Kelamin harus MALE atau FEMALE (ditemukan: "${genderRaw}")`);
                skipped++;
                continue;
            }

            if (nip && seenNip.has(nip)) {
                errors.push(`Baris ${rowNum}: NIP "${nip}" duplikat dalam file, baris dilewati`);
                skipped++;
                continue;
            }
            if (code && seenCode.has(code)) {
                errors.push(`Baris ${rowNum}: Kode Guru "${code}" duplikat dalam file, baris dilewati`);
                skipped++;
                continue;
            }
            if (email && seenEmail.has(email.toLowerCase())) {
                errors.push(`Baris ${rowNum}: Email "${email}" duplikat dalam file, baris dilewati`);
                skipped++;
                continue;
            }

            if (nip) seenNip.add(nip);
            if (code) seenCode.add(code);
            if (email) seenEmail.add(email.toLowerCase());
            candidates.push({ rowNum, nip, code, name, gender, subject, phone, email, address });
        }

        const toInsert: Array<Omit<ValidTeacherRow, "rowNum">> = [];

        if (candidates.length > 0) {
            const nips = candidates.map((c) => c.nip).filter((v): v is string => Boolean(v));
            const codes = candidates.map((c) => c.code).filter((v): v is string => Boolean(v));
            const emails = candidates.map((c) => c.email).filter((v): v is string => Boolean(v));

            const orFilters: Array<Record<string, unknown>> = [];
            if (nips.length > 0) orFilters.push({ nip: { in: nips } });
            if (codes.length > 0) orFilters.push({ code: { in: codes } });
            if (emails.length > 0) orFilters.push({ email: { in: emails } });

            const existingTeachers =
                orFilters.length > 0
                    ? await prisma.teacher.findMany({
                          where: { OR: orFilters },
                          select: { nip: true, code: true, email: true, name: true },
                      })
                    : [];

            const existingByNip = new Map<string, string>();
            const existingByCode = new Map<string, string>();
            const existingByEmail = new Map<string, string>();
            for (const t of existingTeachers) {
                if (t.nip) existingByNip.set(t.nip, t.name);
                if (t.code) existingByCode.set(t.code, t.name);
                if (t.email) existingByEmail.set(t.email.toLowerCase(), t.name);
            }

            for (const item of candidates) {
                if (item.nip && existingByNip.has(item.nip)) {
                    errors.push(`Baris ${item.rowNum}: NIP "${item.nip}" sudah digunakan oleh "${existingByNip.get(item.nip)}", baris dilewati`);
                    skipped++;
                    continue;
                }
                if (item.code && existingByCode.has(item.code)) {
                    errors.push(`Baris ${item.rowNum}: Kode Guru "${item.code}" sudah digunakan oleh "${existingByCode.get(item.code)}", baris dilewati`);
                    skipped++;
                    continue;
                }
                if (item.email && existingByEmail.has(item.email.toLowerCase())) {
                    errors.push(`Baris ${item.rowNum}: Email "${item.email}" sudah digunakan, baris dilewati`);
                    skipped++;
                    continue;
                }

                toInsert.push({
                    nip: item.nip,
                    code: item.code,
                    name: item.name,
                    gender: item.gender,
                    subject: item.subject,
                    phone: item.phone,
                    email: item.email,
                    address: item.address,
                });
            }
        }

        let created = 0;
        const BATCH_SIZE = 500;
        for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
            const chunk = toInsert.slice(i, i + BATCH_SIZE);
            const result = await prisma.teacher.createMany({
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
