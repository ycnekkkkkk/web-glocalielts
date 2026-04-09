/**
 * URL Supabase redirect về sau Google OAuth (PKCE → thường có ?code=...).
 * Phải khai báo TRÙNG KHÍT trong Supabase Dashboard:
 * Authentication → URL Configuration → Redirect URLs
 * (ví dụ: http://localhost:3000/login khi dev)
 */
export function getOAuthRedirectToPath(): "/login" {
  return "/login";
}

export function getOAuthRedirectToUrl(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${getOAuthRedirectToPath()}`;
}
