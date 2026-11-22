// 自動產生擬真天氣資料：依「月份 + 區域」的氣候範圍隨機，並隨時間小幅漂移。
// 後台手動編輯過的資料會被鎖定(manual = true)，自動產生不會覆蓋。
const sb = require('./supabase');
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.round(rnd(a, b));
const r1 = x => Math.round(x * 10) / 10;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const pick = a => a[Math.floor(Math.random() * a.length)];
const wpick = list => { let t = list.reduce((s, x) => s + x[1], 0) * Math.random(); for (const [v, w] of list) if ((t -= w) <= 0) return v; return list[0][0]; };
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// 北部各月平均高/低溫(°C)，各區再加修正
const HI = [19, 20, 22, 26, 29, 32, 34, 34, 31, 27, 23, 20], LO = [14, 14, 16, 19, 22, 25, 26, 26, 24, 21, 17, 15];
const ADJ = { 北部: [0, 0], 中部: [2, -2], 南部: [5, 0], 東部: [2, 1], 離島: [-1, 0] };
const WET = { 北部: 1, 東部: 1, 離島: .6, 中部: 0, 南部: 0 };
const season = m => (m >= 11 || m <= 2) ? 'winter' : m <= 5 ? 'spring' : m <= 8 ? 'summer' : 'autumn';
const POOL = {
  winter: { wet: [['陰短暫雨', 3], ['多雲', 2], ['陰', 2], ['雨', 2], ['多雲時晴', 1], ['短暫陣雨', 1]], dry: [['晴', 4], ['多雲時晴', 3], ['多雲', 2], ['陰', 1]] },
  spring: { wet: [['陰短暫雨', 3], ['多雲', 2], ['雨', 2], ['短暫陣雨', 2], ['多雲時晴', 1]], dry: [['多雲時晴', 3], ['多雲', 3], ['晴', 2], ['午後雷陣雨', 1]] },
  summer: { wet: [['午後雷陣雨', 4], ['多雲時晴', 3], ['晴', 2], ['短暫陣雨', 2], ['雨', 1]], dry: [['午後雷陣雨', 4], ['多雲時晴', 3], ['晴', 3], ['短暫陣雨', 1]] },
  autumn: { wet: [['多雲', 2], ['陰短暫雨', 2], ['多雲時晴', 2], ['晴', 1], ['雨', 1]], dry: [['晴', 3], ['多雲時晴', 3], ['多雲', 2]] }
};
const POP = { 晴: [0, 10], 多雲時晴: [0, 20], 多雲: [10, 30], 陰: [30, 50], 陰短暫雨: [50, 70], 短暫陣雨: [50, 70], 午後雷陣雨: [50, 80], 雨: [70, 90], 大雨: [80, 95], 霧: [10, 30] };
const wxFor = (region, m) => wpick(POOL[season(m)][Math.random() < (WET[region] ?? 0) ? 'wet' : 'dry']);
const popFor = wx => { const [a, b] = POP[wx] || [20, 40]; return Math.round(rnd(a, b) / 10) * 10; };
const rainy = wx => /雨/.test(wx);
const comfort = (h, l) => { const a = (h + l) / 2; return a <= 12 ? '寒冷' : a <= 17 ? '稍有寒意' : a <= 28 ? '舒適' : a <= 32 ? '悶熱' : '易中暑'; };
const diurnal = hr => (1 + Math.sin(((hr - 8) / 24) * 2 * Math.PI)) / 2; // 14 時最高、2 時最低
const aqiStatus = a => a <= 50 ? '良好' : a <= 100 ? '普通' : a <= 150 ? '對敏感族群不健康' : a <= 200 ? '對所有族群不健康' : '非常不健康';

// ---- 單筆資料產生器（純函式）----
function daily(loc, date, prev, reroll) {
  const m = date.getMonth() + 1, [ah, al] = ADJ[loc.region] || [0, 0], bh = HI[m - 1] + ah, bl = LO[m - 1] + al;
  let high, low, wx, pop;
  if (prev && !reroll) {
    high = clamp(Number(prev.temp_high) + rnd(-1.2, 1.2), bh - 4, bh + 4);
    low = clamp(Number(prev.temp_low) + rnd(-1.2, 1.2), bl - 4, bl + 3);
    wx = Math.random() < .2 ? wxFor(loc.region, m) : prev.wx;
    pop = wx === prev.wx ? clamp(Number(prev.pop) + pick([-10, 0, 0, 10]), ...(POP[wx] || [0, 100])) : popFor(wx);
  } else { high = rnd(bh - 3, bh + 3); low = rnd(bl - 3, bl + 2); wx = wxFor(loc.region, m); pop = popFor(wx); }
  low = Math.min(low, high - 3);
  const s = season(m), lv = ri(2, 5), base = { winter: 3, spring: 7, summer: 10, autumn: 6 }[s];
  return {
    location_id: loc.id, forecast_date: ymd(date), wx, temp_high: r1(high), temp_low: r1(low), pop,
    comfort: comfort(high, low), wind: `${s === 'summer' ? '西南風' : s === 'winter' ? '東北風' : pick(['東北風', '東風'])} ${lv}-${lv + 1}級`,
    uvi: Math.round(clamp(base - (/晴/.test(wx) ? 0 : 2) + rnd(-1, 1), 0, 11)), manual: false
  };
}
function obs(loc, d, now) {
  const m = now.getMonth() + 1, s = season(m), wet = (WET[loc.region] ?? 0) > .5, rn = rainy(d.wx);
  const t = Number(d.temp_low) + (Number(d.temp_high) - Number(d.temp_low)) * diurnal(now.getHours()) + rnd(-.5, .5);
  return {
    location_id: loc.id, obs_time: now.toISOString(), temp: r1(t),
    humidity: Math.round(rn ? rnd(85, 96) : /陰|多雲$/.test(d.wx) ? rnd(70, 85) : rnd(50, 72)),
    pressure: r1({ winter: rnd(1017, 1027), spring: rnd(1010, 1018), summer: rnd(1003, 1011), autumn: rnd(1011, 1019) }[s]),
    wind_speed: r1(s === 'winter' && wet ? rnd(3, 9) : rnd(1, 5)),
    wind_dir: Math.round(s === 'winter' ? rnd(20, 70) : s === 'summer' ? rnd(190, 250) : rnd(40, 110)),
    rain_1h: rn ? r1(rnd(.2, 6)) : 0, visibility: r1(rn ? rnd(4, 10) : rnd(10, 25)), manual: false
  };
}
function air(loc, now) {
  const s = season(now.getMonth() + 1), north = (WET[loc.region] ?? 0) >= .6;
  const [a, b] = { winter: north ? [25, 65] : [45, 110], spring: [35, 85], summer: [20, 55], autumn: [30, 75] }[s];
  const aqi = ri(a, b);
  return { location_id: loc.id, obs_time: now.toISOString(), aqi, pm25: r1(Math.max(3, aqi * .45 + rnd(-3, 3))), status: aqiStatus(aqi), manual: false };
}
const STATIONS = [['基隆外海', -1], ['高雄外海', 1.5], ['花蓮外海', 0], ['澎湖外海', 0]];
const SEA = [20, 19.5, 20.5, 22.5, 25, 27.5, 28.5, 29, 28.5, 26.5, 24, 21.5];
function ocean(name, adj, now) {
  const m = now.getMonth() + 1, s = season(m);
  const wave = r1(s === 'winter' ? rnd(1.5, 3.2) : s === 'summer' ? rnd(.6, 1.6) : rnd(.8, 2));
  return { station: name, obs_time: now.toISOString(), wave_height: wave, wave_period: r1(rnd(5, 9)), sea_temp: r1(SEA[m - 1] + adj + rnd(-.8, .8)),
    tide: ['漲潮', '滿潮', '退潮', '乾潮'][Math.floor((now.getHours() % 12) / 3)], forecast: `浪高 ${r1(wave - .3)}–${r1(wave + .5)} 公尺，海面${wave < 1 ? '平穩' : wave < 2 ? '稍有湧浪' : '浪大'}`, manual: false };
}
const QUAKE_AT = ['花蓮縣近海', '宜蘭縣外海', '臺東縣近海', '花蓮縣秀林鄉', '南投縣仁愛鄉', '嘉義縣大埔鄉', '屏東縣外海'];
function quake(now) {
  const mag = r1(3 + Math.pow(Math.random(), 2.2) * 2.8);
  return { occurred_at: now.toISOString(), magnitude: mag, depth: r1(rnd(5, 40)), epicenter: pick(QUAKE_AT), max_intensity: mag < 3.8 ? '1級' : mag < 4.3 ? '2級' : mag < 4.8 ? '3級' : mag < 5.3 ? '4級' : '5弱' };
}

// ---- 寫入資料庫 ----
const ok = r => { if (r.error) throw r.error; return r.data || []; };
let running = false, last = 0;
async function generateAll({ reroll = false } = {}) {
  if (!sb) return { ok: false, msg: 'Supabase 尚未設定' };
  if (running) return { ok: false, msg: '正在產生中' };
  running = true;
  try {
    const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate()), todayStr = ymd(today);
    const locs = ok(await sb.from('locations').select('id,name,region'));
    const ids = locs.map(l => l.id);
    // 1) 逐日預報（14 天）：未鎖定的小幅漂移，缺少的補上
    const exist = ok(await sb.from('forecasts').select('*').in('location_id', ids).gte('forecast_date', todayStr));
    const dmap = {}, rows = [];
    for (const loc of locs) {
      dmap[loc.id] = {};
      for (let i = 0; i < 14; i++) {
        const dt = new Date(today.getTime() + i * 86400000), key = ymd(dt);
        const prev = exist.find(e => e.location_id === loc.id && e.forecast_date === key);
        if (prev && prev.manual) { dmap[loc.id][key] = prev; continue; }
        const row = daily(loc, dt, prev, reroll); dmap[loc.id][key] = row; rows.push(row);
      }
    }
    if (rows.length) ok(await sb.from('forecasts').upsert(rows, { onConflict: 'location_id,forecast_date' }));
    ok(await sb.from('forecasts').delete().lt('forecast_date', todayStr).eq('manual', false));
    // 2) 逐時預報（未來 24 小時，依當日預報的高低溫推算）
    const h0 = new Date(now); h0.setMinutes(0, 0, 0);
    const lock = ok(await sb.from('hourly_forecasts').select('location_id,forecast_time').eq('manual', true).gte('forecast_time', h0.toISOString()));
    const locked = new Set(lock.map(x => x.location_id + '|' + new Date(x.forecast_time).getTime()));
    const hrows = [];
    for (const loc of locs) for (let h = 0; h < 24; h++) {
      const t = new Date(h0.getTime() + h * 3600000);
      if (locked.has(loc.id + '|' + t.getTime())) continue;
      const d = dmap[loc.id][ymd(t)] || dmap[loc.id][todayStr];
      hrows.push({ location_id: loc.id, forecast_time: t.toISOString(), wx: d.wx, manual: false,
        temp: r1(Number(d.temp_low) + (Number(d.temp_high) - Number(d.temp_low)) * diurnal(t.getHours()) + rnd(-.4, .4)), pop: clamp(Number(d.pop) + pick([-10, 0, 10]), 0, 100) });
    }
    if (hrows.length) ok(await sb.from('hourly_forecasts').upsert(hrows, { onConflict: 'location_id,forecast_time' }));
    ok(await sb.from('hourly_forecasts').delete().lt('forecast_time', new Date(now - 3 * 3600000).toISOString()).eq('manual', false));
    // 3) 即時觀測、空氣品質：新增一筆（若最近 3 小時內有手動資料就跳過），並清掉 2 天前的自動資料
    const cut = new Date(now - 3 * 3600000).toISOString(), old = new Date(now - 2 * 86400000).toISOString();
    for (const [table, make] of [['observations', loc => obs(loc, dmap[loc.id][todayStr], now)], ['air_quality', loc => air(loc, now)]]) {
      const man = new Set(ok(await sb.from(table).select('location_id').eq('manual', true).gte('obs_time', cut)).map(x => x.location_id));
      const add = locs.filter(l => !man.has(l.id)).map(make);
      if (add.length) ok(await sb.from(table).insert(add));
      ok(await sb.from(table).delete().lt('obs_time', old).eq('manual', false));
    }
    // 4) 海象
    const oman = new Set(ok(await sb.from('ocean').select('station').eq('manual', true).gte('obs_time', cut)).map(x => x.station));
    const oadd = STATIONS.filter(([n]) => !oman.has(n)).map(([n, a]) => ocean(n, a, now));
    if (oadd.length) ok(await sb.from('ocean').insert(oadd));
    ok(await sb.from('ocean').delete().lt('obs_time', old).eq('manual', false));
    // 5) 偶爾來一筆地震
    if (Math.random() < .15) ok(await sb.from('earthquakes').insert(quake(now)));
    last = Date.now();
    return { ok: true, msg: '已更新' };
  } catch (e) { console.error('[generator]', e.message || e); return { ok: false, msg: e.message || String(e) }; }
  finally { running = false; }
}

const every = (Number(process.env.GEN_INTERVAL_MIN) || 30) * 60000, enabled = process.env.AUTO_GEN !== 'off';
const touch = () => { if (enabled && sb && !running && Date.now() - last > every) generateAll(); };
const start = () => { if (!enabled) return; setTimeout(generateAll, 4000); setInterval(generateAll, every); };
module.exports = { generateAll, touch, start, _t: { daily, obs, air, ocean, quake } };
