import { NextResponse } from "next/server";
import { trackFunnelEvent } from "@/lib/analytics/events";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Platform = "MT4" | "MT5";
type QueryClient = {
  from: (table: string) => any;
  storage: {
    from: (bucket: string) => {
      createSignedUrl: (path: string, expiresIn: number, options?: Record<string, unknown>) => Promise<{
        data: { signedUrl: string } | null;
        error: { message: string } | null;
      }>;
    };
  };
};

const bucketName = "ea-downloads";
const signedUrlTtlSeconds = 60 * 5;
const platformConfig = {
  MT4: {
    path: process.env.EA_MT4_STORAGE_PATH ?? "tfp-edge/mt4/tfp-edge.ex4",
    download: "tfp-edge-mt4.ex4"
  },
  MT5: {
    path: process.env.EA_MT5_STORAGE_PATH ?? "tfp-edge/mt5/tfp-edge.ex5",
    download: "tfp-edge-mt5.ex5"
  }
} satisfies Record<Platform, { path: string; download: string }>;

function getPlatform(request: Request): Platform | null {
  const platform = new URL(request.url).searchParams.get("platform")?.toUpperCase();

  if (platform === "MT4" || platform === "MT5") {
    return platform;
  }

  return null;
}

function isEntitlementActive(entitlement: { status: string; expires_at: string | null }) {
  if (entitlement.status !== "active") {
    return false;
  }

  return !entitlement.expires_at || new Date(entitlement.expires_at).getTime() > Date.now();
}

export async function GET(request: Request) {
  const platform = getPlatform(request);
  const rateLimit = checkRateLimit(`download:${getClientIp(request)}`, 30, 60_000);

  if (rateLimit.limited) {
    return NextResponse.json(
      { error: "Too many download requests. Please retry shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString()
        }
      }
    );
  }

  if (!platform) {
    return NextResponse.json({ error: "Choose MT4 or MT5." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const admin = createSupabaseAdminClient() as unknown as QueryClient;
  const { data: entitlements, error: entitlementError } = await admin
    .from("license_entitlements")
    .select("id, status, expires_at")
    .eq("user_id", userData.user.id)
    .eq("platform", platform)
    .eq("status", "active");

  if (entitlementError) {
    const destination = new URL("/dashboard", request.url);
    destination.searchParams.set("message", "We could not check your download access. Please try again shortly.");
    return NextResponse.redirect(destination);
  }

  const hasAccess = (entitlements ?? []).some(isEntitlementActive);

  if (!hasAccess) {
    return NextResponse.json({ error: "EA download is locked for this platform." }, { status: 403 });
  }

  const config = platformConfig[platform];
  const { data, error } = await admin.storage.from(bucketName).createSignedUrl(config.path, signedUrlTtlSeconds, {
    download: config.download
  });

  if (error || !data?.signedUrl) {
    const destination = new URL("/dashboard", request.url);
    destination.searchParams.set("message", `The ${platform} download is temporarily unavailable. Please try again later or contact support.`);
    return NextResponse.redirect(destination);
  }

  await trackFunnelEvent("ea_download_started", { platform, path: config.path }, userData.user.id);

  return NextResponse.redirect(data.signedUrl);
}
