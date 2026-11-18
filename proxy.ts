import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";

const protectedPaths = ["/dashboard", "/master", "/exam", "/export"];

/**
 * NextAuth v5 memakai nama cookie berbeda untuk HTTPS:
 * - HTTP  : `authjs.session-token`
 * - HTTPS : `__Secure-authjs.session-token` (sekaligus menjadi salt JWT)
 *
 * `getToken()` default-nya selalu memakai nama non-secure, sehingga di Vercel
 * (HTTPS) token tidak pernah terbaca dan semua halaman terproteksi memantul
 * kembali ke /login (login loop). Karena itu `secureCookie` harus ditentukan
 * dari protokol request.
 */
async function readToken(req: NextRequest): Promise<JWT | null> {
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) return null;

    const isSecure =
        req.nextUrl.protocol === "https:" ||
        req.headers.get("x-forwarded-proto") === "https";

    const token = await getToken({ req, secret, secureCookie: isSecure });
    if (token) return token;

    // Fallback: jaga-jaga bila protokol request dan AUTH_URL tidak selaras
    // (mis. AUTH_URL masih http), coba nama cookie versi satunya.
    return getToken({ req, secret, secureCookie: !isSecure });
}

export async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
    const isLoginPage = pathname === "/login";

    const token = await readToken(req);

    if (isProtected && !token) {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        // Jangan bawa query lama (mis. ?error=...) ke halaman login.
        url.search = "";
        return NextResponse.redirect(url);
    }

    if (isLoginPage && token) {
        const url = req.nextUrl.clone();
        url.pathname = "/dashboard";
        url.search = "";
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/master/:path*",
        "/exam/:path*",
        "/export/:path*",
        "/login",
    ],
};
