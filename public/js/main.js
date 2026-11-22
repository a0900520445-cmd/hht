const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// 台灣時間
const clock = document.getElementById('clock');
const tick = () => clock && (clock.textContent = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }));
tick(); setInterval(tick, 1000);

// 換頁淡出淡入
addEventListener('pageshow', () => document.body.classList.remove('leaving'));
document.addEventListener('click', e => {
  const a = e.target.closest('a[href]');
  if (!a || reduce || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
  const u = new URL(a.href, location.href);
  if (u.origin !== location.origin || (u.pathname === location.pathname && u.search === location.search)) return;
  e.preventDefault(); document.body.classList.add('leaving');
  setTimeout(() => (location.href = a.href), 180);
});

// 區塊捲動進場
if (!reduce && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => es.forEach(x => x.isIntersecting && (x.target.classList.add('in'), io.unobserve(x.target))), { threshold: .08 });
  document.querySelectorAll('.panel, .hero').forEach(el => { el.classList.add('rv'); io.observe(el); });
}

// 一週預報：點日期切換詳細
const week = document.getElementById('week'), det = document.getElementById('detail');
if (week && det) {
  const data = JSON.parse(document.getElementById('fcdata').textContent || '[]');
  const v = x => (x === null || x === undefined || x === '') ? '—' : x;
  const show = i => {
    const r = data[i]; if (!r) return;
    const btn = week.querySelector(`[data-i="${i}"]`);
    week.querySelectorAll('.day').forEach(d => d.classList.toggle('on', d === btn));
    det.classList.remove('swap'); void det.offsetWidth;
    det.innerHTML = '';
    det.appendChild(btn.querySelector('.wi').cloneNode(true));
    const box = document.createElement('div');
    box.innerHTML = `<h3>${r.forecast_date}　${v(r.wx)}</h3><div class="dgrid">
      <span>最高溫<b>${v(r.temp_high)}°C</b></span><span>最低溫<b>${v(r.temp_low)}°C</b></span><span>降雨機率<b>${v(r.pop)}%</b></span>
      <span>舒適度<b>${v(r.comfort)}</b></span><span>風<b>${v(r.wind)}</b></span><span>紫外線<b>${v(r.uvi)}</b></span></div>`;
    det.appendChild(box); det.classList.add('swap');
  };
  week.addEventListener('click', e => { const b = e.target.closest('.day'); b && show(+b.dataset.i); });
  if (data.length) show(0);
}

// 首頁即時觀測每 60 秒更新
const ob = document.getElementById('obsbox');
if (ob) {
  const st = document.getElementById('obsstamp');
  const esc = s => String(s ?? '—').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  setInterval(async () => {
    try {
      const rows = await (await fetch('/api/observations')).json();
      if (!rows.length) return;
      ob.querySelector('tbody').innerHTML = rows.map(r => `<tr><td>${esc(r.locations?.name)}</td><td><b>${esc(r.temp)}</b></td><td>${esc(r.humidity)}</td><td>${esc(r.pressure)}</td><td>${esc(r.wind_dir)}°</td><td>${esc(r.wind_speed)}</td><td>${esc(r.rain_1h)}</td><td>${esc(r.visibility)}</td><td>${new Date(r.obs_time).toLocaleString('zh-TW', { hour12: false })}</td></tr>`).join('');
      st.textContent = '已更新 ' + new Date().toLocaleTimeString('zh-TW', { hour12: false });
    } catch (e) {}
  }, 60000);
}
