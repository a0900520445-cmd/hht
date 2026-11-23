-- 在 Supabase Dashboard → SQL Editor 貼上執行
create table if not exists locations (
  id bigint generated always as identity primary key,
  name text not null, region text, lat numeric, lon numeric, sort int default 0
);
create table if not exists forecasts (
  id bigint generated always as identity primary key,
  location_id bigint references locations(id) on delete cascade,
  forecast_date date not null, wx text not null,
  temp_high numeric, temp_low numeric, pop int, comfort text, wind text, uvi int
);
create table if not exists observations (
  id bigint generated always as identity primary key,
  location_id bigint references locations(id) on delete cascade,
  obs_time timestamptz not null default now(),
  temp numeric, humidity int, pressure numeric, wind_speed numeric, wind_dir int, rain_1h numeric, visibility numeric
);
create table if not exists warnings (
  id bigint generated always as identity primary key,
  title text not null, type text not null, level text not null default '注意',
  areas text, content text, issued_at timestamptz not null default now(), expires_at timestamptz, active boolean default true
);
create table if not exists earthquakes (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null, magnitude numeric not null, depth numeric,
  epicenter text not null, max_intensity text, note text
);
create table if not exists typhoons (
  id bigint generated always as identity primary key,
  name text not null, intl_no text, status text, lat numeric, lon numeric, pressure int,
  max_wind int, gust int, speed int, heading text, updated_at timestamptz not null default now(), active boolean default true
);
create table if not exists ocean (
  id bigint generated always as identity primary key,
  station text not null, obs_time timestamptz not null default now(),
  wave_height numeric, wave_period numeric, sea_temp numeric, tide text, forecast text
);
create table if not exists news (
  id bigint generated always as identity primary key,
  title text not null, category text, content text,
  published_at timestamptz not null default now(), published boolean default true
);

create index if not exists idx_fc on forecasts(location_id, forecast_date);
create index if not exists idx_obs on observations(location_id, obs_time desc);

-- 伺服器使用 service_role key（會略過 RLS）；開啟 RLS 且不建政策 = 外部無法直接存取資料表
alter table locations enable row level security;
alter table forecasts enable row level security;
alter table observations enable row level security;
alter table warnings enable row level security;
alter table earthquakes enable row level security;
alter table typhoons enable row level security;
alter table ocean enable row level security;
alter table news enable row level security;

-- ===== 範例資料 =====
insert into locations (name, region, lat, lon, sort) values
 ('臺北市','北部',25.04,121.56,1),('新北市','北部',25.01,121.46,2),('桃園市','北部',24.99,121.30,3),
 ('臺中市','中部',24.15,120.67,4),('臺南市','南部',22.99,120.21,5),('高雄市','南部',22.63,120.30,6),
 ('花蓮縣','東部',23.98,121.60,7),('臺東縣','東部',22.76,121.14,8),('澎湖縣','離島',23.57,119.58,9);

insert into forecasts (location_id, forecast_date, wx, temp_high, temp_low, pop, comfort, wind, uvi)
select l.id, current_date + d,
  (array['多雲時晴','晴','陰短暫雨','多雲','短暫陣雨','午後雷陣雨','陰'])[1 + (l.id + d) % 7],
  26 + (l.id + d) % 6, 19 + (l.id + d) % 5, ((l.id * 7 + d * 13) % 9) * 10,
  (array['舒適','稍有寒意','舒適','悶熱'])[1 + (l.id + d) % 4], '東北風 3-4級', 3 + (l.id + d) % 6
from locations l, generate_series(0, 6) d;

insert into observations (location_id, obs_time, temp, humidity, pressure, wind_speed, wind_dir, rain_1h, visibility)
select id, now(), 22 + id % 6, 62 + id * 3, 1012 + id % 4, 1.5 + id % 5, (id * 40) % 360, case when id % 3 = 0 then 0.5 else 0 end, 12 + id % 8 from locations;

insert into warnings (title, type, level, areas, content, issued_at, active) values
 ('東北季風增強，北部及東半部地區留意強風','陸上強風','注意','基隆北海岸、臺北市、新北市、花蓮縣','受東北季風影響，上述地區平地風力達 6 級以上，請注意交通安全。', now(), true);
insert into earthquakes (occurred_at, magnitude, depth, epicenter, max_intensity) values
 (now() - interval '3 hours', 4.8, 18.5, '花蓮縣近海', '3級'), (now() - interval '1 day', 5.4, 22.1, '宜蘭縣外海', '4級'), (now() - interval '2 days', 3.9, 9.8, '臺東縣海端鄉', '2級');
insert into typhoons (name, intl_no, status, lat, lon, pressure, max_wind, gust, speed, heading, active) values
 ('範例颱風','2601','輕度颱風',18.2,131.5,985,28,38,15,'西北西',false);
insert into ocean (station, wave_height, wave_period, sea_temp, tide, forecast) values
 ('基隆外海',1.8,7.2,23.5,'漲潮','浪高 1.5–2.5 公尺，海面稍有湧浪'),('高雄外海',0.9,5.4,27.1,'退潮','浪高 0.5–1 公尺，海面平穩'),('花蓮外海',1.4,6.8,25.2,'滿潮','浪高 1–1.5 公尺');
insert into news (title, category, content) values
 ('如何判讀降雨機率','科普知識','降雨機率是指預報時段內，該地區任一地點出現降雨的可能性，並非降雨量多寡或降雨時間長短。'),
 ('系統上線公告','公告','虛擬中央氣象局網站正式啟用。');
