/**
 * Nguồn chân lý duy nhất cho giá trị dữ liệu giữa DB Supabase và Web.
 */

export const SESSION_STATUS = {
  UPCOMING: "UPCOMING",
  DONE: "DONE",
  CANCELLED: "CANCELLED",
} as const;
export type SessionStatus = keyof typeof SESSION_STATUS;

export const ATTENDANCE_STATUS = {
  ON_TIME: "on_time",
  LATE: "late",
  ABSENT: "absent",
} as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[keyof typeof ATTENDANCE_STATUS];

export const ATTENDANCE_DEFAULT = ATTENDANCE_STATUS.ON_TIME;

export const CLASS_STATUS_DB = {
  DANG_HOC: "Đang học",
  BINH_THUONG: "Bình thường",
  SAP_KHAI_GIANG: "Sắp khai giảng",
  KET_THUC: "Kết thúc",
  HOAN_THANH: "Hoàn thành",
} as const;

export const CLASS_STATUS_UI = {
  ACTIVE: "ACTIVE",
  DONE: "DONE",
  UPCOMING: "UPCOMING",
} as const;
export type ClassStatusUI = keyof typeof CLASS_STATUS_UI;

export const INVOICE_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  PARTIAL: "PARTIAL",
  OVERDUE: "OVERDUE",
} as const;
export type InvoiceStatus = keyof typeof INVOICE_STATUS;

export const STUDENT_STATUS_UI = {
  ACTIVE: "ACTIVE",
  DEBT: "DEBT",
  INACTIVE: "INACTIVE",
} as const;

export const DEMO_ACCOUNTS = {
  ADMIN: { email: "admin@glocalielts.edu.vn", name: "Admin – Glocal IELTS", role: "admin" as const },
  TEACHER: { email: "teacher@glocalielts.edu.vn", name: "Nguyễn Thị Lan", role: "teacher" as const },
  STUDENT: { email: "student@glocalielts.edu.vn", name: "Trần Minh Khoa", role: "student" as const },
} as const;

export const DEMO_PASSWORD = "demo123456";

export const ASSIGNMENT_GRADE_STATUS = {
  PENDING: "pending",
  GRADED: "graded",
} as const;

export const GRADE_OPTIONS = ["A+", "A", "B+", "B", "C+", "C", "D", "F"] as const;
export type GradeOption = (typeof GRADE_OPTIONS)[number];

export const GRADE_TO_SCORE: Record<GradeOption, number> = {
  "A+": 95,
  A: 87,
  "B+": 82,
  B: 75,
  "C+": 70,
  C: 65,
  D: 50,
  F: 50,
};

export const SCHEDULE_EMPTY_LABEL = "–";
