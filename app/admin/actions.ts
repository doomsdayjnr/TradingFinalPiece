"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type VerificationStatus = "verified" | "rejected" | "suspended" | "revoked";
type QueryClient = {
  from: (table: string) => any;
};

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const db = supabase as unknown as QueryClient;
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  const { data: profile } = await db.from("profiles").select("role").eq("id", data.user.id).single();

  if (profile?.role !== "admin") {
    redirect("/dashboard?message=Admin access required.");
  }

  return data.user;
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function auditLog(adminId: string, action: string, targetId: string, previousData: unknown, newData: unknown) {
  const admin = createSupabaseAdminClient() as unknown as QueryClient;

  await admin.from("admin_audit_logs").insert({
    admin_id: adminId,
    action,
    target_table: "broker_accounts",
    target_id: targetId,
    previous_data: previousData,
    new_data: newData
  });
}

export async function approveAccount(formData: FormData) {
  const adminUser = await requireAdmin();
  const admin = createSupabaseAdminClient() as unknown as QueryClient;
  const accountId = getFormString(formData, "account_id");
  const notes = getFormString(formData, "admin_notes");
  const licenseToken = crypto.randomBytes(32).toString("hex");
  const licenseTokenHash = hashToken(licenseToken);

  const { data: previousAccount, error: fetchError } = await admin
    .from("broker_accounts")
    .select("*")
    .eq("id", accountId)
    .single();

  if (fetchError || !previousAccount) {
    redirect(`/admin?message=${encodeURIComponent(fetchError?.message ?? "Account not found.")}`);
  }

  const { data: updatedAccount, error: updateError } = await admin
    .from("broker_accounts")
    .update({
      verification_status: "verified",
      rejection_reason: null,
      admin_notes: notes || previousAccount.admin_notes,
      verified_at: new Date().toISOString(),
      rejected_at: null,
      verified_by: adminUser.id
    })
    .eq("id", accountId)
    .select("*")
    .single();

  if (updateError || !updatedAccount) {
    redirect(`/admin?message=${encodeURIComponent(updateError?.message ?? "Could not approve account.")}`);
  }

  const { error: entitlementError } = await admin.from("license_entitlements").insert({
    user_id: updatedAccount.user_id,
    broker_account_id: updatedAccount.id,
    kind: "live",
    platform: updatedAccount.platform,
    ea_product: "tfp-edge",
    status: "active",
    license_token_hash: licenseTokenHash
  });

  if (entitlementError) {
    redirect(`/admin?message=${encodeURIComponent(entitlementError.message)}`);
  }

  await auditLog(adminUser.id, "broker_account.approved", accountId, previousAccount, updatedAccount);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirect("/admin?message=Account approved and live entitlement created.");
}

export async function rejectAccount(formData: FormData) {
  await updateAccountStatus(formData, "rejected", "broker_account.rejected");
}

export async function suspendAccount(formData: FormData) {
  await updateAccountStatus(formData, "suspended", "broker_account.suspended");
}

export async function revokeAccount(formData: FormData) {
  await updateAccountStatus(formData, "revoked", "broker_account.revoked");
}

async function updateAccountStatus(formData: FormData, status: VerificationStatus, action: string) {
  const adminUser = await requireAdmin();
  const admin = createSupabaseAdminClient() as unknown as QueryClient;
  const accountId = getFormString(formData, "account_id");
  const reason = getFormString(formData, "reason");
  const notes = getFormString(formData, "admin_notes");
  const now = new Date().toISOString();

  const { data: previousAccount, error: fetchError } = await admin
    .from("broker_accounts")
    .select("*")
    .eq("id", accountId)
    .single();

  if (fetchError || !previousAccount) {
    redirect(`/admin?message=${encodeURIComponent(fetchError?.message ?? "Account not found.")}`);
  }

  const patch: Record<string, unknown> = {
    verification_status: status,
    rejection_reason: reason || null,
    admin_notes: notes || previousAccount.admin_notes,
    verified_by: adminUser.id
  };

  if (status === "rejected") {
    patch.rejected_at = now;
  }

  const { data: updatedAccount, error: updateError } = await admin
    .from("broker_accounts")
    .update(patch)
    .eq("id", accountId)
    .select("*")
    .single();

  if (updateError || !updatedAccount) {
    redirect(`/admin?message=${encodeURIComponent(updateError?.message ?? "Could not update account.")}`);
  }

  if (status === "suspended" || status === "revoked") {
    await admin
      .from("license_entitlements")
      .update({ status })
      .eq("broker_account_id", accountId);
  }

  await auditLog(adminUser.id, action, accountId, previousAccount, updatedAccount);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirect(`/admin?message=Account ${status}.`);
}
