-- Migration 056: Course Purchase Requests & Messaging
-- Thêm bảng quản lý yêu cầu mua khóa học và chat admin-user

-- ============================================================
-- 1. course_purchase_requests
-- ============================================================
create table if not exists course_purchase_requests (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public_courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text,
  user_email text,
  course_title text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  note text,           -- ghi chú từ user
  admin_note text,     -- phản hồi từ admin
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, user_id)
);

-- ============================================================
-- 2. course_messages (chat admin <-> user theo course)
-- ============================================================
create table if not exists course_messages (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public_courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null check (sender_role in ('user', 'admin')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Index để query nhanh theo course + user
create index if not exists idx_course_messages_course_user
  on course_messages(course_id, user_id, created_at);

create index if not exists idx_purchase_requests_status
  on course_purchase_requests(status, created_at desc);

-- ============================================================
-- 3. RLS Policies
-- ============================================================

-- Enable RLS
alter table course_purchase_requests enable row level security;
alter table course_messages enable row level security;

-- course_purchase_requests: user tự xem request của mình
create policy "User reads own requests"
  on course_purchase_requests for select
  using (auth.uid() = user_id);

-- course_purchase_requests: user tự tạo
create policy "User inserts own requests"
  on course_purchase_requests for insert
  with check (auth.uid() = user_id);

-- course_purchase_requests: admin đọc tất cả
create policy "Admin reads all requests"
  on course_purchase_requests for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- course_purchase_requests: admin update (approve/reject)
create policy "Admin updates requests"
  on course_purchase_requests for update
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- course_messages: user xem tin nhắn của mình
create policy "User reads own messages"
  on course_messages for select
  using (auth.uid() = user_id);

-- course_messages: user gửi tin nhắn
create policy "User inserts own messages"
  on course_messages for insert
  with check (auth.uid() = sender_id and sender_role = 'user' and auth.uid() = user_id);

-- course_messages: admin đọc tất cả
create policy "Admin reads all messages"
  on course_messages for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- course_messages: admin gửi tin nhắn
create policy "Admin inserts messages"
  on course_messages for insert
  with check (
    sender_role = 'admin' and
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ============================================================
-- 4. updated_at auto-update trigger
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_course_purchase_requests_updated_at on course_purchase_requests;
create trigger trg_course_purchase_requests_updated_at
  before update on course_purchase_requests
  for each row execute function set_updated_at();
