"use server";

import { redirect } from "next/navigation";
import { trackFunnelEvent } from "@/lib/analytics/events";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function login(formData: FormData) {
  const email = getFormString(formData, "email");
  const password = getFormString(formData, "password");
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?message=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function register(formData: FormData) {
  const email = getFormString(formData, "email");
  const password = getFormString(formData, "password");
  const fullName = getFormString(formData, "full_name");
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  });

  if (error) {
    redirect(`/register?message=${encodeURIComponent(error.message)}`);
  }

  await trackFunnelEvent("site_signup", { email }, data.user?.id ?? null);

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
