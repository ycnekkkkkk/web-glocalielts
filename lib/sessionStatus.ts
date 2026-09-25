import { SESSION_STATUS } from "@/lib/constants";

/**
 * Parses date string in 'dd/MM/yyyy' or 'YYYY-MM-DD' format safely into a Date object.
 */
export function parseSessionDateSafe(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const str = dateStr.trim();

  // Format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.slice(0, 10).split("-").map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m - 1, d);
    }
  }

  // Format: dd/MM/yyyy
  const parts = str.split("/");
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
      return new Date(y, m, d);
    }
  }

  const ts = Date.parse(str);
  if (!isNaN(ts)) return new Date(ts);
  return null;
}

/**
 * Parses session date + time into a full Date object.
 */
export function getSessionDateTime(dateStr?: string | null, timeStr?: string | null): Date | null {
  const date = parseSessionDateSafe(dateStr);
  if (!date) return null;

  if (timeStr) {
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      const h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      if (!isNaN(h) && !isNaN(m)) {
        date.setHours(h, m, 0, 0);
        return date;
      }
    }
  }

  // Default to 00:00:00
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Checks whether a session has already passed relative to `now`.
 * If session date is before today, it's past.
 * If session date is today and time is provided, it's past once current time >= start time.
 */
export function isSessionPast(dateStr?: string | null, timeStr?: string | null): boolean {
  if (!dateStr) return false;
  const sessionDate = parseSessionDateSafe(dateStr);
  if (!sessionDate) return false;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());

  // Strictly in the past day
  if (targetDay.getTime() < today.getTime()) {
    return true;
  }

  // Future day
  if (targetDay.getTime() > today.getTime()) {
    return false;
  }

  // Same day (Today): check time if available
  if (timeStr) {
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      const h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      if (!isNaN(h) && !isNaN(m)) {
        const sessionTime = new Date(today);
        sessionTime.setHours(h, m, 0, 0);
        return now.getTime() >= sessionTime.getTime();
      }
    }
  }

  return false;
}

export interface SessionState {
  isDone: boolean;
  isCancelled: boolean;
  isMakeup: boolean;
  isPast: boolean;
  isPendingAttendance: boolean; // Has passed date/time but teacher has not marked attendance
  isUpcoming: boolean;
}

export function getSessionState(session: {
  status?: string | null;
  session_date?: string | null;
  session_time?: string | null;
  makeup_original_date?: string | null;
}): SessionState {
  const isDone = session.status === SESSION_STATUS.DONE;
  const isCancelled = session.status === SESSION_STATUS.CANCELLED;
  const isMakeup = Boolean(session.makeup_original_date);
  const isPast = isSessionPast(session.session_date, session.session_time);
  const isPendingAttendance = !isDone && !isCancelled && isPast;
  const isUpcoming = !isDone && !isCancelled && !isPast;

  return {
    isDone,
    isCancelled,
    isMakeup,
    isPast,
    isPendingAttendance,
    isUpcoming,
  };
}
