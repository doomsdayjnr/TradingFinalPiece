export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const fallback = process.env.NODE_ENV === "production"
    ? "https://trading-final-piece.vercel.app"
    : "http://localhost:3000";
  const url = new URL(configured || fallback);
  if (url.username || url.password || !["http:", "https:"].includes(url.protocol)) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be an HTTP(S) site URL.");
  }
  return url.origin;
}
