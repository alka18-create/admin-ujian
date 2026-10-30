import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedPaths = ["/dashboard", "/master", "/exam", "/export"];

export async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;
    const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
    const isLoginPage = pathname === "/login";

    const token = await getToken({
        req,
        secret: process.env.AUTH_SECRET,
    });

    if (isProtected && !token) {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    if (isLoginPage && token) {
        const url = req.nextUrl.clone();
        url.pathname = "/dashboard";
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
