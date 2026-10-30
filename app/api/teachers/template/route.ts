import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-utils";

export async function GET() {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;

    // Create an Excel template with headers for teacher data import
    const { utils, write } = await import("xlsx");

    // Sample/example rows to guide the user
    const rows = [
        {
            NIP: "197701010001001",
            "Kode Guru": "G01",
            Nama: "Budi Santoso, S.Pd",
            "Jenis Kelamin (MALE/FEMALE)": "MALE",
            "Mata Pelajaran": "Matematika",
            "No. HP": "081234567890",
            Email: "budi@sekolah.sch.id",
            Alamat: "Jl. Contoh No. 1",
        },
        {
            NIP: "198802020002002",
            "Kode Guru": "G02",
            Nama: "Siti Rahayu, S.Pd",
            "Jenis Kelamin (MALE/FEMALE)": "FEMALE",
            "Mata Pelajaran": "Bahasa Indonesia",
            "No. HP": "082345678901",
            Email: "",
            Alamat: "",
        },
    ];

    const ws = utils.json_to_sheet(rows);

    // Column widths
    ws["!cols"] = [
        { wch: 18 }, // NIP
        { wch: 15 }, // Kode Guru
        { wch: 28 }, // Nama
        { wch: 28 }, // Jenis Kelamin
        { wch: 22 }, // Mata Pelajaran
        { wch: 16 }, // No. HP
        { wch: 26 }, // Email
        { wch: 36 }, // Alamat
    ];

    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Data Guru");

    const buf = write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": "attachment; filename=\"template_data_guru.xlsx\"",
        },
    });
}
