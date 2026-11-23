-- 升級用：在 Supabase SQL Editor 貼上執行一次（新增逐時預報、空氣品質）
create table if not exists hourly_forecasts (
  id bigint generated always as identity primary key,
  location_id bigint references locations(id) on delete cascade,
  forecast_time timestamptz not null, wx text not null, temp numeric, pop int
);
create table if not exists air_quality (
  id bigint generated always as identity primary key,
  location_id bigint references locations(id) on delete cascade,
  obs_time timestamptz not null default now(), aqi int not null, pm25 numeric, status text
);
create index if not exists idx_hf on hourly_forecasts(location_id, forecast_time);
alter table hourly_forecasts enable row level security;
alter table air_quality enable row level security;
grant all on hourly_forecasts, air_quality to service_role;
grant all on all sequences in schema public to service_role;

insert into hourly_forecasts (location_id, forecast_time, wx, temp, pop)
select l.id, date_trunc('hour', now()) + h * interval '1 hour',
  (array['多雲','多雲時晴','晴','陰','短暫陣雨'])[1 + ((l.id + h) % 5)::int],
  round((24 + 4 * sin((extract(hour from (date_trunc('hour', now()) + h * interval '1 hour')) - 9) / 24 * 2 * pi()) + l.id % 3)::numeric, 1),
  (((l.id + h) % 6) * 10)::int
from locations l, generate_series(0, 23) h;

insert into air_quality (location_id, aqi, pm25, status)
select id, 35 + id * 7, 10 + id * 2.5,
  case when 35 + id * 7 <= 50 then '良好' when 35 + id * 7 <= 100 then '普通' else '對敏感族群不健康' end
from locations;
