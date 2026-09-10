import Link from "next/link";
import { LogoutButton } from "@/app/auth/logout-button";
import { redirect } from "next/navigation";
import { addUserTicketReply, closeOwnTicket } from "../actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type QueryClient = { from: (table: string) => any };
type PageProps = {
  params: Promise<{ ticketId: string }>;
  searchParams?: Promise<{ message?: string }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function TicketPage({ params, searchParams }: PageProps) {
  const { ticketId } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const db = supabase as unknown as QueryClient;
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const [ticketResult, messagesResult] = await Promise.all([
    db
      .from("support_tickets")
      .select("id, user_id, category, subject, description, status, platform, account_kind, account_number, error_code, created_at")
      .eq("id", ticketId)
      .single(),
    db.from("support_ticket_messages").select("id, author_id, body, attachment_path, created_at, profiles(email, full_name)").eq("ticket_id", ticketId).order("created_at")
  ]);
  const ticket = ticketResult.data;

  if (!ticket || ticket.user_id !== userData.user.id) {
    redirect("/dashboard?message=Ticket not found.");
  }

  const messages = messagesResult.data ?? [];

  return (
    <main className="portal-shell">
      <header className="portal-header">
        <div>
          <p className="eyebrow">Support Ticket</p>
          <h1>{ticket.subject}</h1>
          <p>{ticket.status.replaceAll("_", " ")} - {formatDate(ticket.created_at)}</p>
        </div>
        <nav>
          <Link href="/dashboard">Dashboard</Link>
          <LogoutButton />
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
        </div>
        <p className="ticket-description">{ticket.description}</p>
      </section>

      <section className="portal-panel">
        <h2>Conversation</h2>
        <div className="message-list">
          {messages.map((message: any) => (
            <article className={message.author_id === userData.user?.id ? "ticket-message is-own" : "ticket-message"} key={message.id}>
              <strong>{message.profiles?.full_name || message.profiles?.email || "Support"}</strong>
              <p>{message.body}</p>
              {message.attachment_path && <span>Attachment: {message.attachment_path}</span>}
              <time>{formatDate(message.created_at)}</time>
            </article>
          ))}
        </div>
        {ticket.status !== "closed" && (
          <form className="portal-form reply-form" action={addUserTicketReply}>
            <input type="hidden" name="ticket_id" value={ticket.id} />
            <label>
              Reply
              <textarea name="body" rows={5} required />
            </label>
            <label>
              Attachment Path
              <input name="attachment_path" placeholder="Optional uploaded file path or link" />
            </label>
            <button type="submit">Send Reply</button>
          </form>
        )}
        {ticket.status !== "closed" && (
          <form action={closeOwnTicket} className="single-action-form">
            <input type="hidden" name="ticket_id" value={ticket.id} />
            <button type="submit">Close Ticket</button>
          </form>
        )}
      </section>
    </main>
  );
}
