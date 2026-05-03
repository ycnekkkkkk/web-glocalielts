"use client";
import Avatar from "@/components/ui/Avatar";
import { Search, LogOut } from "lucide-react";
import { useState } from "react";
import NotificationBell from "./NotificationBell";
import { createBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { AuthUser } from "@/types";

interface HeaderProps {
  user: AuthUser | null;
  title?: string;
}

export default function Header({ user, title }: HeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="h-16 border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10 flex items-center px-6 justify-between shrink-0">
      <div className="flex items-center gap-3">
        {title && <h2 className="text-base font-semibold text-gray-800 hidden sm:block">{title}</h2>}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-400 w-52 cursor-pointer hover:border-gray-300 transition-colors">
          <Search className="w-3.5 h-3.5" />
          <span>Tìm kiếm...</span>
          <span className="ml-auto text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-md">⌘K</span>
        </div>

        {/* Notifications */}
        {user && <NotificationBell user={user} />}

        {/* User Menu */}
        {user && (
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
              <Avatar name={user.name} src={user.avatar_url} size="sm" />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-800 leading-none">{user.name}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 capitalize">{user.role}</p>
              </div>
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                <div className="px-3 py-2 border-b border-gray-50">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
