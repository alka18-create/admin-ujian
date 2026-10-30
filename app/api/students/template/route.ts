import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-utils";

export async function GET() {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;

    const { utils, write } = await import("xlsx");

    const rows = [
        {
            NIS: "12345",
            NISN: "9876543210",
            Nama: "Budi Santoso",
            "Jenis Kelamin (L/P)": "L",
            Kelas: "XII IPA 1",
            "Jurusan (MIPA/IPS/KEAGAMAAN)": "MIPA",
            "No. HP": "081234567890",
        },
        {
            NIS: "12346",
            NISN: "9876543211",
            Nama: "Siti Rahayu",
            "Jenis Kelamin (L/P)": "P",
            Kelas: "XII IPS 2",
            "Jurusan (MIPA/IPS/KEAGAMAAN)": "IPS",
            "No. HP": "",
        },
    ];

    const ws = utils.json_to_sheet(rows);

    ws["!cols"] = [
        { wch: 12 }, // NIS
        { wch: 14 }, // NISN
        { wch: 28 }, // Nama
        { wch: 24 }, // Jenis Kelamin
        { wch: 16 }, // Kelas
        { wch: 28 }, // Jurusan
        { wch: 16 }, // No. HP
    ];

    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Data Siswa");

    const buf = write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": "attachment; filename=\"template_data_siswa.xlsx\"",
        },
    });
}
