import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  const destination = new URL("/login", request.url);
  destination.searchParams.set("message", "We could not complete sign-in from this link. If your email is confirmed, sign in below. Otherwise use a fresh confirmation email in the browser where you registered.");
  return NextResponse.redirect(destination);
}
