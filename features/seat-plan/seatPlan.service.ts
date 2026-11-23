import { prisma } from "@/lib/prisma";
import { generateSeatLabel } from "@/utils/generateCode";

export type DeskType = "single" | "double" | "double_diff_grade";

type StudentForSeat = {
    id: string;
    className: string;
    name: string;
    grade: string;
};

/**
 * Mengekstrak jenjang/tingkat kelas dari nama kelas (className).
 * Contoh:
 * - "XII IPA 1", "12-MIPA1", "Kelas 12 IPS 2" -> "12"
 * - "XI IPS 2", "11-A", "11 B" -> "11"
 * - "X-A", "10-C", "X MIPA 1" -> "10"
 * - "IX A", "9A" -> "9"
 * Jika tidak cocok pola angka/romawi standar, fallback ke nama kelas utuh.
 */
export function extractGradeLevel(className: string): string {
    const cleaned = className
        .trim()
        .toUpperCase()
        .replace(/^(KELAS|KLS)\.?\s*/i, "");

    // Cek angka di awal (12, 11, 10, 9, 8, 7, ...)
    const numMatch = cleaned.match(/^(1[0-2]|[1-9])(?:\b|[^0-9])/);
    if (numMatch) {
        return numMatch[1];
    }

    // Cek angka Romawi di awal (urutkan dari yang terpanjang agar XII tidak cocok sebagai X/XI)
    const romanMap: Array<[RegExp, string]> = [
        [/^XII(?:\b|[^A-Z])/, "12"],
        [/^XI(?:\b|[^A-Z])/, "11"],
        [/^IX(?:\b|[^A-Z])/, "9"],
        [/^VIII(?:\b|[^A-Z])/, "8"],
        [/^VII(?:\b|[^A-Z])/, "7"],
        [/^VI(?:\b|[^A-Z])/, "6"],
        [/^IV(?:\b|[^A-Z])/, "4"],
        [/^III(?:\b|[^A-Z])/, "3"],
        [/^II(?:\b|[^A-Z])/, "2"],
        [/^X(?:\b|[^A-Z])/, "10"],
        [/^V(?:\b|[^A-Z])/, "5"],
        [/^I(?:\b|[^A-Z])/, "1"],
    ];

    for (const [pattern, grade] of romanMap) {
        if (pattern.test(cleaned)) {
            return grade;
        }
    }

    return cleaned || "LAINNYA";
}

/**
 * Mode "double" (Beda Kelas):
 * Memilih siswa untuk 1 ruang dengan menjaga setiap kursi berurutan (dan pasangan semeja)
 * berasal dari `className` berbeda.
 */
function selectStudentsDiffClass(
    buckets: Map<string, StudentForSeat[]>,
    count: number
): StudentForSeat[] {
    const selected: StudentForSeat[] = [];
    let lastClass: string | null = null;

    while (selected.length < count) {
        const available: Array<[string, StudentForSeat[]]> = Array.from(buckets.entries()).filter(
            ([, students]) => students.length > 0
        );

        if (available.length === 0) break;

        let candidates: Array<[string, StudentForSeat[]]> = lastClass
            ? available.filter(([className]) => className !== lastClass)
            : available;

        if (candidates.length === 0) candidates = available;

        candidates.sort(
            (a, b) =>
                b[1].length - a[1].length ||
                a[0].localeCompare(b[0], "id")
        );

        const [className, students] = candidates[0];
        selected.push(students.shift()!);
        lastClass = className;
    }

    return selected;
}

/**
 * Mode "double_diff_grade" (1 Meja 2 Siswa — Wajib Beda Jenjang):
 * Mengisi kursi per pasangan meja (kiri & kanan):
 * - Kursi kiri diambil dari jenjang dengan sisa siswa terbanyak.
 * - Kursi kanan WAJIB diambil dari jenjang berbeda dengan kursi kiri (yang sisanya terbanyak).
 * Strategi greedy per pasangan ini secara matematis menjamin 100% meja beda jenjang
 * selama jumlah siswa jenjang terbesar <= 50% total siswa.
 */
function selectStudentsDiffGrade(
    gradeBuckets: Map<string, StudentForSeat[]>,
    count: number
): StudentForSeat[] {
    const selected: StudentForSeat[] = [];
    let lastGrade: string | null = null;

    const pickFromGrade = (
        excludeGrade: string | null,
        preferDifferentFromGrade: string | null,
        avoidClassName: string | null
    ): StudentForSeat | null => {
        const available = Array.from(gradeBuckets.entries()).filter(
            ([, students]) => students.length > 0
        );
        if (available.length === 0) return null;

        let candidates = excludeGrade
            ? available.filter(([grade]) => grade !== excludeGrade)
            : available;

        if (candidates.length === 0) {
            candidates = available;
        }

        // Urutkan berdasarkan sisa siswa terbanyak; jika seri, utamakan jenjang yang berbeda dari kursi sebelumnya
        candidates.sort((a, b) => {
            if (b[1].length !== a[1].length) return b[1].length - a[1].length;
            if (preferDifferentFromGrade) {
                const aDiff = a[0] !== preferDifferentFromGrade ? 1 : 0;
                const bDiff = b[0] !== preferDifferentFromGrade ? 1 : 0;
                if (bDiff !== aDiff) return bDiff - aDiff;
            }
            return a[0].localeCompare(b[0], "id");
        });

        const [, students] = candidates[0];

        // Jika terpaksa fallback ke jenjang yang sama, usahakan minimal beda rombel (className)
        if (avoidClassName) {
            const diffClassIdx = students.findIndex((s) => s.className !== avoidClassName);
            if (diffClassIdx > 0) {
                const [picked] = students.splice(diffClassIdx, 1);
                return picked;
            }
        }

        return students.shift()!;
    };

    while (selected.length < count) {
        const isPairLeft = selected.length % 2 === 0;
        if (isPairLeft) {
            // Kursi kiri meja: ambil jenjang terbanyak (tie-break beda dari kursi kanan meja sebelumnya)
            const left = pickFromGrade(null, lastGrade, null);
            if (!left) break;
            selected.push(left);
            lastGrade = left.grade;
        } else {
            // Kursi kanan meja: WAJIB beda jenjang dari kursi kiri pada meja yang sama
            const leftStudent = selected[selected.length - 1];
            const right = pickFromGrade(leftStudent.grade, null, leftStudent.className);
            if (!right) break;
            selected.push(right);
            lastGrade = right.grade;
        }
    }

    return selected;
}

/**
 * Generates seat plans for all rooms in a given exam config.
 * - "single": 1 meja 1 siswa (4 kolom per baris).
 * - "double": 1 meja 2 siswa beda kelas (8 kolom per baris).
 * - "double_diff_grade": 1 meja 2 siswa beda jenjang/tingkat (8 kolom per baris).
 */
export async function generateSeatPlans(
    examConfigId: string,
    deskType: DeskType = "double_diff_grade"
) {
    const [assignments, rawStudents] = await Promise.all([
        prisma.roomAssignment.findMany({
            where: { examConfigId },
            include: { room: true },
            orderBy: { room: { code: "asc" } },
        }),
        prisma.student.findMany({
            where: { isActive: true },
            orderBy: [{ className: "asc" }, { name: "asc" }],
            select: { id: true, className: true, name: true },
        }),
    ]);

    if (assignments.length === 0) {
        throw new Error("Alokasi ruang belum dibuat. Generate alokasi ruang terlebih dahulu.");
    }

    if (rawStudents.length === 0) {
        throw new Error("Tidak ada data siswa aktif. Import data siswa terlebih dahulu.");
    }

    const totalAssigned = assignments.reduce((sum, item) => sum + item.studentCount, 0);

    if (totalAssigned !== rawStudents.length) {
        throw new Error(
            `Alokasi ruang tidak sesuai: total alokasi ${totalAssigned} siswa, ` +
            `sedangkan siswa aktif ${rawStudents.length}. Silakan generate ulang alokasi ruang.`
        );
    }

    const oversizedRoom = assignments.find(
        (assignment) => assignment.studentCount > assignment.room.capacity
    );
    if (oversizedRoom) {
        throw new Error(
            `Alokasi ${oversizedRoom.room.name} (${oversizedRoom.studentCount} siswa) ` +
            `melebihi kapasitas ${oversizedRoom.room.capacity}. Silakan generate ulang alokasi ruang.`
        );
    }

    const students: StudentForSeat[] = rawStudents.map((s) => ({
        ...s,
        grade: extractGradeLevel(s.className),
    }));

    const isDiffGrade = deskType === "double_diff_grade";
    const isDouble = deskType === "double" || isDiffGrade;
    const cols = isDouble ? 8 : 4;

    // Siapkan bucket per jenjang atau per kelas sesuai mode
    const classBuckets = new Map<string, StudentForSeat[]>();
    const gradeBuckets = new Map<string, StudentForSeat[]>();

    for (const student of students) {
        const cList = classBuckets.get(student.className);
        if (cList) cList.push(student);
        else classBuckets.set(student.className, [student]);

        const gList = gradeBuckets.get(student.grade);
        if (gList) gList.push(student);
        else gradeBuckets.set(student.grade, [student]);
    }

    const allSeatPlans: Array<{
        examConfigId: string;
        roomId: string;
        studentId: string;
        seatRow: number;
        seatCol: number;
        seatLabel: string;
    }> = [];

    let totalPairs = 0;
    let diffGradePairs = 0;

    for (const assignment of assignments) {
        const roomStudents = isDiffGrade
            ? selectStudentsDiffGrade(gradeBuckets, assignment.studentCount)
            : selectStudentsDiffClass(classBuckets, assignment.studentCount);

        if (roomStudents.length < assignment.studentCount) {
            throw new Error(
                `Siswa tidak cukup untuk ${assignment.room.name}. ` +
                `Dibutuhkan ${assignment.studentCount}, tersedia ${roomStudents.length}.`
            );
        }

        if (isDouble) {
            for (let i = 0; i + 1 < roomStudents.length; i += 2) {
                totalPairs++;
                if (roomStudents[i].grade !== roomStudents[i + 1].grade) {
                    diffGradePairs++;
                }
            }
        }

        roomStudents.forEach((student, index) => {
            const row = Math.floor(index / cols) + 1;
            const col = (index % cols) + 1;

            allSeatPlans.push({
                examConfigId,
                roomId: assignment.roomId,
                studentId: student.id,
                seatRow: row,
                seatCol: col,
                seatLabel: generateSeatLabel(row, col),
            });
        });
    }

    await prisma.$transaction([
        prisma.seatPlan.deleteMany({ where: { examConfigId } }),
        prisma.seatPlan.createMany({ data: allSeatPlans }),
    ]);

    return {
        total: allSeatPlans.length,
        deskType,
        totalPairs,
        diffGradePairs,
    };
}

export async function getSeatPlanByRoom(roomId: string, examConfigId?: string) {
    return prisma.seatPlan.findMany({
        where: {
            roomId,
            ...(examConfigId ? { examConfigId } : {}),
        },
        include: { student: true },
        orderBy: [{ seatRow: "asc" }, { seatCol: "asc" }],
    });
}

export async function getSeatPlansByConfig(examConfigId: string) {
    const assignments = await prisma.roomAssignment.findMany({
        where: { examConfigId },
        include: { room: true },
        orderBy: { room: { code: "asc" } },
    });

    if (assignments.length === 0) return [];

    const roomIds = assignments.map((assignment) => assignment.roomId);
    const allSeats = await prisma.seatPlan.findMany({
        where: {
            examConfigId,
            roomId: { in: roomIds },
        },
        include: { student: true },
        orderBy: [{ seatRow: "asc" }, { seatCol: "asc" }],
    });

    const seatsByRoom = new Map<string, typeof allSeats>();
    for (const seat of allSeats) {
        const list = seatsByRoom.get(seat.roomId);
        if (list) list.push(seat);
        else seatsByRoom.set(seat.roomId, [seat]);
    }

    return assignments.map((assignment) => ({
        room: assignment.room,
        studentCount: assignment.studentCount,
        seats: seatsByRoom.get(assignment.roomId) ?? [],
    }));
}
