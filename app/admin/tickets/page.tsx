import Link from "next/link";
import { LogoutButton } from "@/app/auth/logout-button";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type QueryClient = { from: (table: string) => any };
type PageProps = { searchParams?: Promise<{ q?: string; status?: string; message?: string }> };
const statuses = ["open", "waiting_on_user", "resolved", "closed"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function AdminTicketsPage({ searchParams }: PageProps) {
  const query = await searchParams;
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

  const selectedStatus = statuses.includes(query?.status ?? "") ? query?.status : "open";
  const search = query?.q?.trim() ?? "";
  let ticketsQuery = db
    .from("support_tickets")
    .select("id, category, subject, status, platform, account_kind, account_number, error_code, created_at, profiles(email, full_name)")
    .order("created_at", { ascending: false });

  if (selectedStatus) {
    ticketsQuery = ticketsQuery.eq("status", selectedStatus);
  }

  if (search) {
    ticketsQuery = ticketsQuery.or(`subject.ilike.%${search}%,account_number.ilike.%${search}%,error_code.ilike.%${search}%`);
  }

  const { data } = await ticketsQuery;
  const tickets = data ?? [];

  return (
    <main className="portal-shell">
      <header className="portal-header">
        <div>
          <p className="eyebrow">Admin Support</p>
          <h1>Ticket Queue</h1>
          <p>Review user support requests and keep status current.</p>
        </div>
        <nav>
          <Link href="/admin/analytics">Analytics</Link>
          <Link href="/admin">Verification</Link>
          <Link href="/dashboard">User Portal</Link>
          <LogoutButton />
        </nav>
      </header>

      {query?.message && <p className="portal-message">{query.message}</p>}

      <section className="portal-panel">
        <h2>Tickets</h2>
        <form className="admin-filter" action="/admin/tickets">
          <input name="q" placeholder="Search subject, account, error" defaultValue={search} />
          <select name="status" defaultValue={selectedStatus}>
            {statuses.map((status) => (
              <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
            ))}
          </select>
          <button type="submit">Filter</button>
        </form>
        <div className="admin-list">
          {tickets.length === 0 && <p>No tickets match this view.</p>}
          {tickets.map((ticket: any) => (
            <Link className="ticket-card" href={`/admin/tickets/${ticket.id}`} key={ticket.id}>
              <strong>{ticket.subject}</strong>
              <span>{ticket.status.replaceAll("_", " ")} - {ticket.category.replaceAll("_", " ")}</span>
              <span>{ticket.profiles?.full_name || ticket.profiles?.email || "Unknown user"}</span>
              <span>{ticket.platform ?? "No platform"} / {ticket.account_number ?? "No account"}</span>
              <time>{formatDate(ticket.created_at)}</time>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
