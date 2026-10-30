"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

interface DashboardLayoutProps {
    children: React.ReactNode;
    title?: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-[var(--bg-base)] overflow-hidden print:block print:h-auto print:overflow-visible print:bg-white">
            {/* Desktop sidebar */}
            <div className="hidden lg:flex flex-shrink-0 h-full print:hidden">
                <Sidebar />
            </div>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div
                        className="absolute inset-0 bg-black/60"
                        onClick={() => setSidebarOpen(false)}
                    />
                    <div className="relative z-10 flex-shrink-0">
                        <Sidebar onClose={() => setSidebarOpen(false)} />
                    </div>
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:block print:overflow-visible print:h-auto">
                <div className="print:hidden">
                    <Topbar onMenuClick={() => setSidebarOpen(true)} title={title} />
                </div>
                <main className="flex-1 overflow-y-auto p-4 sm:p-5 bg-[var(--bg-base)] print:block print:overflow-visible print:h-auto print:p-0 print:bg-white print:border-none print:shadow-none">
                    {children}
                </main>
            </div>
        </div>
    );
}
