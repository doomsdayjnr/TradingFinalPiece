import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AccountKind = "live" | "demo";
type Platform = "MT4" | "MT5";
type LicenseResult =
  | "allowed"
  | "denied_unknown_account"
  | "denied_pending"
  | "denied_rejected"
  | "denied_suspended"
  | "denied_revoked"
  | "denied_expired"
  | "denied_platform_mismatch"
  | "denied_invalid_token"
  | "server_error";
type QueryClient = {
  from: (table: string) => any;
};
type ValidationPayload = {
  account_number?: unknown;
  account_type?: unknown;
  platform_type?: unknown;
  broker_name?: unknown;
  ea_product?: unknown;
  ea_version?: unknown;
  license_token?: unknown;
};
type LicenseDecision = {
  allowed: boolean;
  result: LicenseResult;
  status: string;
  message: string;
  grace_until?: string;
  user_id?: string | null;
  broker_account_id?: string | null;
  demo_license_id?: string | null;
  license_entitlement_id?: string | null;
};

const requestWindowMs = 60_000;
const maxRequestsPerWindow = 60;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function rateLimitKey(request: Request, accountNumber: string) {
  return `${getClientIp(request)}:${accountNumber || "unknown"}`;
}

function isRateLimited(key: string) {
  const now = Date.now();
  const bucket = rateLimitStore.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + requestWindowMs });
    return false;
  }

  bucket.count += 1;
  return bucket.count > maxRequestsPerWindow;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAccountKind(value: unknown): AccountKind | null {
  const normalized = asString(value).toLowerCase();

  if (normalized === "live" || normalized === "real") {
    return "live";
  }

  if (normalized === "demo") {
    return "demo";
  }

  return null;
}

function normalizePlatform(value: unknown): Platform | null {
  const normalized = asString(value).toUpperCase();

  if (normalized === "MT4" || normalized === "MT5") {
    return normalized;
  }

  return null;
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function graceUntil() {
  return new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
}

async function logLicenseCheck(
  db: QueryClient,
  request: Request,
  payload: {
    accountNumber: string;
    accountKind: AccountKind | null;
    platform: Platform | null;
    brokerName: string;
    eaProduct: string;
    eaVersion: string;
  },
  decision: LicenseDecision
) {
  await db.from("license_checks").insert({
    user_id: decision.user_id ?? null,
    broker_account_id: decision.broker_account_id ?? null,
    demo_license_id: decision.demo_license_id ?? null,
    license_entitlement_id: decision.license_entitlement_id ?? null,
    account_number: payload.accountNumber || null,
    account_kind: payload.accountKind,
    platform: payload.platform,
    broker_name: payload.brokerName || null,
    ea_product: payload.eaProduct || null,
    ea_version: payload.eaVersion || null,
    result: decision.result,
    message: decision.message,
    request_ip: getClientIp(request),
    user_agent: request.headers.get("user-agent")
  });
}

async function decideLiveAccess(
  db: QueryClient,
  payload: {
    accountNumber: string;
    platform: Platform;
    brokerName: string;
    eaProduct: string;
    licenseTokenHash: string;
  }
): Promise<LicenseDecision> {
  const { data: account, error: accountError } = await db
    .from("broker_accounts")
    .select("id, user_id, platform, verification_status, brokers(name)")
    .eq("account_number", payload.accountNumber)
    .eq("account_kind", "live")
    .single();

  if (accountError || !account) {
    return {
      allowed: false,
      result: "denied_unknown_account",
      status: "not_found",
      message: `Account #${payload.accountNumber} was not found. Please submit it in your dashboard.`
    };
  }

  if (account.platform !== payload.platform) {
    return {
      allowed: false,
      result: "denied_platform_mismatch",
      status: "platform_mismatch",
      message: `Account #${payload.accountNumber} is registered for ${account.platform}, not ${payload.platform}.`,
      user_id: account.user_id,
      broker_account_id: account.id
    };
  }

  if (payload.brokerName && account.brokers?.name?.toLowerCase() !== payload.brokerName.toLowerCase()) {
    return {
      allowed: false,
      result: "denied_unknown_account",
      status: "broker_mismatch",
      message: `Account #${payload.accountNumber} is not registered under ${payload.brokerName}.`,
      user_id: account.user_id,
      broker_account_id: account.id
    };
  }

  if (account.verification_status !== "verified") {
    const resultByStatus: Record<string, LicenseResult> = {
      pending: "denied_pending",
      rejected: "denied_rejected",
      suspended: "denied_suspended",
      revoked: "denied_revoked",
      removed_by_user: "denied_unknown_account"
    };

    return {
      allowed: false,
      result: resultByStatus[account.verification_status] ?? "denied_unknown_account",
      status: account.verification_status,
      message: `Account #${payload.accountNumber} is ${String(account.verification_status).replaceAll("_", " ")}.`,
      user_id: account.user_id,
      broker_account_id: account.id
    };
  }

  const { data: entitlement, error: entitlementError } = await db
    .from("license_entitlements")
    .select("id, status, expires_at")
    .eq("broker_account_id", account.id)
    .eq("platform", payload.platform)
    .eq("kind", "live")
    .eq("license_token_hash", payload.licenseTokenHash)
    .single();

  if (entitlementError || !entitlement) {
    return {
      allowed: false,
      result: "denied_invalid_token",
      status: "invalid_token",
      message: "License token is invalid for this account.",
      user_id: account.user_id,
      broker_account_id: account.id
    };
  }

  if (entitlement.status !== "active") {
    return {
      allowed: false,
      result: entitlement.status === "expired" ? "denied_expired" : "denied_suspended",
      status: entitlement.status,
      message: `License is ${entitlement.status}.`,
      user_id: account.user_id,
      broker_account_id: account.id,
      license_entitlement_id: entitlement.id
    };
  }

  await db.from("license_entitlements").update({ last_validated_at: new Date().toISOString() }).eq("id", entitlement.id);

  return {
    allowed: true,
    result: "allowed",
    status: "active",
    message: "License active",
    grace_until: graceUntil(),
    user_id: account.user_id,
    broker_account_id: account.id,
    license_entitlement_id: entitlement.id
  };
}

async function decideDemoAccess(
  db: QueryClient,
  payload: {
    platform: Platform;
    eaProduct: string;
    licenseTokenHash: string;
  }
): Promise<LicenseDecision> {
  const { data: entitlement, error: entitlementError } = await db
    .from("license_entitlements")
    .select("id, user_id, demo_license_id, status, expires_at, demo_licenses(id, status, expires_at)")
    .eq("kind", "demo")
    .eq("platform", payload.platform)
    .eq("license_token_hash", payload.licenseTokenHash)
    .single();

  if (entitlementError || !entitlement) {
    return {
      allowed: false,
      result: "denied_invalid_token",
      status: "invalid_token",
      message: "Demo license token is invalid."
    };
  }

  const expiresAt = entitlement.expires_at ?? entitlement.demo_licenses?.expires_at;
  const isExpired = expiresAt ? new Date(expiresAt).getTime() <= Date.now() : false;

  if (isExpired || entitlement.status === "expired" || entitlement.demo_licenses?.status === "expired") {
    return {
      allowed: false,
      result: "denied_expired",
      status: "expired",
      message: "Your 14-day demo trial has expired.",
      user_id: entitlement.user_id,
      demo_license_id: entitlement.demo_license_id,
      license_entitlement_id: entitlement.id
    };
  }

  if (entitlement.status !== "active" || entitlement.demo_licenses?.status !== "active") {
    return {
      allowed: false,
      result: entitlement.status === "revoked" ? "denied_revoked" : "denied_suspended",
      status: entitlement.status,
      message: `Demo license is ${entitlement.status}.`,
      user_id: entitlement.user_id,
      demo_license_id: entitlement.demo_license_id,
      license_entitlement_id: entitlement.id
    };
  }

  await db.from("license_entitlements").update({ last_validated_at: new Date().toISOString() }).eq("id", entitlement.id);

  return {
    allowed: true,
    result: "allowed",
    status: "active",
    message: "Demo license active",
    grace_until: graceUntil(),
    user_id: entitlement.user_id,
    demo_license_id: entitlement.demo_license_id,
    license_entitlement_id: entitlement.id
  };
}

export async function POST(request: Request) {
  const db = createSupabaseAdminClient() as unknown as QueryClient;
  let body: ValidationPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ allowed: false, status: "bad_request", message: "Invalid JSON payload." }, { status: 400 });
  }

  const accountNumber = asString(body.account_number);
  const accountKind = normalizeAccountKind(body.account_type);
  const platform = normalizePlatform(body.platform_type);
  const brokerName = asString(body.broker_name) || "XM";
  const eaProduct = asString(body.ea_product) || "tfp-edge";
  const eaVersion = asString(body.ea_version);
  const licenseToken = asString(body.license_token);
  const logPayload = { accountNumber, accountKind, platform, brokerName, eaProduct, eaVersion };

  if (isRateLimited(rateLimitKey(request, accountNumber))) {
    const decision: LicenseDecision = {
      allowed: false,
      result: "denied_invalid_token",
      status: "rate_limited",
      message: "Too many license validation attempts. Please retry shortly."
    };
    await logLicenseCheck(db, request, logPayload, decision);
    return NextResponse.json(decision, { status: 429 });
  }

  if (!accountNumber || !accountKind || !platform || !licenseToken) {
    const decision: LicenseDecision = {
      allowed: false,
      result: "denied_invalid_token",
      status: "invalid_request",
      message: "account_number, account_type, platform_type and license_token are required."
    };
    await logLicenseCheck(db, request, logPayload, decision);
    return NextResponse.json(decision, { status: 400 });
  }

  try {
    const licenseTokenHash = hashToken(licenseToken);
    const decision =
      accountKind === "live"
        ? await decideLiveAccess(db, { accountNumber, platform, brokerName, eaProduct, licenseTokenHash })
        : await decideDemoAccess(db, { platform, eaProduct, licenseTokenHash });

    await logLicenseCheck(db, request, logPayload, decision);

    return NextResponse.json({
      allowed: decision.allowed,
      status: decision.status,
      message: decision.message,
      grace_until: decision.grace_until
    });
  } catch {
    const decision: LicenseDecision = {
      allowed: false,
      result: "server_error",
      status: "server_error",
      message: "License validation is temporarily unavailable."
    };

    await logLicenseCheck(db, request, logPayload, decision);
    return NextResponse.json(decision, { status: 500 });
  }
}
