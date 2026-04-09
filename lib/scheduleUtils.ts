export type DayColumn = "T2" | "T3" | "T4" | "T5" | "T6" | "T7" | "CN";
export const DAY_COLUMNS: DayColumn[] = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/** Parse Vietnamese weekday strings in lich_hoc */
const VIET_DAYS: Record<string, DayColumn> = {
  "thứ 2": "T2", "thứ hai": "T2", "t2": "T2",
  "thứ 3": "T3", "thứ ba": "T3", "t3": "T3",
  "thứ 4": "T4", "thứ tư": "T4", "t4": "T4",
  "thứ 5": "T5", "thứ năm": "T5", "t5": "T5",
  "thứ 6": "T6", "thứ sáu": "T6", "t6": "T6",
  "thứ 7": "T7", "thứ bảy": "T7", "t7": "T7",
  "chủ nhật": "CN", "cn": "CN",
};

export function parseDayFromString(str: string): DayColumn | null {
  const lower = str.toLowerCase().trim();
  for (const [key, val] of Object.entries(VIET_DAYS)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

export interface ScheduleSession {
  id: number;
  class_name: string;
  session_no: number;
  session_date: string;
  session_time: string;
  topic: string;
  status: string;
  teacher_name: string;
}

export interface WeekCell {
  day: DayColumn;
  sessions: ScheduleSession[];
}

/** Parse dd/MM/yyyy -> Date */
export function parseSessionDate(dateStr: string): Date | null {
  const parts = (dateStr || "").split("/");
  if (parts.length !== 3) return null;
  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const y = parseInt(parts[2], 10);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  return new Date(y, m, d);
}

/** Get Monday of the week containing the given date */
export function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get day column from a Date */
export function getDayColumn(date: Date): DayColumn {
  const day = date.getDay();
  return DAY_COLUMNS[day === 0 ? 6 : day - 1];
}

/** Group sessions by day column for a specific week */
export function groupSessionsByDay(
  sessions: ScheduleSession[],
  weekStart: Date
): Record<DayColumn, ScheduleSession[]> {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const result: Record<DayColumn, ScheduleSession[]> = {
    T2: [], T3: [], T4: [], T5: [], T6: [], T7: [], CN: [],
  };

  for (const s of sessions) {
    const d = parseSessionDate(s.session_date);
    if (!d || d < weekStart || d >= weekEnd) continue;
    const col = getDayColumn(d);
    result[col].push(s);
  }

  return result;
}

/** Format date to dd/MM */
export function formatDateShort(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Format Date to dd/MM/yyyy (used as session_date in DB) */
export function formatDateFull(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

/** Map DayColumn → JS getDay() value (0=Sunday) */
const DAY_TO_JS: Record<DayColumn, number> = {
  T2: 1, T3: 2, T4: 3, T5: 4, T6: 5, T7: 6, CN: 0,
};

/**
 * Generate session dates from a start date, selected weekdays, and total count.
 * @param startDate - ISO string YYYY-MM-DD (inclusive start)
 * @param selectedDays - Array of DayColumn codes, e.g. ["T2","T4","T6"]
 * @param totalSessions - How many session dates to generate
 * @returns Array of Date objects (at most totalSessions items)
 */
export function generateSessionDates(
  startDate: string,
  selectedDays: DayColumn[],
  totalSessions: number
): Date[] {
  if (!startDate || selectedDays.length === 0 || totalSessions <= 0) return [];

  const targetDays = selectedDays.map(d => DAY_TO_JS[d]);
  const dates: Date[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  // Safety cap: don't iterate more than 5 years' worth of days
  const maxIterations = totalSessions * 10 + 365;
  let iterations = 0;

  while (dates.length < totalSessions && iterations < maxIterations) {
    if (targetDays.includes(current.getDay())) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
    iterations++;
  }

  return dates;
}
