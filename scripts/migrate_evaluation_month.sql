-- =============================================================
-- Migration: Chuyển evaluation_month từ format số tiếng Việt
--            ("Tháng thứ nhất", "Tháng thứ hai", ...)
--            sang format số Arabic ("Tháng thứ 1", "Tháng thứ 2", ...)
-- =============================================================

-- Xem trước dữ liệu sẽ thay đổi
SELECT DISTINCT evaluation_month, class_id
FROM monthly_student_evaluations
ORDER BY class_id, evaluation_month;

-- Thực hiện update
UPDATE monthly_student_evaluations
SET evaluation_month = REPLACE(evaluation_month, 'Tháng thứ nhất', 'Tháng thứ 1');

UPDATE monthly_student_evaluations
SET evaluation_month = REPLACE(evaluation_month, 'Tháng thứ hai', 'Tháng thứ 2');

UPDATE monthly_student_evaluations
SET evaluation_month = REPLACE(evaluation_month, 'Tháng thứ ba', 'Tháng thứ 3');

UPDATE monthly_student_evaluations
SET evaluation_month = REPLACE(evaluation_month, 'Tháng thứ tư', 'Tháng thứ 4');

UPDATE monthly_student_evaluations
SET evaluation_month = REPLACE(evaluation_month, 'Tháng thứ năm', 'Tháng thứ 5');

UPDATE monthly_student_evaluations
SET evaluation_month = REPLACE(evaluation_month, 'Tháng thứ sáu', 'Tháng thứ 6');

UPDATE monthly_student_evaluations
SET evaluation_month = REPLACE(evaluation_month, 'Tháng thứ bảy', 'Tháng thứ 7');

UPDATE monthly_student_evaluations
SET evaluation_month = REPLACE(evaluation_month, 'Tháng thứ tám', 'Tháng thứ 8');

UPDATE monthly_student_evaluations
SET evaluation_month = REPLACE(evaluation_month, 'Tháng thứ chín', 'Tháng thứ 9');

UPDATE monthly_student_evaluations
SET evaluation_month = REPLACE(evaluation_month, 'Tháng thứ mười', 'Tháng thứ 10');

-- Xác nhận kết quả sau khi update
SELECT DISTINCT evaluation_month, class_id
FROM monthly_student_evaluations
ORDER BY class_id, evaluation_month;
