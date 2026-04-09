"use client";
import { resolveUserRole } from "@/lib/auth/resolve-user-role";
import { createBrowserClient } from "@/lib/supabase/client";
import type { AuthUser } from "@/types";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

async function fetchProfileWithRetry(
  supabase: ReturnType<typeof createBrowserClient>,
  authUser: User
) {
  const query = () =>
    supabase.from("profiles").select("role, full_name, avatar_url").eq("id", authUser.id).maybeSingle();

  let { data: profile } = await query();
  // Sau OAuth / tạo user, dòng profiles có thể chậm một nhịp — thử lại ngắn.
  if (!profile) {
    await new Promise((r) => setTimeout(r, 450));
    const second = await query();
    profile = second.data;
  }
  return profile;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient();
    let cancelled = false;

    async function loadProfile(authUser: User) {
      try {
        if (cancelled) return;
        const profile = await fetchProfileWithRetry(supabase, authUser);
        if (cancelled) return;
        const role = resolveUserRole(profile?.role, authUser);
        setUser({
          id: authUser.id,
          email: authUser.email || "",
          role,
          name: profile?.full_name || (authUser.user_metadata?.full_name as string) || authUser.email || "",
          avatar_url: profile?.avatar_url,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    supabase.auth
      .getSession()
      .then((res: { data: { session: Session | null } }) => {
        const session = res.data.session;
        if (cancelled) return;
        if (!session?.user) {
          setUser(null);
          setLoading(false);
          return;
        }
        void loadProfile(session.user);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (cancelled) return;
      if (!session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }
      void loadProfile(session.user);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
