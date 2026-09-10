import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">Trading Final Piece</p>
        <h1>Check Your Email</h1>
        <p role="status">Check your inbox for a confirmation email from Trading Final Piece. Confirm your email address before signing in.</p>
        <p>Check your spam folder too. Open the confirmation link in the same browser where you registered.</p>
        <Link className="primary-button" href="/login">Continue To Login</Link>
        <p className="auth-switch">Already confirmed your email? You can sign in now.</p>
      </section>
    </main>
  );
}
