import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">Trading Final Piece</p>
        <h1>Login</h1>
        <p>
          The login form will connect to Supabase Auth in the backend phase. For
          Phase 1 this route confirms the public funnel has a clear portal entry.
        </p>
        <Link className="primary-button" href="/">
          Back To Homepage
        </Link>
      </section>
    </main>
  );
}
