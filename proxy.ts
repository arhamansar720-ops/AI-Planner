import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/plan", "/history", "/settings", "/setup", "/chats", "/personalize", "/today", "/insights"];
const SESSION_COOKIE = "forma_session";

/**
 * Keeps signed-out visitors away from private pages. This is only a fast
 * check for the session cookie; every page and API route still verifies the
 * session against the database.
 */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  if (!hasSession && PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
