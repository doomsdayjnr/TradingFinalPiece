"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Platform = "MT4" | "MT5";
type QueryClient = {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => any;
};

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  return data.user;
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function requirePlatform(value: string): Platform {
  if (value !== "MT4" && value !== "MT5") {
    throw new Error("Choose MT4 or MT5.");
  }

  return value;
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function submitBrokerAccount(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const db = supabase as unknown as QueryClient;
  const accountNumber = getFormString(formData, "account_number");
  const platform = requirePlatform(getFormString(formData, "platform"));

  if (!accountNumber) {
    redirect("/dashboard?message=Account number is required.");
  }

  const { data: broker, error: brokerError } = await db
    .from("brokers")
    .select("id")
    .eq("slug", "xm")
    .single();

  if (brokerError || !broker) {
    redirect("/dashboard?message=XM broker record was not found.");
  }

  const { error } = await db.from("broker_accounts").insert({
    user_id: user.id,
    broker_id: broker.id,
    account_number: accountNumber,
    platform,
    account_kind: "live",
    verification_status: "pending"
  });

  if (error) {
    redirect(`/dashboard?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?message=Account submitted for verification.");
}

export async function removeBrokerAccount(formData: FormData) {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const db = supabase as unknown as QueryClient;
  const accountId = getFormString(formData, "account_id");

  const { error } = await db.rpc("remove_own_broker_account", {
    account_id: accountId
  });

  if (error) {
    redirect(`/dashboard?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?message=Account removed.");
}

export async function requestDemoLicense(formData: FormData) {
  const user = await requireUser();
  const admin = createSupabaseAdminClient() as unknown as QueryClient;
  const platform = requirePlatform(getFormString(formData, "platform"));
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);

  const { data: demoLicense, error: demoError } = await admin
    .from("demo_licenses")
    .insert({
      user_id: user.id,
      platform,
      license_token_hash: tokenHash,
      status: "active"
    })
    .select("id, expires_at")
    .single();

  if (demoError || !demoLicense) {
    redirect(`/dashboard?message=${encodeURIComponent(demoError?.message ?? "Could not create demo license.")}`);
  }

  const { error: entitlementError } = await admin.from("license_entitlements").insert({
    user_id: user.id,
    demo_license_id: demoLicense.id,
    kind: "demo",
    platform,
    ea_product: "tfp-edge",
    status: "active",
    license_token_hash: tokenHash,
    expires_at: demoLicense.expires_at
  });

  if (entitlementError) {
    redirect(`/dashboard?message=${encodeURIComponent(entitlementError.message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?message=Demo license created. Save your license token securely when downloads are enabled.");
}

export async function createSupportTicket(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const db = supabase as unknown as QueryClient;
  const category = getFormString(formData, "category");
  const subject = getFormString(formData, "subject");
  const description = getFormString(formData, "description");
  const platform = getFormString(formData, "platform");
  const accountKind = getFormString(formData, "account_kind");

  if (!category || !subject || !description) {
    redirect("/dashboard?message=Category, subject, and message are required.");
  }

  const { error } = await db.from("support_tickets").insert({
    user_id: user.id,
    category,
    subject,
    description,
    platform: platform || null,
    account_kind: accountKind || null,
    account_number: getFormString(formData, "account_number") || null,
    error_code: getFormString(formData, "error_code") || null
  });

  if (error) {
    redirect(`/dashboard?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?message=Support ticket created.");
}
