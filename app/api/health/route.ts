import { NextResponse } from "next/server";

const requiredServerEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY"
];

export async function GET() {
  const missing = requiredServerEnv.filter((name) => !process.env[name]);

  return NextResponse.json(
    {
      ok: missing.length === 0,
      missing
    },
    {
      status: missing.length === 0 ? 200 : 503
    }
  );
}
