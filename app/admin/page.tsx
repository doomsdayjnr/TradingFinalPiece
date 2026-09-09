import Link from "next/link";
import { redirect } from "next/navigation";
import { approveAccount, rejectAccount, revokeAccount, suspendAccount } from "./actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ message?: string; q?: string; status?: string }>;
type QueryClient = {
  from: (table: string) => any;
};
type AccountRow = {
  id: string;
  user_id: string;
  account_number: string;
  platform: "MT4" | "MT5";
  verification_status: string;
  rejection_reason: string | null;
  admin_notes: string | null;
  submitted_at: string;
  verified_at: string | null;
  profiles?: {
    email: string | null;
    full_name: string | null;
  } | null;
  brokers?: {
    name: string;
    slug: string;
  } | null;
};
type AuditRow = {
  id: string;
  action: string;
  target_id: string | null;
  created_at: string;
  profiles?: {
    email: string | null;
  } | null;
};

const statuses = ["pending", "verified", "rejected", "suspended", "revoked"];

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default async function AdminPage({ searchParams }: { searchParams?: SearchParams }) {
  const supabase = await createSupabaseServerClient();
  const db = supabase as unknown as QueryClient;
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: profile } = await db.from("profiles").select("role, email").eq("id", userData.user.id).single();

  if (profile?.role !== "admin") {
    redirect("/dashboard?message=Admin access required.");
  }

  const params = await searchParams;
  const selectedStatus = statuses.includes(params?.status ?? "") ? params?.status : "pending";
  const search = params?.q?.trim() ?? "";
  let accountsQuery = db
    .from("broker_accounts")
    .select("id, user_id, account_number, platform, verification_status, rejection_reason, admin_notes, submitted_at, verified_at, profiles(email, full_name), brokers(name, slug)")
    .eq("account_kind", "live")
    .neq("verification_status", "removed_by_user")
    .order("submitted_at", { ascending: false });

  if (selectedStatus) {
    accountsQuery = accountsQuery.eq("verification_status", selectedStatus);
  }

  if (search) {
    const upperSearch = search.toUpperCase();

    if (upperSearch === "MT4" || upperSearch === "MT5") {
      accountsQuery = accountsQuery.eq("platform", upperSearch);
    } else {
      accountsQuery = accountsQuery.ilike("account_number", `%${search}%`);
    }
  }

  const [accountsResult, auditsResult] = await Promise.all([
    accountsQuery,
    db
      .from("admin_audit_logs")
      .select("id, action, target_id, created_at, profiles(email)")
      .order("created_at", { ascending: false })
      .limit(12)
  ]);
  const accounts = (accountsResult.data ?? []) as AccountRow[];
  const audits = (auditsResult.data ?? []) as AuditRow[];

  return (
    <main className="portal-shell">
      <header className="portal-header">
        <div>
          <p className="eyebrow">Admin Verification</p>
          <h1>Manual XM Review</h1>
          <p>Approve only accounts confirmed in the XM partner dashboard under code R99D9.</p>
        </div>
        <nav>
          <Link href="/admin/tickets">Tickets</Link>
          <Link href="/dashboard">User Portal</Link>
          <Link href="/">Homepage</Link>
          <Link href="/logout">Logout</Link>
        </nav>
      </header>

      {params?.message && <p className="portal-message">{params.message}</p>}

      <section className="portal-panel">
        <h2>Verification Queue</h2>
        <form className="admin-filter" action="/admin">
          <input name="q" placeholder="Search account or platform" defaultValue={search} />
          <select name="status" defaultValue={selectedStatus}>
            {statuses.map((status) => (
              <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
            ))}
          </select>
          <button type="submit">Filter</button>
        </form>
        <div className="admin-list">
          {accounts.length === 0 && <p>No accounts match this view.</p>}
          {accounts.map((account) => (
            <article className="admin-account" key={account.id}>
              <div>
                <p className="eyebrow">{account.brokers?.name ?? "XM"} / {account.platform}</p>
                <h3>#{account.account_number}</h3>
                <p>{account.profiles?.full_name || account.profiles?.email || "Unknown user"}</p>
                <p>Submitted {formatDate(account.submitted_at)}</p>
                {account.rejection_reason && <p>Reason: {account.rejection_reason}</p>}
                {account.admin_notes && <p>Notes: {account.admin_notes}</p>}
              </div>
              <strong>{account.verification_status.replaceAll("_", " ")}</strong>
              <div className="admin-actions">
                <form action={approveAccount}>
                  <input type="hidden" name="account_id" value={account.id} />
                  <input name="admin_notes" placeholder="Admin notes" />
                  <button type="submit">Approve</button>
                </form>
                <form action={rejectAccount}>
                  <input type="hidden" name="account_id" value={account.id} />
                  <input name="reason" placeholder="Rejection reason" required />
                  <input name="admin_notes" placeholder="Admin notes" />
                  <button type="submit">Reject</button>
                </form>
                <form action={suspendAccount}>
                  <input type="hidden" name="account_id" value={account.id} />
                  <input name="reason" placeholder="Suspension reason" />
                  <button type="submit">Suspend</button>
                </form>
                <form action={revokeAccount}>
                  <input type="hidden" name="account_id" value={account.id} />
                  <input name="reason" placeholder="Revocation reason" />
                  <button type="submit">Revoke</button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="portal-panel">
        <h2>Recent Admin Actions</h2>
        <div className="status-list">
          {audits.length === 0 && <p>No audit log entries yet.</p>}
          {audits.map((audit) => (
            <div className="status-row" key={audit.id}>
              <strong>{audit.action}</strong>
              <span>{audit.profiles?.email ?? "Admin"} - {formatDate(audit.created_at)}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
