// 公開唯讀 JSON API（前台自動更新、第三方串接用）
const router = require('express').Router();
const sb = require('../lib/supabase');
const q = require('../lib/safeQuery');
const gen = require('../lib/generator');
const run = (fn, fb) => q(() => { if (!sb) throw new Error('Supabase 尚未設定'); return fn(sb); }, fb);

// ---- 手機 App 用：一次回傳某地點的全部天氣資料 ----
router.get('/locations', async (req, res) => res.json(await run(s => s.from('locations').select('id,name,region,lat,lon').order('sort'))));
router.get('/weather/:id', async (req, res) => {
  const id = Number(req.params.id) || 0;
  await gen.ensureFor(id);
  const today = require('../lib/format').today(), since = new Date(Date.now() - 3600e3).toISOString();
  const [loc, now, daily, hourly, air] = await Promise.all([
    run(s => s.from('locations').select('id,name,region,lat,lon').eq('id', id).limit(1)),
    run(s => s.from('observations').select('*').eq('location_id', id).order('obs_time', { ascending: false }).limit(1)),
    run(s => s.from('forecasts').select('*').eq('location_id', id).gte('forecast_date', today).order('forecast_date').limit(7)),
    run(s => s.from('hourly_forecasts').select('*').eq('location_id', id).gte('forecast_time', since).order('forecast_time').limit(24)),
    run(s => s.from('air_quality').select('*').eq('location_id', id).order('obs_time', { ascending: false }).limit(1))
  ]);
  // 讓即時氣溫、現在天氣與逐時、最高最低互相連動
  const { fitPop } = gen.rules, o = now[0] || null, hr = hourly.map(h => ({ ...h })), dl = daily.map(d => ({ ...d }));
  if (o && o.temp != null && hr.length && !hr[0].manual && hr[0].temp != null) {
    const off = Number(o.temp) - Number(hr[0].temp);
    hr.forEach((h, i) => { if (!h.manual && h.temp != null) h.temp = Math.round((Number(h.temp) + off * Math.max(0, 1 - i / 18)) * 10) / 10; });
  }
  if (o && o.wx) {
    hr.slice(0, 6).forEach(h => { if (!h.manual) { h.wx = o.wx; h.pop = fitPop(o.wx, h.pop ?? 50); } });
    if (dl[0]) { dl[0].wx = o.wx; dl[0].pop = fitPop(o.wx, dl[0].pop ?? 50); }
  }
  if (dl[0]) {
    const ts = [...hr.map(h => Number(h.temp)), o ? Number(o.temp) : NaN].filter(x => Number.isFinite(x));
    if (ts.length) { const mx = Math.max(...ts), mn = Math.min(...ts);
      dl[0].temp_high = dl[0].temp_high == null ? mx : Math.max(Number(dl[0].temp_high), mx);
      dl[0].temp_low = dl[0].temp_low == null ? mn : Math.min(Number(dl[0].temp_low), mn); }
  }
  res.json({ location: loc[0] || null, now: o, daily: dl, hourly: hr, air: air[0] || null, updated: new Date().toISOString() });
});

router.get('/overview', async (req, res) => {
  const today = require('../lib/format').today();
  const [locs, obs, fc] = await Promise.all([
    run(s => s.from('locations').select('id,name,region,lat,lon').order('sort')),
    run(s => s.from('observations').select('location_id,temp,obs_time').order('obs_time', { ascending: false }).limit(400)),
    run(s => s.from('forecasts').select('location_id,wx,temp_high,temp_low,pop').eq('forecast_date', today))
  ]);
  const lt = {}; obs.forEach(o => { if (!(o.location_id in lt)) lt[o.location_id] = o.temp; });
  const ft = {}; fc.forEach(f => ft[f.location_id] = f);
  const withF = locs.filter(l => ft[l.id]);
  res.json((withF.length ? withF : locs).map(l => ({ ...l, temp: lt[l.id] ?? ft[l.id]?.temp_high ?? null, wx: ft[l.id]?.wx ?? null, high: ft[l.id]?.temp_high ?? null, low: ft[l.id]?.temp_low ?? null, pop: ft[l.id]?.pop ?? null })));
});
router.get('/quakes', async (req, res) => res.json(await run(s => s.from('earthquakes').select('*').order('occurred_at', { ascending: false }).limit(30))));
router.get('/typhoons', async (req, res) => res.json(await run(s => s.from('typhoons').select('*').eq('active', true).order('updated_at', { ascending: false }))));
router.get('/ocean', async (req, res) => {
  const rows = await run(s => s.from('ocean').select('*').order('obs_time', { ascending: false }).limit(60)), seen = new Set();
  res.json(rows.filter(r => !seen.has(r.station) && seen.add(r.station)));
});
router.get('/news', async (req, res) => res.json(await run(s => s.from('news').select('*').eq('published', true).order('published_at', { ascending: false }).limit(20))));

router.get('/observations', async (req, res) => {
  const rows = await run(s => s.from('observations').select('*, locations(name)').order('obs_time', { ascending: false }).limit(100));
  const seen = new Set();
  res.json(rows.filter(r => !seen.has(r.location_id) && seen.add(r.location_id)));
});
router.get('/warnings', async (req, res) =>
  res.json(await run(s => s.from('warnings').select('*').eq('active', true).order('issued_at', { ascending: false }))));
router.get('/forecast/:locationId', async (req, res) =>
  res.json(await run(s => s.from('forecasts').select('*').eq('location_id', req.params.locationId).order('forecast_date').limit(14))));

module.exports = router;
