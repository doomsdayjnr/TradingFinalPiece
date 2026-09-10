import Link from "next/link";
import { login } from "../auth/actions";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ message?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/dashboard");
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">Trading Final Piece</p>
        <h1>Login</h1>
        <p>Access your EA verification portal, demo trial, downloads and support.</p>
        <form className="auth-form" action={login}>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="primary-button" type="submit">Login</button>
        </form>
        <AuthMessage searchParams={searchParams} />
        <p className="auth-switch">
          Need an account? <Link href="/register">Create one</Link>
        </p>
        <Link className="primary-button" href="/">
          Back To Homepage
        </Link>
      </section>
    </main>
  );
}

async function AuthMessage({
  searchParams
}: {
  searchParams?: Promise<{ message?: string }>;
}) {
  const params = await searchParams;

  if (!params?.message) {
    return null;
  }

  return <p className="form-message">{params.message}</p>;
}
