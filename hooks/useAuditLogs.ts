"use client";
import { createBrowserClient } from "@/lib/supabase/client";
import type { AuditLog } from "@/types";
import { useCallback, useEffect, useState } from "react";

export function useAuditLogs(limit = 100, entity?: string) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createBrowserClient();
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (entity) query = query.eq("entity", entity);

      const { data, error: err } = await query;
      if (err) throw err;
      setLogs((data as AuditLog[]) || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải audit logs");
    } finally {
      setLoading(false);
    }
  }, [limit, entity]);

  useEffect(() => { load(); }, [load]);

  return { logs, loading, error, reload: load };
}
