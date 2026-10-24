/**
 * Cloudinary konfiguratsiyasi — fayl yuklash xizmati.
 * index.js dan ajratildi.
 */
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { ENV } from './env.js';

export function setupCloudinary() {
  if (!ENV.CLOUDINARY_CLOUD_NAME) {
    console.warn('⚠️  Cloudinary sozlanmagan — fayl yuklash o\'chirilgan');
    return false;
  }

  cloudinary.config({
    cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
    api_key: ENV.CLOUDINARY_API_KEY,
    api_secret: ENV.CLOUDINARY_API_SECRET,
  });

  console.log('✅ Cloudinary sozlandi');
  return true;
}

export { cloudinary };

// Multer — xotira ichida saqlash (disk emas)
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/', 'application/pdf', 'application/vnd.openxmlformats'];
    const isAllowed = allowed.some(type => file.mimetype.startsWith(type) || file.mimetype.includes('word'));
    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error('Faqat rasm, PDF yoki Word fayllarini yuklash mumkin.'));
    }
  },
});
