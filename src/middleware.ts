import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";
import { canAccessPath } from "@/lib/route-access";
import type { Role } from "@prisma/client";

const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/whatsapp/webhook") ||
    pathname.startsWith("/api/leads/capture") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/_next")
  ) {
    if (pathname.startsWith("/login") && request.auth?.user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }
  if (!request.auth?.user && !pathname.startsWith("/api")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/login") url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  if (!request.auth?.user && pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const role = request.auth?.user?.role as Role | undefined;
  if (role && !pathname.startsWith("/api") && !canAccessPath(role, pathname)) {
    return NextResponse.redirect(new URL("/dashboard?forbidden=1", request.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
