"use client";
import { createBrowserClient } from "@/lib/supabase/client";
import type { InvoiceStatus, PaymentHistory } from "@/types";
import { useCallback, useEffect, useState } from "react";

/** Always reads invoice status from v_invoice_status view (computed from payment_history) */
export function useInvoiceStatus(filters?: { studentName?: string; status?: string }) {
  const [invoices, setInvoices] = useState<InvoiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createBrowserClient();
      let query = supabase
        .from("v_invoice_status")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.studentName) query = query.eq("student_name", filters.studentName);
      if (filters?.status) query = query.eq("status", filters.status);

      const { data, error: err } = await query;
      if (err) throw err;
      setInvoices((data as InvoiceStatus[]) || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải hóa đơn");
    } finally {
      setLoading(false);
    }
  }, [filters?.studentName, filters?.status]);

  useEffect(() => { load(); }, [load]);

  return { invoices, loading, error, reload: load };
}

/** Fetch payment history for a specific invoice */
export function usePaymentHistory(invoiceId?: number) {
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!invoiceId) return;
    async function load() {
      setLoading(true);
      const supabase = createBrowserClient();
      const { data } = await supabase
        .from("payment_history")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("paid_at", { ascending: false });
      setPayments(data || []);
      setLoading(false);
    }
    load();
  }, [invoiceId]);

  return { payments, loading };
}

/**
 * Add a payment to an invoice.
 * Inserts into payment_history only — invoice status auto-recomputes via v_invoice_status view.
 */
export async function addPayment(
  invoiceId: number,
  amount: number,
  method: "cash" | "transfer" | "card",
  note?: string,
  collectedBy?: string
): Promise<PaymentHistory> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase
    .from("payment_history")
    .insert({
      invoice_id: invoiceId,
      amount,
      payment_method: method,
      note: note || null,
      collected_by: collectedBy || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as PaymentHistory;
}
