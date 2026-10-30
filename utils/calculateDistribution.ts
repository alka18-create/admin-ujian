/**
 * Distributes students by filling rooms in order up to each room's capacity.
 * Room capacity represents the number of desks/chairs available based on the
 * room's size, so the first room is filled completely before moving to the next.
 *
 * Class mixing is handled later when seat plans are generated.
 */
export function calculateRoomDistribution(
    studentCount: number,
    rooms: { id: string; capacity: number }[]
): Array<{ roomId: string; studentCount: number }> {
    if (studentCount <= 0) return [];

    const result: Array<{ roomId: string; studentCount: number }> = [];
    let remaining = studentCount;

    for (const room of rooms) {
        if (remaining <= 0) break;
        if (room.capacity <= 0) continue;

        const assigned = Math.min(room.capacity, remaining);
        result.push({ roomId: room.id, studentCount: assigned });
        remaining -= assigned;
    }

    if (remaining > 0) {
        throw new Error(
            `Kapasitas ruang tidak cukup. Masih ada ${remaining} siswa yang belum mendapat ruang.`
        );
    }

    return result;
}
