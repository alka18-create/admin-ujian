import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function requireSession() {
    const session = await auth();
    if (!session?.user) {
        redirect("/login");
    }
    return session;
}

export async function requireRole(allowedRoles: string[]) {
    const session = await requireSession();
    const role = session.user.role;
    if (!allowedRoles.includes(role)) {
        redirect("/dashboard");
    }
    return session;
}
