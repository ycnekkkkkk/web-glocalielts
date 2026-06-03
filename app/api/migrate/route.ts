import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// ONE-TIME migration endpoint — remove after use
export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const ddlStatements = [
    `ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS makeup_original_date TEXT`,
    `ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS makeup_note TEXT`,
    `ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS cancelled_note TEXT`,
    `ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS cancelled_by TEXT`,
    `ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ`,
    `UPDATE public.session_attendance SET attendance_status = 'on_time' WHERE attendance_status = 'late'`,
  ];

  const results: { sql: string; ok: boolean; error?: string }[] = [];

  for (const sql of ddlStatements) {
    // Use rpc with a raw SQL function if available, otherwise use supabase-js
    // We'll use the pg-net or just test the column
    const { error } = await supabase.rpc("run_ddl", { sql_text: sql }).single();
    if (error) {
      // Fallback: some DDL can be run via special RPC
      results.push({ sql: sql.slice(0, 60), ok: false, error: error.message });
    } else {
      results.push({ sql: sql.slice(0, 60), ok: true });
    }
  }

  return NextResponse.json({ results });
}
