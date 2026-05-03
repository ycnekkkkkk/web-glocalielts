"use client";

import { createBrowserClient } from "@/lib/supabase/client";
import { Bell, CheckCircle2, MessageCircle, XCircle } from "lucide-react";
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

  // Đánh dấu đã đọc khi mở
  useEffect(() => {
    if (open && unreadCount > 0) {
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      // Background update
      supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false)
        .then(); // no await needed
    }
  }, [open, unreadCount, user.id]);

  function getIcon(title: string) {
    if (title.toLowerCase().includes("tin nhắn")) return <MessageCircle className="w-5 h-5 text-blue-500" />;
    if (title.toLowerCase().includes("từ chối")) return <XCircle className="w-5 h-5 text-red-500" />;
    return <CheckCircle2 className="w-5 h-5 text-green-500" />;
  }

  function handleItemClick(url: string | null) {
    setOpen(false);
    if (url) router.push(url);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      >
        <Bell className={`w-5 h-5 ${isRinging ? "animate-wiggle text-brand-600" : ""}`} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">Thông báo</h3>
            {notifications.length > 0 && (
              <span className="text-xs text-gray-500">{notifications.length} thông báo</span>
            )}
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Không có thông báo nào</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleItemClick(n.link_url)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                      !n.is_read ? "bg-brand-50/30" : ""
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">{getIcon(n.title)}</div>
                    <div>
                      <p className={`text-sm ${!n.is_read ? "font-bold text-gray-900" : "font-medium text-gray-800"}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-2 leading-relaxed">
                        {n.content}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1.5">
                        {new Date(n.created_at).toLocaleString("vi-VN", {
                          hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit"
                        })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
