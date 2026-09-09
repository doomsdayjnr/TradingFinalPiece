import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type QueryClient = {
  from: (table: string) => any;
};

export async function trackFunnelEvent(
  eventName: string,
  metadata: Record<string, unknown> = {},
  userId?: string | null,
  sessionId?: string | null
) {
  const admin = createSupabaseAdminClient() as unknown as QueryClient;

  await admin.from("funnel_events").insert({
    user_id: userId ?? null,
    event_name: eventName,
    metadata,
    session_id: sessionId ?? null
  });
}
