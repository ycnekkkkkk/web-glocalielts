/** TypeScript row types for all Supabase tables */

// ============================================================
// Auth / Profiles
// ============================================================
export interface Profile {
  id: string;
  profile_code: string | null;
  email: string | null;
  full_name: string | null;
  role: "admin" | "teacher" | "student" | "organization" | "academic_manager";
  avatar_url: string | null;
  has_local_password: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Multi-tenant
// ============================================================
export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "starter" | "pro" | "enterprise";
  owner_id: string | null;
  created_at: string;
}

export interface OrganizationUser {
  id: string;
  organization_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  created_at: string;
}

// ============================================================
// Normalized classes / students / enrollments
// ============================================================

/** teacher_id FK only — name always fetched via JOIN with profiles */
export interface Class {
  id: string;
  organization_id: string | null;
  name: string;
  teacher_id: string | null;        // FK → auth.users / profiles
  schedule: string | null;
  /** Weekday codes for scheduled days, e.g. ["T2","T4","T6"] */
  schedule_days: string[] | null;
  /** Class start time, e.g. "19:00" */
  schedule_time: string | null;
  /** Class end time, e.g. "20:30" */
  schedule_end_time: string | null;
  room: string | null;
  level_in: string | null;
  level_out: string | null;
  total_sessions: number;
  sessions_done: number;
  tuition_fee: number;
  start_date: string | null;
  end_date: string | null;
  status: "active" | "upcoming" | "completed" | "cancelled";
  class_type: "group" | "1on1";
  zoom_link: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  /** Joined via: classes.select("*, teacher:profiles!teacher_id(id,full_name,email)") */
  teacher?: { id: string; full_name: string | null; email: string | null };
  /** Joined aggregate: classes.select("*, enrollments(count)") */
  enrollments?: [{ count: number }];
}

/** Partial unique index on email WHERE email IS NOT NULL */
export interface Student {
  id: string;
  student_code: string | null;
  organization_id: string | null;
  profile_id: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  current_address: string | null;
  current_status: string | null;
  profile_completed: boolean;
  parent_info: string | null;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  class_id: string;
  student_id: string;
  status: "active" | "completed" | "dropped";
  enrolled_at: string;
  /** Optional joins */
  student?: Pick<Student, "id" | "full_name" | "email" | "phone">;
  class?: Pick<Class, "id" | "name" | "status">;
}

// ============================================================
// Sessions (with class_id FK)
// ============================================================
export interface Session {
  id: number;
  class_id: string | null;          // FK → classes.id
  class_name: string;               // kept for legacy display
  session_no: number | null;
  session_date: string | null;
  session_time: string | null;
  topic: string | null;
  homework: string | null;
  status: "UPCOMING" | "DONE" | "CANCELLED";
  teacher_id: string | null;        // FK → auth.users (replaces teacher_name)
  zoom_link: string | null;
  created_at: string;
}

export interface SessionAttendance {
  id: number;
  session_ref: string;              // legacy — kept for backward compat
  session_id: number | null;        // new FK
  student_id: string | null;        // new FK → students.id
  class_name: string;
  session_no: number | null;
  session_date: string | null;
  student_name: string;
  attendance_status: "on_time" | "late" | "absent";
  note: string | null;
  created_at: string;
  updated_at: string;
}

/** GV đánh giá tổng thể buổi học — maps to session_class_evaluation */
export interface SessionClassEvaluation {
  id: number;
  session_ref: string;
  class_name: string;
  session_no: number | null;
  session_date: string | null;
  /** Overall session rating 1–5 */
  rating: number | null;
  comment: string | null;
  evaluated_by: string | null;
  evaluated_at: string | null;
  created_at: string;
}

/** GV đánh giá từng học viên trong buổi — maps to session_student_evaluation */
export interface SessionStudentEvaluation {
  id: number;
  session_ref: string;
  class_name: string | null;
  session_no: number | null;
  session_date: string | null;
  student_name: string;
  /** Student rating 1–5 */
  rating: number | null;
  comment: string | null;
  evaluated_by: string | null;
  evaluated_at: string | null;
  created_at: string;
}

/** HV đánh giá giảng viên trong buổi — maps to session_teacher_evaluation */
export interface SessionTeacherEvaluation {
  id: number;
  session_ref: string;
  class_name: string;
  session_no: number | null;
  session_date: string | null;
  student_name: string;
  /** Teacher rating 1–5 */
  rating: number | null;
  comment: string | null;
  created_at: string;
}

/** Lịch học bù cho học viên vắng — maps to attendance_makeup */
export interface AttendanceMakeup {
  /** session_ref of the MISSED session */
  session_ref: string;
  student_name: string;
  approved_by: string | null;
  approved_at: string | null;
  /** similar_group: bù vào lớp nhóm tương tự; other_session: ghi chú */
  makeup_type: "similar_group" | "other_session";
  /** session_ref of the makeup session (only for similar_group) */
  target_session_ref: string | null;
  note: string | null;
  /** Marked completed manually (mainly for other_session) */
  is_completed?: boolean | null;
  completed_at?: string | null;
  completed_by?: string | null;
  created_at: string;
}

/** Row returned by get_makeup_status RPC */
export interface MakeupStatusRow {
  student_name: string;
  session_ref: string;
  session_no: number | null;
  session_date: string | null;
  has_makeup: boolean;
  makeup_type: string | null;
  target_session_ref: string | null;
  note: string | null;
}

/** Row returned by get_class_evaluations RPC */
export interface ClassEvaluationRow {
  eval_type: "class_eval" | "teacher_eval";
  session_no: number | null;
  session_date: string | null;
  session_ref: string;
  rater_name: string | null;
  student_name: string | null;
  rating: number | null;
  comment: string | null;
  created_at: string;
}

// ============================================================
// Invoices + Payment History
// ============================================================

/** Raw invoice row — do NOT read status from here, use InvoiceStatus view */
export interface Invoice {
  id: number;
  enrollment_id: string | null;     // FK → enrollments.id
  student_name: string;             // kept for display / legacy
  class_name: string;               // kept for display / legacy
  amount: number;
  due_date: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

/** Always read from v_invoice_status view — status is computed from payment_history */
export interface InvoiceStatus {
  id: number;
  enrollment_id: string | null;
  student_name: string;
  class_name: string;
  amount: number;
  paid_total: number;
  remaining: number;
  status: "pending" | "paid" | "partial" | "overdue";
  due_date: string | null;
  note: string | null;
  created_at: string;
}

export interface PaymentHistory {
  id: number;
  invoice_id: number;
  amount: number;
  payment_method: "cash" | "transfer" | "card";
  note: string | null;
  collected_by: string | null;
  paid_at: string;
}

// ============================================================
// Audit Logs (populated by DB triggers only)
// ============================================================
export interface AuditLog {
  id: number;
  user_id: string | null;
  user_name: string | null;
  user_role: string | null;
  action: "INSERT" | "UPDATE" | "DELETE";
  entity: string;
  entity_id: string | null;
  old_data: unknown;
  new_data: unknown;
  created_at: string;
}

// ============================================================
// Staff / Center Settings
// ============================================================
export interface Staff {
  id: number;
  name: string;
  role: string;
  department: string | null;
  phone: string | null;
  email: string | null;
  status: "active" | "inactive";
  created_at: string;
}

export interface CenterSetting {
  id: number;
  key: string;
  value: string | null;
  updated_at: string;
}

// ============================================================
// Legacy tables (kept for backward compat / read-only)
// ============================================================
export interface ClassProgress {
  id: number;
  stt: number | null;
  phan_lop: string | null;
  ten_lop: string | null;
  hoc_vien: string | null;
  giao_vien: string | null;
  tro_giang: string | null;
  nhom_ph: string | null;
  tinh_trang: string | null;
  da_hoc: number | null;
  tong_so_buoi: number | null;
  test_t1: boolean | null;
  test_t2: boolean | null;
  test_t3: boolean | null;
  test_t4: boolean | null;
  test_t5: boolean | null;
  test_t6: boolean | null;
  dau_vao: string | null;
  dau_ra: string | null;
  cong_viec: string | null;
  ghi_chu: string | null;
  created_at: string;
}

export interface DataTuVan {
  id: number;
  giai_doan: string | null;
  stt: number | null;
  hoc_vien: string | null;
  tinh_trang: string | null;
  nguon: string | null;
  so_dien_thoai: string | null;
  email: string | null;
  nhu_cau: string | null;
  ghi_chu: string | null;
  created_at: string;
}

export interface ClassCurrent {
  id: number;
  stt: number | null;
  ten_lop: string;
  tinh_trang: string | null;
  hoc_vien: string | null;
  so_dien_thoai: string | null;
  email: string | null;
  giao_vien: string | null;
  tro_giang: string | null;
  lich_hoc: string | null;
  phong: string | null;
  buoi_hoc: number | null;
  da_hoc: number | null;
  con_lai: number | null;
  nhom_lop: string | null;
  dau_vao: string | null;
  dau_ra: string | null;
  hoc_phi_tong: number | null;
  hoc_phi_da_thu: number | null;
  hoc_phi_chua_thu: number | null;
  thong_tin_phu_huynh: string | null;
  ghi_chu: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClassFinished {
  id: number;
  stt: number | null;
  ten_lop: string;
  tinh_trang: string | null;
  hoc_vien: string | null;
  so_dien_thoai: string | null;
  email: string | null;
  giao_vien: string | null;
  lich_hoc: string | null;
  nhom_lop: string | null;
  dau_vao: string | null;
  dau_ra: string | null;
  hoc_phi_tong: number | null;
  ghi_chu: string | null;
  created_at: string;
}

export interface MonthlyFinancial {
  id: number;
  month: string;
  revenue: number;
  expense: number;
  profit: number;
  created_at: string;
}

export interface Transaction {
  id: number;
  date: string | null;
  type: string | null;
  description: string | null;
  amount: number | null;
  category: string | null;
  created_at: string;
}

export interface TopCourse {
  id: number;
  name: string;
  students: number;
  revenue: number;
  rating: number;
  type: string | null;
  created_at: string;
}

export interface Teacher {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface AssignmentGrade {
  id: number;
  class_name: string;
  student_name: string;
  assignment_name: string;
  grade: string | null;
  score: number | null;
  status: "pending" | "graded";
  feedback: string | null;
  submitted_at: string | null;
  graded_at: string | null;
  created_at: string;
}

export interface StudentExam {
  id: number;
  student_name: string;
  class_name: string;
  exam_name: string;
  exam_date: string | null;
  score: number | null;
  max_score: number | null;
  status: string | null;
  note: string | null;
  created_at: string;
}

export interface StudentAchievement {
  id: number;
  student_name: string;
  class_name: string | null;
  achievement_type: string | null;
  title: string;
  description: string | null;
  issued_at: string | null;       // migrated column name
  created_at: string;
}

export interface PublicCourse {
  id: string;
  legacy_webinar_id: number | null;
  slug: string;
  title: string;
  short_description: string | null;
  description: string | null;
  teacher_name: string | null;
  objective_text: string | null;
  duration_text: string | null;
  certificate_text: string | null;
  thumbnail_url: string | null;
  demo_video_url: string | null;
  demo_video_source: string | null;
  curriculum: PublicCourseLesson[] | null;
  level: string | null;
  price: number;
  currency: string;
  status: "published" | "draft" | "archived";
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface PublicCourseTopic {
  title: string;
  video: string | null;
}

export interface PublicCourseLesson {
  name: string;
  topics: PublicCourseTopic[];
  assignments: string[];
}

export interface PublicQuiz {
  id: string;
  legacy_quiz_id: number | null;
  slug: string;
  title: string;
  description: string | null;
  time_limit_minutes: number | null;
  pass_mark: number;
  total_mark: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicQuizQuestion {
  id: string;
  quiz_id: string;
  legacy_question_id: number | null;
  question_text: string;
  question_type: string;
  grade: number;
  sort_order: number;
  created_at: string;
}

export interface PublicQuizOption {
  id: string;
  question_id: string;
  legacy_answer_id: number | null;
  option_text: string;
  is_correct: boolean;
  sort_order: number;
}

export interface PublicQuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number;
  max_score: number;
  status: "submitted" | "passed" | "failed";
  answers: Record<string, string>;
  submitted_at: string;
  created_at: string;
}

// ============================================================
// Mock skill exams (IELTS 4 kỹ năng — thi thử + Drive)
// ============================================================

export interface MockSkillExamDef {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content_public: Record<string, unknown> | null;
  content_drive_file_id: string | null;
  content_drive_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MockSkillExamAnswers {
  exam_id: string;
  answers: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MockSkillSubmission {
  id: string;
  exam_id: string;
  auth_user_id: string | null;
  candidate: Record<string, unknown>;
  drive_folder_id: string | null;
  drive_folder_url: string | null;
  scores: Record<string, unknown> | null;
  status: "processing" | "completed" | "failed";
  error_message: string | null;
  submitted_at: string;
  created_at: string;
}

/** View types */
export interface VTeacher {
  name: string;
  classes_count: number;
  classes: string | null;
}

export interface VStudentFromClass {
  hoc_vien: string;
  ten_lop: string;
  giao_vien: string | null;
  tinh_trang: string | null;
}

// ============================================================
// Monthly Student Evaluations
// ============================================================
export interface MonthlyStudentEvaluation {
  id: string;
  class_id: string;
  student_id: string;
  evaluation_month: string;           // 'YYYY-MM'
  academic_year?: string | null;
  rating?: number | null;             // 1-5 stars
  performance?: "excellent" | "good" | "average" | "below_average" | "poor" | null;
  attendance_rate?: number | null;   // percentage
  homework_score?: number | null;    // percentage
  midterm_score?: number | null;     // percentage
  final_score?: number | null;       // percentage
  teacher_comment?: string | null;
  academic_comment?: string | null;
  evaluated_by_teacher_id?: string | null;
  evaluated_by_manager_id?: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Periodic Tests & Submissions
// ============================================================
export interface PeriodicTest {
  id: string;
  class_id: string;
  test_name: string;
  test_date?: string | null;
  test_type?: "midterm" | "final" | "regular" | "mock" | null;
  max_score?: number | null;
  passing_score?: number | null;
  description?: string | null;
  test_material_link?: string | null;
  zoom_link?: string | null;         // <-- Tích hợp Zoom
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PeriodicTestSubmission {
  id: string;
  test_id: string;
  student_id: string;
  score?: number | null;
  status?: "not_taken" | "in_progress" | "submitted" | "graded" | "absent" | null;
  submitted_at?: string | null;
  graded_by?: string | null;
  graded_at?: string | null;
  teacher_comment?: string | null;
  student_note?: string | null;
  created_at: string;
  updated_at: string;
}
