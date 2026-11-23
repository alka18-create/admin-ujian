import { NextRequest, NextResponse } from "next/server";
import { generateSeatPlans, getSeatPlanByRoom, getSeatPlansByConfig, type DeskType } from "@/features/seat-plan/seatPlan.service";
import { requireAuth, handleApiError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;

    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId") || "";
    const examConfigId = searchParams.get("examConfigId") || "";

    try {
        if (examConfigId) {
            const data = await getSeatPlansByConfig(examConfigId);
            return NextResponse.json({ success: true, data });
        }
        const data = await getSeatPlanByRoom(roomId);
        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(req: NextRequest) {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;
    try {
        const { examConfigId, deskType = "double_diff_grade" } = await req.json();
        if (!examConfigId) return NextResponse.json({ success: false, error: "examConfigId required" }, { status: 400 });
        const validDeskTypes: DeskType[] = ["single", "double", "double_diff_grade"];
        const resolvedDeskType: DeskType = validDeskTypes.includes(deskType) ? deskType : "double_diff_grade";
        const result = await generateSeatPlans(examConfigId, resolvedDeskType);
        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        return handleApiError(error);
    }
}
