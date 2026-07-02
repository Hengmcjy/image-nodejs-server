const sharp = require('sharp');
const path = require('path');

// เอกสารค่าแรง worker ต้องอ่านชัด (เจ้าของโรงงานสูงอายุ) → quality 95, กว้างสูงสุด 2560
const QUALITY   = parseInt(process.env.IMAGE_QUALITY)    || 95;
const MAX_WIDTH = parseInt(process.env.IMAGE_MAX_WIDTH)  || 2560;

/**
 * แปลง image buffer → webp ไฟล์เดียว
 * @param {Buffer} buffer     - raw bytes จาก multer memoryStorage
 * @param {string} folderPath - folder ปลายทาง
 * @param {string} baseName   - ชื่อไฟล์ (ไม่มี extension)
 * @returns {string} filename ที่บันทึก เช่น "profile_photo 202606211140.webp"
 */
async function processImage(buffer, folderPath, baseName) {
  const filename = `${baseName}.webp`;
  await sharp(buffer)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(path.join(folderPath, filename));
  return filename;
}

module.exports = { processImage };
