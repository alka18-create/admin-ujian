import { NextRequest, NextResponse } from "next/server";
import { getExamParticipants } from "@/features/exam-cards/exam-card.service";
import { requireAuth, handleApiError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;

    const { searchParams } = new URL(req.url);
    const examConfigId = searchParams.get("examConfigId");

    if (!examConfigId) {
        return NextResponse.json({ success: false, error: "Exam Config ID is required" }, { status: 400 });
    }

    try {
        const data = await getExamParticipants(examConfigId);
        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}
