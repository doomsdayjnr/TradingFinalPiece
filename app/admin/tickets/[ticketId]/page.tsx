import Link from "next/link";
import { redirect } from "next/navigation";
import { addAdminTicketReply, updateTicketStatus } from "@/app/dashboard/tickets/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type QueryClient = { from: (table: string) => any };
type PageProps = {
  params: Promise<{ ticketId: string }>;
  searchParams?: Promise<{ message?: string }>;
};
const statuses = ["open", "waiting_on_user", "resolved", "closed"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function AdminTicketDetailPage({ params, searchParams }: PageProps) {
  const { ticketId } = await params;
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

  const [ticketResult, messagesResult] = await Promise.all([
    db
      .from("support_tickets")
      .select("id, user_id, category, subject, description, status, platform, account_kind, account_number, error_code, created_at, profiles(email, full_name)")
      .eq("id", ticketId)
      .single(),
    db.from("support_ticket_messages").select("id, author_id, body, attachment_path, created_at, profiles(email, full_name)").eq("ticket_id", ticketId).order("created_at")
  ]);
  const ticket = ticketResult.data;

  if (!ticket) {
    redirect("/admin/tickets?message=Ticket not found.");
  }

  const messages = messagesResult.data ?? [];

  return (
    <main className="portal-shell">
      <header className="portal-header">
        <div>
          <p className="eyebrow">Admin Ticket</p>
          <h1>{ticket.subject}</h1>
          <p>{ticket.profiles?.full_name || ticket.profiles?.email || "Unknown user"} - {ticket.status.replaceAll("_", " ")}</p>
        </div>
        <nav>
          <Link href="/admin/tickets">Ticket Queue</Link>
          <Link href="/admin">Verification</Link>
          <Link href="/logout">Logout</Link>
        </nav>
      </header>

      {query?.message && <p className="portal-message">{query.message}</p>}

      <section className="portal-panel">
        <h2>Ticket Details</h2>
        <div className="ticket-meta">
          <span>Category: {ticket.category.replaceAll("_", " ")}</span>
          <span>Platform: {ticket.platform ?? "Not supplied"}</span>
          <span>Account: {ticket.account_number ?? "Not supplied"}</span>
          <span>Type: {ticket.account_kind ?? "Not supplied"}</span>
          <span>Error: {ticket.error_code ?? "Not supplied"}</span>
          <span>Created: {formatDate(ticket.created_at)}</span>
        </div>
        <p className="ticket-description">{ticket.description}</p>
        <form className="admin-filter status-form" action={updateTicketStatus}>
          <input type="hidden" name="ticket_id" value={ticket.id} />
          <select name="status" defaultValue={ticket.status}>
            {statuses.map((status) => (
              <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
            ))}
          </select>
          <button type="submit">Update Status</button>
        </form>
      </section>

      <section className="portal-panel">
        <h2>Conversation</h2>
        <div className="message-list">
          {messages.map((message: any) => (
            <article className={message.author_id === userData.user?.id ? "ticket-message is-own" : "ticket-message"} key={message.id}>
              <strong>{message.profiles?.full_name || message.profiles?.email || "User"}</strong>
              <p>{message.body}</p>
              {message.attachment_path && <span>Attachment: {message.attachment_path}</span>}
              <time>{formatDate(message.created_at)}</time>
            </article>
          ))}
        </div>
        <form className="portal-form reply-form" action={addAdminTicketReply}>
          <input type="hidden" name="ticket_id" value={ticket.id} />
          <label>
            Reply
            <textarea name="body" rows={5} required />
          </label>
          <label>
            Attachment Path
            <input name="attachment_path" placeholder="Optional uploaded file path or link" />
          </label>
          <label>
            Set Status After Reply
            <select name="next_status" defaultValue="waiting_on_user">
              {statuses.map((status) => (
                <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
              ))}
            </select>
          </label>
          <button type="submit">Send Reply</button>
        </form>
      </section>
    </main>
  );
}
