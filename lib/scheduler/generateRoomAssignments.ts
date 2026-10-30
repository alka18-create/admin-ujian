import { Student, Room } from "@/types/student";
import { shuffle } from "@/utils/shuffle";

export interface Assignment {
    student_id: string;
    room_id: string;
    seat_number: number;
}

export interface RoomAssignmentResult {
    assignments: Assignment[];
    /** Ringkasan: berapa siswa per ruang */
    summary: Record<string, number>;
}

/**
 * Mendistribusikan siswa ke ruang ujian secara merata dengan metode round-robin
 * sehingga siswa dari kelas yang sama tidak berdekatan.
 *
 * Algoritma:
 * 1. Kelompokkan siswa berdasarkan kelas
 * 2. Shuffle setiap kelompok kelas (acak urutan dalam kelas)
 * 3. Gabungkan secara round-robin antar kelas → siswa tercampur
 * 4. Shuffle daftar ruang agar distribusi tidak deterministik
 * 5. Isi ruang satu per satu sesuai kapasitas
 *
 * Kompleksitas: O(n) untuk n siswa
 *
 * @throws Error jika total kapasitas ruang < jumlah siswa
 */
export function generateRoomAssignments(
    students: Student[],
    rooms: Room[]
): RoomAssignmentResult {
    if (students.length === 0) return { assignments: [], summary: {} };

    // Validasi kapasitas total
    const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);
    if (totalCapacity < students.length) {
        throw new Error(
            `Kapasitas ruang tidak cukup. Total kapasitas: ${totalCapacity}, jumlah siswa: ${students.length}`
        );
    }

    // ── 1. Kelompokkan siswa berdasarkan kelas ──────────────────────────────
    const classGroups: Record<string, Student[]> = {};
    for (const student of students) {
        if (!classGroups[student.class]) classGroups[student.class] = [];
        classGroups[student.class].push(student);
    }

    // ── 2. Shuffle setiap kelompok kelas ──────────────────────────────────
    for (const cls of Object.keys(classGroups)) {
        classGroups[cls] = shuffle(classGroups[cls]);
    }

    // ── 3. Round-robin antar kelas ─────────────────────────────────────────
    //  Contoh: A=[a1,a2], B=[b1,b2], C=[c1]
    //  Hasil : [a1, b1, c1, a2, b2]
    const mixedStudents: Student[] = [];
    const classKeys = Object.keys(classGroups);

    let hasMore = true;
    while (hasMore) {
        hasMore = false;
        for (const cls of classKeys) {
            const student = classGroups[cls].shift();
            if (student) {
                mixedStudents.push(student);
                hasMore = true;
            }
        }
    }

    // ── 4. Shuffle daftar ruang ────────────────────────────────────────────
    const shuffledRooms = shuffle(rooms);

    // ── 5. Distribusikan ke ruang sesuai kapasitas ────────────────────────
    const assignments: Assignment[] = [];
    const summary: Record<string, number> = {};

    let roomIndex = 0;
    let seatNumber = 1;

    for (const student of mixedStudents) {
        // Lewati ruang yang sudah penuh (kapasitas 0 atau sudah dilewati)
        while (roomIndex < shuffledRooms.length && seatNumber > shuffledRooms[roomIndex].capacity) {
            roomIndex++;
            seatNumber = 1;
        }

        if (roomIndex >= shuffledRooms.length) {
            // Seharusnya tidak terjadi karena sudah divalidasi di atas
            throw new Error("Jumlah ruang tidak cukup untuk menampung semua siswa");
        }

        const room = shuffledRooms[roomIndex];

        assignments.push({
            student_id: student.id,
            room_id: room.id,
            seat_number: seatNumber,
        });

        // Update summary
        summary[room.id] = (summary[room.id] ?? 0) + 1;

        seatNumber++;
    }

    return { assignments, summary };
}
