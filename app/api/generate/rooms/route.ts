import { NextRequest, NextResponse } from "next/server";
import { generateRoomAssignments, getRoomAssignments } from "@/features/room-assignment/roomAssignment.service";
import { requireAuth, handleApiError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;
    const examConfigId = new URL(req.url).searchParams.get("examConfigId") || "";
    try {
        const data = await getRoomAssignments(examConfigId);
        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(req: NextRequest) {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;
    try {
        const { examConfigId } = await req.json();
        if (!examConfigId) return NextResponse.json({ success: false, error: "examConfigId required" }, { status: 400 });
        const result = await generateRoomAssignments(examConfigId);
        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        return handleApiError(error);
    }
}
