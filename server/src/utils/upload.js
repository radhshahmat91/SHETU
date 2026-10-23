import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.resolve(here, '../../uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, crypto.randomBytes(14).toString('hex') + path.extname(file.originalname).toLowerCase()),
});
const allowed = /\.(pdf|docx?|pptx?|xlsx?|txt|md|csv|png|jpe?g|gif|webp|zip|rar)$/i;

export const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => (allowed.test(file.originalname) ? cb(null, true) : cb(new Error('That file type is not supported. Use PDF, Office, image, text or zip files.'))),
});

// multer decodes names as latin1; restore UTF-8 so Bangla file names survive
export const toFileDoc = (f) =>
  f ? { filename: f.filename, originalName: Buffer.from(f.originalname, 'latin1').toString('utf8'), mimetype: f.mimetype, size: f.size } : undefined;
