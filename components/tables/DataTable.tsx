"use client";

import { ChevronLeft, ChevronRight, Search, Loader2 } from "lucide-react";
import { useState } from "react";

interface Column<T> {
    label: string;
    key?: keyof T;
    render?: (row: T) => React.ReactNode;
    className?: string;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    total?: number;
    page?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    onSearch?: (q: string) => void;
    searchPlaceholder?: string;
    isLoading?: boolean;
    emptyMessage?: string;
}

export default function DataTable<T extends { id: string }>({
    columns,
    data,
    total = 0,
    page = 1,
    totalPages = 1,
    onPageChange,
    onSearch,
    searchPlaceholder = "Cari...",
    isLoading = false,
    emptyMessage = "Tidak ada data",
}: DataTableProps<T>) {
    const [searchValue, setSearchValue] = useState("");

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearchValue(val);
        onSearch?.(val);
    };

    return (
        <div className="card-glass">
            {/* Table toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-[var(--border)]">
                {onSearch && (
                    <div className="relative w-full sm:w-auto">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] opacity-60" />
                        <input
                            type="text"
                            value={searchValue}
                            onChange={handleSearch}
                            placeholder={searchPlaceholder}
                            className="form-input !pl-10 w-full sm:w-64"
                        />
                    </div>
                )}
                {total > 0 && (
                    <span className="text-xs text-[var(--text-muted)] sm:ml-auto">
                        {total} data ditemukan
                    </span>
                )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16 text-slate-500">
                        <Loader2 size={24} className="animate-spin mr-2" />
                        Memuat data...
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                        <p className="text-sm">{emptyMessage}</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th className="w-8">#</th>
                                {columns.map((col, i) => (
                                    <th key={i} className={col.className}>
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, idx) => (
                                <tr key={row.id}>
                                    <td className="text-slate-500 text-xs">
                                        {(page - 1) * 10 + idx + 1}
                                    </td>
                                    {columns.map((col, i) => (
                                        <td key={i} className={col.className}>
                                            {col.render
                                                ? col.render(row)
                                                : col.key
                                                    ? String(row[col.key] ?? "-")
                                                    : "-"}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
                    <p className="text-xs text-slate-500">
                        Halaman {page} dari {totalPages}
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onPageChange?.(page - 1)}
                            disabled={page <= 1}
                            className="btn-ghost py-1 px-2 disabled:opacity-30"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            const p = i + Math.max(1, page - 2);
                            if (p > totalPages) return null;
                            return (
                                <button
                                    key={p}
                                    onClick={() => onPageChange?.(p)}
                                    className={`w-8 h-8 flex items-center justify-center text-xs rounded-lg transition-colors ${p === page
                                            ? "bg-[var(--primary)] text-white shadow-sm"
                                            : "text-[var(--text-muted)] hover:bg-[var(--bg-surface-hover)]"
                                        }`}
                                >
                                    {p}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => onPageChange?.(page + 1)}
                            disabled={page >= totalPages}
                            className="btn-ghost py-1 px-2 disabled:opacity-30"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
