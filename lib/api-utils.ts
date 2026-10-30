import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { Session } from "next-auth";

type RequireAuthSuccess = {
    authorized: true;
    response: null;
    session: Session;
};

type RequireAuthFailure = {
    authorized: false;
    response: NextResponse;
    session: Session | null;
};

export async function requireAuth(
    allowedRoles: string[] = ["ADMIN", "SUPERADMIN"]
): Promise<RequireAuthSuccess | RequireAuthFailure> {
    const session = await auth();

    if (!session) {
        return { authorized: false, response: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }), session: null };
    }

    // Pengecekan Role
    const userRole = session.user.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
        return { authorized: false, response: NextResponse.json({ success: false, error: "Forbidden: Akses ditolak" }, { status: 403 }), session };
    }

    return { authorized: true, response: null, session };
}

export function handleApiError(error: unknown) {
    console.error("[API ERROR]", error);

    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
        return NextResponse.json({ success: false, error: "Data tidak valid" }, { status: 400 });
    }

    // Tangkap custom error Prisma
    if (error && typeof error === 'object' && 'code' in error) {
        if ((error as { code?: string }).code === 'P2002') {
             return NextResponse.json({ success: false, error: "Data duplikat: Nilai unik sudah digunakan." }, { status: 400 });
        }
    }

    // Untuk development, mungkin berguna melihat pesan asli, tapi di production kita samarkan
    const isDev = process.env.NODE_ENV === "development";
    const msg = error instanceof Error ? error.message : "Terjadi kesalahan internal pada server.";

    return NextResponse.json(
        { success: false, error: isDev ? msg : "Terjadi kesalahan internal pada server." },
        { status: 500 }
    );
}

export function parsePage(value: string | null, fallback = 1): number {
    const n = Number.parseInt(value ?? "", 10);
    return Number.isFinite(n) && n >= 1 ? n : fallback;
}
