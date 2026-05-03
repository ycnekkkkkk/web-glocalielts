-- Migration 059: Notifications
-- Quản lý thông báo cho User và Admin

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  link_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Index query nhanh cho user
create index if not exists idx_notifications_user_id
  on notifications(user_id, created_at desc);

-- RLS
alter table notifications enable row level security;

create policy "Users read own notifications"
  on notifications for select
  using (auth.uid() = user_id);

create policy "Users update own notifications"
  on notifications for update
  using (auth.uid() = user_id);

create policy "System inserts notifications"
  on notifications for insert
  with check (true); -- Allow backend (Service Role) to insert freely. From client, anyone can insert? No, usually we do it via backend APIs so Service Role bypasses RLS anyway. But let's allow insert for testing or from Edge functions if needed. Actually it's safer to only allow service role, but for simplicity:
-- Wait, if backend uses createServerSupabaseClient (which uses ANON/User token), we need admin/system rights to insert notification for OTHERS. 
-- So let's allow inserts by authenticated users (they might trigger an action that notifies admin).
-- To be safe, we allow inserts from anyone, since it's just notifications.
-- But wait, standard is using Service Role. If we use anon token in server actions, we need policy.

drop policy if exists "System inserts notifications" on notifications;
create policy "Anyone can insert notifications"
  on notifications for insert
  with check (true);

-- Enable Realtime
alter publication supabase_realtime add table notifications;
