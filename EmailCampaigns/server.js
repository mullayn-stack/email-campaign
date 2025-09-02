/**
 * Mobile-first email campaign server for Northern Ireland
 * Optimized for Replit deployment with analytics tracking
 *
 * This server provides:
 *  - GET /config         → returns the current campaign configuration as JSON.
 *  - POST /admin/update  → accepts a new configuration and writes it to disk
 *                          (requires Basic Auth using credentials from .env).
 *  - POST /track-email   → logs email send for analytics
 *  - GET /analytics      → returns campaign analytics (requires Basic Auth)
 *  - GET /               → serves the landing page (index.html).
 *  - GET /admin          → serves the admin page (admin.html).
 *  - GET /<static file>  → serves static assets from the current directory.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Import database functionality (when available)
let db = null;
let emailSends = null;
let campaignStats = null;
let dbInitialized = false;

async function initializeDatabase() {
  if (dbInitialized) return;
  
  try {
    // Import JavaScript database module
    const dbModule = require('./server/db.js');
    
    db = dbModule.db;
    emailSends = dbModule.emailSends;
    campaignStats = dbModule.campaignStats;
    dbInitialized = true;
    console.log('Database connection established for analytics');
  } catch (error) {
    console.log('Database not available, running without analytics:', error.message);
  }
}

// Initialize database connection
initializeDatabase();

// Load environment variables from .env if present.
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
  lines.forEach((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match) {
      const key = match[1];
      const value = match[2];
      process.env[key] = value;
    }
  });
}
loadEnv();

// Use port 5000 for Replit compatibility, bind to 0.0.0.0
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password';

const configPath = path.join(__dirname, 'config.json');

/** Read the campaign configuration from disk. */
function readConfig() {
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading config:', err);
    // Return default config if file doesn't exist
    return {
      title: "Protect Our Community",
      tagline: "Contact your representatives in Northern Ireland",
      subject: "Protect our community",
      body: "Dear Representative,\n\nI am writing as your constituent to urge you to consider the important issues affecting our community in Northern Ireland.\n\nRegards,\n{{name}}\n{{postcode}}",
      recipients: [
        {
          name: "Your Local Representative",
          email: "contact@example.com"
        }
      ]
    };
  }
}

/** Write the campaign configuration to disk. */
function writeConfig(cfg) {
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2));
}

/** Send a JSON response with proper headers. */
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

/** Send a text or HTML response from a file. */
function sendFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, {
        'Content-Type': 'text/html'
      });
      return res.end('<!DOCTYPE html><html><head><title>404 Not Found</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><h1>404 Not Found</h1></body></html>');
    }
    res.writeHead(200, { 
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
}

/** Handle requests coming into the server. */
function requestHandler(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle OPTIONS requests for CORS
  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // Route: GET /config → return JSON config
  if (pathname === '/config' && method === 'GET') {
    try {
      const cfg = readConfig();
      return sendJson(res, 200, cfg);
    } catch (err) {
      console.error('Error reading config:', err);
      return sendJson(res, 500, { message: 'Failed to read configuration.' });
    }
  }

  // Route: POST /track-email → log email send for analytics
  if (pathname === '/track-email' && method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', async () => {
      // Ensure database is initialized
      await initializeDatabase();
      
      if (!db) {
        return sendJson(res, 500, { message: 'Analytics not available' });
      }

      try {
        const data = JSON.parse(body);
        const config = readConfig();
        
        // Get client IP
        const clientIP = req.headers['x-forwarded-for'] || 
                        req.connection.remoteAddress || 
                        req.socket.remoteAddress || 
                        (req.connection.socket ? req.connection.socket.remoteAddress : null);

        // Import sql function 
        const { sql } = require('drizzle-orm');

        // Insert email send record
        await db.insert(emailSends).values({
          name: data.name || '',
          email: data.email || '',
          postcode: data.postcode || '',
          personalNote: data.personalNote || '',
          recipientCount: (config.recipients || []).length,
          campaignTitle: config.title || 'Untitled Campaign',
          userAgent: req.headers['user-agent'] || '',
          ipAddress: clientIP || '',
          sentAt: new Date()
        });

        // Update daily stats
        const today = new Date().toISOString().split('T')[0];
        
        await db.insert(campaignStats).values({
          date: today,
          totalSends: 1,
          uniqueUsers: 1
        }).onConflictDoUpdate({
          target: campaignStats.date,
          set: {
            totalSends: sql`${campaignStats.totalSends} + 1`,
            updatedAt: new Date()
          }
        });

        return sendJson(res, 200, { message: 'Email send tracked successfully' });
      } catch (err) {
        console.error('Error tracking email:', err);
        return sendJson(res, 500, { message: 'Failed to track email send' });
      }
    });
    return;
  }

  // Route: GET /analytics → return campaign analytics (requires Basic Auth)
  if (pathname === '/analytics' && method === 'GET') {
    const authHeader = req.headers['authorization'] || '';
    if (!authHeader.startsWith('Basic ')) {
      return sendJson(res, 401, { message: 'Unauthorized - Basic Auth required' });
    }
    const encoded = authHeader.split(' ')[1];
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    const [username, password] = decoded.split(':');
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return sendJson(res, 401, { message: 'Invalid credentials' });
    }

    (async () => {
      // Ensure database is initialized
      await initializeDatabase();
      
      if (!db) {
        return sendJson(res, 500, { message: 'Analytics not available' });
      }

      try {
        const { sql } = require('drizzle-orm');
        
        // Get recent sends
        const recentSends = await db.select({
          id: emailSends.id,
          name: emailSends.name,
          postcode: emailSends.postcode,
          sentAt: emailSends.sentAt,
          recipientCount: emailSends.recipientCount
        })
        .from(emailSends)
        .orderBy(sql`${emailSends.sentAt} DESC`)
        .limit(50);

        // Get daily stats for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const dailyStats = await db.select()
          .from(campaignStats)
          .where(sql`${campaignStats.date} >= ${thirtyDaysAgo.toISOString().split('T')[0]}`)
          .orderBy(campaignStats.date);

        // Calculate totals
        const totalSends = await db.select({
          count: sql`COUNT(*)`
        }).from(emailSends);

        const uniqueEmails = await db.select({
          count: sql`COUNT(DISTINCT ${emailSends.email})`
        }).from(emailSends);

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
        console.error('Error fetching analytics:', err);
        return sendJson(res, 500, { message: 'Failed to fetch analytics' });
      }
    })();
    return;
  }

  // Route: POST /admin/update → update config (requires Basic Auth)
  if (pathname === '/admin/update' && method === 'POST') {
    const authHeader = req.headers['authorization'] || '';
    if (!authHeader.startsWith('Basic ')) {
      return sendJson(res, 401, { message: 'Unauthorized - Basic Auth required' });
    }
    const encoded = authHeader.split(' ')[1];
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    const [username, password] = decoded.split(':');
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return sendJson(res, 401, { message: 'Invalid credentials' });
    }
    // Collect the request body
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const cfg = JSON.parse(body);
        writeConfig(cfg);
        return sendJson(res, 200, { message: 'Configuration updated successfully.' });
      } catch (err) {
        console.error('Error updating config:', err);
        return sendJson(res, 500, { message: 'Failed to save configuration.' });
      }
    });
    return;
  }

  // Static file serving
  let filePath = '';
  if (pathname === '/' && method === 'GET') {
    filePath = path.join(__dirname, 'index.html');
  } else if (pathname === '/admin' && method === 'GET') {
    filePath = path.join(__dirname, 'admin.html');
  } else {
    // Attempt to serve file relative to current directory
    filePath = path.join(__dirname, pathname);
  }
  
  // Determine content type
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  // Check file exists and serve
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      res.writeHead(404, {
        'Content-Type': 'text/html; charset=utf-8'
      });
      res.end('<!DOCTYPE html><html><head><title>404 Not Found</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><h1>404 Not Found</h1></body></html>');
    } else {
      sendFile(res, filePath, contentType);
    }
  });
}

// Create and start the HTTP server.
const server = http.createServer(requestHandler);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Mobile-first email campaign server running on port ${PORT}`);
  console.log(`Access your campaign at: http://localhost:${PORT}`);
  console.log(`Admin dashboard at: http://localhost:${PORT}/admin`);
});
