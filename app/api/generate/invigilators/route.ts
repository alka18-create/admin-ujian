import { NextRequest, NextResponse } from "next/server";
import { generateInvigilators, getInvigilatorsByConfig, getSupervisionRecap } from "@/features/invigilators/invigilator.service";
import { requireAuth, handleApiError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;
    const { searchParams } = new URL(req.url);
    const examConfigId = searchParams.get("examConfigId") || "";
    const recap = searchParams.get("recap") === "1";
    try {
        if (recap) {
            const data = await getSupervisionRecap(examConfigId);
            return NextResponse.json({ success: true, data });
        }
        const data = await getInvigilatorsByConfig(examConfigId);
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
        const result = await generateInvigilators(examConfigId);
        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        return handleApiError(error);
    }
}
