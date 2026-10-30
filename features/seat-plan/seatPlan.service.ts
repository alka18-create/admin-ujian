import { prisma } from "@/lib/prisma";
import { generateSeatLabel } from "@/utils/generateCode";

type StudentForSeat = {
    id: string;
    className: string;
    name: string;
};

/**
 * Selects students for one room while keeping consecutive seats (and therefore
 * every desk pair) in different classes whenever possible.
 *
 * Students are taken from shared per-class buckets, so each room receives a mix
 * of classes instead of one contiguous class block.
 */
function selectStudentsForRoom(
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

        // Prefer a different class from the previous seat. This guarantees that
        // pairs sitting at the same desk (col 1-2, 3-4, ...) are different classes.
        let candidates: Array<[string, StudentForSeat[]]> = lastClass
            ? available.filter(([className]) => className !== lastClass)
            : available;

        if (candidates.length === 0) candidates = available;

        // Draw from the class with the most remaining students first so the
        // distribution does not run out of one class too early.
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
 * Generates seat plans for all rooms in a given exam config.
 * - Single (1 meja 1 siswa): 4 cols per row (1 meja = 1 kolom).
 * - Double (1 meja 2 siswa): 4 desks x 2 students = 8 cols per row.
 *
 * Seat plans are scoped by examConfigId so generating a plan for one exam never
 * overwrites another exam's plan.
 */
export async function generateSeatPlans(
    examConfigId: string,
    deskType: "single" | "double" = "double"
) {
    const [assignments, students] = await Promise.all([
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

    if (students.length === 0) {
        throw new Error("Tidak ada data siswa aktif. Import data siswa terlebih dahulu.");
    }

    const totalAssigned = assignments.reduce((sum, item) => sum + item.studentCount, 0);

    if (totalAssigned !== students.length) {
        throw new Error(
            `Alokasi ruang tidak sesuai: total alokasi ${totalAssigned} siswa, ` +
            `sedangkan siswa aktif ${students.length}. Silakan generate ulang alokasi ruang.`
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

    // Group students by class once, then share the buckets across rooms so each
    // room gets a balanced mix of classes.
    const buckets = new Map<string, StudentForSeat[]>();
    for (const student of students) {
        const list = buckets.get(student.className);
        if (list) list.push(student);
        else buckets.set(student.className, [student]);
    }

    const isDouble = deskType === "double";
    const cols = isDouble ? 8 : 4;
    const allSeatPlans: Array<{
        examConfigId: string;
        roomId: string;
        studentId: string;
        seatRow: number;
        seatCol: number;
        seatLabel: string;
    }> = [];

    for (const assignment of assignments) {
        const roomStudents = selectStudentsForRoom(buckets, assignment.studentCount);

        if (roomStudents.length < assignment.studentCount) {
            throw new Error(
                `Siswa tidak cukup untuk ${assignment.room.name}. ` +
                `Dibutuhkan ${assignment.studentCount}, tersedia ${roomStudents.length}.`
            );
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

    return { total: allSeatPlans.length };
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
