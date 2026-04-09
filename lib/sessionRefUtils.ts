/** Normalize class name for session_ref (trim, collapse spaces) */
export function normalizeClassForRef(className: string): string {
  return className.trim().replace(/\s+/g, " ");
}

/** Convert date string dd/MM/yyyy to session date key */
export function toSessionDateKey(dateStr: string): string {
  return (dateStr || "").trim();
}

/** Build session_ref: class_name#session_no#session_date */
export function buildSessionRef(className: string, sessionNo: number, dateStr: string): string {
  const c = normalizeClassForRef(className || "");
  const d = toSessionDateKey(dateStr || "");
  return `${c}#${sessionNo}#${d}`;
}

/** Parse session_ref back to parts */
export function parseSessionRef(ref: string): { className: string; sessionNo: number; sessionDate: string } | null {
  const parts = ref.split("#");
  if (parts.length !== 3) return null;
  return {
    className: parts[0],
    sessionNo: parseInt(parts[1], 10),
    sessionDate: parts[2],
  };
}
