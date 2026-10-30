import { prisma } from "@/lib/prisma";
import { calculateRoomDistribution } from "@/utils/calculateDistribution";

/**
 * Generates room assignments by filling rooms sequentially according to their
 * capacity. Capacity reflects the number of desks/chairs available in each room.
 * Class mixing is applied later when seat plans are generated.
 */
export async function generateRoomAssignments(examConfigId: string) {
    const [students, rooms] = await Promise.all([
        prisma.student.findMany({ where: { isActive: true }, orderBy: [{ className: "asc" }, { name: "asc" }] }),
        prisma.room.findMany({ orderBy: { code: "asc" } }),
    ]);

    if (students.length === 0) throw new Error("Tidak ada data siswa");
    if (rooms.length === 0) throw new Error("Tidak ada data ruang");

    const totalCapacity = rooms.reduce((s, r) => s + r.capacity, 0);
    if (totalCapacity < students.length) {
        throw new Error(`Kapasitas total (${totalCapacity}) kurang dari jumlah siswa (${students.length})`);
    }

    const distribution = calculateRoomDistribution(students.length, rooms);

    // Delete existing assignments and create new ones atomically
    await prisma.$transaction([
        prisma.roomAssignment.deleteMany({ where: { examConfigId } }),
        prisma.roomAssignment.createMany({
            data: distribution.map((d) => ({
                examConfigId,
                roomId: d.roomId,
                studentCount: d.studentCount,
            })),
        })
    ]);

    return { assignments: distribution, totalStudents: students.length, totalRooms: distribution.length };
}

export async function getRoomAssignments(examConfigId: string) {
    return prisma.roomAssignment.findMany({
        where: { examConfigId },
        include: { room: true },
        orderBy: { room: { code: "asc" } },
    });
}

export async function deleteRoomAssignments(examConfigId: string) {
    return prisma.roomAssignment.deleteMany({ where: { examConfigId } });
}
