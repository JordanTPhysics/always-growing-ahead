import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/lib/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Serve stored media from the files API so `.jpg` / `.mp4` are not treated
  // as missing public assets, and so next-intl does not locale-prefix them.
  if (pathname.startsWith("/uploads")) {
    const url = request.nextUrl.clone();
    url.pathname = `/api/files${pathname.slice("/uploads".length)}`;
    return NextResponse.rewrite(url);
  }

  // Keep API + Auth.js routes out of locale rewriting.
  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!api|_next|_netlify|uploads|.*\\..*).*)",
    "/uploads/:path*",
  ],
};
