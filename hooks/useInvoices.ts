"use client";
import { createBrowserClient } from "@/lib/supabase/client";
import type { InvoiceStatus } from "@/types";
import { useEffect, useState } from "react";

/** Always reads from v_invoice_status view — status is COMPUTED, never stored */
export function useInvoices(studentName?: string) {
  const [invoices, setInvoices] = useState<InvoiceStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const supabase = createBrowserClient();
      let query = supabase
        .from("v_invoice_status")
        .select("*")
        .order("created_at", { ascending: false });
      if (studentName) query = query.eq("student_name", studentName);
      const { data } = await query;
      setInvoices((data as InvoiceStatus[]) || []);
      setLoading(false);
    }
    fetch();
  }, [studentName]);

  return { invoices, loading, setInvoices };
}
