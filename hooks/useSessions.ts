"use client";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Session, SessionAttendance } from "@/types";
import { useEffect, useState } from "react";

export function useSessions(className?: string) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const supabase = createBrowserClient();
      let query = supabase.from("sessions").select("*").order("session_no");
      if (className) query = query.eq("class_name", className);
      const { data } = await query;
      setSessions(data || []);
      setLoading(false);
    }
    fetch();
  }, [className]);

  return { sessions, loading, setSessions };
}

export function useAttendance(sessionRef: string) {
  const [attendance, setAttendance] = useState<SessionAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionRef) return;
    async function fetch() {
      const supabase = createBrowserClient();
      const { data } = await supabase
        .from("session_attendance")
        .select("*")
        .eq("session_ref", sessionRef);
      setAttendance(data || []);
      setLoading(false);
    }
    fetch();
  }, [sessionRef]);

  return { attendance, loading, setAttendance };
}
