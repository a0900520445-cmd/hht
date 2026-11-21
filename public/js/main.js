// 台灣時間時鐘
const clock = document.getElementById('clock');
const tick = () => clock && (clock.textContent = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }));
tick(); setInterval(tick, 1000);

// 首頁即時觀測每 60 秒自動更新
const box = document.getElementById('obsbox');
if (box) {
  const stamp = document.getElementById('obsstamp');
  const esc = s => String(s ?? '—').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const refresh = async () => {
    try {
      const rows = await (await fetch('/api/observations')).json();
      if (!rows.length) return;
      const tb = box.querySelector('tbody');
      tb.innerHTML = rows.map(r => `<tr><td>${esc(r.locations?.name)}</td><td><b>${esc(r.temp)}</b></td><td>${esc(r.humidity)}</td><td>${esc(r.pressure)}</td><td>${esc(r.wind_dir)}°</td><td>${esc(r.wind_speed)}</td><td>${esc(r.rain_1h)}</td><td>${esc(r.visibility)}</td><td>${new Date(r.obs_time).toLocaleString('zh-TW', { hour12: false })}</td></tr>`).join('');
      stamp.textContent = '已更新 ' + new Date().toLocaleTimeString('zh-TW', { hour12: false });
    } catch (e) { /* 失敗就保留原資料 */ }
  };
  setInterval(refresh, 60000);
}
