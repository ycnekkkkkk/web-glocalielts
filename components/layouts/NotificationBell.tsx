"use client";

import { createBrowserClient } from "@/lib/supabase/client";
import { Bell, CheckCheck, CheckCircle2, MessageCircle, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/types";

type Notification = {
  id: string;
  title: string;
  content: string;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
};

export default function NotificationBell({ user }: { user: AuthUser }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isRinging, setIsRinging] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createBrowserClient();
  const router = useRouter();

  // Load ban đầu
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
      }
    }
    load();
  }, [user.id]);

  // Lắng nghe Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((c) => c + 1);

          // Ring animation
          setIsRinging(true);
          setTimeout(() => setIsRinging(false), 3000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  // Click ra ngoài để đóng dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Đánh dấu tất cả đã đọc
  async function markAllAsRead() {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
  }

  function getIcon(title: string) {
    const t = title.toLowerCase();
    if (t.includes("tin nhắn") || t.includes("chat")) return <MessageCircle className="w-4 h-4 text-sky-500" />;
    if (t.includes("từ chối") || t.includes("hủy")) return <XCircle className="w-4 h-4 text-rose-500" />;
    return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  }

  function handleItemClick(url: string | null) {
    setOpen(false);
    if (url) router.push(url);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative w-10 h-10 flex items-center justify-center rounded-2xl text-slate-500 hover:text-brand-600 hover:bg-slate-100/80 transition-all border border-transparent hover:border-slate-200 cursor-pointer"
        aria-label="Thông báo"
        title="Thông báo"
      >
        <Bell className={`w-4 h-4 ${isRinging ? "animate-bounce text-brand-600" : ""}`} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-white shadow-2xs">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-[var(--animate-fade-in)]">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Thông báo</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                  {unreadCount} mới
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-brand-600 hover:text-brand-800 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Đã đọc tất cả
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Bell className="w-9 h-9 mx-auto mb-2 opacity-25" />
                <p className="text-xs font-medium">Bạn chưa có thông báo nào</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleItemClick(n.link_url)}
                  className={`w-full text-left p-4 hover:bg-slate-50/80 transition-colors flex items-start gap-3 cursor-pointer ${!n.is_read ? "bg-brand-50/20" : ""
                    }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    {getIcon(n.title)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${!n.is_read ? "font-bold text-slate-900" : "font-semibold text-slate-700"} leading-snug truncate`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                      {n.content}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">
                      {new Date(n.created_at).toLocaleString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
