const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure upload directories exist
const resumesDir = path.join(__dirname, '../uploads/resumes');
const photosDir = path.join(__dirname, '../uploads/photos');

if (!fs.existsSync(resumesDir)) {
  fs.mkdirSync(resumesDir, { recursive: true });
}

if (!fs.existsSync(photosDir)) {
  fs.mkdirSync(photosDir, { recursive: true });
}

// Allowed file extensions
const ALLOWED_RESUME_EXTENSIONS = ['.pdf'];
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const ALLOWED_IMAGE_MIMETYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Sanitize filename to prevent path traversal and other attacks
const sanitizeFilename = (filename) => {
  // Remove directory path and invalid characters
  const basename = path.basename(filename);
  // Replace any non-alphanumeric characters (except dots and dashes) with underscores
  return basename.replace(/[^a-zA-Z0-9.-]/g, '_');
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'resume') {
      cb(null, resumesDir);
    } else if (file.fieldname === 'profilePhoto') {
      cb(null, photosDir);
    } else {
      cb(new Error('Invalid file field name'));
    }
  },
  filename: (req, file, cb) => {
    try {
      // Generate cryptographically secure random filename
      const randomName = crypto.randomBytes(16).toString('hex');
      const sanitizedOriginal = sanitizeFilename(file.originalname);
      const ext = path.extname(sanitizedOriginal).toLowerCase();
      
      if (file.fieldname === 'resume') {
        // Verify extension is allowed
        if (!ALLOWED_RESUME_EXTENSIONS.includes(ext)) {
          return cb(new Error('Invalid file extension for resume'));
        }
        cb(null, `resume-${randomName}${ext}`);
      } else if (file.fieldname === 'profilePhoto') {
        // Verify extension is allowed
        if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
          return cb(new Error('Invalid file extension for photo'));
        }
        cb(null, `photo-${randomName}${ext}`);
      } else {
        cb(new Error('Invalid file field name'));
      }
    } catch (error) {
      cb(error);
    }
  }
});

const fileFilter = (req, file, cb) => {
  try {
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (file.fieldname === 'resume') {
      // Check both mimetype and extension
      if (file.mimetype === 'application/pdf' && ALLOWED_RESUME_EXTENSIONS.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed for resumes'), false);
      }
    } else if (file.fieldname === 'profilePhoto') {
      // Check both mimetype and extension
      if (ALLOWED_IMAGE_MIMETYPES.includes(file.mimetype) && ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Only JPG, PNG, GIF, and WEBP images are allowed for profile photos'), false);
      }
    } else {
      cb(new Error('Invalid file field name'), false);
    }
  } catch (error) {
    cb(error, false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only allow 1 file per request
  }
});

// Error handling middleware for multer errors
upload.handleError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 5MB limit' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files uploaded' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected file field' });
    }
    return res.status(400).json({ error: 'File upload error: ' + err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

module.exports = upload;
