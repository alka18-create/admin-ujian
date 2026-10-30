import { prisma } from "@/lib/prisma";
import type { TeacherInput } from "./teacher.schema";
import { ITEMS_PER_PAGE } from "@/lib/constants";

export async function getTeachers(page = 1, search = "") {
    const skip = (page - 1) * ITEMS_PER_PAGE;
    const where = search
        ? {
            OR: [
                { name: { contains: search } },
                { nip: { contains: search } },
                { subject: { contains: search } },
            ],
        }
        : {};

    const [data, total] = await Promise.all([
        prisma.teacher.findMany({
            where,
            skip,
            take: ITEMS_PER_PAGE,
            orderBy: { createdAt: "asc" },
        }),
        prisma.teacher.count({ where }),
    ]);

    return { data, total, page, perPage: ITEMS_PER_PAGE, totalPages: Math.ceil(total / ITEMS_PER_PAGE) };
}

export async function getTeacherById(id: string) {
    return prisma.teacher.findUnique({ where: { id } });
}

export async function createTeacher(data: TeacherInput) {
    return prisma.teacher.create({
        data: {
            ...data,
            email: data.email || null,
            isActive: data.isActive ?? true,
        },
    });
}

export async function updateTeacher(id: string, data: TeacherInput) {
    return prisma.teacher.update({
        where: { id },
        data: {
            ...data,
            email: data.email || null,
            isActive: data.isActive ?? true,
        },
    });
}

export async function deleteTeacher(id: string) {
    return prisma.teacher.delete({ where: { id } });
}

export async function deleteAllTeachers() {
    return prisma.teacher.deleteMany();
}

export async function getAllTeachers(search = "") {
    const where = search
        ? {
            OR: [
                { name: { contains: search } },
                { nip: { contains: search } },
                { code: { contains: search } },
                { subject: { contains: search } },
            ],
        }
        : {};

    return prisma.teacher.findMany({ where, orderBy: { createdAt: "asc" } });
}
