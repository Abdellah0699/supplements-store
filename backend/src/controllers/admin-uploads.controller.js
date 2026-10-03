/**
 * admin-uploads.controller.js
 * ---------------------------------------------------------
 * Product image uploads from the admin dashboard.
 *
 * Two storage backends, chosen automatically:
 *  - Supabase Storage (production): when SUPABASE_URL and
 *    SUPABASE_SERVICE_ROLE_KEY are set, files are uploaded to
 *    the configured bucket and the public URL is stored on the
 *    product. Files survive restarts, redeploys and sleeping.
 *  - Local disk (development fallback): files land in
 *    backend/uploads/ (gitignored) and are served back at
 *    /uploads/<filename>. Ephemeral on free hosting tiers -
 *    do not rely on it in production.
 *
 * The product's `image` field stores the full URL so the
 * customer site can use it as-is.
 * ---------------------------------------------------------
 */

const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const env = require('../config/env');
const AppError = require('../utils/app-error');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

// Supabase Storage is used only when fully configured; otherwise the
// local-disk behavior is kept so development and tests need no setup.
const useSupabase = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);

// Lazy client: created on first use so merely requiring this module
// never touches the network (local dev, tests).
let supabaseClient = null;
function getSupabase() {
  if (!supabaseClient) {
    const { createClient } = require('@supabase/supabase-js');
    supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabaseClient;
}

function safeFilename(mimetype) {
  const ext = MIME_TO_EXT[mimetype] || '.jpg';
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
}

// Supabase path keeps the file in memory (buffer); the disk path
// keeps the previous behavior of writing into backend/uploads/.
const storage = useSupabase
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
      filename: (_req, file, cb) => cb(null, safeFilename(file.mimetype)),
    });

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    cb(AppError.validation('Only JPG, PNG, WebP or GIF images are allowed.'));
  },
});

// Multer middleware for a single `image` field, with friendly errors.
function uploadSingle(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(AppError.validation('Image is too large. Maximum size is 5 MB.'));
      }
      return next(err);
    }
    next();
  });
}

async function uploadToSupabase(file) {
  const filename = safeFilename(file.mimetype);
  const { error } = await getSupabase()
    .storage.from(env.SUPABASE_STORAGE_BUCKET)
    .upload(filename, file.buffer, { contentType: file.mimetype, upsert: false });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[uploads] Supabase upload failed:', error.message);
    throw new AppError('Image upload failed. Please try again.', {
      statusCode: 502,
      code: 'UPLOAD_FAILED',
    });
  }
  const { data } = getSupabase().storage.from(env.SUPABASE_STORAGE_BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

async function uploadImage(req, res) {
  if (!req.file) throw AppError.validation('No image file was sent.');
  const url = useSupabase
    ? await uploadToSupabase(req.file)
    : `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(201).json({ success: true, data: { url } });
}

module.exports = { uploadSingle, uploadImage, UPLOAD_DIR };
