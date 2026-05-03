"use client";

import { createBrowserClient } from "@/lib/supabase/client";
import { MessageCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

type Message = {
  id: string;
  sender_role: "user" | "admin";
  content: string;
  created_at: string;
};

type Props = {
  courseId: string;
  /** "user" nếu là student, "admin" nếu admin chat với user */
  viewerRole: "user" | "admin";
  /** Nếu admin xem, truyền userId của user cần chat */
  targetUserId?: string;
  courseName?: string;
  autoOpen?: boolean;
};

export default function CourseChat({ courseId, viewerRole, targetUserId, courseName, autoOpen }: Props) {
  const [open, setOpen] = useState(autoOpen ?? false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const openRef = useRef(open);
  useEffect(() => { openRef.current = open; }, [open]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createBrowserClient();

  async function loadMessages() {
    setLoading(true);
    try {
      const url =
        viewerRole === "admin" && targetUserId
          ? `/api/admin/course-messages/${courseId}/${targetUserId}`
          : `/api/student/course-messages/${courseId}`;
      const res = await fetch(url);
      const json = await res.json() as { data: Message[] };
      setMessages(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, targetUserId]);

  useEffect(() => {
    const channel = supabase
      .channel(`course-messages-${courseId}-${targetUserId ?? "self"}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "course_messages",
          filter: targetUserId
            ? `course_id=eq.${courseId}`
            : `course_id=eq.${courseId}`,
        },
        (payload: any) => {
          const newMsg = payload.new as Message;
          // Ignore if admin has a specific targetUserId but this message belongs to a different user
          if (targetUserId && newMsg.sender_role === "user" && (payload.new as any).user_id !== targetUserId) return;
          
          setMessages((prev) => {
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          
          // Notify if the message is from the other person
          if (newMsg.sender_role !== viewerRole) {
            if (!openRef.current) {
              setUnreadCount((c) => c + 1);
              toast("Có tin nhắn mới!", {
                icon: "💬",
                position: "bottom-right",
                style: { marginBottom: "80px", borderRadius: "12px" },
              });
            } else {
              // Just play a subtle sound or do nothing if it's open
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, targetUserId, viewerRole]);

  useEffect(() => {
    if (open) {
      setUnreadCount(0); // reset unread when opening
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [messages, open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const url =
        viewerRole === "admin" && targetUserId
          ? `/api/admin/course-messages/${courseId}/${targetUserId}`
          : `/api/student/course-messages/${courseId}`;
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      setInput("");
    } finally {
      setSending(false);
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-gradient-to-r from-brand-600 to-indigo-500 hover:from-brand-500 hover:to-indigo-400 text-white px-5 py-3.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_40px_rgb(79,70,229,0.3)] animate-fade-in"
          aria-label="Mở chat"
        >
          <div className="relative flex items-center justify-center">
            <MessageCircle className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-2 flex h-4 w-4 animate-bounce items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <span className="text-sm font-semibold tracking-wide">
            {viewerRole === "admin" ? "Chat với học viên" : "Hỗ trợ trực tuyến"}
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] sm:w-[400px] h-[550px] rounded-3xl border border-white/40 bg-gray-50/95 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden animate-slide-in">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-brand-600 to-indigo-600 text-white shrink-0 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[15px] font-bold tracking-wide">
                  {viewerRole === "admin" ? "Học viên" : "Admin Hỗ Trợ"}
                </p>
                {courseName && (
                  <p className="text-[11px] text-brand-100/90 truncate max-w-[200px] font-medium tracking-wide uppercase mt-0.5">{courseName}</p>
                )}
              </div>
            </div>
            <button 
              onClick={() => setOpen(false)} 
              className="relative z-10 p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scroll-smooth min-h-0 bg-[#f8fafc]/50">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs text-brand-400 font-medium animate-pulse">Đang kết nối...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-3 opacity-60">
                <MessageCircle className="w-10 h-10" />
                <p className="text-xs text-center px-4 leading-relaxed">
                  Bắt đầu cuộc trò chuyện. Chúng tôi sẽ phản hồi trong giây lát!
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isMe =
                  (viewerRole === "user" && msg.sender_role === "user") ||
                  (viewerRole === "admin" && msg.sender_role === "admin");
                
                // Grouping logic for margins
                const isNextSame = messages[idx + 1]?.sender_role === msg.sender_role;
                
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} ${isNextSame ? "mb-1" : "mb-4"}`}>
                    <div
                      className={`max-w-[85%] px-4 py-2.5 text-[14px] leading-relaxed shadow-sm relative group ${
                        isMe
                          ? `bg-gradient-to-br from-brand-500 to-indigo-600 text-white rounded-2xl ${isNextSame ? "rounded-br-md" : "rounded-br-sm"}`
                          : `bg-white border border-gray-100 text-gray-800 rounded-2xl ${isNextSame ? "rounded-bl-md" : "rounded-bl-sm"}`
                      }`}
                    >
                      <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-[9px] font-medium mt-1.5 text-right opacity-0 group-hover:opacity-100 transition-opacity absolute ${isMe ? "-left-12 bottom-1 text-gray-400" : "-right-12 bottom-1 text-gray-400"}`}>
                        {formatTime(msg.created_at).split(" ")[1]}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white/80 backdrop-blur-md border-t border-gray-100">
            <div className="relative flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-3xl p-1.5 focus-within:ring-2 focus-within:ring-brand-500/50 focus-within:border-brand-500 transition-all shadow-inner">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Nhập nội dung..."
                className="flex-1 max-h-32 min-h-[40px] text-[14px] bg-transparent border-none px-3 py-2.5 focus:outline-none resize-none overflow-y-auto"
                disabled={sending}
                rows={1}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-brand-600 text-white disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-brand-700 transition-colors shadow-sm"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
