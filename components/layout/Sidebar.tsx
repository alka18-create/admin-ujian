"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    GraduationCap,
    DoorOpen,
    CalendarDays,
    ClipboardList,
    MapPin,
    Grid3X3,
    UserCheck,
    FileText,
    ChevronDown,
    ChevronRight,
    School,
    X,
    Landmark,
    Hash
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface NavGroup {
    label: string;
    items: NavItem[];
}

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
}

const navigation: NavGroup[] = [
    {
        label: "Utama",
        items: [
            { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} /> },
        ],
    },
    {
        label: "Master Data",
        items: [
            { label: "Data Guru", href: "/master/teachers", icon: <Users size={18} /> },
            { label: "Data Siswa", href: "/master/students", icon: <GraduationCap size={18} /> },
            { label: "Data Ruang", href: "/master/rooms", icon: <DoorOpen size={18} /> },
            { label: "Identitas Madrasah", href: "/master/school-identity", icon: <Landmark size={18} /> },
        ],
    },
    {
        label: "Ujian",
        items: [
            { label: "Konfigurasi Ujian", href: "/exam/config", icon: <ClipboardList size={18} /> },
            { label: "Jadwal Ujian", href: "/exam/schedule", icon: <CalendarDays size={18} /> },
            { label: "Alokasi Ruang", href: "/exam/room-assignment", icon: <MapPin size={18} /> },
            { label: "Denah Kursi", href: "/exam/seat-plan", icon: <Grid3X3 size={18} /> },
            { label: "Pengawas", href: "/exam/invigilators", icon: <UserCheck size={18} /> },
        ],
    },
    {
        label: "Export",
        items: [
            { label: "Jadwal PDF/Excel", href: "/export/jadwal", icon: <FileText size={18} /> },
            { label: "Jadwal Pengawas", href: "/export/pengawas", icon: <FileText size={18} /> },
            { label: "Denah Kursi", href: "/export/denah-kursi", icon: <Grid3X3 size={18} /> },
            { label: "Denah Ruang", href: "/export/denah-ruang", icon: <MapPin size={18} /> },
            { label: "Nomor Ruang", href: "/export/nomor-ruang", icon: <Hash size={18} /> },
            { label: "Daftar Hadir", href: "/export/daftar-hadir", icon: <ClipboardList size={18} /> },
            { label: "Berita Acara", href: "/export/berita-acara", icon: <FileText size={18} /> },
            { label: "Kartu Peserta", href: "/exam/cards", icon: <FileText size={18} /> },
            { label: "Kartu Meja", href: "/export/kartu-meja", icon: <FileText size={18} /> },
        ],
    },
];

interface SidebarProps {
    onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

    const toggleGroup = (label: string) => {
        setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
    };

    return (
        <div className="sidebar h-full flex flex-col w-64 overflow-hidden">
            {/* Logo */}
            <div className="flex items-center justify-between px-4 py-5 border-b border-[var(--sidebar-border)]">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center shrink-0 shadow-[0_8px_18px_-10px_var(--primary)]">
                        <School size={20} className="text-white" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[13.5px] font-bold text-[var(--text-main)] leading-tight truncate">Admin Ujian</p>
                        <p className="text-[11px] text-[var(--text-muted)] truncate">Panel Administrasi</p>
                    </div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-hover)] lg:hidden"
                        aria-label="Tutup menu"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto px-2.5 py-3">
                {navigation.map((group) => (
                    <div key={group.label} className="mb-1.5">
                        <button
                            onClick={() => toggleGroup(group.label)}
                            className="w-full flex items-center justify-between px-2.5 py-2 rounded-md hover:bg-[var(--sidebar-link-hover-bg)] transition-colors"
                        >
                            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                                {group.label}
                            </span>
                            {collapsed[group.label] ? (
                                <ChevronRight size={12} className="text-[var(--text-muted)]" />
                            ) : (
                                <ChevronDown size={12} className="text-[var(--text-muted)]" />
                            )}
                        </button>
                        {!collapsed[group.label] && (
                            <div className="space-y-0.5">
                                {group.items.map((item) => {
                                    const isActive =
                                        item.href === "/dashboard"
                                            ? pathname === item.href
                                            : pathname.startsWith(item.href);
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={onClose}
                                            className={cn("sidebar-link", isActive && "active")}
                                        >
                                            <span className="shrink-0">{item.icon}</span>
                                            <span className="truncate">{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </nav>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-[var(--sidebar-border)]">
                <p className="text-[11px] text-[var(--text-muted)]">v1.0.0 • Admin Ujian Sekolah</p>
            </div>
        </div>
    );
}
