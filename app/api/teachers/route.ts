import { NextRequest, NextResponse } from "next/server";
import { getTeachers, createTeacher } from "@/features/teachers/teacher.service";
import { teacherSchema } from "@/features/teachers/teacher.schema";
import { requireAuth, handleApiError, parsePage } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;

    const { searchParams } = new URL(req.url);
    const page = parsePage(searchParams.get("page"));
    const search = searchParams.get("search") || "";

    try {
        if (searchParams.get("all") === "true") {
            const { getAllTeachers } = await import("@/features/teachers/teacher.service");
            const data = await getAllTeachers(search);
            return NextResponse.json({ success: true, data });
        }
        const data = await getTeachers(page, search);
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
        const parsed = teacherSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
        }
        const teacher = await createTeacher(parsed.data);
        return NextResponse.json({ success: true, data: teacher });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE() {
    const { authorized, response } = await requireAuth(["SUPERADMIN"]);
    if (!authorized) return response;

    try {
        const { deleteAllTeachers } = await import("@/features/teachers/teacher.service");
        await deleteAllTeachers();
        return NextResponse.json({ success: true, message: "Semua data guru berhasil dihapus" });
    } catch (error) {
        return handleApiError(error);
    }
}
