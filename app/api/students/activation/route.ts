import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api-utils";
import { getClassesWithActiveStatus, updateClassActivation } from "@/features/students/student.service";

export async function GET() {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;

    try {
        const data = await getClassesWithActiveStatus();
        return NextResponse.json({ success: true, data });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(req: NextRequest) {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;

    try {
        const body = await req.json();
        // body.activeClasses should be an array of strings (class names)
        if (!Array.isArray(body.activeClasses)) {
            return NextResponse.json({ success: false, error: "Invalid data format. Expected activeClasses array." }, { status: 400 });
        }

        await updateClassActivation(body.activeClasses);
        return NextResponse.json({ success: true, message: "Status peserta ujian berhasil diperbarui" });
    } catch (error) {
        return handleApiError(error);
    }
}
