"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DataTable from "@/components/tables/DataTable";
import { Plus, Pencil, Trash2, Download } from "lucide-react";
import Link from "next/link";

type Room = { id: string; code: string; name: string; capacity: number; floor: number; building: string | null };

export default function RoomsPage() {
    const [data, setData] = useState<Room[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const res = await fetch(`/api/rooms?page=${page}&search=${search}`);
        const json = await res.json();
        if (json.success) { setData(json.data.data); setTotal(json.data.total); setTotalPages(json.data.totalPages); }
        setLoading(false);
    }, [page, search]);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- refresh list when page/search changes
    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Hapus ruang "${name}"?`)) return;
        setDeleting(id);
        const res = await fetch(`/api/rooms/${id}`, { method: "DELETE" });
        const json = await res.json();
        if (json.success) fetchData(); else alert(json.error || "Gagal menghapus");
        setDeleting(null);
    };

    const handleExportExcel = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ all: "true", search });
            const res = await fetch(`/api/rooms?${params}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);

            const rooms = json.data as Room[];
            const ExcelJS = await import("exceljs");
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Data Ruang");

            const headerRow = worksheet.addRow(["KODE", "NAMA RUANG", "KAPASITAS", "LANTAI", "GEDUNG"]);
            headerRow.font = { bold: true };
            headerRow.eachCell(cell => {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
                cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
            });

            rooms.forEach(r => {
                const row = worksheet.addRow([
                    r.code,
                    r.name,
                    r.capacity,
                    r.floor,
                    r.building || "-"
                ]);
                row.eachCell(cell => {
                    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
                });
            });

            worksheet.getColumn(1).width = 15;
            worksheet.getColumn(2).width = 25;
            worksheet.getColumn(3).width = 12;
            worksheet.getColumn(4).width = 10;
            worksheet.getColumn(5).width = 20;

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Data_Ruang_${new Date().toISOString().split("T")[0]}.xlsx`;
            a.click();
        } catch (error) {
            alert("Gagal export: " + (error instanceof Error ? error.message : "Terjadi kesalahan"));
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { label: "Kode", key: "code" as keyof Room },
        { label: "Nama Ruang", key: "name" as keyof Room },
        { label: "Kapasitas", key: "capacity" as keyof Room },
        { label: "Lantai", key: "floor" as keyof Room },
        { label: "Gedung", render: (r: Room) => r.building || "-" },
        {
            label: "Aksi", render: (r: Room) => (
                <div className="flex items-center gap-1">
                    <Link href={`/master/rooms/${r.id}`} className="btn-ghost py-1 px-2 text-xs"><Pencil size={13} /></Link>
                    <button onClick={() => handleDelete(r.id, r.name)} disabled={deleting === r.id} className="btn-danger py-1 px-2 text-xs"><Trash2 size={13} /></button>
                </div>
            )
        },
    ];

    return (
        <DashboardLayout title="Data Ruang">
            <div className="max-w-6xl mx-auto space-y-4">
                <div className="page-header">
                    <div><h1 className="page-title">Data Ruang Ujian</h1><p className="page-subtitle">Kelola ruang yang digunakan untuk ujian</p></div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleExportExcel} className="btn-secondary" title="Export ke Excel">
                            <Download size={16} /> Export Excel
                        </button>
                        <Link href="/master/rooms/create" className="btn-primary"><Plus size={16} /> Tambah Ruang</Link>
                    </div>
                </div>
                <DataTable columns={columns} data={data} total={total} page={page} totalPages={totalPages}
                    onPageChange={setPage} onSearch={(q) => { setSearch(q); setPage(1); }}
                    searchPlaceholder="Cari kode, nama ruang..." isLoading={loading} emptyMessage="Belum ada data ruang" />
            </div>
        </DashboardLayout>
    );
}
