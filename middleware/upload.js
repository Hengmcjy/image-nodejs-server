const multer = require('multer');

const MAX_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB) || 20;
const MAX_FILES   = parseInt(process.env.MAX_FILES_PER_REQUEST) || 20;

const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/gif',
  'image/webp', 'image/heic', 'image/heif',
];

// สร้าง yyyymmddHHmm จาก Date ปัจจุบัน
function getDatetimeStamp() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
  ].join('');
}

// sanitize ชื่อไฟล์ — เก็บ ไทย/EN/ตัวเลข/space/hyphen/underscore
function sanitizeName(name) {
  return name
    .replace(/[^\wก-๙\s\-]/g, '')
    .replace(/\s+/g, '_')
    .trim();
}

const fileFilter = (req, file, cb) => {
  ALLOWED_MIME.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error(`File type not allowed: ${file.mimetype}`), false);
};

// ใช้ memoryStorage → ไม่มี tmp folder บน disk เลย
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: MAX_SIZE_MB * 1024 * 1024,
    files: MAX_FILES,
  },
});

module.exports = { upload, getDatetimeStamp, sanitizeName };
