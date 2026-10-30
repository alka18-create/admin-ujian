import { NextRequest, NextResponse } from "next/server";
import { getRooms, createRoom } from "@/features/rooms/room.service";
import { roomSchema } from "@/features/rooms/room.schema";
import { requireAuth, handleApiError, parsePage } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;
    const { searchParams } = new URL(req.url);
    const page = parsePage(searchParams.get("page"));
    const search = searchParams.get("search") || "";
    try {
        if (searchParams.get("all") === "true") {
            const { getAllRooms } = await import("@/features/rooms/room.service");
            const data = await getAllRooms(search);
            return NextResponse.json({ success: true, data });
        }
        const data = await getRooms(page, search);
        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(req: NextRequest) {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;
    try {
        const body = await req.json();
        const parsed = roomSchema.safeParse(body);
        if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
        const room = await createRoom(parsed.data);
        return NextResponse.json({ success: true, data: room });
    } catch (error) {
        return handleApiError(error);
    }
}
