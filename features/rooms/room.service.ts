import { prisma } from "@/lib/prisma";
import type { RoomInput } from "./room.schema";
import { ITEMS_PER_PAGE } from "@/lib/constants";

export async function getRooms(page = 1, search = "") {
    const skip = (page - 1) * ITEMS_PER_PAGE;
    const where = search
        ? { OR: [{ name: { contains: search } }, { code: { contains: search } }] }
        : {};

    const [data, total] = await Promise.all([
        prisma.room.findMany({ where, skip, take: ITEMS_PER_PAGE, orderBy: { code: "asc" } }),
        prisma.room.count({ where }),
    ]);

    return { data, total, page, perPage: ITEMS_PER_PAGE, totalPages: Math.ceil(total / ITEMS_PER_PAGE) };
}

export async function getRoomById(id: string) {
    return prisma.room.findUnique({ where: { id } });
}

export async function createRoom(data: RoomInput) {
    return prisma.room.create({ data });
}

export async function updateRoom(id: string, data: RoomInput) {
    return prisma.room.update({ where: { id }, data });
}

export async function deleteRoom(id: string) {
    return prisma.room.delete({ where: { id } });
}

export async function getAllRooms(search = "") {
    const where = search
        ? { OR: [{ name: { contains: search } }, { code: { contains: search } }] }
        : {};

    return prisma.room.findMany({ where, orderBy: { code: "asc" } });
}
