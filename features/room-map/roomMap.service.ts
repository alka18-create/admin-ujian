import { prisma } from "@/lib/prisma";

export type RoomMapSource = "seat-plan" | "assignment" | "none";
export type RoomMapStatus = "AKTIF" | "NON_AKTIF";

export type RoomMapRoom = {
    id: string;
    code: string;
    name: string;
    capacity: number;
    floor: number;
    building: string | null;
    /** Nomor urut tampilan: 1 -> "Ruang-01". */
    seq: number;
    seqLabel: string;
    /** Jumlah siswa yang benar-benar menempati kursi. */
    studentCount: number;
    /** Jumlah siswa pada rencana alokasi ruang. */
    assignedCount: number;
    status: RoomMapStatus;
    isFull: boolean;
    source: RoomMapSource;
};

export type RoomMapData = {
    examConfigId: string;
    configName: string;
    academicYear: string;
    semester: string;
    schoolName: string;
    startDate: string | null;
    endDate: string | null;
    /** true bila ujian ini sudah punya denah kursi (SeatPlan). */
    hasSeatPlan: boolean;
    /** true bila ujian ini sudah punya alokasi ruang. */
    hasAssignment: boolean;
    rooms: RoomMapRoom[];
    summary: {
        totalRuang: number;
        aktif: number;
        nonAktif: number;
        totalSiswa: number;
        totalKapasitas: number;
        totalKursiTerisi: number;
    };
};

function toRuangLabel(seq: number) {
    return `Ruang-${String(seq).padStart(2, "0")}`;
}

/**
 * Data denah ruang ujian.
 *
 * Sumber jumlah siswa:
 * - Bila ujian sudah punya SeatPlan, angka kursi terisi (SeatPlan) dipakai
 *   sebagai sumber utama. Ruang tanpa kursi dianggap 0 siswa.
 * - Bila belum ada SeatPlan sama sekali, dipakai hasil alokasi ruang
 *   (RoomAssignment) agar halaman tetap dapat menampilkan rencana.
 * `source` pada tiap ruang menandai sumber yang dipakai agar tidak ambigu.
 */
export async function getRoomMapData(examConfigId: string): Promise<RoomMapData> {
    if (!examConfigId) throw new Error("examConfigId wajib diisi");

    const [config, rooms, assignments, seatGroups, school] = await Promise.all([
        prisma.examConfig.findUnique({ where: { id: examConfigId } }),
        prisma.room.findMany({ orderBy: { code: "asc" } }),
        prisma.roomAssignment.findMany({ where: { examConfigId } }),
        prisma.seatPlan.groupBy({
            by: ["roomId"],
            where: { examConfigId },
            _count: { _all: true },
        }),
        prisma.schoolIdentity.findFirst(),
    ]);

    if (!config) throw new Error("Konfigurasi ujian tidak ditemukan");

    const seatByRoom = new Map<string, number>(
        seatGroups.map((group) => [group.roomId, group._count._all])
    );
    const assignedByRoom = new Map<string, number>(
        assignments.map((assignment) => [assignment.roomId, assignment.studentCount])
    );

    const hasSeatPlan = seatGroups.length > 0;
    const hasAssignment = assignments.length > 0;

    const mappedRooms: RoomMapRoom[] = rooms.map((room, index) => {
        const seatCount = seatByRoom.get(room.id) ?? 0;
        const assignedCount = assignedByRoom.get(room.id) ?? 0;

        const studentCount = hasSeatPlan ? seatCount : assignedCount;
        const source: RoomMapSource = hasSeatPlan
            ? seatCount > 0
                ? "seat-plan"
                : "none"
            : assignedCount > 0
              ? "assignment"
              : "none";

        const seq = index + 1;

        return {
            id: room.id,
            code: room.code,
            name: room.name,
            capacity: room.capacity,
            floor: room.floor,
            building: room.building?.trim() ? room.building : null,
            seq,
            seqLabel: toRuangLabel(seq),
            studentCount,
            assignedCount,
            status: studentCount > 0 ? "AKTIF" : "NON_AKTIF",
            isFull: room.capacity > 0 && studentCount >= room.capacity,
            source,
        };
    });

    const totalSiswa = mappedRooms.reduce((sum, room) => sum + room.studentCount, 0);
    const totalKapasitas = mappedRooms.reduce((sum, room) => sum + room.capacity, 0);

    const rawSchoolName = school?.name?.trim() || "MADRASAH ALIYAH NEGERI 3 NGAWI";
    const schoolName =
        rawSchoolName.toUpperCase() === "MAN 3 NGAWI"
            ? "MADRASAH ALIYAH NEGERI 3 NGAWI"
            : rawSchoolName.toUpperCase();

    return {
        examConfigId,
        configName: config.name,
        academicYear: config.academicYear,
        semester: config.semester,
        schoolName,
        startDate: config.startDate ? config.startDate.toISOString() : null,
        endDate: config.endDate ? config.endDate.toISOString() : null,
        hasSeatPlan,
        hasAssignment,
        rooms: mappedRooms,
        summary: {
            totalRuang: mappedRooms.length,
            aktif: mappedRooms.filter((room) => room.status === "AKTIF").length,
            nonAktif: mappedRooms.filter((room) => room.status === "NON_AKTIF").length,
            totalSiswa,
            totalKapasitas,
            totalKursiTerisi: mappedRooms.reduce(
                (sum, room) => sum + (seatByRoom.get(room.id) ?? 0),
                0
            ),
        },
    };
}
