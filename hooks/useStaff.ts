"use client";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Staff } from "@/types";
import { useCallback, useEffect, useState } from "react";

export function useStaff() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createBrowserClient();
      const { data, error: err } = await supabase
        .from("staff")
        .select("*")
        .order("name");
      if (err) throw err;
      setStaff(data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu nhân sự");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createStaff(payload: Omit<Staff, "id" | "created_at">) {
    const supabase = createBrowserClient();
    const { data, error: err } = await supabase.from("staff").insert(payload).select().single();
    if (err) throw new Error(err.message);
    await load();
    return data as Staff;
  }

  async function updateStaff(id: number, payload: Partial<Omit<Staff, "id" | "created_at">>) {
    const supabase = createBrowserClient();
    const { error: err } = await supabase.from("staff").update(payload).eq("id", id);
    if (err) throw new Error(err.message);
    await load();
  }

  async function deleteStaff(id: number) {
    const supabase = createBrowserClient();
    const { error: err } = await supabase.from("staff").delete().eq("id", id);
    if (err) throw new Error(err.message);
    await load();
  }

  return { staff, loading, error, reload: load, createStaff, updateStaff, deleteStaff };
}
