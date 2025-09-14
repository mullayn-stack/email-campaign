/**
 * Simple HTTP server for the email campaign app.
 *
 * This server provides:
 *  - GET /config         → returns the current campaign configuration as JSON.
 *  - POST /admin/update  → accepts a new configuration and writes it to disk
 *                          (requires Basic Auth using credentials from .env).
 *  - GET /               → serves the landing page (frontend/index.html).
 *  - GET /admin          → serves the admin page (frontend/admin.html).
 *  - GET /<static file>  → serves static assets from the frontend folder.
 *
 * The server does not depend on any third‑party packages; it uses only
 * built‑in Node modules. Environment variables are loaded from .env.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

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

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password';

const frontendDir = path.join(__dirname, '..', 'frontend');
const configPath = path.join(__dirname, 'config.json');

/** Read the campaign configuration from disk. */
function readConfig() {
  const raw = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(raw);
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
    'Access-Control-Allow-Origin': '*'
  });
  res.end(body);
}

/** Send a text or HTML response from a file. */
function sendFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('404 Not Found');
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

/** Handle requests coming into the server. */
function requestHandler(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

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

  // Route: POST /admin/update → update config (requires Basic Auth)
  if (pathname === '/admin/update' && method === 'POST') {
    const authHeader = req.headers['authorization'] || '';
    if (!authHeader.startsWith('Basic ')) {
      return sendJson(res, 401, { message: 'Unauthorized' });
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
  // Map root paths to specific files.
  let filePath = '';
  if (pathname === '/' && method === 'GET') {
    filePath = path.join(frontendDir, 'index.html');
  } else if (pathname === '/admin' && method === 'GET') {
    filePath = path.join(frontendDir, 'admin.html');
  } else {
    // Attempt to serve file relative to frontend directory
    filePath = path.join(frontendDir, pathname);
  }
  // Determine content type
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'
  };
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  // Check file exists and serve
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      res.writeHead(404);
      res.end('404 Not Found');
    } else {
      sendFile(res, filePath, contentType);
    }
  });
}

// Create and start the HTTP server.
const server = http.createServer(requestHandler);
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
