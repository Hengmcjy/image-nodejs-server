const sharp = require('sharp');
const path = require('path');

const QUALITY   = parseInt(process.env.IMAGE_QUALITY)    || 90;
const MAX_WIDTH = parseInt(process.env.IMAGE_MAX_WIDTH)  || 1920;

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
