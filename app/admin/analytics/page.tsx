import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type QueryClient = { from: (table: string) => any };
type FunnelEvent = {
  id: string;
  event_name: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};
type CountResult = { count: number | null };

const trackedEvents = [
  "landing_xm_cta_clicked",
  "site_signup",
  "demo_license_started",
  "live_account_submitted",
  "live_account_approved",
  "live_account_rejected",
  "ea_download_started",
  "license_validation_succeeded",
  "license_validation_failed",
  "support_ticket_created"
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function sinceDays(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

async function countRows(query: PromiseLike<CountResult>) {
  const result = await query;
  return result.count ?? 0;
}

export default async function AdminAnalyticsPage() {
  const supabase = await createSupabaseServerClient();
  const db = supabase as unknown as QueryClient;
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: profile } = await db.from("profiles").select("role").eq("id", userData.user.id).single();

  if (profile?.role !== "admin") {
    redirect("/dashboard?message=Admin access required.");
  }

  const last30Days = sinceDays(30);
  const [
    users,
    activeDemos,
    expiredDemos,
    pendingAccounts,
    verifiedAccounts,
    rejectedAccounts,
    mt4Downloads,
    mt5Downloads,
    successfulChecks,
    failedChecks,
    openTickets,
    recentEventsResult,
    eventCountResults
  ] = await Promise.all([
    countRows(db.from("profiles").select("id", { count: "exact", head: true })),
    countRows(db.from("demo_licenses").select("id", { count: "exact", head: true }).eq("status", "active").gt("expires_at", new Date().toISOString())),
    countRows(db.from("demo_licenses").select("id", { count: "exact", head: true }).lt("expires_at", new Date().toISOString())),
    countRows(db.from("broker_accounts").select("id", { count: "exact", head: true }).eq("verification_status", "pending")),
    countRows(db.from("broker_accounts").select("id", { count: "exact", head: true }).eq("verification_status", "verified")),
    countRows(db.from("broker_accounts").select("id", { count: "exact", head: true }).eq("verification_status", "rejected")),
    countRows(db.from("funnel_events").select("id", { count: "exact", head: true }).eq("event_name", "ea_download_started").eq("metadata->>platform", "MT4")),
    countRows(db.from("funnel_events").select("id", { count: "exact", head: true }).eq("event_name", "ea_download_started").eq("metadata->>platform", "MT5")),
    countRows(db.from("license_checks").select("id", { count: "exact", head: true }).eq("result", "allowed").gte("checked_at", last30Days)),
    countRows(db.from("license_checks").select("id", { count: "exact", head: true }).neq("result", "allowed").gte("checked_at", last30Days)),
    countRows(db.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["open", "waiting_on_user"])),
    db.from("funnel_events").select("id, event_name, metadata, created_at").order("created_at", { ascending: false }).limit(12),
    Promise.all(
      trackedEvents.map(async (eventName) => ({
        eventName,
        count: await countRows(db.from("funnel_events").select("id", { count: "exact", head: true }).eq("event_name", eventName))
      }))
    )
  ]);
  const recentEvents = (recentEventsResult.data ?? []) as FunnelEvent[];
  const failureRate = successfulChecks + failedChecks === 0 ? 0 : Math.round((failedChecks / (successfulChecks + failedChecks)) * 100);

  return (
    <main className="portal-shell">
      <header className="portal-header">
        <div>
          <p className="eyebrow">Admin Analytics</p>
          <h1>Funnel Metrics</h1>
          <p>Track conversion, access, support load and license health.</p>
        </div>
        <nav>
          <Link href="/admin">Verification</Link>
          <Link href="/admin/tickets">Tickets</Link>
          <Link href="/dashboard">User Portal</Link>
        </nav>
      </header>

      <section className="metrics-grid">
        <Metric label="Total Users" value={users} />
        <Metric label="Active Demo Trials" value={activeDemos} />
        <Metric label="Expired Demo Trials" value={expiredDemos} />
        <Metric label="Pending Live Accounts" value={pendingAccounts} />
        <Metric label="Verified Live Accounts" value={verifiedAccounts} />
        <Metric label="Rejected Live Accounts" value={rejectedAccounts} />
        <Metric label="MT4 Downloads" value={mt4Downloads} />
        <Metric label="MT5 Downloads" value={mt5Downloads} />
        <Metric label="License Successes 30d" value={successfulChecks} />
        <Metric label="License Failures 30d" value={failedChecks} />
        <Metric label="Failure Rate 30d" value={`${failureRate}%`} alert={failureRate >= 25 && failedChecks >= 10} />
        <Metric label="Open Support Tickets" value={openTickets} />
      </section>

      <section className="portal-grid">
        <article className="portal-panel">
          <h2>Funnel Events</h2>
          <div className="status-list">
            {eventCountResults.map((event) => (
              <div className="status-row" key={event.eventName}>
                <strong>{event.eventName.replaceAll("_", " ")}</strong>
                <span>{event.count}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="portal-panel">
          <h2>Recent Events</h2>
          <div className="status-list">
            {recentEvents.length === 0 && <p>No funnel events yet.</p>}
            {recentEvents.map((event) => (
              <div className="status-row" key={event.id}>
                <strong>{event.event_name.replaceAll("_", " ")}</strong>
                <span>{formatDate(event.created_at)}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

function Metric({ label, value, alert }: { label: string; value: number | string; alert?: boolean }) {
  return (
    <article className={alert ? "metric-card is-alert" : "metric-card"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
