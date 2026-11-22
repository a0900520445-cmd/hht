const router = require('express').Router();
const sb = require('../lib/supabase');
const q = require('../lib/safeQuery');
const run = (fn, fb) => q(() => { if (!sb) throw new Error('Supabase 尚未設定'); return fn(sb); }, fb);

const latestPerLocation = rows => {
  const seen = new Set();
  return rows.filter(r => !seen.has(r.location_id) && seen.add(r.location_id));
};
const getLocations = () => run(s => s.from('locations').select('*').order('sort'));
const activeWarnings = () => run(s => s.from('warnings').select('*').eq('active', true).order('issued_at', { ascending: false }));

router.get('/', async (req, res) => {
  const [locations, warnings, obsRaw, quakes, typhoons, news] = await Promise.all([
    getLocations(), activeWarnings(),
    run(s => s.from('observations').select('*, locations(name)').order('obs_time', { ascending: false }).limit(100)),
    run(s => s.from('earthquakes').select('*').order('occurred_at', { ascending: false }).limit(5)),
    run(s => s.from('typhoons').select('*').eq('active', true).order('updated_at', { ascending: false })),
    run(s => s.from('news').select('id,title,category,published_at').eq('published', true).order('published_at', { ascending: false }).limit(6))
  ]);
  const locId = Number(req.query.loc) || locations[0]?.id;
  const forecasts = locId ? await run(s => s.from('forecasts').select('*').eq('location_id', locId)
    .gte('forecast_date', new Date().toISOString().slice(0, 10)).order('forecast_date').limit(7)) : [];
  const [hourly, air] = locId ? await Promise.all([
    run(s => s.from('hourly_forecasts').select('*').eq('location_id', locId).gte('forecast_time', new Date(Date.now() - 3600e3).toISOString()).order('forecast_time').limit(24)),
    run(s => s.from('air_quality').select('*').eq('location_id', locId).order('obs_time', { ascending: false }).limit(1))
  ]) : [[], []];
  res.render('index', { title: '首頁', active: 'home', locations, locId, warnings, obs: latestPerLocation(obsRaw), quakes, typhoons, news, forecasts, hourly, air: air[0] });
});

router.get('/forecast', async (req, res) => {
  const locations = await getLocations();
  const locId = Number(req.query.loc) || locations[0]?.id;
  const forecasts = locId ? await run(s => s.from('forecasts').select('*').eq('location_id', locId)
    .gte('forecast_date', new Date().toISOString().slice(0, 10)).order('forecast_date').limit(14)) : [];
  res.render('forecast', { title: '天氣預報', active: 'forecast', locations, locId, forecasts, warnings: await activeWarnings() });
});

router.get('/observations', async (req, res) => {
  const raw = await run(s => s.from('observations').select('*, locations(name,region)').order('obs_time', { ascending: false }).limit(200));
  res.render('observations', { title: '即時觀測', active: 'obs', obs: latestPerLocation(raw), warnings: await activeWarnings() });
});

router.get('/radar', async (req, res) => {
  const locations = await getLocations();
  res.render('radar', { title: '雷達回波', active: 'radar', locations, warnings: await activeWarnings() });
});

router.get('/warnings', async (req, res) => {
  const list = await run(s => s.from('warnings').select('*').order('issued_at', { ascending: false }).limit(50));
  res.render('warnings', { title: '警特報', active: 'warnings', list, warnings: list.filter(w => w.active) });
});

router.get('/earthquakes', async (req, res) => {
  const list = await run(s => s.from('earthquakes').select('*').order('occurred_at', { ascending: false }).limit(50));
  res.render('earthquakes', { title: '地震資訊', active: 'quake', list, warnings: await activeWarnings() });
});

router.get('/typhoons', async (req, res) => {
  const list = await run(s => s.from('typhoons').select('*').order('updated_at', { ascending: false }).limit(20));
  res.render('typhoons', { title: '颱風消息', active: 'typhoon', list, warnings: await activeWarnings() });
});

router.get('/ocean', async (req, res) => {
  const list = await run(s => s.from('ocean').select('*').order('obs_time', { ascending: false }).limit(60));
  res.render('ocean', { title: '海象資訊', active: 'ocean', list, warnings: await activeWarnings() });
});

router.get('/news', async (req, res) => {
  const list = await run(s => s.from('news').select('*').eq('published', true).order('published_at', { ascending: false }).limit(50));
  res.render('news', { title: '最新消息', active: 'news', list, item: null, warnings: await activeWarnings() });
});
router.get('/news/:id', async (req, res) => {
  const rows = await run(s => s.from('news').select('*').eq('id', req.params.id).eq('published', true).limit(1));
  if (!rows[0]) return res.status(404).render('404', { title: '找不到頁面' });
  res.render('news', { title: rows[0].title, active: 'news', list: [], item: rows[0], warnings: await activeWarnings() });
});

module.exports = router;
