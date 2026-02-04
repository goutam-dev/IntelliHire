/**
 * Resume Ranking Service - Main Orchestrator
 * 
 * This service coordinates the Multi-Agent LLM Council System for resume ranking.
 * 
 * Architecture:
 * 1. Agent 1: JD Information Extractor
 * 2. Agent 2: Resume Technical Analyzer
 * 3. Agent 3: Semantic Matching & Scoring
 * 4. Agent 4: Supervisor & Quality Controller
 * 
 * Flow:
 * Resume Upload → Parse → Agent 1 & 2 (parallel) → Agent 3 → Agent 4 → Save Results
 * 
 * FEATURE TOGGLE: USE_HYBRID_RANKING (default: true)
 * - When true: Uses fast, deterministic hybrid ranking (semantic + rule-based + keywords)
 * - When false: Uses original LLM Council approach (4 agents + supervisor)
 * 
 * Part of FYP: Intelligent Recruitment and Interview Automation System
 */

const ResumeAnalysis = require('../models/ResumeAnalysis');
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const { parseResume, validateResumeFile, extractResumeSections } = require('../utils/resumeParser');

// Import Hybrid Ranking Module
const { executeHybridRanking } = require('./ai-agents/hybrid-ranking');

// Import all AI agents (LLM Council - kept for backward compatibility)
const { extractJDInformation } = require('./ai-agents/agent1-jd-extractor');
const { analyzeResumeTechnical } = require('./ai-agents/agent2-resume-analyzer');
const { performSemanticMatching } = require('./ai-agents/agent3-semantic-matcher');
const { superviseFinalVerdict } = require('./ai-agents/agent4-supervisor');

/**
 * Main function to analyze a resume for a job application
 * @param {String} applicationId - Application ID
 * @param {String} resumeFilePath - Path to resume file
 * @param {String} mimeType - MIME type of resume file
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - Analysis results
 */
async function analyzeResumeForApplication(applicationId, resumeFilePath, mimeType, options = {}) {
  const startTime = Date.now();
  let analysis = null;
  
  try {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  RESUME ANALYSIS ORCHESTRATOR STARTED                          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log(`[Resume Ranking] Application ID: ${applicationId}`);
    console.log(`[Resume Ranking] Resume File Path: ${resumeFilePath}`);
    console.log(`[Resume Ranking] MIME Type: ${mimeType}`);
    console.log('');
    
    // 1. Fetch application and related data
    console.log('[Resume Ranking] Step 1: Fetching application and related data...');
    const application = await JobApplication.findById(applicationId)
      .populate('jobId')
      .populate('candidateId');
    
    if (!application) {
      throw new Error('Application not found');
    }
    
    if (!application.jobId) {
      throw new Error('Job not found for this application');
    }
    
    console.log('[Resume Ranking] ✓ Application and related data fetched');
    console.log(`[Resume Ranking]   - Job Title: ${application.jobId.title}`);
    console.log(`[Resume Ranking]   - Candidate: ${application.candidateId.fullName}`);
    console.log('');
    
    // 2. Validate resume file
    console.log('[Resume Ranking] Step 2: Validating resume file...');
    const validation = await validateResumeFile(resumeFilePath);
    if (!validation.valid) {
      console.log(`[Resume Ranking] ❌ Validation failed: ${validation.error}`);
      throw new Error(`Resume validation failed: ${validation.error}`);
    }
    console.log('[Resume Ranking] ✓ Resume file validated');
    console.log('');
    
    // 3. Parse resume to extract text
    console.log('[Resume Ranking] Step 3: Parsing resume to extract text...');
    const resumeText = await parseResume(resumeFilePath, mimeType);
    const resumeSections = extractResumeSections(resumeText);
    console.log(`[Resume Ranking] ✓ Resume parsed successfully (${resumeText.length} characters)`);
    console.log('');
    
    // 4. Prepare Job Description text
    console.log('[Resume Ranking] Step 4: Preparing Job Description text...');
    const jobDescriptionText = buildJobDescriptionText(application.jobId);
    console.log(`[Resume Ranking] ✓ Job Description prepared (${jobDescriptionText.length} characters)`);
    console.log('');
    
    // 5. Create or update analysis record
    analysis = await ResumeAnalysis.findOne({ applicationId });
    if (!analysis) {
      analysis = new ResumeAnalysis({
        applicationId,
        jobId: application.jobId._id,
        candidateId: application.candidateId._id,
        processingStatus: 'processing'
      });
    } else {
      analysis.processingStatus = 'processing';
    }
    
    // Store basic information
    analysis.resumeText = resumeText;
    analysis.jobDescriptionText = jobDescriptionText;
    analysis.resumeFileInfo = {
      originalName: options.originalName || 'resume',
      filePath: resumeFilePath,
      fileSize: options.fileSize || 0,
      mimeType: mimeType,
      uploadedAt: new Date()
    };
    
    await analysis.save();
    console.log('[Resume Ranking] ✓ Analysis record created/updated in database');
    console.log('');
    
    // 6. Execute Ranking Pipeline (Hybrid or LLM Council based on feature toggle)
    console.log('[Resume Ranking] Step 6: Executing Ranking Pipeline...');
    
    // Check feature toggle: USE_HYBRID_RANKING (default: true)
    const useHybridRanking = process.env.USE_HYBRID_RANKING !== 'false';
    
    let agentResults;
    if (useHybridRanking) {
      console.log('[Resume Ranking] 🚀 Using HYBRID RANKING approach (fast & deterministic)');
      console.log('');
      agentResults = await executeHybridRanking(
        jobDescriptionText,
        resumeText,
        resumeSections,
        options
      );
    } else {
      console.log('[Resume Ranking] 🤖 Using LLM COUNCIL approach (4 AI Directors)');
      console.log('[Resume Ranking] This will invoke all 4 AI Directors in sequence');
      console.log('');
      agentResults = await executeMultiAgentPipeline(
        jobDescriptionText,
        resumeText,
        resumeSections,
        options
      );
    }
    
    // 7. Update analysis with all agent results
    analysis.jdExtraction = agentResults.agent1.data;
    analysis.resumeTechnicalAnalysis = agentResults.agent2.data;
    analysis.matchingScore = agentResults.agent3.data;
    analysis.supervisorVerdict = agentResults.agent4.data;
    
    // 8. Set AI model metadata
    analysis.aiModelMetadata = {
      jdExtractorModel: agentResults.agent1.metadata?.model || 'rule-based',
      resumeAnalyzerModel: agentResults.agent2.metadata?.model || 'rule-based',
      matchingModel: agentResults.agent3.metadata?.model || 'rule-based',
      supervisorModel: agentResults.agent4.metadata?.model || 'rule-based',
      apiProvider: useHybridRanking ? 'hybrid-ranking' : (options.apiProvider || process.env.AI_API_PROVIDER || 'rule-based'),
      rankingMethod: useHybridRanking ? 'hybrid' : 'llm-council'
    };
    
    // 9. Set performance metrics
    analysis.performanceMetrics = {
      totalProcessingTime: Date.now() - startTime,
      agent1Time: agentResults.agent1.metadata?.processingTime || 0,
      agent2Time: agentResults.agent2.metadata?.processingTime || 0,
      agent3Time: agentResults.agent3.metadata?.processingTime || 0,
      agent4Time: agentResults.agent4.metadata?.processingTime || 0
    };
    
    // 10. Mark as completed
    analysis.processingStatus = 'completed';
    await analysis.save();
    
    console.log(`[Resume Ranking] Analysis completed for application: ${applicationId}, Score: ${analysis.supervisorVerdict.final_resume_score}`);
    
    return {
      success: true,
      analysisId: analysis._id,
      applicationId: analysis.applicationId,
      score: analysis.supervisorVerdict.final_resume_score,
      verdict: analysis.supervisorVerdict.verdict,
      processingTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('[Resume Ranking] Error:', error);
    
    // Update analysis record with error
    if (analysis) {
      analysis.processingStatus = 'failed';
      analysis.processingError = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date()
      };
      await analysis.save();
    }
    
    throw error;
  }
}

/**
 * Execute the Multi-Agent Pipeline
 * @param {String} jobDescriptionText - JD text
 * @param {String} resumeText - Resume text
 * @param {Object} resumeSections - Parsed resume sections
 * @param {Object} options - Options
 * @returns {Promise<Object>} - All agent results
 */
async function executeMultiAgentPipeline(jobDescriptionText, resumeText, resumeSections, options = {}) {
  console.log('[Multi-Agent Pipeline] Starting...');
  
  // Check if deterministic scoring is forced
  const forceDeterministic = process.env.FORCE_DETERMINISTIC_SCORING === 'true';
  if (forceDeterministic) {
    console.log('[Multi-Agent Pipeline] ⚠️  DETERMINISTIC MODE: Using rule-based scoring for 100% consistency');
    options.useLLM = false; // Force rule-based for Agent 3
  }
  
  // Execute Agent 1 and Agent 2 in parallel (they are independent)
  console.log('[Multi-Agent Pipeline] Executing Agent 1 & 2 in parallel...');
  const [agent1Result, agent2Result] = await Promise.all([
    extractJDInformation(jobDescriptionText, options),
    analyzeResumeTechnical(resumeText, resumeSections, options)
  ]);
  
  console.log('[Multi-Agent Pipeline] Agent 1 & 2 completed');
  console.log(`  - Agent 1 (JD Extractor): ${agent1Result.success ? 'Success' : 'Failed'}`);
  console.log(`  - Agent 2 (Resume Analyzer): ${agent2Result.success ? 'Success' : 'Failed'}`);
  
  // Execute Agent 3 (requires outputs from Agent 1 and 2)
  console.log('[Multi-Agent Pipeline] Executing Agent 3...');
  const agent3Result = await performSemanticMatching(
    agent1Result.data,
    agent2Result.data,
    options
  );
  
  console.log(`[Multi-Agent Pipeline] Agent 3 completed: ${agent3Result.success ? 'Success' : 'Failed'}`);
  console.log(`  - Overall Score: ${agent3Result.data.overall_score}/100`);
  
  // Execute Agent 4 (requires outputs from all previous agents)
  console.log('[Multi-Agent Pipeline] Executing Agent 4 (Supervisor)...');
  const agent4Result = await superviseFinalVerdict(
    agent1Result.data,
    agent2Result.data,
    agent3Result.data,
    options
  );
  
  console.log(`[Multi-Agent Pipeline] Agent 4 completed: ${agent4Result.success ? 'Success' : 'Failed'}`);
  console.log(`  - Final Score: ${agent4Result.data.final_resume_score}/100`);
  console.log(`  - Verdict: ${agent4Result.data.verdict}`);
  console.log(`  - Confidence: ${agent4Result.data.confidence_level}`);
  
  console.log('[Multi-Agent Pipeline] Pipeline completed successfully');
  
  return {
    agent1: agent1Result,
    agent2: agent2Result,
    agent3: agent3Result,
    agent4: agent4Result
  };
}

/**
 * Build job description text from Job object
 * @param {Object} job - Job object
 * @returns {String} - Formatted JD text
 */
function buildJobDescriptionText(job) {
  let jdText = `Job Title: ${job.title}\n\n`;
  
  if (job.department) {
    jdText += `Department: ${job.department}\n\n`;
  }
  
  jdText += `Description:\n${job.description}\n\n`;
  
  if (job.requiredSkills && job.requiredSkills.length > 0) {
    jdText += `Required Skills:\n${job.requiredSkills.join(', ')}\n\n`;
  }
  
  if (job.experienceLevel) {
    jdText += `Experience Level: ${job.experienceLevel}\n\n`;
  }
  
  if (job.educationRequirements) {
    jdText += `Education Requirements:\n${job.educationRequirements}\n\n`;
  }
  
  if (job.location) {
    jdText += `Location: ${job.location}\n\n`;
  }
  
  if (job.employmentType) {
    jdText += `Employment Type: ${job.employmentType}\n\n`;
  }
  
  if (job.salaryRange) {
    jdText += `Salary Range: ${job.salaryRange.min} - ${job.salaryRange.max} ${job.salaryRange.currency}\n\n`;
  }
  
  return jdText;
}

/**
 * Get analysis results for an application
 * @param {String} applicationId - Application ID
 * @returns {Promise<Object>} - Analysis results
 */
async function getAnalysisResults(applicationId) {
  const analysis = await ResumeAnalysis.findOne({ applicationId })
    .populate('applicationId')
    .populate('jobId')
    .populate('candidateId');
  
  if (!analysis) {
    return null;
  }
  
  return {
    id: analysis._id,
    applicationId: analysis.applicationId,
    status: analysis.processingStatus,
    score: analysis.supervisorVerdict?.final_resume_score,
    verdict: analysis.supervisorVerdict?.verdict,
    strengths: analysis.supervisorVerdict?.strengths,
    weaknesses: analysis.supervisorVerdict?.weaknesses,
    confidenceLevel: analysis.supervisorVerdict?.confidence_level,
    explanation: analysis.supervisorVerdict?.explanation,
    matchedSkills: analysis.matchingScore?.matched_skills,
    missingSkills: analysis.matchingScore?.missing_skills,
    skillMatchScore: analysis.matchingScore?.skill_match_score,
    experienceMatchScore: analysis.matchingScore?.experience_match_score,
    projectRelevanceScore: analysis.matchingScore?.project_relevance_score,
    educationScore: analysis.matchingScore?.education_score,
    processingTime: analysis.performanceMetrics?.totalProcessingTime,
    createdAt: analysis.createdAt,
    updatedAt: analysis.updatedAt
  };
}

/**
 * Get top ranked candidates for a job
 * @param {String} jobId - Job ID
 * @param {Number} limit - Number of candidates to return
 * @returns {Promise<Array>} - Top candidates
 */
async function getTopCandidatesForJob(jobId, limit = 10) {
  const analyses = await ResumeAnalysis.find({
    jobId,
    processingStatus: 'completed'
  })
    .sort({ 'supervisorVerdict.final_resume_score': -1 })
    .limit(limit)
    .populate({
      path: 'applicationId',
      populate: [
        {
          path: 'candidateId',
          select: 'fullName email phoneNumber'
        },
        {
          path: 'jobId',
          select: 'title'
        }
      ]
    })
    .lean();
  
  return analyses.map(analysis => ({
    _id: analysis._id,
    application: analysis.applicationId,
    candidate: analysis.applicationId?.candidateId ? {
      user: {
        fullName: analysis.applicationId.candidateId.fullName,
        email: analysis.applicationId.candidateId.email,
        phoneNumber: analysis.applicationId.candidateId.phoneNumber
      },
      ...analysis.applicationId.applicationProfile
    } : null,
    supervisorVerdict: analysis.supervisorVerdict,
    matchingScore: analysis.matchingScore,
    jdExtraction: analysis.jdExtraction,
    resumeTechnicalAnalysis: analysis.resumeTechnicalAnalysis,
    score: analysis.supervisorVerdict?.final_resume_score,
    verdict: analysis.supervisorVerdict?.verdict,
    strengths: analysis.supervisorVerdict?.strengths,
    weaknesses: analysis.supervisorVerdict?.weaknesses,
    confidenceLevel: analysis.supervisorVerdict?.confidence_level,
    appliedAt: analysis.createdAt
  }));
}

/**
 * Get statistics for a job's applications
 * @param {String} jobId - Job ID
 * @returns {Promise<Object>} - Statistics
 */
async function getJobStatistics(jobId) {
  const mongoose = require('mongoose');
  
  // Get total applications count
  const JobApplication = require('../models/JobApplication');
  const totalApplications = await JobApplication.countDocuments({ jobId });
  
  const stats = await ResumeAnalysis.aggregate([
    {
      $match: {
        jobId: new mongoose.Types.ObjectId(jobId),
        processingStatus: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        totalAnalyzed: { $sum: 1 },
        averageScore: { $avg: '$supervisorVerdict.final_resume_score' },
        maxScore: { $max: '$supervisorVerdict.final_resume_score' },
        minScore: { $min: '$supervisorVerdict.final_resume_score' },
        excellentCount: {
          $sum: {
            $cond: [{ $eq: ['$supervisorVerdict.verdict', 'Excellent'] }, 1, 0]
          }
        },
        goodCount: {
          $sum: {
            $cond: [{ $eq: ['$supervisorVerdict.verdict', 'Good'] }, 1, 0]
          }
        },
        averageCount: {
          $sum: {
            $cond: [{ $eq: ['$supervisorVerdict.verdict', 'Average'] }, 1, 0]
          }
        },
        poorCount: {
          $sum: {
            $cond: [{ $eq: ['$supervisorVerdict.verdict', 'Poor'] }, 1, 0]
          }
        },
        highConfidenceCount: {
          $sum: {
            $cond: [{ $eq: ['$supervisorVerdict.confidence_level', 'High'] }, 1, 0]
          }
        }
      }
    }
  ]);
  
  const result = stats[0] || {
    totalAnalyzed: 0,
    averageScore: 0,
    maxScore: 0,
    minScore: 0,
    excellentCount: 0,
    goodCount: 0,
    averageCount: 0,
    poorCount: 0,
    highConfidenceCount: 0
  };
  
  return {
    totalApplications,
    analyzedCount: result.totalAnalyzed,
    averageScore: result.averageScore || 0,
    topScore: result.maxScore || 0,
    lowScore: result.minScore || 0,
    excellentCount: result.excellentCount,
    goodCount: result.goodCount,
    averageCount: result.averageCount,
    poorCount: result.poorCount,
    highConfidenceCount: result.highConfidenceCount
  };
}

/**
 * Re-analyze a resume (useful for debugging or updates)
 * @param {String} applicationId - Application ID
 * @param {Object} options - Options
 * @returns {Promise<Object>} - Analysis results
 */
async function reanalyzeResume(applicationId, options = {}) {
  console.log(`[Resume Ranking] Re-analyzing application: ${applicationId}`);
  
  // Get existing analysis
  const existingAnalysis = await ResumeAnalysis.findOne({ applicationId });
  
  if (!existingAnalysis || !existingAnalysis.resumeFileInfo) {
    throw new Error('No existing analysis found or resume file info missing');
  }
  
  // Re-run analysis using existing resume file
  return await analyzeResumeForApplication(
    applicationId,
    existingAnalysis.resumeFileInfo.filePath,
    existingAnalysis.resumeFileInfo.mimeType,
    {
      ...options,
      originalName: existingAnalysis.resumeFileInfo.originalName,
      fileSize: existingAnalysis.resumeFileInfo.fileSize
    }
  );
}

module.exports = {
  analyzeResumeForApplication,
  executeMultiAgentPipeline,
  getAnalysisResults,
  getTopCandidatesForJob,
  getJobStatistics,
  reanalyzeResume
};
