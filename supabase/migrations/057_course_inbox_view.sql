-- Migration 057: Course Inbox View
-- View để Admin thấy danh sách các cuộc hội thoại (chat) với học viên
-- bất kể học viên đã bấm mua hay chưa.

create or replace view admin_course_inbox_view as
select distinct on (cm.course_id, cm.user_id)
  cm.course_id,
  cm.user_id,
  c.title as course_title,
  p.full_name as user_name,
  p.email as user_email,
  cm.content as last_message,
  cm.created_at as last_message_at,
  cm.sender_role as last_sender
from course_messages cm
left join public_courses c on c.id = cm.course_id
left join profiles p on p.id = cm.user_id
order by cm.course_id, cm.user_id, cm.created_at desc;

-- RLS for view is not directly applicable, but the underlying tables have RLS.
-- Because views bypass RLS by default if created by superuser, we should grant access.
grant select on admin_course_inbox_view to authenticated;
