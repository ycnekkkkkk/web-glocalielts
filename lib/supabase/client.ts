import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";

// Singleton — one client instance for the entire browser session.
// Multiple instances fight over the same localStorage lock for the auth token,
// causing "Lock was not released" errors especially in React Strict Mode.
let _client: ReturnType<typeof createSupabaseBrowserClient> | null = null;

export function createBrowserClient() {
  if (!_client) {
    _client = createSupabaseBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}
