import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/roleGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/cards/StatCard";
import Image from "next/image";
import { Users, GraduationCap, DoorOpen, CalendarDays, UserCheck, Grid3X3, Building2, MapPin, ClipboardList } from "lucide-react";
import { formatDate } from "@/utils/dateFormatter";

async function getDashboardStats() {
    const [activeConfig, teachers, students, rooms, schoolIdentity] = await Promise.all([
        prisma.examConfig.findFirst({ where: { isActive: true } }),
        prisma.teacher.count(),
        prisma.student.count(),
        prisma.room.count(),
        prisma.schoolIdentity.findFirst(),
    ]);

    const configId = activeConfig?.id;
    let schedules = 0;
    let assignments = 0;
    let invigilators = 0;
    let seatPlans = 0;

    if (configId) {
        const [scheduleRows, assignmentCount, invigilatorRows, seatPlanCount] = await Promise.all([
            prisma.examSchedule.findMany({
                where: { examConfigId: configId },
                select: { date: true, session: true },
            }),
            prisma.roomAssignment.count({ where: { examConfigId: configId } }),
            prisma.invigilator.findMany({
                where: { examSchedule: { examConfigId: configId } },
                select: {
                    roomId: true,
                    examSchedule: { select: { date: true, session: true } },
                },
            }),
            prisma.seatPlan.count({ where: { examConfigId: configId } }),
        ]);

        // A parallel schedule can contain several subject rows in the same session.
        schedules = new Set(
            scheduleRows.map((row) => `${row.date.toISOString()}-${row.session}`)
        ).size;
        // Invigilator rows are replicated per room; count unique duties per room/session.
        invigilators = new Set(
            invigilatorRows.map(
                (row) => `${row.examSchedule.date.toISOString()}-${row.examSchedule.session}-${row.roomId}`
            )
        ).size;
        assignments = assignmentCount;
        seatPlans = seatPlanCount;
    }

    return { teachers, students, rooms, schedules, assignments, invigilators, seatPlans, activeConfig, schoolIdentity };
}

export default async function DashboardPage() {
    await requireSession();
    const stats = await getDashboardStats();

    return (
        <DashboardLayout title="Dashboard">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-main)]">Dashboard</h1>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                        Selamat datang di sistem administrasi ujian sekolah
                    </p>
                </div>

                {/* School Identity Banner */}
                {stats.schoolIdentity && (
                    <div className="card-glass p-4 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        <div className="w-16 h-16 bg-[var(--bg-surface-hover)] rounded-lg flex items-center justify-center shrink-0 overflow-hidden shadow-sm p-2 border border-[var(--border)]">
                            {stats.schoolIdentity.logo ? (
                                <Image src={stats.schoolIdentity.logo} alt="Logo" width={64} height={64} unoptimized className="w-full h-full object-contain" />
                            ) : (
                                <Building2 size={24} className="text-[var(--text-muted)]" />
                            )}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-[var(--text-main)]">{stats.schoolIdentity.name}</h2>
                            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--text-muted)]">
                                {stats.schoolIdentity.npsn && (
                                    <span className="flex items-center gap-1.5 font-medium">
                                        NPSN: {stats.schoolIdentity.npsn}
                                    </span>
                                )}
                                {stats.schoolIdentity.nsm && (
                                    <span className="flex items-center gap-1.5 font-medium">
                                        NSM: {stats.schoolIdentity.nsm}
                                    </span>
                                )}
                                {stats.schoolIdentity.address && (
                                    <span className="flex items-center gap-1.5 opacity-80">
                                        <MapPin size={14} /> {stats.schoolIdentity.address}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Active Exam Banner */}
                {stats.activeConfig && (
                    <div className="card-glass p-4 flex items-center gap-3">
                        <div className="w-2 h-2 bg-[var(--primary)] rounded-md animate-pulse flex-shrink-0" />
                        <p className="text-sm text-[var(--text-main)]">
                            <span className="font-semibold">Ujian Aktif:</span>{" "}
                            {stats.activeConfig.name} — {stats.activeConfig.academicYear} (
                            {formatDate(stats.activeConfig.startDate)} s/d{" "}
                            {formatDate(stats.activeConfig.endDate)})
                        </p>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatCard
                        label="Total Guru"
                        value={stats.teachers}
                        icon={Users}
                        iconColor="text-blue-400"
                        iconBg="bg-blue-500/10"
                        suffix="orang"
                    />
                    <StatCard
                        label="Total Siswa"
                        value={stats.students}
                        icon={GraduationCap}
                        iconColor="text-emerald-400"
                        iconBg="bg-emerald-500/10"
                        suffix="siswa"
                    />
                    <StatCard
                        label="Total Ruang"
                        value={stats.rooms}
                        icon={DoorOpen}
                        iconColor="text-purple-400"
                        iconBg="bg-purple-500/10"
                        suffix="ruang"
                    />
                    <StatCard
                        label="Jadwal Ujian"
                        value={stats.schedules}
                        icon={CalendarDays}
                        iconColor="text-amber-400"
                        iconBg="bg-amber-500/10"
                        suffix="sesi"
                    />
                    <StatCard
                        label="Alokasi Ruang"
                        value={stats.assignments}
                        icon={Grid3X3}
                        iconColor="text-pink-400"
                        iconBg="bg-pink-500/10"
                        suffix="ruang"
                    />
                    <StatCard
                        label="Penugasan Pengawas"
                        value={stats.invigilators}
                        icon={UserCheck}
                        iconColor="text-cyan-400"
                        iconBg="bg-cyan-500/10"
                        suffix="tugas"
                    />
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="card-glass p-6">
                        <h3 className="font-bold flex items-center gap-2 mb-4">
                            <DoorOpen className="text-[var(--primary)]" size={20} />
                            Aksi Cepat
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: "Tambah Guru", href: "/master/teachers/create", icon: Users },
                                { label: "Tambah Siswa", href: "/master/students/create", icon: GraduationCap },
                                { label: "Tambah Ruang", href: "/master/rooms/create", icon: DoorOpen },
                                { label: "Buat Jadwal", href: "/exam/schedule", icon: CalendarDays },
                            ].map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    className="flex flex-col items-center justify-center p-4 rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/5 transition-all group"
                                >
                                    <link.icon className="text-[var(--text-muted)] group-hover:text-[var(--primary)] mb-2" size={24} />
                                    <span className="text-xs font-semibold text-[var(--text-main)]">{link.label}</span>
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className="card-glass p-6">
                        <h3 className="font-bold flex items-center gap-2 mb-4">
                            <ClipboardList className="text-[var(--primary)]" size={20} />
                            Status Generate
                        </h3>
                        <div className="space-y-4">
                            {[
                                { label: "Alokasi Ruang", done: stats.assignments > 0 },
                                { label: "Denah Kursi", done: stats.seatPlans > 0 },
                                { label: "Penugasan Pengawas", done: stats.invigilators > 0 },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center justify-between">
                                    <span className="text-sm text-[var(--text-muted)] font-medium">{item.label}</span>
                                    <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${item.done ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                                        {item.done ? "✓ Selesai" : "Pending"}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 p-4 bg-[var(--primary)]/10 rounded-xl border border-[var(--primary)]/20">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-bold text-[var(--primary)]">Peringatan Sistem</span>
                            </div>
                            <p className="text-xs text-[var(--text-muted)]">Pastikan Anda selalu menyelesaikan generasi Jadwal, Denah, dan Pengawas sebelum ujian dimulai.</p>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
