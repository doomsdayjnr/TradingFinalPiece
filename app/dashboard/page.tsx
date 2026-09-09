import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupportTicket, removeBrokerAccount, requestDemoLicense, submitBrokerAccount } from "./actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ message?: string }>;
type BrokerAccountRow = {
  id: string;
  account_number: string;
  platform: "MT4" | "MT5";
  verification_status: string;
  rejection_reason: string | null;
  submitted_at: string;
  verified_at: string | null;
  rejected_at: string | null;
};
type DemoLicenseRow = {
  id: string;
  platform: "MT4" | "MT5";
  status: string;
  starts_at: string;
  expires_at: string;
};
type EntitlementRow = {
  id: string;
  kind: string;
  platform: "MT4" | "MT5";
  status: string;
  expires_at: string | null;
  broker_account_id: string | null;
};
type TicketRow = {
  id: string;
  category: string;
  subject: string;
  status: string;
  created_at: string;
};
type QueryClient = {
  from: (table: string) => any;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function isDemoActive(license: { status: string; expires_at: string }) {
  return license.status === "active" && new Date(license.expires_at).getTime() > Date.now();
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: SearchParams;
}) {
  const supabase = await createSupabaseServerClient();
  const db = supabase as unknown as QueryClient;
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const [profileResult, brokerAccountsResult, demoLicensesResult, entitlementsResult, ticketsResult] = await Promise.all([
    db.from("profiles").select("email, full_name, role").eq("id", userData.user.id).single(),
    db
      .from("broker_accounts")
      .select("id, account_number, platform, verification_status, rejection_reason, submitted_at, verified_at, rejected_at")
      .neq("verification_status", "removed_by_user")
      .order("submitted_at", { ascending: false }),
    db.from("demo_licenses").select("id, platform, status, starts_at, expires_at").order("created_at", { ascending: false }),
    db.from("license_entitlements").select("id, kind, platform, status, expires_at, broker_account_id").order("created_at", { ascending: false }),
    db.from("support_tickets").select("id, category, subject, status, created_at").order("created_at", { ascending: false }).limit(8)
  ]);
  const params = await searchParams;
  const profile = profileResult.data;
  const brokerAccounts = (brokerAccountsResult.data ?? []) as BrokerAccountRow[];
  const demoLicenses = (demoLicensesResult.data ?? []) as DemoLicenseRow[];
  const entitlements = (entitlementsResult.data ?? []) as EntitlementRow[];
  const tickets = (ticketsResult.data ?? []) as TicketRow[];
  const hasVerifiedMt4 = brokerAccounts.some((account) => account.platform === "MT4" && account.verification_status === "verified");
  const hasVerifiedMt5 = brokerAccounts.some((account) => account.platform === "MT5" && account.verification_status === "verified");
  const hasDemoMt4 = demoLicenses.some((license) => license.platform === "MT4" && isDemoActive(license));
  const hasDemoMt5 = demoLicenses.some((license) => license.platform === "MT5" && isDemoActive(license));

  return (
    <main className="portal-shell">
      <header className="portal-header">
        <div>
          <p className="eyebrow">Trading Final Piece Portal</p>
          <h1>EA Access Dashboard</h1>
          <p>{profile?.full_name || profile?.email || userData.user.email}</p>
        </div>
        <nav>
          {profile?.role === "admin" && <Link href="/admin">Admin</Link>}
          <Link href="/">Homepage</Link>
          <Link href="/logout">Logout</Link>
        </nav>
      </header>

      {params?.message && <p className="portal-message">{params.message}</p>}

      <section className="portal-grid">
        <article className="portal-panel">
          <h2>Live XM Account</h2>
          <p>Submit the XM MT4 or MT5 account number registered under partner code R99D9.</p>
          <form className="portal-form" action={submitBrokerAccount}>
            <label>
              Account Number
              <input name="account_number" inputMode="numeric" required />
            </label>
            <label>
              Platform
              <select name="platform" required>
                <option value="MT4">MT4</option>
                <option value="MT5">MT5</option>
              </select>
            </label>
            <label className="check-row">
              <input name="risk_acknowledgement" type="checkbox" required />
              I understand trading is high risk and EA access does not guarantee results.
            </label>
            <button type="submit">Submit For Verification</button>
          </form>
        </article>

        <article className="portal-panel">
          <h2>14-Day Demo Trial</h2>
          <p>Request one self-serve demo license per platform. Demo access expires automatically.</p>
          <form className="portal-form inline-form" action={requestDemoLicense}>
            <select name="platform" required>
              <option value="MT4">MT4</option>
              <option value="MT5">MT5</option>
            </select>
            <button type="submit">Start Demo Trial</button>
          </form>
          <div className="status-list">
            {demoLicenses.length === 0 && <p>No demo licenses requested yet.</p>}
            {demoLicenses.map((license) => (
              <div key={license.id} className="status-row">
                <strong>{license.platform}</strong>
                <span>{isDemoActive(license) ? "Active" : "Expired"} until {formatDate(license.expires_at)}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="portal-panel">
        <h2>Submitted Accounts</h2>
        <div className="table-list">
          {brokerAccounts.length === 0 && <p>No live accounts submitted yet.</p>}
          {brokerAccounts.map((account) => (
            <div className="table-row" key={account.id}>
              <span>#{account.account_number}</span>
              <span>{account.platform}</span>
              <strong>{account.verification_status.replaceAll("_", " ")}</strong>
              <span>{account.rejection_reason ?? formatDate(account.submitted_at)}</span>
              <form action={removeBrokerAccount}>
                <input type="hidden" name="account_id" value={account.id} />
                <button type="submit">Remove</button>
              </form>
            </div>
          ))}
        </div>
      </section>

      <section className="portal-grid">
        <article className="portal-panel">
          <h2>EA Downloads</h2>
          <div className="download-grid">
            <DownloadCard platform="MT4" enabled={hasVerifiedMt4 || hasDemoMt4} reason={hasVerifiedMt4 ? "Live verified" : hasDemoMt4 ? "Demo active" : "Verify MT4 live account or start MT4 demo"} />
            <DownloadCard platform="MT5" enabled={hasVerifiedMt5 || hasDemoMt5} reason={hasVerifiedMt5 ? "Live verified" : hasDemoMt5 ? "Demo active" : "Verify MT5 live account or start MT5 demo"} />
          </div>
          <ol className="install-steps">
            <li>Download the EA that matches your verified or active demo platform.</li>
            <li>Open MetaTrader and place the file inside the platform Experts folder.</li>
            <li>Restart MetaTrader, then attach TFP Edge to the correct chart.</li>
          </ol>
          <p className="fine-print">Downloads use short-lived signed URLs. If a file is not available, upload the compiled EA binary to private Supabase Storage first.</p>
        </article>

        <article className="portal-panel">
          <h2>License Status</h2>
          <div className="status-list">
            {entitlements.length === 0 && <p>No active license entitlements yet.</p>}
            {entitlements.map((entitlement) => (
              <div key={entitlement.id} className="status-row">
                <strong>{entitlement.platform} {entitlement.kind}</strong>
                <span>{entitlement.status}{entitlement.expires_at ? ` until ${formatDate(entitlement.expires_at)}` : ""}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="portal-grid">
        <article className="portal-panel">
          <h2>New Support Ticket</h2>
          <form className="portal-form" action={createSupportTicket}>
            <label>
              Category
              <select name="category" required>
                <option value="license_verification">License & Verification</option>
                <option value="mt4_mt5_setup">MT4/MT5 EA Setup</option>
                <option value="broker_ib_issue">Broker / IB Issue</option>
                <option value="performance_trading_query">Performance & Trading Query</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Subject
              <input name="subject" required />
            </label>
            <label>
              Account Number
              <input name="account_number" />
            </label>
            <div className="form-pair">
              <label>
                Platform
                <select name="platform">
                  <option value="">Not sure</option>
                  <option value="MT4">MT4</option>
                  <option value="MT5">MT5</option>
                </select>
              </label>
              <label>
                Account Type
                <select name="account_kind">
                  <option value="">Not sure</option>
                  <option value="live">Live / Real</option>
                  <option value="demo">Demo</option>
                </select>
              </label>
            </div>
            <label>
              Error Message / Code
              <input name="error_code" />
            </label>
            <label>
              Message
              <textarea name="description" rows={5} required />
            </label>
            <button type="submit">Create Ticket</button>
          </form>
        </article>

        <article className="portal-panel">
          <h2>Ticket History</h2>
          <div className="status-list">
            {tickets.length === 0 && <p>No support tickets yet.</p>}
            {tickets.map((ticket) => (
              <div key={ticket.id} className="status-row">
                <strong>{ticket.subject}</strong>
                <span>{ticket.status.replaceAll("_", " ")} - {formatDate(ticket.created_at)}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

function DownloadCard({ platform, enabled, reason }: { platform: "MT4" | "MT5"; enabled: boolean; reason: string }) {
  return (
    <div className={enabled ? "download-card is-enabled" : "download-card"}>
      <strong>{platform} EA</strong>
      <span>{reason}</span>
      {enabled ? (
        <a href={`/api/downloads/ea?platform=${platform}`}>Download {platform}</a>
      ) : (
        <button type="button" disabled>Locked</button>
      )}
    </div>
  );
}
