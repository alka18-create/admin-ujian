import { NextRequest, NextResponse } from "next/server";
import { getRoomById, updateRoom, deleteRoom } from "@/features/rooms/room.service";
import { roomSchema } from "@/features/rooms/room.schema";
import { requireAuth, handleApiError } from "@/lib/api-utils";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;
    const { id } = await params;
    try {
        const room = await getRoomById(id);
        if (!room) return NextResponse.json({ success: false, error: "Tidak ditemukan" }, { status: 404 });
        return NextResponse.json({ success: true, data: room });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;
    const { id } = await params;
    try {
        const body = await req.json();
        const parsed = roomSchema.safeParse(body);
        if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
        const room = await updateRoom(id, parsed.data);
        return NextResponse.json({ success: true, data: room });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;
    const { id } = await params;
    try {
        await deleteRoom(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
