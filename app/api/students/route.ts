import { NextRequest, NextResponse } from "next/server";
import { getStudents, createStudent } from "@/features/students/student.service";
import { studentSchema } from "@/features/students/student.schema";
import { requireAuth, handleApiError, parsePage } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;
    const { searchParams } = new URL(req.url);
    const page = parsePage(searchParams.get("page"));
    const search = searchParams.get("search") || "";
    const className = searchParams.get("className") || "";
    try {
        if (searchParams.get("all") === "true") {
            const { getAllStudents } = await import("@/features/students/student.service");
            const data = await getAllStudents(className, search);
            return NextResponse.json({ success: true, data });
        }
        const data = await getStudents(page, search, className);
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
        const parsed = studentSchema.safeParse(body);
        if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
        const student = await createStudent(parsed.data);
        return NextResponse.json({ success: true, data: student });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE() {
    const { authorized, response } = await requireAuth(["SUPERADMIN"]);
    if (!authorized) return response;

    try {
        const { deleteAllStudents } = await import("@/features/students/student.service");
        await deleteAllStudents();
        return NextResponse.json({ success: true, message: "Semua data siswa berhasil dihapus" });
    } catch (error) {
        return handleApiError(error);
    }
}
