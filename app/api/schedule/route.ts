import { NextRequest, NextResponse } from "next/server";
import {
    getExamConfigs, getSchedulesByConfig,
    createExamConfig, createExamSchedule,
    updateExamConfig, deleteExamConfig, updateExamSchedule
} from "@/features/schedule/schedule.service";
import { examConfigSchema, examScheduleSchema } from "@/features/schedule/schedule.schema";
import { requireAuth, handleApiError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type"); // "configs" | "schedules"
    const examConfigId = searchParams.get("examConfigId") || "";
    try {
        if (type === "schedules" && examConfigId) {
            const data = await getSchedulesByConfig(examConfigId);
            return NextResponse.json({ success: true, data });
        }
        const data = await getExamConfigs();
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
        const { type, ...data } = body;
        if (type === "schedule") {
            const parsed = examScheduleSchema.safeParse(data);
            if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
            const schedule = await createExamSchedule(parsed.data);
            return NextResponse.json({ success: true, data: schedule });
        }
        const parsed = examConfigSchema.safeParse(data);
        if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
        const config = await createExamConfig(parsed.data);
        return NextResponse.json({ success: true, data: config });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(req: NextRequest) {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;
    try {
        const body = await req.json();

        // Schedule update
        if (body.type === "schedule") {
            const { id, ...data } = body;
            if (!id) return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });

            const parsed = examScheduleSchema.safeParse(data);
            if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });

            const schedule = await updateExamSchedule(id, parsed.data);
            return NextResponse.json({ success: true, data: schedule });
        }

        // ExamConfig update
        const { id, ...data } = body;
        if (!id) return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });

        const parsed = examConfigSchema.safeParse(data);
        if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });

        const config = await updateExamConfig(id, parsed.data);
        return NextResponse.json({ success: true, data: config });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(req: NextRequest) {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });

        await deleteExamConfig(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
