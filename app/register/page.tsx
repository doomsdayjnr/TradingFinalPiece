import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">14-day demo trial</p>
        <h1>Create Account</h1>
        <p>
          Account creation and demo-license generation will be wired to Supabase
          in the backend phase. This route is the Phase 1 registration shell.
        </p>
        <Link className="primary-button" href="/">
          Back To Homepage
        </Link>
      </section>
    </main>
  );
}
