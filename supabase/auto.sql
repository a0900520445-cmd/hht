-- 自動產生資料用：在 Supabase SQL Editor 貼上執行一次
alter table forecasts add column if not exists manual boolean not null default false;
alter table hourly_forecasts add column if not exists manual boolean not null default false;
alter table observations add column if not exists manual boolean not null default false;
alter table air_quality add column if not exists manual boolean not null default false;
alter table ocean add column if not exists manual boolean not null default false;

-- 先清掉可能重複的資料，再建立唯一索引（自動產生靠它更新同一筆）
delete from forecasts a using forecasts b where a.id > b.id and a.location_id = b.location_id and a.forecast_date = b.forecast_date;
delete from hourly_forecasts a using hourly_forecasts b where a.id > b.id and a.location_id = b.location_id and a.forecast_time = b.forecast_time;
create unique index if not exists uq_forecasts on forecasts(location_id, forecast_date);
create unique index if not exists uq_hourly on hourly_forecasts(location_id, forecast_time);
