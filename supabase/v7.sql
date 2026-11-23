-- 在 Supabase SQL Editor 貼上執行一次
alter table locations add column if not exists auto boolean not null default true;
alter table observations add column if not exists wx text;
alter table forecasts add column if not exists manual boolean not null default false;
alter table hourly_forecasts add column if not exists manual boolean not null default false;
alter table observations add column if not exists manual boolean not null default false;
alter table air_quality add column if not exists manual boolean not null default false;
alter table ocean add column if not exists manual boolean not null default false;
notify pgrst, 'reload schema';
