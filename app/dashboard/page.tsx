import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/roleGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/cards/StatCard";
import Link from "next/link";
import { Users, GraduationCap, DoorOpen, CalendarDays, UserCheck, Grid3X3, Building2, MapPin, ClipboardList } from "lucide-react";
import { formatDate } from "@/utils/dateFormatter";

type DashboardCountsRow = {
    teachers: number;
    students: number;
    rooms: number;
    schedules: number;
    assignments: number;
    invigilators: number;
    seatPlans: number;
    hasLogo: boolean;
};

async function getDashboardStats() {
    const [activeConfig, schoolIdentity, countRows] = await Promise.all([
        prisma.examConfig.findFirst({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                academicYear: true,
                startDate: true,
                endDate: true,
            },
        }),
        prisma.schoolIdentity.findFirst({
            select: {
                id: true,
                name: true,
                npsn: true,
                nsm: true,
                address: true,
                updatedAt: true,
            },
        }),
        prisma.$queryRaw<DashboardCountsRow[]>`
            WITH active_cfg AS (
                SELECT id FROM "ExamConfig" WHERE "isActive" = true LIMIT 1
            )
            SELECT
                (SELECT COUNT(*)::int FROM "Teacher") AS teachers,
                (SELECT COUNT(*)::int FROM "Student") AS students,
                (SELECT COUNT(*)::int FROM "Room") AS rooms,
                COALESCE((SELECT (logo IS NOT NULL AND logo <> '') FROM "SchoolIdentity" LIMIT 1), false) AS "hasLogo",
                (
                    SELECT COUNT(DISTINCT (es."date", es."session"))::int
                    FROM "ExamSchedule" es
                    WHERE es."examConfigId" = (SELECT id FROM active_cfg)
                ) AS schedules,
                (
                    SELECT COUNT(*)::int
                    FROM "RoomAssignment" ra
                    WHERE ra."examConfigId" = (SELECT id FROM active_cfg)
                ) AS assignments,
                (
                    SELECT COUNT(DISTINCT (es."date", es."session", inv."roomId"))::int
                    FROM "Invigilator" inv
                    JOIN "ExamSchedule" es ON es.id = inv."examScheduleId"
                    WHERE es."examConfigId" = (SELECT id FROM active_cfg)
                ) AS invigilators,
                (
                    SELECT COUNT(*)::int
                    FROM "SeatPlan" sp
                    WHERE sp."examConfigId" = (SELECT id FROM active_cfg)
                ) AS "seatPlans"
        `,
    ]);

    const counts = countRows[0] ?? {
        teachers: 0,
        students: 0,
        rooms: 0,
        schedules: 0,
        assignments: 0,
        invigilators: 0,
        seatPlans: 0,
        hasLogo: false,
    };

    return {
        teachers: Number(counts.teachers),
        students: Number(counts.students),
        rooms: Number(counts.rooms),
        schedules: Number(counts.schedules),
        assignments: Number(counts.assignments),
        invigilators: Number(counts.invigilators),
        seatPlans: Number(counts.seatPlans),
        hasLogo: Boolean(counts.hasLogo),
        activeConfig,
        schoolIdentity,
    };
}

export default async function DashboardPage() {
    await requireSession();
    const stats = await getDashboardStats();

    return (
        <DashboardLayout title="Dashboard">
            <div className="max-w-7xl mx-auto space-y-5">
                {/* Header */}
                <div className="page-header !mb-0">
                    <div>
                        <h1 className="page-title">Dashboard</h1>
                        <p className="page-subtitle">Ringkasan administrasi ujian madrasah</p>
                    </div>
                    {stats.activeConfig && (
                        <span className="badge badge-blue">
                            {stats.activeConfig.academicYear}
                        </span>
                    )}
                </div>

                {/* School Identity Banner */}
                {stats.schoolIdentity && (
                    <div className="card-glass p-4 sm:p-5 flex items-center gap-4">
                        <div className="w-14 h-14 bg-[var(--bg-surface)] rounded-[var(--radius-sm)] flex items-center justify-center shrink-0 overflow-hidden border border-[var(--border)] p-1.5">
                            {stats.hasLogo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={`/api/school-identity/logo?v=${stats.schoolIdentity.updatedAt.getTime()}`}
                                    alt="Logo"
                                    width={56}
                                    height={56}
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <Building2 size={22} className="text-[var(--text-muted)]" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-bold text-[var(--text-main)] leading-tight truncate">{stats.schoolIdentity.name}</h2>
                            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
                                {stats.schoolIdentity.npsn && (
                                    <span className="font-medium">NPSN {stats.schoolIdentity.npsn}</span>
                                )}
                                {stats.schoolIdentity.nsm && (
                                    <span className="font-medium">NSM {stats.schoolIdentity.nsm}</span>
                                )}
                                {stats.schoolIdentity.address && (
                                    <span className="flex items-center gap-1">
                                        <MapPin size={12} /> {stats.schoolIdentity.address}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Active Exam Banner */}
                {stats.activeConfig && (
                    <div className="card-glass px-4 py-3 flex items-center gap-3">
                        <span className="relative flex h-2.5 w-2.5 shrink-0">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--primary)] opacity-40 animate-ping" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--primary)]" />
                        </span>
                        <p className="text-[13px] text-[var(--text-main)] leading-relaxed">
                            <span className="font-semibold">Ujian aktif:</span>{" "}
                            <span className="text-[var(--text-muted)]">
                                {stats.activeConfig.name} — {formatDate(stats.activeConfig.startDate)} s/d{" "}
                                {formatDate(stats.activeConfig.endDate)}
                            </span>
                        </p>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatCard
                        label="Total Guru"
                        value={stats.teachers}
                        icon={Users}
                        tone="primary"
                        suffix="orang"
                    />
                    <StatCard
                        label="Total Siswa"
                        value={stats.students}
                        icon={GraduationCap}
                        tone="success"
                        suffix="siswa"
                    />
                    <StatCard
                        label="Total Ruang"
                        value={stats.rooms}
                        icon={DoorOpen}
                        tone="info"
                        suffix="ruang"
                    />
                    <StatCard
                        label="Jadwal Ujian"
                        value={stats.schedules}
                        icon={CalendarDays}
                        tone="warning"
                        suffix="sesi"
                    />
                    <StatCard
                        label="Alokasi Ruang"
                        value={stats.assignments}
                        icon={Grid3X3}
                        tone="neutral"
                        suffix="ruang"
                    />
                    <StatCard
                        label="Penugasan Pengawas"
                        value={stats.invigilators}
                        icon={UserCheck}
                        tone="primary"
                        suffix="tugas"
                    />
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="card-glass p-5">
                        <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
                            <DoorOpen className="text-[var(--primary-text)]" size={18} />
                            Aksi Cepat
                        </h3>
                        <div className="grid grid-cols-2 gap-2.5">
                            {[
                                { label: "Tambah Guru", href: "/master/teachers/create", icon: Users },
                                { label: "Tambah Siswa", href: "/master/students/create", icon: GraduationCap },
                                { label: "Tambah Ruang", href: "/master/rooms/create", icon: DoorOpen },
                                { label: "Buat Jadwal", href: "/exam/schedule", icon: CalendarDays },
                            ].map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors group"
                                >
                                    <link.icon className="text-[var(--text-muted)] group-hover:text-[var(--primary-text)] transition-colors" size={22} />
                                    <span className="text-xs font-semibold text-[var(--text-main)] group-hover:text-[var(--primary-text)]">{link.label}</span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="card-glass p-5">
                        <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
                            <ClipboardList className="text-[var(--primary-text)]" size={18} />
                            Status Generate
                        </h3>
                        <div className="space-y-3.5">
                            {[
                                { label: "Alokasi Ruang", done: stats.assignments > 0 },
                                { label: "Denah Kursi", done: stats.seatPlans > 0 },
                                { label: "Penugasan Pengawas", done: stats.invigilators > 0 },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center justify-between gap-3">
                                    <span className="text-[13px] text-[var(--text-muted)] font-medium">{item.label}</span>
                                    <span className={`badge ${item.done ? "badge-success" : "badge-neutral"}`}>
                                        {item.done ? "✓ Selesai" : "Pending"}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-5 p-3.5 bg-[var(--warning-soft)] rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--warning)_28%,transparent)]">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[12.5px] font-bold text-[var(--warning-text)]">Peringatan</span>
                            </div>
                            <p className="text-xs leading-relaxed text-[var(--warning-text)] opacity-90">Pastikan jadwal, denah, dan pengawas sudah lengkap sebelum ujian dimulai.</p>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
