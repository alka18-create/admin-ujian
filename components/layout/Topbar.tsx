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
        <header className="h-16 bg-[var(--bg-surface)] border-b border-[var(--border)] flex items-center justify-between px-6 sticky top-0 z-30">
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[var(--bg-surface-hover)] transition-colors"
                >
                    <Menu size={20} />
                </button>
                {title && <h1 className="text-sm font-semibold text-[var(--text-main)]">{title}</h1>}
            </div>

            <div className="flex items-center gap-4">
                <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors relative">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
                </button>

                <ThemeToggle />

                <div className="flex items-center gap-3 pl-3 border-l border-[var(--border)]">
                    <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 border-2 border-[var(--primary)]/20 rounded-full flex items-center justify-center">
                        <User size={18} className="text-[var(--text-muted)]" />
                    </div>
                    <div className="hidden sm:block">
                        <p className="text-xs font-medium text-[var(--text-main)] leading-none">
                            {session?.user?.name || "Admin"}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{(session?.user as { role?: string } | undefined)?.role || "ADMIN"}</p>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="ml-1 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                        title="Logout"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </header>
    );
}
