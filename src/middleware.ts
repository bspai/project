// src/middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const roles = token?.roles ?? [];

    // Redirect root to role-appropriate dashboard
    if (path === "/") {
      if (roles.includes("ADMIN"))      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
      if (roles.includes("CONSULTANT")) return NextResponse.redirect(new URL("/consultant/dashboard", req.url));
      if (roles.includes("MENTOR"))     return NextResponse.redirect(new URL("/mentor/dashboard", req.url));
      if (roles.includes("LEARNER"))    return NextResponse.redirect(new URL("/learner/dashboard", req.url));
    }

    // Consultant routes — CONSULTANT or ADMIN only
    if (path.startsWith("/consultant") && !roles.includes("CONSULTANT") && !roles.includes("ADMIN")) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    // Learner routes — LEARNER, MENTOR (can also take courses), or ADMIN
    if (
      path.startsWith("/learner") &&
      !roles.includes("LEARNER") &&
      !roles.includes("MENTOR") &&
      !roles.includes("ADMIN")
    ) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    // Mentor routes — MENTOR or ADMIN only
    if (path.startsWith("/mentor") && !roles.includes("MENTOR") && !roles.includes("ADMIN")) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    // Admin routes — ADMIN only
    if (path.startsWith("/admin") && !roles.includes("ADMIN")) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        const publicPaths = ["/login", "/register", "/unauthorized", "/accept-invite", "/api/admin/accept-invite"];
        if (publicPaths.some((p) => path.startsWith(p))) return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
