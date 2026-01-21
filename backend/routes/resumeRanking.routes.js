/**
 * Resume Ranking API Routes
 * 
 * Endpoints for AI-powered Resume Ranking Module
 * Part of FYP: Intelligent Recruitment and Interview Automation System
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import controller
const resumeRankingController = require('../controllers/resumeRankingController');

// Import middleware (if you have auth middleware)
// const { authenticate } = require('../middleware/auth');
// const { authorizeEmployer } = require('../middleware/authorization');

// Add logging middleware for all resume-ranking routes
router.use((req, res, next) => {
  console.log(`\n🔔 [Resume Ranking API] ${req.method} ${req.originalUrl}`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`📦 Body:`, req.body);
  console.log(`🔑 Params:`, req.params);
  next();
});

// Configure multer for resume uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/resumes');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'resume-' + uniqueSuffix + ext);
  }
});

// File filter for resumes
const fileFilter = function (req, file, cb) {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  }
});

// Routes

/**
 * @route   POST /api/resume-ranking/analyze/:applicationId
 * @desc    Analyze a resume for a specific application
 * @access  Private (Employer or System)
 */
router.post(
  '/analyze/:applicationId',
  upload.single('resume'),
  resumeRankingController.analyzeResume
);

/**
 * @route   GET /api/resume-ranking/results/:applicationId
 * @desc    Get analysis results for an application
 * @access  Private (Employer)
 */
router.get(
  '/results/:applicationId',
  resumeRankingController.getAnalysisResults
);

/**
 * @route   GET /api/resume-ranking/detailed/:applicationId
 * @desc    Get detailed analysis breakdown with all agent outputs
 * @access  Private (Employer)
 */
router.get(
  '/detailed/:applicationId',
  resumeRankingController.getDetailedAnalysis
);

/**
 * @route   GET /api/resume-ranking/status/:applicationId
 * @desc    Get analysis processing status
 * @access  Private
 */
router.get(
  '/status/:applicationId',
  resumeRankingController.getAnalysisStatus
);

/**
 * @route   GET /api/resume-ranking/top-candidates/:jobId
 * @desc    Get top ranked candidates for a job
 * @access  Private (Employer)
 */
router.get(
  '/top-candidates/:jobId',
  resumeRankingController.getTopCandidates
);

/**
 * @route   GET /api/resume-ranking/statistics/:jobId
 * @desc    Get statistics for a job's applications
 * @access  Private (Employer)
 */
router.get(
  '/statistics/:jobId',
  resumeRankingController.getJobStatistics
);

/**
 * @route   POST /api/resume-ranking/reanalyze/:applicationId
 * @desc    Re-analyze a resume (useful for debugging or AI model updates)
 * @access  Private (Admin/Employer)
 */
router.post(
  '/reanalyze/:applicationId',
  resumeRankingController.reanalyzeResume
);

/**
 * @route   POST /api/resume-ranking/batch-analyze/:jobId
 * @desc    Batch analyze multiple applications for a job
 * @access  Private (Employer)
 */
router.post(
  '/batch-analyze/:jobId',
  resumeRankingController.batchAnalyze
);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds the 10MB limit'
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next();
});

module.exports = router;
