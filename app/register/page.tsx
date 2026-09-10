import Link from "next/link";
import { register } from "../auth/actions";
import { SubmitButton } from "../submit-button";

export default function RegisterPage({
  searchParams
}: {
  searchParams?: Promise<{ message?: string }>;
}) {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">14-day demo trial</p>
        <h1>Create Account</h1>
        <p>Create your Trading Final Piece account to request demo access or submit your XM live account.</p>
        <form className="auth-form" action={register}>
          <label>
            Full Name
            <input name="full_name" type="text" autoComplete="name" />
          </label>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="new-password" minLength={6} required />
          </label>
          <SubmitButton className="primary-button" pendingLabel="Creating Account...">Create Account</SubmitButton>
        </form>
        <AuthMessage searchParams={searchParams} />
        <p className="auth-switch">
          Already registered? <Link href="/login">Login</Link>
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
