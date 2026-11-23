const router = require('express').Router();
const sb = require('../lib/supabase');
const modules = require('../config/adminModules');
const { check, requireAdmin } = require('../middleware/auth');

// ---- 登入 / 登出 ----
const attempts = new Map(); // 簡易防暴力破解：同 IP 15 分鐘內最多 8 次
router.get('/login', (req, res) => res.render('admin/login', { title: '管理登入', error: null }));
router.post('/login', (req, res) => {
  const now = Date.now(), rec = (attempts.get(req.ip) || []).filter(t => now - t < 900000);
  if (rec.length >= 8) return res.status(429).render('admin/login', { title: '管理登入', error: '嘗試次數過多，請稍後再試' });
  if (check(req.body.username, req.body.password)) {
    attempts.delete(req.ip);
    req.session = { admin: true };
    return res.redirect('/admin');
  }
  attempts.set(req.ip, [...rec, now]);
  res.status(401).render('admin/login', { title: '管理登入', error: '帳號或密碼錯誤' });
});
router.post('/logout', (req, res) => { req.session = null; res.redirect('/admin/login'); });

router.use(requireAdmin);
router.use((req, res, next) => { res.locals.modules = modules; res.locals.cur = null; next(); });

// ---- 工具 ----
const refs = async mod => {
  const out = {};
  for (const f of mod.fields.filter(f => f.ref)) {
    const { data } = await sb.from(f.ref).select('id,name').order('id');
    out[f.name] = data || [];
  }
  return out;
};
const collect = (mod, body) => {
  const o = {};
  for (const f of mod.fields) {
    let v = body[f.name];
    if (f.type === 'checkbox') v = v === 'on';
    else if (v === undefined || v === '') v = null;
    else if (f.type === 'number' || f.ref) v = Number(v);
    else if (f.type === 'datetime') v = new Date(v).toISOString();
    o[f.name] = v;
  }
  if ((mod.table === 'forecasts' || mod.table === 'hourly_forecasts') && o.wx) { const R = require('../lib/generator').rules; o.pop = o.pop == null ? R.popFor(o.wx) : R.fitPop(o.wx, o.pop); }
  return o;
};
router.param('mod', (req, res, next, name) => {
  const mod = modules[name];
  if (!mod) return res.status(404).render('404', { title: '找不到模組' });
  req.mod = mod; res.locals.cur = name; res.locals.mod = mod; next();
});
const noDb = (res) => res.status(503).send('Supabase 尚未設定，請檢查 .env');

router.post('/auto', async (req, res) => {
  const on = req.body.on === '1';
  try { await require('../lib/generator').setOn(on); } catch (e) { return res.redirect('/admin?ok=' + encodeURIComponent('失敗：請先在 Supabase 執行 more.sql')); }
  res.redirect('/admin?ok=' + encodeURIComponent(on ? '已開啟自動產生' : '已關閉自動產生，現在全部由你手動控制'));
});
router.post('/generate', async (req, res) => {
  const r = await require('../lib/generator').generateAll({ reroll: req.body.mode === 'reroll', force: true });
  res.redirect('/admin?ok=' + encodeURIComponent(r.ok ? '資料已重新產生' : '失敗：' + r.msg));
});

// ---- 儀表板 ----
router.get('/', async (req, res) => {
  if (!sb) return noDb(res);
  const counts = {};
  await Promise.all(Object.entries(modules).map(async ([k, m]) => {
    const { count } = await sb.from(m.table).select('*', { count: 'exact', head: true });
    counts[k] = count ?? 0;
  }));
  res.render('admin/dashboard', { title: '後台總覽', counts, flash: req.query.ok, auto: await require('../lib/generator').isOn() });
});

// ---- 通用 CRUD ----
router.get('/:mod', async (req, res) => {
  if (!sb) return noDb(res);
  const m = req.mod, page = Math.max(1, Number(req.query.page) || 1), size = 20;
  const { data, count, error } = await sb.from(m.table).select(`*${m.join ? ',' + m.join : ''}`, { count: 'exact' })
    .order(m.order[0], { ascending: m.order[1] }).range((page - 1) * size, page * size - 1);
  res.render('admin/list', { title: m.label, rows: data || [], total: count || 0, page, size, error: error?.message, flash: req.query.ok });
});
router.get('/:mod/new', async (req, res) => {
  if (!sb) return noDb(res);
  res.render('admin/form', { title: `新增${req.mod.label}`, row: {}, refs: await refs(req.mod), error: null, action: `/admin/${res.locals.cur}` });
});
router.post('/:mod', async (req, res) => {
  const { error } = await sb.from(req.mod.table).insert(collect(req.mod, req.body));
  if (error) return res.status(400).render('admin/form', { title: `新增${req.mod.label}`, row: req.body, refs: await refs(req.mod), error: error.message, action: `/admin/${res.locals.cur}` });
  res.redirect(`/admin/${res.locals.cur}?ok=已新增`);
});
router.get('/:mod/:id/edit', async (req, res) => {
  const { data } = await sb.from(req.mod.table).select('*').eq('id', req.params.id).single();
  if (!data) return res.status(404).render('404', { title: '找不到資料' });
  res.render('admin/form', { title: `編輯${req.mod.label}`, row: data, refs: await refs(req.mod), error: null, action: `/admin/${res.locals.cur}/${data.id}` });
});
router.post('/:mod/:id', async (req, res) => {
  const { error } = await sb.from(req.mod.table).update(collect(req.mod, req.body)).eq('id', req.params.id);
  if (error) return res.status(400).render('admin/form', { title: `編輯${req.mod.label}`, row: { ...req.body, id: req.params.id }, refs: await refs(req.mod), error: error.message, action: `/admin/${res.locals.cur}/${req.params.id}` });
  res.redirect(`/admin/${res.locals.cur}?ok=已儲存`);
});
router.post('/:mod/:id/toggle', async (req, res) => {
  const f = req.mod.toggle; if (f) {
    const { data } = await sb.from(req.mod.table).select(f).eq('id', req.params.id).single();
    await sb.from(req.mod.table).update({ [f]: !(data && data[f]) }).eq('id', req.params.id);
  }
  res.redirect(req.get('Referer') || `/admin/${res.locals.cur}`);
});
router.post('/:mod/:id/delete', async (req, res) => {
  await sb.from(req.mod.table).delete().eq('id', req.params.id);
  res.redirect(`/admin/${res.locals.cur}?ok=已刪除`);
});

module.exports = router;
