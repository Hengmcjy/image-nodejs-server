require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3967;
const UPLOAD_BASE = process.env.UPLOAD_BASE_PATH || '/app/uploads';

// ────────────────────────────────────────────────────────────────
// CORS
// ────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow no-origin (mobile, postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin not allowed — ${origin}`));
  },
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-api-key', 'Authorization'],
}));

// ────────────────────────────────────────────────────────────────
// Security / logging
// ────────────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow serving images
}));
app.use(morgan('tiny'));
app.use(express.json());

// ────────────────────────────────────────────────────────────────
// API Key middleware (optional — set API_KEY in .env to enable)
// ────────────────────────────────────────────────────────────────
const API_KEY = process.env.API_KEY;
app.use('/api', (req, res, next) => {
  if (!API_KEY) return next(); // ถ้าไม่ set ก็ไม่บังคับ
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
});

// ────────────────────────────────────────────────────────────────
// Static image serving
// GET /images/hr/web/filename.webp
// GET /images/accounting/thumb/filename.webp
// ────────────────────────────────────────────────────────────────
fs.mkdirSync(UPLOAD_BASE, { recursive: true });
app.use('/images', express.static(UPLOAD_BASE, {
  maxAge: '7d',
  immutable: true,
  etag: true,
}));

// ────────────────────────────────────────────────────────────────
// API Routes
// ────────────────────────────────────────────────────────────────
const imageRoutes = require('./routes/images');
app.use('/api/images', imageRoutes);

// ────────────────────────────────────────────────────────────────
// Health check
// ────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  const upSec = process.uptime();
  const memMB = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);

  // disk usage ของ uploads folder
  let diskInfo = {};
  try {
    const out = execSync(`df -h "${UPLOAD_BASE}" 2>/dev/null | tail -1`).toString().trim();
    const parts = out.split(/\s+/);
    diskInfo = { size: parts[1], used: parts[2], avail: parts[3], usePercent: parts[4] };
  } catch (_) {}

  res.json({
    status: 'ok',
    port: PORT,
    uptime: `${Math.floor(upSec / 60)}m ${Math.floor(upSec % 60)}s`,
    memoryRSS: `${memMB} MB`,
    uploadsPath: UPLOAD_BASE,
    disk: diskInfo,
  });
});

// ────────────────────────────────────────────────────────────────
// 404
// ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

// ────────────────────────────────────────────────────────────────
// Error handler
// ────────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  res.status(err.status || 500).json({ success: false, message: err.message });
});

// ────────────────────────────────────────────────────────────────
// Start
// ────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Image server running on port ${PORT}`);
  console.log(`Uploads path : ${UPLOAD_BASE}`);
  console.log(`API Key      : ${API_KEY ? 'enabled' : 'disabled'}`);
});
