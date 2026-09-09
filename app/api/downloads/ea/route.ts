import { NextResponse } from "next/server";
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
    return NextResponse.json({ error: entitlementError.message }, { status: 500 });
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
    return NextResponse.json(
      {
        error: "EA file is not available yet. Upload the compiled file to Supabase Storage first.",
        path: config.path
      },
      { status: 404 }
    );
  }

  return NextResponse.redirect(data.signedUrl);
}
