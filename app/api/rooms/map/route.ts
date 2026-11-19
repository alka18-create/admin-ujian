import { NextRequest, NextResponse } from "next/server";
import { getRoomMapData } from "@/features/room-map/roomMap.service";
import { requireAuth, handleApiError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;

    const examConfigId = new URL(req.url).searchParams.get("examConfigId") || "";
    if (!examConfigId) {
        return NextResponse.json(
            { success: false, error: "examConfigId wajib diisi" },
            { status: 400 }
        );
    }

    try {
        const data = await getRoomMapData(examConfigId);
        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}
