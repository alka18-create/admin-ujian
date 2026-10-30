import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { shuffle } from "@/utils/shuffle";

// Day-of-week mapping: JS getDay() = 0(Sun),1(Mon),...,6(Sat)
// We use 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
function getDayNumber(date: Date): number {
    const d = date.getDay(); // 0=Sun
    return d === 0 ? 7 : d;  // map Sun→7 to keep Mon=1..Sat=6
}

/**
 * Check if a teacher is available on a given date.
 * If availableDays is null/empty → available on all days.
 */
function isAvailableOnDay(availableDays: string | null, date: Date): boolean {
    if (!availableDays || availableDays.trim() === "") return true;
    const day = getDayNumber(date);
    return availableDays.split(",").map(Number).includes(day);
}

/**
 * Generates invigilator assignments for each exam schedule session.
 * Constraints applied:
 *  - teacher.availableDays: teacher only assigned on days they are available
 *  - teacher.maxSessions: teacher not assigned more than N times total
 * Uses round-robin rotation across sessions.
 */
export async function generateInvigilators(examConfigId: string) {
    const [schedules, assignments, teachers] = await Promise.all([
        prisma.examSchedule.findMany({
            where: { examConfigId },
            orderBy: [{ date: "asc" }, { session: "asc" }],
        }),
        prisma.roomAssignment.findMany({
            where: { examConfigId },
            include: { room: true },
        }),
        prisma.teacher.findMany({
            where: { isActive: true },
            orderBy: { createdAt: "asc" },
        }),
    ]);

    if (schedules.length === 0) throw new Error("Belum ada jadwal ujian");
    if (assignments.length === 0) throw new Error("Alokasi ruang belum dibuat");

    // Delete existing invigilators and insert new ones atomically at the end

    // Group schedules by Date + Session. Parallel schedules (e.g. different
    // subjects taken by different classes at the same time) share the same
    // invigilator/room assignment, so every schedule in the group receives the
    // same supervisor rows.
    const sessionsByKey = new Map<string, typeof schedules>();
    for (const schedule of schedules) {
        const key = `${schedule.date.getTime()}-${schedule.session}`;
        const group = sessionsByKey.get(key);
        if (group) group.push(schedule);
        else sessionsByKey.set(key, [schedule]);
    }
    const sessionList = Array.from(sessionsByKey.values());

    const allInvigilators: Prisma.InvigilatorCreateManyInput[] = [];
    let dutyCount = 0;

    // Track how many sessions each teacher has been assigned
    const sessionCount: Record<string, number> = {};
    for (const t of teachers) sessionCount[t.id] = 0;

    // Track which rooms each teacher has already supervised to prevent duplicate room assignments
    const supervisedRooms = new Map<string, Set<string>>(); // teacherId -> Set<roomId>
    for (const t of teachers) supervisedRooms.set(t.id, new Set());

    for (let i = 0; i < sessionList.length; i++) {
        const sessionSchedules = sessionList[i];
        const schedule = sessionSchedules[0];
        const date = schedule.date;

        // Base eligible teachers for this schedule (checks days and max sessions)
        const baseEligible = teachers.filter((t) => {
            if (!isAvailableOnDay(t.availableDays, date)) return false;
            if (t.maxSessions !== null && t.maxSessions !== undefined) {
                if (sessionCount[t.id] >= t.maxSessions) return false;
            }
            return true;
        });

        if (baseEligible.length < assignments.length) {
            const dayNames = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
            const dayName = dayNames[getDayNumber(date)];
            throw new Error(
                `Tidak cukup guru tersedia untuk sesi ${schedule.session} hari ${dayName} ` +
                `(${date.toLocaleDateString("id-ID")}). ` +
                `Diperlukan: ${assignments.length} guru, tersedia: ${baseEligible.length} guru.`
            );
        }

        // To assign rooms for this session, we iterate rooms and find the best teacher.
        // We shuffle eligible to keep it random, but prioritize those who haven't supervised this room.
        const currentEligible = shuffle([...baseEligible]);

        // Prioritize teachers who have supervised the fewest sessions so far
        currentEligible.sort((a, b) => {
            const countA = sessionCount[a.id] || 0;
            const countB = sessionCount[b.id] || 0;

            // 1. Prioritize teachers who have supervised the FEWEST sessions so far.
            if (countA !== countB) {
                return countA - countB;
            }

            // 2. If tied on session count, prioritize those with higher capacity (maxSessions).
            // Treat null (unlimited) as Infinity so they don't get penalized compared to limited teachers.
            const maxA = a.maxSessions ?? Infinity;
            const maxB = b.maxSessions ?? Infinity;
            return maxB - maxA;
        });

        for (let j = 0; j < assignments.length; j++) {
            const roomId = assignments[j].roomId;

            // Find a teacher who hasn't supervised this room yet
            let selectedIndex = currentEligible.findIndex(t => !supervisedRooms.get(t.id)!.has(roomId));

            // Fallback: if all eligible teachers have supervised this room, just pick the first one
            // This happens if the number of sessions exceeds the number of available rooms
            if (selectedIndex === -1) {
                selectedIndex = 0;
            }

            const teacher = currentEligible[selectedIndex];

            // Remove the selected teacher from current eligible list so they don't double-invigilate in the same session
            currentEligible.splice(selectedIndex, 1);

            // Attach the same supervisor to every parallel schedule in this
            // session so reports never omit a subject/schedule row.
            for (const sessionSchedule of sessionSchedules) {
                allInvigilators.push({
                    examScheduleId: sessionSchedule.id,
                    teacherId: teacher.id,
                    roomId: roomId,
                    session: sessionSchedule.session,
                });
            }
            dutyCount++;
            sessionCount[teacher.id]++;
            supervisedRooms.get(teacher.id)!.add(roomId);
        }
    }

    await prisma.$transaction([
        prisma.invigilator.deleteMany({
            where: { examScheduleId: { in: schedules.map((s) => s.id) } },
        }),
        prisma.invigilator.createMany({ data: allInvigilators })
    ]);

    return { total: dutyCount, rows: allInvigilators.length };
}

export async function getInvigilatorsBySchedule(examScheduleId: string) {
    return prisma.invigilator.findMany({
        where: { examScheduleId },
        include: { teacher: true, room: true },
        orderBy: { room: { code: "asc" } },
    });
}

export async function getInvigilatorsByConfig(examConfigId: string) {
    const invigilators = await prisma.invigilator.findMany({
        where: { examSchedule: { examConfigId } },
        include: { teacher: true, room: true, examSchedule: true },
        orderBy: [{ examSchedule: { date: "asc" } }, { room: { code: "asc" } }],
    });

    const roomIds = Array.from(new Set(invigilators.map(i => i.roomId)));
    const seatPlans = await prisma.seatPlan.findMany({
        where: {
            examConfigId,
            roomId: { in: roomIds },
        },
        select: { roomId: true, student: { select: { className: true } } }
    });

    const roomClassesMap = new Map<string, Set<string>>();
    seatPlans.forEach(sp => {
        if (!roomClassesMap.has(sp.roomId)) roomClassesMap.set(sp.roomId, new Set());
        roomClassesMap.get(sp.roomId)!.add(sp.student.className);
    });

    return invigilators.map(inv => ({
        ...inv,
        room: {
            ...inv.room,
            classes: Array.from(roomClassesMap.get(inv.roomId) || [])
        }
    }));
}

/**
 * Get supervision count per teacher for a given exam config.
 * Parallel schedules in the same session produce multiple rows per duty, so the
 * count is based on unique date+session combinations, not raw rows.
 * Returns array of { teacher, count } sorted by count descending.
 */
export async function getSupervisionRecap(examConfigId: string) {
    const invigs = await prisma.invigilator.findMany({
        where: { examSchedule: { examConfigId } },
        include: {
            teacher: true,
            examSchedule: { select: { date: true, session: true } },
        },
    });

    const countMap = new Map<string, { teacher: typeof invigs[0]["teacher"]; sessions: Set<string> }>();
    for (const inv of invigs) {
        if (!inv.teacher) continue;
        if (!countMap.has(inv.teacherId)) {
            countMap.set(inv.teacherId, { teacher: inv.teacher, sessions: new Set() });
        }
        countMap.get(inv.teacherId)!.sessions.add(
            `${inv.examSchedule.date.getTime()}-${inv.examSchedule.session}`
        );
    }

    return Array.from(countMap.values())
        .map(({ teacher, sessions }) => ({ teacher, count: sessions.size }))
        .sort((a, b) => b.count - a.count);
}
