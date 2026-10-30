import { prisma } from "@/lib/prisma";

export async function getExamParticipants(examConfigId: string) {
    // Optimization: fetch students with their assigned seats, the exam config, and school identity
    const [seatPlans, exam, school] = await Promise.all([
        prisma.seatPlan.findMany({
            where: {
                examConfigId,
                room: { roomAssignments: { some: { examConfigId } } },
            },
            include: {
                student: true,
                room: true
            },
            orderBy: [
                { room: { code: 'asc' } },
                { seatRow: 'asc' },
                { seatCol: 'asc' }
            ]
        }),
        prisma.examConfig.findUnique({
            where: { id: examConfigId },
            select: { name: true, academicYear: true, semester: true }
        }),
        prisma.schoolIdentity.findFirst()
    ]);

    const students = seatPlans.map(plan => ({
        id: plan.student.id,
        nis: plan.student.nis,
        nisn: plan.student.nisn,
        name: plan.student.name,
        className: plan.student.className,
        roomName: plan.room.name,
        roomCode: plan.room.code,
        seatLabel: plan.seatLabel,
        gender: plan.student.gender
    }));

    return {
        exam,
        school,
        students
    };
}
