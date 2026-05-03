-- Migration 058: Bật tính năng Realtime cho bảng course_messages
-- Lệnh này sẽ đưa bảng course_messages vào kênh broadcast của Supabase
-- giúp chat nảy tin nhắn ngay lập tức không cần F5.

alter publication supabase_realtime add table course_messages;
