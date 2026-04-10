// src/middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Redirect root to role-appropriate dashboard
    if (path === "/") {
      if (token?.role === "CONSULTANT") {
        return NextResponse.redirect(new URL("/consultant/dashboard", req.url));
      }
      if (token?.role === "LEARNER") {
        return NextResponse.redirect(new URL("/learner/dashboard", req.url));
      }
      if (token?.role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin/dashboard", req.url));
      }
    }

    // Prevent learners accessing consultant routes
    if (path.startsWith("/consultant") && token?.role !== "CONSULTANT" && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    // Prevent consultants accessing learner routes
    if (path.startsWith("/learner") && token?.role !== "LEARNER" && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    // Prevent non-admins accessing admin routes
    if (path.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        // Public paths that don't need auth
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
