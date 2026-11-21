const tz = 'Asia/Taipei';
const pad = n => String(n).padStart(2, '0');
exports.dt = v => v ? new Date(v).toLocaleString('zh-TW', { timeZone: tz, hour12: false }) : '—';
exports.date = v => v ? new Date(v + (String(v).length === 10 ? 'T00:00:00' : '')).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short' }) : '—';
exports.num = (v, u = '') => (v === null || v === undefined) ? '—' : v + u;
exports.toInput = v => { if (!v) return ''; const d = new Date(v); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
exports.windDir = deg => deg == null ? '—' : ['北','北北東','東北','東北東','東','東南東','東南','南南東','南','南南西','西南','西南西','西','西北西','西北','北北西'][Math.round(deg / 22.5) % 16];
exports.beaufort = ms => { if (ms == null) return '—'; const t=[0.3,1.6,3.4,5.5,8,10.8,13.9,17.2,20.8,24.5,28.5,32.7]; const i=t.findIndex(x=>ms<x); return i<0?12:i; };
