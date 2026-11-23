const tz = 'Asia/Taipei';
const pad = n => String(n).padStart(2, '0');
exports.dt = v => v ? new Date(v).toLocaleString('zh-TW', { timeZone: tz, hour12: false }) : '—';
exports.date = v => v ? new Date(v + (String(v).length === 10 ? 'T00:00:00' : '')).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short' }) : '—';
exports.num = (v, u = '') => (v === null || v === undefined) ? '—' : v + u;
exports.toInput = v => { if (!v) return ''; const d = new Date(v); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
exports.windDir = deg => deg == null ? '—' : ['北','北北東','東北','東北東','東','東南東','東南','南南東','南','南南西','西南','西南西','西','西北西','西北','北北西'][Math.round(deg / 22.5) % 16];
exports.beaufort = ms => { if (ms == null) return '—'; const t=[0.3,1.6,3.4,5.5,8,10.8,13.9,17.2,20.8,24.5,28.5,32.7]; const i=t.findIndex(x=>ms<x); return i<0?12:i; };

// ---- 天氣圖示（內嵌 SVG）----
const S = (b) => `<svg class="wi" width="48" height="48" viewBox="0 0 56 56" aria-hidden="true">${b}</svg>`;
const cloud = (c = '#c9d3df', t = '') => `<path ${t} d="M15 42a9 9 0 0 1 1-18 13 13 0 0 1 25 4 7.5 7.5 0 0 1-1 14z" fill="${c}"/>`;
const sun = (x = 28, y = 28, r = 9) => `<g stroke="#f2a900" stroke-width="3" stroke-linecap="round">${[0,45,90,135,180,225,270,315].map(a => { const R = a * Math.PI / 180, c = Math.cos(R), s = Math.sin(R); return `<line x1="${x + c*(r+4)}" y1="${y + s*(r+4)}" x2="${x + c*(r+8)}" y2="${y + s*(r+8)}"/>`; }).join('')}</g><circle cx="${x}" cy="${y}" r="${r}" fill="#f7b928"/>`;
const drops = `<g stroke="#2f7fd8" stroke-width="3" stroke-linecap="round"><line x1="20" y1="47" x2="18" y2="53"/><line x1="29" y1="47" x2="27" y2="53"/><line x1="38" y1="47" x2="36" y2="53"/></g>`;
exports.icon = wx => {
  wx = wx || '';
  if (wx.includes('雪')) return S(cloud('#dfe6ee','transform="translate(0,-5)"') + '<g fill="#9fb4c8"><circle cx="20" cy="47" r="2.6"/><circle cx="29" cy="51" r="2.6"/><circle cx="38" cy="47" r="2.6"/></g>');
  if (wx.includes('雷')) return S(cloud('#9aa7b8','transform="translate(0,-4)"') + '<path d="M30 36l-6 9h5l-2 8 8-11h-5l3-6z" fill="#f7b928"/>');
  if (wx.includes('雨')) return S(cloud('#b4c0cf','transform="translate(0,-5)"') + drops);
  if (wx.includes('霧')) return S(cloud('#d3dae3','transform="translate(0,-6)"') + '<g stroke="#9aa7b8" stroke-width="3" stroke-linecap="round"><line x1="12" y1="45" x2="44" y2="45"/><line x1="18" y1="51" x2="50" y2="51"/></g>');
  if (wx.includes('陰')) return S(cloud('#b9c4d2'));
  if (wx.includes('多雲')) return S(sun(21, 20, 7) + cloud('#dbe3ed', 'transform="translate(2,4)"'));
  if (wx.includes('晴')) return S(sun());
  return S(cloud());
};
exports.tone = wx => /雷|雨/.test(wx || '') ? 'rain' : /晴/.test(wx || '') && !/多雲/.test(wx) ? 'sun' : 'cloud';
exports.day = v => v ? ['日','一','二','三','四','五','六'][new Date(v + 'T00:00:00').getDay()] : '';
exports.md = v => v ? (new Date(v + 'T00:00:00').getMonth() + 1) + '/' + new Date(v + 'T00:00:00').getDate() : '';

exports.hour = v => v ? String(new Date(v).getHours()).padStart(2, '0') + ':00' : '';

exports.today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
