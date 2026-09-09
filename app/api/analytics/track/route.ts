import { NextResponse } from "next/server";
import { trackFunnelEvent } from "@/lib/analytics/events";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedEvents = new Set([
  "landing_xm_cta_clicked",
  "landing_register_clicked",
  "landing_demo_clicked"
]);

export async function POST(request: Request) {
  let body: { event_name?: unknown; metadata?: unknown; session_id?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const eventName = typeof body.event_name === "string" ? body.event_name : "";

  if (!allowedEvents.has(eventName)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const metadata = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
    ? (body.metadata as Record<string, unknown>)
    : {};
  const sessionId = typeof body.session_id === "string" ? body.session_id : null;

  await trackFunnelEvent(eventName, metadata, data.user?.id ?? null, sessionId);

  return NextResponse.json({ ok: true });
}
