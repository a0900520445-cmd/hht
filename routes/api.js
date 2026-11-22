// 公開唯讀 JSON API（前台自動更新、第三方串接用）
const router = require('express').Router();
const sb = require('../lib/supabase');
const q = require('../lib/safeQuery');
const run = (fn, fb) => q(() => { if (!sb) throw new Error('Supabase 尚未設定'); return fn(sb); }, fb);

// ---- 手機 App 用：一次回傳某地點的全部天氣資料 ----
router.get('/locations', async (req, res) => res.json(await run(s => s.from('locations').select('id,name,region,lat,lon').order('sort'))));
router.get('/weather/:id', async (req, res) => {
  const id = Number(req.params.id) || 0;
  const today = new Date().toISOString().slice(0, 10), since = new Date(Date.now() - 3600e3).toISOString();
  const [loc, now, daily, hourly, air] = await Promise.all([
    run(s => s.from('locations').select('id,name,region').eq('id', id).limit(1)),
    run(s => s.from('observations').select('*').eq('location_id', id).order('obs_time', { ascending: false }).limit(1)),
    run(s => s.from('forecasts').select('*').eq('location_id', id).gte('forecast_date', today).order('forecast_date').limit(7)),
    run(s => s.from('hourly_forecasts').select('*').eq('location_id', id).gte('forecast_time', since).order('forecast_time').limit(24)),
    run(s => s.from('air_quality').select('*').eq('location_id', id).order('obs_time', { ascending: false }).limit(1))
  ]);
  res.json({ location: loc[0] || null, now: now[0] || null, daily, hourly, air: air[0] || null, updated: new Date().toISOString() });
});

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
