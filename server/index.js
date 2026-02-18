/**
 * MET Collection Explorer — Server (Supabase / Postgres)
 *
 * Local dev:  set DATABASE_URL in .env then run: npm run dev
 * Production: set DATABASE_URL as environment variable on Cloud Run
 *
 * Routes:
 *   GET /api/search?q=&dept=&culture=&from=&to=&highlight=&page=
 *   GET /api/objects/:id
 *   GET /api/departments
 *   GET /health
 */

import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env in development

if (process.env.NODE_ENV !== 'production') {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n'); for (const line of lines) {
      const [key, ...rest] = line.split('=');
      if (key?.trim() && rest.length) process.env[key.trim()] = rest.join('=').trim();
    }
  } catch { /* .env is optional if env vars already set */ }
}

// ── Config ────────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT ?? 3001);
const DIST_DIR = path.join(__dirname, '..', 'dist');
const IS_PROD = process.env.NODE_ENV === 'production';
const PAGE_SIZE = 20;

// ── Database pool ─────────────────────────────────────────────────────────────

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // required for Supabase
  max: 10,
  idleTimeoutMillis: 30000,
});

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function send(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

function sendError(res, err) {
  console.error(err.message);
  send(res, 500, { error: 'Internal server error' });
}

// ── Route: GET /api/search ────────────────────────────────────────────────────

async function handleSearch(res, url) {
  const q = (url.searchParams.get('q') ?? '').trim();
  const dept = (url.searchParams.get('dept') ?? '').trim();
  const culture = (url.searchParams.get('culture') ?? '').trim();
  const from = parseInt(url.searchParams.get('from') ?? '');
  const to = parseInt(url.searchParams.get('to') ?? '');
  const highlight = url.searchParams.get('highlight') === 'true';
  const page = Math.max(0, parseInt(url.searchParams.get('page') ?? '0') || 0);

  const where = [];
  const params = [];
  let p = 1;

  if (q) {
    where.push(`to_tsvector('english',
      coalesce(title,'') || ' ' || coalesce(artist,'') || ' ' ||
      coalesce(culture,'') || ' ' || coalesce(medium,'') || ' ' ||
      coalesce(department,'')
    ) @@ plainto_tsquery('english', $${p++})`);
    params.push(q);
  }
  if (dept) { where.push(`department = $${p++}`); params.push(dept); }
  if (culture) { where.push(`culture ILIKE $${p++}`); params.push(`%${culture}%`); }
  if (!isNaN(from)) { where.push(`object_end_date >= $${p++}`); params.push(from); }
  if (!isNaN(to)) { where.push(`object_begin_date <= $${p++}`); params.push(to); }
  if (highlight) { where.push(`is_highlight = true`); }

  const W = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const offset = page * PAGE_SIZE;

  try {
    const [countRes, rowsRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS n FROM objects ${W}`, params),
      pool.query(
        `SELECT id, object_id, title, artist, date, medium,
                primary_image, primary_image_small, department, culture,
                classification, is_highlight, object_begin_date, object_end_date
         FROM objects ${W}
         ORDER BY is_highlight DESC, id ASC
         LIMIT $${p} OFFSET $${p + 1}`,
        [...params, PAGE_SIZE, offset]
      ),
    ]);

    const total = parseInt(countRes.rows[0].n);
    send(res, 200, {
      total,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil(total / PAGE_SIZE),
      results: rowsRes.rows,
    });
  } catch (err) { sendError(res, err); }
}

// ── Route: GET /api/objects/:id ───────────────────────────────────────────────

async function handleGetObject(res, id) {
  try {
    const result = await pool.query('SELECT * FROM objects WHERE id = $1', [id]);
    if (!result.rows.length) return send(res, 404, { error: 'Not found' });
    send(res, 200, result.rows[0]);
  } catch (err) { sendError(res, err); }
}

// ── Route: GET /api/departments ───────────────────────────────────────────────

async function handleDepartments(res) {
  try {
    const result = await pool.query(
      'SELECT DISTINCT department FROM objects WHERE department IS NOT NULL ORDER BY department'
    );
    send(res, 200, result.rows.map(r => r.department));
  } catch (err) { sendError(res, err); }
}

// ── Static file server (production SPA) ──────────────────────────────────────

const MIME = {
  html: 'text/html; charset=utf-8', js: 'application/javascript',
  css: 'text/css', svg: 'image/svg+xml', png: 'image/png',
  webp: 'image/webp', ico: 'image/x-icon', woff2: 'font/woff2',
};

function serveStatic(res, urlPath) {
  const rel = urlPath === '/' ? 'index.html' : urlPath.slice(1);
  const abs = path.join(DIST_DIR, rel);
  fs.readFile(abs, (err, data) => {
    if (err) {
      fs.readFile(path.join(DIST_DIR, 'index.html'), (e2, html) => {
        if (e2) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME.html, 'Cache-Control': 'no-cache' });
        res.end(html);
      });
      return;
    }
    const ext = path.extname(abs).slice(1);
    const cache = ext === 'html' ? 'no-cache'
      : /\.[a-f0-9]{8,}\./.test(rel) ? 'public,max-age=31536000,immutable'
        : 'public,max-age=3600';
    res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream', 'Cache-Control': cache });
    res.end(data);
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nMET Collection Explorer\n');

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not set.');
    console.error('Add it to your .env file:\n');
    console.error('  DATABASE_URL=postgresql://postgres:PASSWORD@db.xxxx.supabase.co:5432/postgres\n');
    process.exit(1);
  }

  // Verify DB connection
  try {
    await pool.query('SELECT 1');
    console.log('Database connected.\n');
  } catch (err) {
    console.error('ERROR: Cannot connect to database.');
    console.error(err.message, '\n');
    process.exit(1);
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const parts = url.pathname.replace(/\/$/, '').split('/').filter(Boolean);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' });
      res.end();
      return;
    }

    if (url.pathname === '/health') return send(res, 200, { ok: true });

    if (parts[0] === 'api') {
      if (parts[1] === 'search') return handleSearch(res, url);
      if (parts[1] === 'departments') return handleDepartments(res);
      if (parts[1] === 'objects' && parts[2]) {
        const id = parseInt(parts[2], 10);
        if (isNaN(id)) return send(res, 400, { error: 'Invalid id' });
        return handleGetObject(res, id);
      }
      return send(res, 404, { error: 'Unknown endpoint' });
    }

    if (IS_PROD) return serveStatic(res, url.pathname);

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`API → http://localhost:${PORT}\nFrontend → http://localhost:5173\n`);
  });

  server.listen(PORT, () => {
    console.log(`Server  →  http://localhost:${PORT}`);
    if (IS_PROD) console.log(`SPA     →  ${DIST_DIR}`);
    else console.log(`Vite    →  http://localhost:5173`);
    console.log('');
  });
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
