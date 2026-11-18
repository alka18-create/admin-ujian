"use client";

import { Menu, Bell, LogOut, User } from "lucide-react";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import ThemeToggle from "@/components/ui/ThemeToggle";
interface TopbarProps {
    onMenuClick: () => void;
    title?: string;
}

export default function Topbar({ onMenuClick, title }: TopbarProps) {
    const { data: session } = useSession();

    return (
        <header className="h-16 bg-[var(--bg-surface)] border-b border-[var(--border)] flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
            <div className="flex items-center gap-3 min-w-0">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 rounded-[10px] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                    aria-label="Buka menu"
                >
                    <Menu size={20} />
                </button>
                {title && (
                    <h1 className="text-[13px] font-semibold text-[var(--text-main)] truncate">{title}</h1>
                )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
                <button
                    className="w-9 h-9 flex items-center justify-center rounded-[10px] bg-[var(--bg-surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors relative"
                    aria-label="Notifikasi"
                >
                    <Bell size={18} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--danger)] rounded-full border-2 border-[var(--bg-surface)]" />
                </button>

                <ThemeToggle />

                <div className="flex items-center gap-2.5 pl-2.5 sm:pl-3 border-l border-[var(--border)]">
                    <div className="w-9 h-9 bg-[var(--primary-soft)] text-[var(--primary-text)] rounded-full flex items-center justify-center">
                        <User size={17} />
                    </div>
                    <div className="hidden sm:block">
                        <p className="text-xs font-semibold text-[var(--text-main)] leading-none">
                            {session?.user?.name || "Admin"}
                        </p>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)] mt-1">
                            {(session?.user as { role?: string } | undefined)?.role || "ADMIN"}
                        </p>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="ml-0.5 p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--danger-text)] hover:bg-[var(--danger-soft)] transition-colors"
                        title="Keluar"
                        aria-label="Keluar"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </header>
    );
}
