import { prisma } from "@/lib/prisma";
import type { ExamConfigInput, ExamScheduleInput } from "./schedule.schema";

export async function getExamConfigs() {
    return prisma.examConfig.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getActiveExamConfig() {
    return prisma.examConfig.findFirst({ where: { isActive: true } });
}

export async function getExamConfigById(id: string) {
    return prisma.examConfig.findUnique({
        where: { id },
        include: { schedules: { orderBy: [{ date: "asc" }, { session: "asc" }] } },
    });
}

export async function createExamConfig(data: ExamConfigInput) {
    if (data.isActive) {
        await prisma.examConfig.updateMany({ data: { isActive: false } });
    }
    return prisma.examConfig.create({
        data: {
            ...data,
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
        },
    });
}

export async function updateExamConfig(id: string, data: ExamConfigInput) {
    if (data.isActive) {
        await prisma.examConfig.updateMany({
            where: { id: { not: id } },
            data: { isActive: false },
        });
    }
    return prisma.examConfig.update({
        where: { id },
        data: {
            ...data,
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
        },
    });
}

export async function deleteExamConfig(id: string) {
    return prisma.examConfig.delete({ where: { id } });
}

export async function getSchedulesByConfig(examConfigId: string) {
    return prisma.examSchedule.findMany({
        where: { examConfigId },
        orderBy: [{ date: "asc" }, { session: "asc" }],
    });
}

export async function createExamSchedule(data: ExamScheduleInput) {
    return prisma.examSchedule.create({
        data: { ...data, date: new Date(data.date), session: Number(data.session) },
    });
}

export async function updateExamSchedule(id: string, data: ExamScheduleInput) {
    return prisma.examSchedule.update({
        where: { id },
        data: { ...data, date: new Date(data.date), session: Number(data.session) },
    });
}

export async function deleteExamSchedule(id: string) {
    return prisma.examSchedule.delete({ where: { id } });
}
