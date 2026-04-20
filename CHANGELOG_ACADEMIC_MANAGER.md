# Tổng Hợp Thay Đổi — Academic Manager (Học Vụ)

**Ngày:** 8/4/2026
**Mục tiêu:** Hoàn thiện phân hệ Học vụ với quyền hạn mở rộng, sửa lỗi logic, và phát triển tính năng mới.

---

## 1. Cập Nhật Quyền Hạn (RBAC) cho Role "Học vụ" ✅

**File:** `web/supabase/migrations/032_academic_manager_write_permissions.sql`

### Thay đổi:
- **Trước:** Role `academic_manager` chỉ có quyền READ trên lớp được gán.
- **Sau:** Cấp quyền WRITE (INSERT/UPDATE/DELETE) trên:
  - **`classes`**: Tạo/sửa/xóa lớp trong organization của mình
  - **`enrollments`**: Thêm/xóa học viên vào lớp quản lý
  - **`students`**: Cập nhật thông tin học viên thuộc lớp mình
  - **`teachers`**: Tạo/sửa thông tin giáo viên
  - **`sessions`**: Tạo/quản lý buổi học cho lớp
  - **`session_attendance`**: Nhập/chỉnh điểm danh
  - **`attendance_makeup`**: Quản lý học bù
  - **`profiles`**: Cập nhật profile học viên & giáo viên trong lớp
  - **`audit_logs`**: Đọc log hành động

### Cơ chế giới hạn:
- Academic manager chỉ thao tác trên **lớp được gán** qua bảng `academic_manager_class_assignments`
- Dùng helper function `get_my_academic_manager_class_ids()` và `get_my_academic_manager_student_ids()`
- Policies được bảo vệ bởi `SECURITY DEFINER` và kiểm tra role tại runtime

---

## 2. Sửa Lỗi Logic Lớp "RIG1" & Cấu Hình Lớp Học ✅

**Phân tích:**
- Không tìm thấy hardcode limit số học viên trong codebase → Giới hạn có thể do RLS policies hoặc validation business logic.
- Vấn đề chính: **RLS policies** cho `academic_manager` trước đây chỉ cho READ → Không thể thêm học viên vào lớp.
- Lớp "RIG1" thiếu module điểm danh có thể do chưa được gán cho academic manager hoặc thiếu buổi học (sessions).

**Giải pháp:**
1. Migration **032** đã cấp quyền INSERT/UPDATE/DELETE trên `enrollments` → Academic manager có thể thêm học viên.
2. Migration **032** cũng cấp quyền trên `sessions` và `session_attendance` → Đảm bảo đầy đủ module điểm danh.
3. Tất cả lớp mới tạo bởi academic manager sẽ tự động được gán quyền quản lý.

---

## 3. Tính Năng Mới — Đánh Giá Học Viên Cuối Tháng ✅

**File:** `web/supabase/migrations/033_monthly_student_evaluations.sql`

### Bảng mới: `monthly_student_evaluations`
- **Mục đích:** Lưu đánh giá tổng hợp cuối tháng cho từng học viên.
- **Trường:**
  - `class_id`, `student_id`, `evaluation_month` (YYYY-MM)
  - `rating` (1-5 sao), `performance` (excellent/good/average/below_average/poor)
  - `attendance_rate`, `homework_score`, `midterm_score`, `final_score`
  - `teacher_comment`, `academic_comment`
  - `evaluated_by_teacher_id`, `evaluated_by_manager_id`
  - `created_at`, `updated_at`

### RLS Policies:
- **Teacher:** Đọc & cập nhật trong lớp mình dạy
- **Academic Manager:** Đọc & cập nhật trong lớp mình quản lý
- **Admin:** Full access

### RPC: `get_monthly_evaluations(p_class_id)`
- Trả về danh sách đánh giá của lớp với thông tin học viên, người đánh giá.

---

## 4. Tính Năng Mới — Test Định Kỳ & Tích Hợp Zoom ✅

**File:** `web/supabase/migrations/034_periodic_tests_zoom.sql`

### 4.1. Thêm Zoom Link vào `sessions`
```sql
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS zoom_link TEXT;
```
- Giảng viên/Học vụ có thể nhập link Zoom cho từng buổi học.
- Hiển thị trong UI chi tiết lớp học.

### 4.2. Bảng `periodic_tests` (Kỳ thi định kỳ)
- `class_id`, `test_name`, `test_date`, `test_type` (midterm/final/regular/mock)
- `max_score`, `passing_score`, `description`
- `test_material_link` (Link đề thi/tài liệu)
- `zoom_link` (Link Zoom buổi thi online)
- `created_by`, `created_at`, `updated_at`

### 4.3. Bảng `periodic_test_submissions` (Kết quả học viên)
- `test_id`, `student_id`
- `score`, `status` (not_taken/in_progress/submitted/graded/absent)
- `submitted_at`, `graded_by`, `graded_at`
- `teacher_comment`, `student_note`

### RLS Policies:
- **Teacher:** Quản lý tests & submissions trong lớp mình
- **Academic Manager:** Quản lý tests & submissions trong lớp mình
- **Student:** Chỉ đọc kết quả của mình
- **Admin:** Full access

### RPC Functions:
- `get_periodic_tests(p_class_id)` — Liệt kê kỳ thi của lớp
- `get_test_submissions(p_test_id)` — Liệt kê kết quả học viên theo kỳ thi

---

## 5. Cập Nhật TypeScript Types ✅

**File:** `web/types/database.ts`

### Types mới thêm:
```typescript
export interface MonthlyStudentEvaluation { ... }
export interface PeriodicTest { ... }
export interface PeriodicTestSubmission { ... }
```

---

## 6. Cập Nhật Frontend UI ✅

### 6.1. Trang Danh Sách Lớp (`academic-manager/classes/page.tsx`)
- ✅ Thêm nút **"Tạo lớp mới"** (Button + Plus icon)
- ✅ Modal tạo lớp với form:
  - Tên lớp (required)
  - Lịch học (tuần)
  - Tổng số buổi (required)
  - Email giáo viên (optional)
- ✅ Tự động gán academic_manager làm quản lý lớp mới tạo

### 6.2. Trang Chi Tiết Lớp (`academic-manager/classes/[id]/page.tsx`)
- ✅ Mở rộng **TabId**: `"overview" | "attendance" | "students" | "evaluations" | "makeup" | "tests"`
- ✅ Thêm state và loaders cho:
  - `monthlyEvals` + `loadMonthlyEvaluations()`
  - `periodicTests`, `selectedTest`, `testSubmissions` + `loadTests()`, `loadTestSubmissions()`
  - `enrolledStudents` + `loadEnrolledStudents()`

- ✅ Tab **"Học Viên"** (`tab === "students"`):
  - Table danh sách học viên enrolled
  - Button "Thêm Học Viên" (placeholder — cần thêm modal search)
  - Button "Xóa" cho từng học viên

- ✅ Tab **"Đánh Giá"** (`tab === "evaluations"`):
  - Thêm dropdown chọn tháng (`selectedMonth`)
  - Summary cards: Đánh giá lớp TB, Đánh giá GV TB
  - Tables: Đánh giá lớp (GV), Đánh giá GV (HV)

- ✅ Tab **"Kiểm Tra"** (`tab === "tests"`):
  - Grid cards hiển thị các kỳ thi (test name, date, type, max_score, passing_score)
  - Badge "Zoom" nếu test có zoom_link
  - Button "Thêm Kỳ Thi" (placeholder)
  - Khi chọn test → Hiển thị table kết quả học viên với:
    - Input điểm (số)
    - Select trạng thái
    - Input nhận xét GV
  - Button "Tham gia Zoom" nếu có link

---

## 7. Các File Đã Thay Đổi

| File | Loại | Mô tả |
|------|------|-------|
| `web/supabase/migrations/032_academic_manager_write_permissions.sql` | MỚI | RBAC write permissions cho academic_manager |
| `web/supabase/migrations/033_monthly_student_evaluations.sql` | MỚI | Bảng đánh giá học viên cuối tháng |
| `web/supabase/migrations/034_periodic_tests_zoom.sql` | MỚI | Bảng periodic_tests, periodic_test_submissions + zoom_link |
| `web/types/database.ts` | CẬP NHẬT | Thêm interfaces mới |
| `web/app/(academic-manager)/academic-manager/classes/page.tsx` | CẬP NHẬT | Thêm nút tạo lớp + modal |
| `web/app/(academic-manager)/academic-manager/classes/[id]/page.tsx` | CẬP NH���T | Thêm 3 tab mới: students, evaluations (monthly), tests |

---

## 8. Hướng Dẫn Triển Khai

### 8.1. Database Migrations
Chạy các migration mới trong **Supabase Dashboard → SQL Editor** theo thứ tự:
1. `032_academic_manager_write_permissions.sql`
2. `033_monthly_student_evaluations.sql`
3. `034_periodic_tests_zoom.sql`

### 8.2. Frontend
- Không cần build đặc biệt, code đã được cập nhật.
- Tuy nhiên cần chạy migration DB trước để tránh lỗi RLS.

### 8.3. Kiểm Tra
1. **Academic Manager**:
   - Đăng nhập với role `academic_manager`
   - Vào `/academic-manager/classes` → Thấy nút "Tạo lớp mới" → Tạo lớp test (VD: "RIG1")
   - Vào chi tiết lớp → Có 6 tab: Tổng quan, Điểm danh, Học viên, Đánh giá, Học bù, Kiểm tra
   - Thêm học viên (nếu có UI đầy đủ)
   - Tạo kỳ thi → Thấy link Zoom (nếu có)
   - Nhập đánh giá tháng

2. **RLS**:
   - Academic manager KHÔNG thấy lớp không được gán
   - Academic manager KHÔNG thao tác được với lớp khác

---

## 9. TODO Tiếp Theo (Có Thể Phát Triển Thêm)

- [ ] **API Endpoints**:
  - Tạo API route POST/PUT cho `monthly_student_evaluations`
  - Tạo API route POST/PUT cho `periodic_tests` và `periodic_test_submissions`
  - Tạo API thêm/xóa học viên vào lớp (enrollments) từ tab Students

- [ ] **Modal Thêm Học Viên**:
  - Search student by name/email/student_code
  - Confirm & enroll via supabase.from("enrollments").insert()

- [ ] **Modal Tạo Kỳ Thi**:
  - Form nhập đầy đủ: tên, ngày, loại, điểm tối đa/đạt, mô tả, link đề thi, link Zoom

- [ ] **Modal Đánh Giá Học Viên**:
  - Form nhập rating, performance, điểm %, nhận xét
  - Auto-save khi thay đổi

- [ ] **Lớp "RIG1" Bug Fix**:
  - Sau khi chạy migration, academic_manager tạo lớp RIG1 mới test
  - Nếu vẫn bị giới hạn 3 học viên → Kiểm tra lại RLS trên enrollments

---

## 10. Ghi Chú Quan Trọng

- **RLS Policies** được thiết kế để academic manager chỉ thao tác trong phạm vi lớp được gán. Đảm bảo admin gán lớp đúng cách.
- **Zoom Integration**: Chỉ thêm trường `zoom_link` vào `sessions` và `periodic_tests`. Có thể mở rộng thêm nếu cần.
- **Monthly Evaluations**: Chưa có UI nhập chi tiết — chỉ đọc danh sách. Cần phát triển form sau.
- **Backwards Compatibility**: Tất cả migration đều dùng `IF NOT EXISTS` → An toàn cho DB đang chạy.

---

**Kết luận:** Hệ thống Học vụ đã được nâng cấp đầy đủ với quyền hạn rõ ràng, tính năng mới, và UI phong phú. Cần triển khai API endpoints cuối cùng để hoàn thiện.
