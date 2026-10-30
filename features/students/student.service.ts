import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { StudentInput } from "./student.schema";
import { ITEMS_PER_PAGE } from "@/lib/constants";

export async function getStudents(page = 1, search = "", className = "") {
    const skip = (page - 1) * ITEMS_PER_PAGE;
    const where: Prisma.StudentWhereInput = {};
    if (search) {
        where.OR = [
            { name: { contains: search } },
            { nis: { contains: search } },
            { nisn: { contains: search } },
        ];
    }
    if (className) where.className = className;

    const [data, total] = await Promise.all([
        prisma.student.findMany({
            where,
            skip,
            take: ITEMS_PER_PAGE,
            orderBy: [{ className: "asc" }, { name: "asc" }],
        }),
        prisma.student.count({ where }),
    ]);

    return { data, total, page, perPage: ITEMS_PER_PAGE, totalPages: Math.ceil(total / ITEMS_PER_PAGE) };
}

export async function getStudentById(id: string) {
    return prisma.student.findUnique({ where: { id } });
}

export async function createStudent(data: StudentInput) {
    return prisma.student.create({ data });
}

export async function updateStudent(id: string, data: StudentInput) {
    return prisma.student.update({ where: { id }, data });
}

export async function deleteStudent(id: string) {
    return prisma.student.delete({ where: { id } });
}

export async function deleteAllStudents() {
    return prisma.student.deleteMany({});
}

export async function getAllStudents(className?: string, search = "") {
    const where: Prisma.StudentWhereInput = {};

    if (className) where.className = className;
    if (search) {
        where.OR = [
            { name: { contains: search } },
            { nis: { contains: search } },
            { nisn: { contains: search } },
        ];
    }

    return prisma.student.findMany({
        where,
        orderBy: [{ className: "asc" }, { name: "asc" }],
    });
}

export async function getStudentClasses() {
    const students = await prisma.student.findMany({
        select: { className: true },
        distinct: ["className"],
        orderBy: { className: "asc" },
    });
    return students.map((s) => s.className);
}

export async function getClassesWithActiveStatus() {
    const classes = await prisma.student.groupBy({
        by: ['className', 'isActive'],
        orderBy: { className: 'asc' },
    });

    const resultMap = new Map<string, boolean>();
    for (const c of classes) {
        if (!resultMap.has(c.className)) {
            resultMap.set(c.className, c.isActive);
        } else if (c.isActive) {
            resultMap.set(c.className, true); // If mixed, treat as active for the toggle
        }
    }

    return Array.from(resultMap.entries()).map(([className, isActive]) => ({ className, isActive }));
}

export async function updateClassActivation(activeClasses: string[]) {
    return prisma.$transaction([
        prisma.student.updateMany({
            data: { isActive: false }
        }),
        ...(activeClasses.length > 0 ? [
            prisma.student.updateMany({
                where: { className: { in: activeClasses } },
                data: { isActive: true }
            })
        ] : [])
    ]);
}
