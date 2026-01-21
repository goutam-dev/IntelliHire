/**
 * Resume Ranking Controller
 * 
 * Handles HTTP requests for the AI-powered Resume Ranking Module
 * Part of FYP: Intelligent Recruitment and Interview Automation System
 */

const resumeRankingService = require('../services/resumeRankingService');
const { sendSuccess, sendError } = require('../utils/responseFormatter');
const path = require('path');

/**
 * Analyze a resume for a specific application
 * POST /api/resume-ranking/analyze/:applicationId
 */
async function analyzeResume(req, res) {
  try {
    const { applicationId } = req.params;
    
    // Check if resume file was uploaded
    if (!req.file) {
      return sendError(res, 'No resume file provided', 400);
    }
    
    // Extract file information
    const resumeFilePath = req.file.path;
    const mimeType = req.file.mimetype;
    const originalName = req.file.originalname;
    const fileSize = req.file.size;
    
    // Optional: Get AI provider from request (default to env variable)
    const apiProvider = req.body.apiProvider || req.query.apiProvider;
    const useLLM = req.body.useLLM !== 'false' && req.query.useLLM !== 'false';
    
    // Call the resume ranking service
    const result = await resumeRankingService.analyzeResumeForApplication(
      applicationId,
      resumeFilePath,
      mimeType,
      {
        originalName,
        fileSize,
        apiProvider,
        useLLM
      }
    );
    
    return sendSuccess(res, { success: true, data: result, message: 'Resume analysis completed successfully' });
    
  } catch (error) {
    console.error('Resume analysis error:', error);
    return sendError(res, error.message || 'Resume analysis failed', 500);
  }
}

/**
 * Get analysis results for an application
 * GET /api/resume-ranking/results/:applicationId
 */
async function getAnalysisResults(req, res) {
  try {
    const { applicationId } = req.params;
    
    const results = await resumeRankingService.getAnalysisResults(applicationId);
    
    if (!results) {
      return sendError(res, 'No analysis found for this application', 404);
    }
    
    return sendSuccess(res, { success: true, data: results, message: 'Analysis results retrieved successfully' });
    
  } catch (error) {
    console.error('Get analysis results error:', error);
    return sendError(res, error.message || 'Failed to retrieve analysis results', 500);
  }
}

/**
 * Get top ranked candidates for a job
 * GET /api/resume-ranking/top-candidates/:jobId
 */
async function getTopCandidates(req, res) {
  try {
    const { jobId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    const topCandidates = await resumeRankingService.getTopCandidatesForJob(jobId, limit);
    
    return sendSuccess(res, { success: true, data: topCandidates, message: 'Top candidates retrieved successfully' });
    
  } catch (error) {
    console.error('Get top candidates error:', error);
    return sendError(res, error.message || 'Failed to retrieve top candidates', 500);
  }
}

/**
 * Get statistics for a job's applications
 * GET /api/resume-ranking/statistics/:jobId
 */
async function getJobStatistics(req, res) {
  try {
    const { jobId } = req.params;
    
    const statistics = await resumeRankingService.getJobStatistics(jobId);
    
    return sendSuccess(res, { success: true, data: statistics, message: 'Job statistics retrieved successfully' });
    
  } catch (error) {
    console.error('Get job statistics error:', error);
    return sendError(res, error.message || 'Failed to retrieve job statistics', 500);
  }
}

/**
 * Re-analyze a resume
 * POST /api/resume-ranking/reanalyze/:applicationId
 */
async function reanalyzeResume(req, res) {
  try {
    const { applicationId } = req.params;
    
    const apiProvider = req.body.apiProvider || req.query.apiProvider;
    const useLLM = req.body.useLLM !== 'false' && req.query.useLLM !== 'false';
    
    const result = await resumeRankingService.reanalyzeResume(applicationId, {
      apiProvider,
      useLLM
    });
    
    return sendSuccess(res, { success: true, data: result, message: 'Resume re-analysis completed successfully' });
    
  } catch (error) {
    console.error('Resume re-analysis error:', error);
    return sendError(res, error.message || 'Resume re-analysis failed', 500);
  }
}

/**
 * Get detailed breakdown for an analysis
 * GET /api/resume-ranking/detailed/:applicationId
 */
async function getDetailedAnalysis(req, res) {
  try {
    const { applicationId } = req.params;
    
    const ResumeAnalysis = require('../models/ResumeAnalysis');
    
    const analysis = await ResumeAnalysis.findOne({ applicationId })
      .populate('applicationId')
      .populate('jobId')
      .populate('candidateId', 'name email');
    
    if (!analysis) {
      return sendError(res, 'No analysis found for this application', 404);
    }
    
    // Return full analysis with all agent outputs
    const detailedData = {
      applicationInfo: {
        id: analysis.applicationId?._id,
        status: analysis.processingStatus,
        createdAt: analysis.createdAt,
        updatedAt: analysis.updatedAt
      },
      candidate: {
        id: analysis.candidateId?._id,
        name: analysis.candidateId?.name,
        email: analysis.candidateId?.email
      },
      job: {
        id: analysis.jobId?._id,
        title: analysis.jobId?.title
      },
      // Agent 1: JD Extraction
      jdExtraction: analysis.jdExtraction,
      // Agent 2: Resume Analysis
      resumeAnalysis: analysis.resumeTechnicalAnalysis,
      // Agent 3: Matching & Scoring
      matchingScore: analysis.matchingScore,
      // Agent 4: Supervisor Verdict
      finalVerdict: analysis.supervisorVerdict,
      // Metadata
      aiModels: analysis.aiModelMetadata,
      performance: analysis.performanceMetrics,
      // Resume file info
      resumeFile: analysis.resumeFileInfo
    };
    
    return sendSuccess(res, { success: true, data: detailedData, message: 'Detailed analysis retrieved successfully' });
    
  } catch (error) {
    console.error('Get detailed analysis error:', error);
    return sendError(res, error.message || 'Failed to retrieve detailed analysis', 500);
  }
}

/**
 * Batch analyze multiple applications for a job
 * POST /api/resume-ranking/batch-analyze/:jobId
 */
async function batchAnalyze(req, res) {
  try {
    const { jobId } = req.params;
    let { applicationIds } = req.body || {};
    
    console.log('\n\n');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('🚀 BATCH ANALYSIS STARTED');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log(`📋 Job ID: ${jobId}`);
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    
    const JobApplication = require('../models/JobApplication');
    
    // If no applicationIds provided, fetch all applications for this job
    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      console.log('[Batch Analyze] No application IDs provided, fetching all applications for job...');
      const applications = await JobApplication.find({ jobId }).select('_id resumePath');
      applicationIds = applications.map(app => app._id.toString());
      
      console.log(`[Batch Analyze] ✓ Found ${applicationIds.length} applications for this job`);
      
      if (applicationIds.length === 0) {
        console.log('[Batch Analyze] ❌ No applications found for this job');
        return sendError(res, 'No applications found for this job', 404);
      }
    } else {
      console.log(`[Batch Analyze] Processing ${applicationIds.length} specific application IDs`);
    }
    
    const results = [];
    const errors = [];
    
    // Process each application
    console.log(`\n[Batch Analyze] Starting to process ${applicationIds.length} applications...\n`);
    
    for (let i = 0; i < applicationIds.length; i++) {
      const applicationId = applicationIds[i];
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📄 Processing Application ${i + 1}/${applicationIds.length}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Application ID: ${applicationId}`);
      
      try {
        // Get application with resume file path
        console.log('[Batch Analyze] Fetching application details...');
        const application = await JobApplication.findById(applicationId);
        
        if (!application) {
          console.log(`[Batch Analyze] ❌ Application not found: ${applicationId}`);
          errors.push({
            applicationId,
            error: 'Application not found'
          });
          continue;
        }
        
        console.log(`[Batch Analyze] ✓ Application found`);
        
        // Get resume path from nested resume object
        const resumePath = application.resume?.filePath;
        const resumeFileName = application.resume?.filename || application.resume?.originalName;
        
        console.log(`[Batch Analyze] Resume File Name: ${resumeFileName || 'NOT SET'}`);
        console.log(`[Batch Analyze] Resume Path (stored): ${resumePath || 'NOT SET'}`);
        
        if (!resumePath) {
          console.log(`[Batch Analyze] ❌ No resume path found for application: ${applicationId}`);
          errors.push({
            applicationId,
            error: 'Resume path not found - candidate may not have uploaded a resume'
          });
          continue;
        }
        
        // Convert URL path to absolute filesystem path
        const path = require('path');
        let absoluteResumePath = resumePath;
        
        // If it's a relative URL path (starts with /), convert to absolute filesystem path
        if (resumePath.startsWith('/')) {
          absoluteResumePath = path.join(__dirname, '..', resumePath);
        }
        
        console.log(`[Batch Analyze] Absolute File Path: ${absoluteResumePath}`);
        
        // Determine MIME type from file extension
        const ext = path.extname(absoluteResumePath).toLowerCase();
        let mimeType = 'application/pdf';
        if (ext === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else if (ext === '.doc') mimeType = 'application/msword';
        else if (ext === '.txt') mimeType = 'text/plain';
        
        console.log(`[Batch Analyze] MIME Type: ${mimeType}`);
        
        // Analyze resume
        console.log(`[Batch Analyze] 🔄 Starting AI analysis...`);
        const result = await resumeRankingService.analyzeResumeForApplication(
          applicationId,
          absoluteResumePath,
          mimeType
        );
        
        console.log(`[Batch Analyze] ✅ Analysis completed successfully`);
        console.log(`[Batch Analyze] Score: ${result.score}/100`);
        console.log(`[Batch Analyze] Verdict: ${result.verdict}`);
        
        results.push(result);
        
      } catch (error) {
        errors.push({
          applicationId,
          error: error.message
        });
      }
    }
    
    return sendSuccess(res, {
      success: true,
      data: {
        successful: results.length,
        failed: errors.length,
        results,
        errors
      },
      message: 'Batch analysis completed'
    });
    
  } catch (error) {
    console.error('Batch analysis error:', error);
    return sendError(res, error.message || 'Batch analysis failed', 500);
  }
}

/**
 * Get analysis status
 * GET /api/resume-ranking/status/:applicationId
 */
async function getAnalysisStatus(req, res) {
  try {
    const { applicationId } = req.params;
    
    const ResumeAnalysis = require('../models/ResumeAnalysis');
    
    const analysis = await ResumeAnalysis.findOne({ applicationId })
      .select('processingStatus processingError performanceMetrics createdAt updatedAt');
    
    if (!analysis) {
      return sendError(res, 'No analysis found for this application', 404);
    }
    
    const statusData = {
      status: analysis.processingStatus,
      error: analysis.processingError,
      processingTime: analysis.performanceMetrics?.totalProcessingTime,
      createdAt: analysis.createdAt,
      updatedAt: analysis.updatedAt
    };
    
    return sendSuccess(res, { success: true, data: statusData, message: 'Analysis status retrieved successfully' });
    
  } catch (error) {
    console.error('Get analysis status error:', error);
    return sendError(res, error.message || 'Failed to retrieve analysis status', 500);
  }
}

module.exports = {
  analyzeResume,
  getAnalysisResults,
  getTopCandidates,
  getJobStatistics,
  reanalyzeResume,
  getDetailedAnalysis,
  batchAnalyze,
  getAnalysisStatus
};

