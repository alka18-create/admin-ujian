import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const identity = await prisma.schoolIdentity.findFirst({
            select: { logo: true, updatedAt: true },
        });

        if (!identity?.logo) {
            return new NextResponse(null, { status: 404 });
        }

        const match = identity.logo.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (!match) {
            return new NextResponse(null, { status: 404 });
        }

        const mimeType = match[1];
        const buffer = Buffer.from(match[2], "base64");

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": mimeType,
                "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
            },
        });
    } catch {
        return new NextResponse(null, { status: 500 });
    }
}

