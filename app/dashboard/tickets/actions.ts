"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type QueryClient = {
  from: (table: string) => any;
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

export async function addUserTicketReply(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const db = supabase as unknown as QueryClient;
  const ticketId = getFormString(formData, "ticket_id");
  const body = getFormString(formData, "body");
  const attachmentPath = getFormString(formData, "attachment_path");

  if (!ticketId || !body) {
    redirect("/dashboard?message=Ticket and reply message are required.");
  }

  const { data: ticket } = await db.from("support_tickets").select("id, user_id, status").eq("id", ticketId).single();

  if (!ticket || ticket.user_id !== user.id) {
    redirect("/dashboard?message=Ticket not found.");
  }

  if (ticket.status === "closed") {
    redirect(`/dashboard/tickets/${ticketId}?message=Closed tickets cannot receive new replies.`);
  }

  const { error } = await db.from("support_ticket_messages").insert({
    ticket_id: ticketId,
    author_id: user.id,
    body,
    attachment_path: attachmentPath || null
  });

  if (error) {
    redirect(`/dashboard/tickets/${ticketId}?message=${encodeURIComponent(error.message)}`);
  }

  await db.from("support_tickets").update({ status: "open" }).eq("id", ticketId);
  revalidatePath(`/dashboard/tickets/${ticketId}`);
  redirect(`/dashboard/tickets/${ticketId}?message=Reply added.`);
}

export async function closeOwnTicket(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const db = supabase as unknown as QueryClient;
  const ticketId = getFormString(formData, "ticket_id");

  await db
    .from("support_tickets")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", ticketId)
    .eq("user_id", user.id);

  revalidatePath(`/dashboard/tickets/${ticketId}`);
  redirect(`/dashboard/tickets/${ticketId}?message=Ticket closed.`);
}

async function requireAdmin() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const db = supabase as unknown as QueryClient;
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single();

  if (profile?.role !== "admin") {
    redirect("/dashboard?message=Admin access required.");
  }

  return user;
}

export async function addAdminTicketReply(formData: FormData) {
  const adminUser = await requireAdmin();
  const admin = createSupabaseAdminClient() as unknown as QueryClient;
  const ticketId = getFormString(formData, "ticket_id");
  const body = getFormString(formData, "body");
  const attachmentPath = getFormString(formData, "attachment_path");
  const nextStatus = getFormString(formData, "next_status") || "waiting_on_user";

  if (!ticketId || !body) {
    redirect("/admin/tickets?message=Ticket and reply message are required.");
  }

  const { error } = await admin.from("support_ticket_messages").insert({
    ticket_id: ticketId,
    author_id: adminUser.id,
    body,
    attachment_path: attachmentPath || null
  });

  if (error) {
    redirect(`/admin/tickets/${ticketId}?message=${encodeURIComponent(error.message)}`);
  }

  await admin.from("support_tickets").update({ status: nextStatus }).eq("id", ticketId);
  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  redirect(`/admin/tickets/${ticketId}?message=Reply sent.`);
}

export async function updateTicketStatus(formData: FormData) {
  await requireAdmin();
  const admin = createSupabaseAdminClient() as unknown as QueryClient;
  const ticketId = getFormString(formData, "ticket_id");
  const status = getFormString(formData, "status");
  const closedAt = status === "closed" ? new Date().toISOString() : null;

  await admin.from("support_tickets").update({ status, closed_at: closedAt }).eq("id", ticketId);
  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  redirect(`/admin/tickets/${ticketId}?message=Ticket status updated.`);
}
