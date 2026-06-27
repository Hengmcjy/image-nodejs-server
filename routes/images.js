const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { upload, getDatetimeStamp, sanitizeName } = require('../middleware/upload');
const { processImage } = require('../utils/resize');

const UPLOAD_BASE = process.env.UPLOAD_BASE_PATH || '/app/uploads';
const MAX_FILES   = parseInt(process.env.MAX_FILES_PER_REQUEST) || 20;
const uploader    = upload.array('files', MAX_FILES);

// Helper: "/images/hr" → { folderKey: "hr", folderPath: "/app/uploads/hr" }
function resolveFolderPath(location) {
  const cleaned = location.replace(/^\/images\//, '').replace(/^\//, '');
  const safe = path.normalize(cleaned).replace(/^(\.\.(\/|\\|$))+/, '');
  return { folderKey: safe, folderPath: path.join(UPLOAD_BASE, safe) };
}

// Helper: list subfolders recursively
function listDirs(baseDir, prefix = '') {
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  const dirs = [];
  entries.forEach(e => {
    if (e.isDirectory() && e.name !== 'tmp') {
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      dirs.push(`/images/${rel}`);
      dirs.push(...listDirs(path.join(baseDir, e.name), rel));
    }
  });
  return dirs;
}

// ── POST /api/images/upload ───────────────────────────────────────
router.post('/upload', uploader, async (req, res) => {
  const location = req.body.location;
  if (!location)         return res.status(400).json({ success: false, message: 'location is required' });
  if (!req.files?.length) return res.status(400).json({ success: false, message: 'No files uploaded' });

  const { folderKey, folderPath } = resolveFolderPath(location);
  fs.mkdirSync(folderPath, { recursive: true });

  try {
    const results = [];
    for (const file of req.files) {
      const ext      = path.extname(file.originalname).toLowerCase();
      const nameOnly = path.basename(file.originalname, ext);
      const baseName = `${sanitizeName(nameOnly) || 'image'}_${getDatetimeStamp()}`;
      const filename = await processImage(file.buffer, folderPath, baseName);
      results.push({
        baseName,
        filename,
        url: `/images/${folderKey}/${encodeURIComponent(filename)}`,
        originalName: file.originalname,
      });
    }
    // console.log(`[upload] ${results.length} file(s) saved:`);
    // results.forEach(r => console.log(`  → ${r.url}`));
    return res.json({ success: true, count: results.length, files: results });
  } catch (e) {
    console.error('[upload error]', e);
    return res.status(500).json({ success: false, message: e.message });
  }
});

// ── DELETE /api/images/delete — ลบไฟล์ที่ขึ้นต้นด้วย baseName ─────
router.delete('/delete', (req, res) => {
  const { location, baseName } = req.body;
  if (!location || !baseName) {
    return res.status(400).json({ success: false, message: 'location and baseName are required' });
  }

  const { folderPath } = resolveFolderPath(location);
  if (!fs.existsSync(folderPath)) {
    return res.status(404).json({ success: false, message: 'Folder not found' });
  }

  const deleted = [];
  fs.readdirSync(folderPath)
    .filter(f => f.startsWith(baseName))
    .forEach(f => {
      fs.unlinkSync(path.join(folderPath, f));
      deleted.push(f);
    });

  if (deleted.length === 0) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }
  return res.json({ success: true, deleted });
});

// ── DELETE /api/images/delete-file ───────────────────────────────
router.delete('/delete-file', (req, res) => {
  const { location, filename } = req.body;
  if (!location || !filename) {
    return res.status(400).json({ success: false, message: 'location and filename are required' });
  }

  const { folderPath } = resolveFolderPath(location);
  const filePath = path.join(folderPath, path.basename(filename));

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File not found' });
  }

  fs.unlinkSync(filePath);
  return res.json({ success: true, deleted: path.basename(filename) });
});

// ── GET /api/images/list ─────────────────────────────────────────
router.get('/list', (req, res) => {
  const { location, page = 1, limit = 50 } = req.query;
  if (!location) {
    return res.status(400).json({ success: false, message: 'location is required' });
  }

  const { folderKey, folderPath } = resolveFolderPath(location);
  if (!fs.existsSync(folderPath)) {
    return res.json({ success: true, total: 0, page: 1, limit: parseInt(limit), files: [] });
  }

  const allFiles = fs.readdirSync(folderPath)
    .filter(f => f.endsWith('.webp'))
    .sort()
    .reverse();

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
  const paged = allFiles.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  const files = paged.map(filename => ({
    filename,
    url: `/images/${folderKey}/${encodeURIComponent(filename)}`,
    baseName: filename.replace(/\.webp$/, ''),
  }));

  return res.json({ success: true, total: allFiles.length, page: pageNum, limit: limitNum, files });
});

// ── GET /api/images/folders ───────────────────────────────────────
router.get('/folders', (req, res) => {
  if (!fs.existsSync(UPLOAD_BASE)) return res.json({ success: true, folders: [] });
  return res.json({ success: true, folders: listDirs(UPLOAD_BASE) });
});

// ── GET /api/images/info ─────────────────────────────────────────
router.get('/info', (req, res) => {
  const { location, baseName } = req.query;
  if (!location || !baseName) {
    return res.status(400).json({ success: false, message: 'location and baseName are required' });
  }

  const { folderKey, folderPath } = resolveFolderPath(location);
  const match = fs.existsSync(folderPath)
    ? fs.readdirSync(folderPath).find(f => f.startsWith(baseName))
    : null;

  if (!match) {
    return res.status(404).json({ success: false, message: 'Image not found' });
  }

  return res.json({
    success: true,
    baseName,
    filename: match,
    url: `/images/${folderKey}/${encodeURIComponent(match)}`,
  });
});

module.exports = router;
