import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export const proxy = async (request: NextRequest) => {
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySession(cookie)) return NextResponse.next();

  const response = NextResponse.redirect(new URL("/login", request.url));
  if (cookie) response.cookies.delete(SESSION_COOKIE);
  return response;
};

export const config = {
  matcher: ["/((?!login|api/session|_next/static|_next/image|favicon.ico).*)"],
};
