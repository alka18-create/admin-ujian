import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/api-utils";

export async function DELETE(
    _: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { authorized, response } = await requireAuth();
    if (!authorized) return response;

    const { id } = await params;
    try {
        await prisma.examSchedule.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
}
