const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const resumesDir = path.join(__dirname, '../uploads/resumes');
const photosDir = path.join(__dirname, '../uploads/photos');

if (!fs.existsSync(resumesDir)) {
  fs.mkdirSync(resumesDir, { recursive: true });
}

if (!fs.existsSync(photosDir)) {
  fs.mkdirSync(photosDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'resume') {
      cb(null, resumesDir);
    } else if (file.fieldname === 'profilePhoto') {
      cb(null, photosDir);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    
    if (file.fieldname === 'resume') {
      cb(null, 'resume-' + uniqueSuffix + path.extname(file.originalname));
    } else if (file.fieldname === 'profilePhoto') {
      cb(null, 'photo-' + uniqueSuffix + path.extname(file.originalname));
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'resume') {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed for resumes'), false);
    }
  } else if (file.fieldname === 'profilePhoto') {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for profile photos'), false);
    }
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

module.exports = upload;
