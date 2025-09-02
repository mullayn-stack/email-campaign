/**
 * Mobile-first email campaign server for Northern Ireland
 * Optimized for Replit/Render deployment with analytics tracking
 *
 * Routes:
 *  - GET  /config         → returns current campaign configuration (JSON)
 *  - POST /admin/update   → updates configuration (Basic Auth via .env)
 *  - POST /track, /track-email → logs an email action (DB if available, else file)
 *  - GET  /analytics      → returns analytics (DB if available, else file) (Basic Auth)
 *  - GET  /               → serves index.html
 *  - GET  /admin          → serves admin.html
 *  - GET  /*              → serves static files
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// ---------------- File‑based analytics fallback ----------------
const ANALYTICS_FILE = path.join(__dirname, 'analytics.json');
function readAnalyticsFile() {
  try { return JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf8')); }
  catch { return { events: [] }; }
}
function writeAnalyticsFile(data) {
  try { fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(data)); } catch {}
}

// ---------------- Optional DB analytics (drizzle-backed) ----------------
let db = null;
let emailSends = null;
let campaignStats = null;
let dbInitialized = false;
async function initializeDatabase() {
  if (dbInitialized) return;
  try {
    const dbModule = require('./server/db.js');
    db = dbModule.db;
    emailSends = dbModule.emailSends;
    campaignStats = dbModule.campaignStats;
    dbInitialized = true;
    console.log('Database connection established for analytics');
  } catch (error) {
    console.log('Database not available, running with file analytics:', error.message);
  }
}
initializeDatabase();

// ---------------- Env (.env) ----------------
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
  lines.forEach((line) => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = m[2];
  });
}
loadEnv();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password';

const configPath = path.join(__dirname, 'config.json');
function readConfig() {
  try { return JSON.parse(fs.readFileSync(configPath, 'utf-8')); }
  catch {
    return {
      title: 'Protect Our Community',
      tagline: 'Contact your representatives in Northern Ireland',
      subject: 'Protect our community',
      body: 'Dear Representative,\n\nI am writing as your constituent to urge you to consider the important issues affecting our community in Northern Ireland.\n\nRegards,\n{{name}}\n{{postcode}}',
      recipients: [{ name: 'Your Local Representative', email: 'contact@example.com' }]
    };
  }
}
function writeConfig(cfg) { fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2)); }

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(body);
}
function sendFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      return res.end('<!DOCTYPE html><html><head><title>404</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><h1>404 Not Found</h1></body></html>');
    }
    res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

function requestHandler(req, res) {
  const { pathname, query } = url.parse(req.url, true);
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // ----------- API: Config -----------
  if (pathname === '/config' && method === 'GET') {
    try { return sendJson(res, 200, readConfig()); }
    catch { return sendJson(res, 500, { message: 'Failed to read configuration.' }); }
  }

  // ----------- API: Track (accept /track or /track-email) -----------
  if ((pathname === '/track' || pathname === '/track-email') && method === 'POST') {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', async () => {
      const payload = (() => { try { return JSON.parse(raw || '{}'); } catch { return {}; } })();
      const cfg = readConfig();

      // Try DB first
      await initializeDatabase();
      if (db && emailSends && campaignStats) {
        try {
          const { sql } = require('drizzle-orm');
          const clientIP = req.headers['x-forwarded-for']
            || req.connection?.remoteAddress
            || req.socket?.remoteAddress
            || (req.connection?.socket ? req.connection.socket.remoteAddress : '');

          await db.insert(emailSends).values({
            name: payload.name || '',
            email: payload.email || '',
            postcode: payload.postcode || '',
            personalNote: payload.personalNote || '',
            recipientCount: (cfg.recipients || []).length,
            campaignTitle: cfg.title || 'Untitled Campaign',
            userAgent: req.headers['user-agent'] || '',
            ipAddress: clientIP || '',
            sentAt: new Date()
          });

          const today = new Date().toISOString().slice(0, 10);
          await db.insert(campaignStats).values({ date: today, totalSends: 1, uniqueUsers: 1 })
            .onConflictDoUpdate({ target: campaignStats.date, set: { totalSends: sql`${campaignStats.totalSends} + 1`, updatedAt: new Date() } });

          return sendJson(res, 200, { message: 'tracked (db)' });
        } catch (err) {
          console.log('DB track failed, using file fallback:', err.message);
        }
      }

      // File fallback
      const store = readAnalyticsFile();
      store.events.push({
        ts: Date.now(),
        name: payload.name || '',
        email: payload.email || '',
        postcode: payload.postcode || '',
        personalNote: payload.personalNote || '',
        recipientCount: (cfg.recipients || []).length,
        ua: req.headers['user-agent'] || ''
      });
      writeAnalyticsFile(store);
      return sendJson(res, 200, { message: 'tracked (file)' });
    });
    return;
  }

  // ----------- API: Analytics (Basic Auth) -----------
  if (pathname === '/analytics' && method === 'GET') {
    const authHeader = req.headers['authorization'] || '';
    if (!authHeader.startsWith('Basic ')) return sendJson(res, 401, { message: 'Unauthorized - Basic Auth required' });
    const [user, pass] = Buffer.from(authHeader.split(' ')[1], 'base64').toString('utf8').split(':');
    if (user !== ADMIN_USERNAME || pass !== ADMIN_PASSWORD) return sendJson(res, 401, { message: 'Invalid credentials' });

    (async () => {
      await initializeDatabase();

      // Prefer DB if available
      if (db && emailSends && campaignStats) {
        try {
          const { sql } = require('drizzle-orm');
          const recentSends = await db.select({ id: emailSends.id, name: emailSends.name, postcode: emailSends.postcode, sentAt: emailSends.sentAt, recipientCount: emailSends.recipientCount })
            .from(emailSends)
            .orderBy(sql`${emailSends.sentAt} DESC`)
            .limit(50);

          const thirty = new Date(); thirty.setDate(thirty.getDate() - 30);
          const dailyStats = await db.select()
            .from(campaignStats)
            .where(sql`${campaignStats.date} >= ${thirty.toISOString().slice(0,10)}`)
            .orderBy(campaignStats.date);

          const totalSends = await db.select({ count: sql`COUNT(*)` }).from(emailSends);
          const uniqueEmails = await db.select({ count: sql`COUNT(DISTINCT ${emailSends.email})` }).from(emailSends);

          return sendJson(res, 200, {
            summary: {
              totalSends: parseInt(totalSends[0]?.count || 0),
              uniqueUsers: parseInt(uniqueEmails[0]?.count || 0),
              recentActivity: recentSends.length
            },
            recentSends,
            dailyStats
          });
        } catch (err) {
          console.log('DB analytics failed, using file fallback:', err.message);
        }
      }

      // File fallback
      const data = readAnalyticsFile();
      const events = data.events || [];
      const totalSends = events.length;

      const recentSends = events.slice(-50).reverse().map((e, i) => ({
        id: i + 1,
        name: e.name || '',
        postcode: e.postcode || '',
        sentAt: new Date(e.ts).toISOString(),
        recipientCount: e.recipientCount || 0
      }));

      const byDay = {};
      for (const e of events) {
        const d = new Date(e.ts).toISOString().slice(0, 10);
        byDay[d] = (byDay[d] || 0) + 1;
      }
      const dailyStats = Object.keys(byDay).sort().map(d => ({ date: d, totalSends: byDay[d] }));

      const uniq = new Set(events.map(e => `${e.name}|${e.postcode}`));
      const uniqueUsers = [...uniq].filter(k => k !== '|').length;

      return sendJson(res, 200, {
        summary: { totalSends, uniqueUsers, recentActivity: recentSends.length },
        recentSends,
        dailyStats
      });
    })();
    return;
  }

  // ----------- API: Admin update (Basic Auth) -----------
  if (pathname === '/admin/update' && method === 'POST') {
    const authHeader = req.headers['authorization'] || '';
    if (!authHeader.startsWith('Basic ')) return sendJson(res, 401, { message: 'Unauthorized - Basic Auth required' });
    const [user, pass] = Buffer.from(authHeader.split(' ')[1], 'base64').toString('utf8').split(':');
    if (user !== ADMIN_USERNAME || pass !== ADMIN_PASSWORD) return sendJson(res, 401, { message: 'Invalid credentials' });

    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      try { writeConfig(JSON.parse(raw || '{}')); return sendJson(res, 200, { message: 'Configuration updated successfully.' }); }
      catch { return sendJson(res, 500, { message: 'Failed to save configuration.' }); }
    });
    return;
  }

  // ----------- Static files -----------
  let filePath = '';
  if (pathname === '/' && method === 'GET') filePath = path.join(__dirname, 'index.html');
  else if (pathname === '/admin' && method === 'GET') filePath = path.join(__dirname, 'admin.html');
  else filePath = path.join(__dirname, pathname);

  const ext = path.extname(filePath).toLowerCase();
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  }[ext] || 'application/octet-stream';

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<!DOCTYPE html><html><head><title>404 Not Found</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><h1>404 Not Found</h1></body></html>');
    } else {
      sendFile(res, filePath, mime);
    }
  });
}

const server = http.createServer(requestHandler);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Email campaign server running on port ${PORT}`);
  console.log(`Public: http://localhost:${PORT}`);
  console.log(`Admin : http://localhost:${PORT}/admin`);
});
