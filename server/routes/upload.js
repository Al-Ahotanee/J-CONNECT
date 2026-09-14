import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const bucket = req.params.bucket || 'general';
    const targetPath = req.query.path ? decodeURIComponent(String(req.query.path)) : '';
    const dirPart = targetPath ? path.dirname(targetPath) : '';
    const uploadDir = dirPart && dirPart !== '.'
      ? path.join(__dirname, '../uploads', bucket, dirPart)
      : path.join(__dirname, '../uploads', bucket);
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const targetPath = req.query.path ? decodeURIComponent(String(req.query.path)) : '';
    const baseName = targetPath ? path.basename(targetPath) : '';
    if (baseName) {
      cb(null, baseName.replace(/[^a-zA-Z0-9._-]/g, '_'));
    } else {
      const originalSafe = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${uniqueSuffix}-${originalSafe}`);
    }
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

router.post('/:bucket', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded' });
    }

    const bucket = req.params.bucket;
    const targetPath = req.query.path ? decodeURIComponent(String(req.query.path)) : req.file.filename;
    const cleanPath = targetPath.replace(/\\/g, '/').replace(/^\/+/, '');
    const publicUrl = `/uploads/${bucket}/${cleanPath}`;

    return res.json({
      success: true,
      key: `${bucket}/${cleanPath}`,
      path: `${bucket}/${cleanPath}`,
      publicUrl,
      fileName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (err) {
    console.error('[Upload Error]:', err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
