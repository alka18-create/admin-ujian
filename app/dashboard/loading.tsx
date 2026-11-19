import DashboardLayout from "@/components/layout/DashboardLayout";

export default function DashboardLoading() {
    return (
        <DashboardLayout title="Dashboard">
            <div className="max-w-7xl mx-auto space-y-5 animate-pulse">
                <div className="page-header !mb-0">
                    <div className="space-y-2">
                        <div className="h-6 w-36 rounded-md bg-[var(--bg-muted)]" />
                        <div className="h-3.5 w-56 rounded-md bg-[var(--bg-muted)]" />
                    </div>
                    <div className="h-6 w-24 rounded-full bg-[var(--bg-muted)]" />
                </div>

                {/* School Identity Banner skeleton */}
                <div className="card-glass p-4 sm:p-5 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-[var(--radius-sm)] bg-[var(--bg-muted)] shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-5 w-48 rounded-md bg-[var(--bg-muted)]" />
                        <div className="h-3.5 w-72 rounded-md bg-[var(--bg-muted)]" />
                    </div>
                </div>

                {/* Active Exam Banner skeleton */}
                <div className="card-glass px-4 py-3.5">
                    <div className="h-4 w-80 max-w-full rounded-md bg-[var(--bg-muted)]" />
                </div>

                {/* Stats Grid skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="stat-card space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="h-3.5 w-24 rounded bg-[var(--bg-muted)]" />
                                <div className="w-9 h-9 rounded-[0.625rem] bg-[var(--bg-muted)]" />
                            </div>
                            <div className="h-7 w-20 rounded bg-[var(--bg-muted)]" />
                        </div>
                    ))}
                </div>

                {/* Bottom Grid skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="card-glass p-5 h-52" />
                    <div className="card-glass p-5 h-52" />
                </div>
            </div>
        </DashboardLayout>
    );
}

