process.env.TZ = 'Asia/Taipei';
require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('cookie-session');
const helmet = require('helmet');

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));
const gen = require('./lib/generator');
app.use((req, res, next) => { gen.touch(); next(); });
app.use(session({
  name: 'cwb.sid',
  keys: [process.env.SESSION_SECRET || 'dev-secret-change-me'],
  httpOnly: true, sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 8 * 3600 * 1000
}));

app.locals.site = { name: '虛擬中央氣象局', en: 'Virtual Central Weather Bureau' };
app.locals.f = require('./lib/format');
app.use((req, res, next) => { res.locals.path = req.path; next(); });

app.use('/api', (req, res, next) => { res.set('Access-Control-Allow-Origin', '*'); next(); });
app.use('/app', express.static(path.join(__dirname, 'app', 'www')));
app.use('/api', require('./routes/api'));
app.use('/admin', require('./routes/admin'));
app.use('/', require('./routes/public'));

app.use((req, res) => res.status(404).render('404', { title: '找不到頁面' }));
app.use((err, req, res, next) => { console.error(err); res.status(500).send('伺服器發生錯誤'); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`虛擬中央氣象局 http://localhost:${PORT}  後台 /admin`); gen.start(); });
