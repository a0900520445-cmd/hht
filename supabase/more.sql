-- 自動/手動開關：在 Supabase SQL Editor 貼上執行一次
create table if not exists settings (key text primary key, value text);
alter table settings enable row level security;
grant all on settings to service_role;
insert into settings (key, value) values ('auto_generate', 'on') on conflict (key) do nothing;
