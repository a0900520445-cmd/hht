// 公開唯讀 JSON API（前台自動更新、第三方串接用）
const router = require('express').Router();
const sb = require('../lib/supabase');
const q = require('../lib/safeQuery');
const run = (fn, fb) => q(() => { if (!sb) throw new Error('Supabase 尚未設定'); return fn(sb); }, fb);

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
