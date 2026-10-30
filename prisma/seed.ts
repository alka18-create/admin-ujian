import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("🌱 Seeding database...");

    // 1. Admin User
    const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@school.ac.id";
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin123";
    const usingDefaultPassword = !process.env.SEED_ADMIN_PASSWORD;
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: { name: "Administrator", email: adminEmail, password: hashedPassword, role: "SUPERADMIN" },
    });
    console.log(`✓ Admin user ready: ${adminEmail}`);
    if (usingDefaultPassword) {
        console.warn("⚠ Password default digunakan. Segera ganti password admin sebelum dipakai produksi.");
    }

    // 2. Teachers
    const teachers = [
        { nip: "198501012010011001", name: "Drs. Ahmad Fauzi", gender: "MALE", subject: "Matematika" },
        { nip: "197603152001012001", name: "Sri Wahyuni, S.Pd", gender: "FEMALE", subject: "Bahasa Indonesia" },
        { nip: "198002202005011002", name: "Bambang Irawan, M.Pd", gender: "MALE", subject: "Fisika" },
        { nip: "197812051999032001", name: "Siti Rahayu, S.Pd", gender: "FEMALE", subject: "Kimia" },
        { nip: "197509102000031003", name: "Hendra Gunawan, S.Pd", gender: "MALE", subject: "Biologi" },
        { nip: "198410202009011004", name: "Rina Kusuma, S.Pd", gender: "FEMALE", subject: "Bahasa Inggris" },
        { nip: "197001151995011005", name: "Drs. Joko Santoso", gender: "MALE", subject: "Sejarah" },
        { nip: "198205252007012002", name: "Dewi Lestari, S.Pd", gender: "FEMALE", subject: "Geografi" },
        { nip: "197704182003011001", name: "Agus Priyanto, M.Pd", gender: "MALE", subject: "Ekonomi" },
        { nip: "198108092006012003", name: "Nur Aini, S.Pd", gender: "FEMALE", subject: "Sosiologi" },
    ];
    for (const t of teachers) {
        await prisma.teacher.upsert({ where: { nip: t.nip }, update: {}, create: t });
    }
    console.log(`✓ ${teachers.length} teachers seeded`);

    // 3. Rooms
    const rooms = [
        { code: "R01", name: "Ruang 01", capacity: 30, floor: 1, building: "Gedung A" },
        { code: "R02", name: "Ruang 02", capacity: 30, floor: 1, building: "Gedung A" },
        { code: "R03", name: "Ruang 03", capacity: 30, floor: 1, building: "Gedung A" },
        { code: "R04", name: "Ruang 04", capacity: 25, floor: 2, building: "Gedung A" },
        { code: "R05", name: "Ruang 05", capacity: 25, floor: 2, building: "Gedung A" },
        { code: "R06", name: "Aula", capacity: 50, floor: 1, building: "Gedung B" },
    ];
    for (const r of rooms) {
        await prisma.room.upsert({ where: { code: r.code }, update: {}, create: r });
    }
    console.log(`✓ ${rooms.length} rooms seeded`);

    // 4. Students
    const classes = [
        { className: "XII IPA 1", major: "MIPA", count: 30 },
        { className: "XII IPA 2", major: "MIPA", count: 30 },
        { className: "XII IPS 1", major: "IPS", count: 28 },
        { className: "XII IPS 2", major: "IPS", count: 28 },
        { className: "XII Agama", major: "KEAGAMAAN", count: 24 },
    ];
    const firstNames = ["Ahmad", "Siti", "Budi", "Dewi", "Andi", "Rina", "Reza", "Putri", "Fajar", "Indah", "Rizky", "Maya", "Doni", "Ayu", "Hendra"];
    const lastNames = ["Santoso", "Utami", "Prasetyo", "Lestari", "Wibowo", "Rahayu", "Kusuma", "Andriani", "Nugroho", "Purnama"];
    let nisCounter = 1001;
    for (const cls of classes) {
        for (let i = 0; i < cls.count; i++) {
            const nis = String(nisCounter++);
            const gender = i % 2 === 0 ? "MALE" : "FEMALE";
            const name = `${firstNames[i % firstNames.length]} ${lastNames[Math.floor(i / 2) % lastNames.length]}`;
            await prisma.student.upsert({
                where: { nis },
                update: {},
                create: { nis, nisn: `99${nis}`, name, gender, className: cls.className, major: cls.major },
            });
        }
    }
    const totalStudents = classes.reduce((s, c) => s + c.count, 0);
    console.log(`✓ ${totalStudents} students seeded (${classes.length} classes)`);

    // 5. Exam Config
    const examConfig = await prisma.examConfig.upsert({
        where: { id: "seed-exam-config-001" },
        update: {},
        create: {
            id: "seed-exam-config-001",
            name: "Ujian Kenaikan Kelas 2024/2025",
            academicYear: "2024/2025",
            semester: "GENAP",
            startDate: new Date("2025-05-05"),
            endDate: new Date("2025-05-14"),
            isActive: true,
        },
    });
    console.log(`✓ Exam config: ${examConfig.name}`);

    // 6. Schedules
    const subjects = [
        { subject: "Matematika", date: "2025-05-05", session: 1, startTime: "07:30", endTime: "09:30" },
        { subject: "Bahasa Indonesia", date: "2025-05-05", session: 2, startTime: "10:00", endTime: "12:00" },
        { subject: "Fisika", date: "2025-05-06", session: 1, startTime: "07:30", endTime: "09:30" },
        { subject: "Kimia", date: "2025-05-06", session: 2, startTime: "10:00", endTime: "12:00" },
        { subject: "Biologi", date: "2025-05-07", session: 1, startTime: "07:30", endTime: "09:30" },
        { subject: "Bahasa Inggris", date: "2025-05-07", session: 2, startTime: "10:00", endTime: "12:00" },
    ];
    for (const s of subjects) {
        const date = new Date(s.date);
        const existing = await prisma.examSchedule.findFirst({
            where: {
                examConfigId: examConfig.id,
                date,
                session: s.session,
                subject: s.subject,
            },
        });
        if (existing) continue;

        await prisma.examSchedule.create({
            data: { examConfigId: examConfig.id, date, session: s.session, startTime: s.startTime, endTime: s.endTime, subject: s.subject },
        });
    }
    console.log(`✓ ${subjects.length} exam schedules seeded`);

    console.log("\n✅ Seeding selesai!");
    console.log(`   Login: ${adminEmail}`);
    if (usingDefaultPassword) {
        console.log("   Password default: admin123 (segera ganti!)");
    }
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
