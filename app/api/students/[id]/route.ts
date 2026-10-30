import { NextRequest, NextResponse } from "next/server";
import { getStudentById, updateStudent, deleteStudent } from "@/features/students/student.service";
import { studentSchema } from "@/features/students/student.schema";
import { requireAuth, handleApiError } from "@/lib/api-utils";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;
    const { id } = await params;
    try {
        const student = await getStudentById(id);
        if (!student) return NextResponse.json({ success: false, error: "Tidak ditemukan" }, { status: 404 });
        return NextResponse.json({ success: true, data: student });
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
        const parsed = studentSchema.safeParse(body);
        if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
        const student = await updateStudent(id, parsed.data);
        return NextResponse.json({ success: true, data: student });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;
    const { id } = await params;
    try {
        await deleteStudent(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
