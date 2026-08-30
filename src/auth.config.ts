import type { NextAuthConfig } from "next-auth";
type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "MANAGER"
  | "SUPERVISOR"
  | "OPERADOR"
  | "OPERATOR"
  | "ANALISTA"
  | "ANALYST";

const publicHttps = (process.env.AUTH_URL ?? process.env.APP_URL ?? "").startsWith("https://");

export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  useSecureCookies: publicHttps || process.env.NODE_ENV === "production",
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: publicHttps || process.env.NODE_ENV === "production",
      },
    },
  },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = (user as { role: Role }).role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (
        pathname.startsWith("/login") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/whatsapp/webhook") ||
        pathname.startsWith("/api/leads/capture") ||
        pathname.startsWith("/api/health") ||
        pathname.startsWith("/api/ready")
      ) {
        return true;
      }
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;
