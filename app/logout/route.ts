import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // GETs, including prefetches and link scanners, must never end a session.
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
