import { NextRequest, NextResponse } from "next/server";
import { getTeacherById, updateTeacher, deleteTeacher } from "@/features/teachers/teacher.service";
import { teacherSchema } from "@/features/teachers/teacher.schema";
import { requireAuth, handleApiError } from "@/lib/api-utils";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;
    const { id } = await params;
    try {
        const teacher = await getTeacherById(id);
        if (!teacher) return NextResponse.json({ success: false, error: "Tidak ditemukan" }, { status: 404 });
        return NextResponse.json({ success: true, data: teacher });
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
        const parsed = teacherSchema.safeParse(body);
        if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
        const teacher = await updateTeacher(id, parsed.data);
        return NextResponse.json({ success: true, data: teacher });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;
    const { id } = await params;
    try {
        await deleteTeacher(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
