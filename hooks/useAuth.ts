"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function useAuth(redirectTo?: string) {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "unauthenticated" && redirectTo) {
            router.push(redirectTo);
        }
    }, [status, redirectTo, router]);

    return {
        user: session?.user,
        role: (session?.user as { role?: string } | undefined)?.role,
        isLoading: status === "loading",
        isAuthenticated: status === "authenticated",
    };
}
