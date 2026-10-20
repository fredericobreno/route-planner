import { type NextRequest, NextResponse } from "next/server";
import {
  createSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
} from "@/lib/session";

export const POST = async (request: NextRequest) => {
  const body = await request.json().catch(() => null);
  const idToken = body?.idToken;
  if (typeof idToken !== "string") {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

  let session: string | null;
  try {
    session = await createSession(idToken);
  } catch (error) {
    console.error("Failed to create session", error);
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }
  if (!session) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });
  return response;
};

export const DELETE = () => {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
};
