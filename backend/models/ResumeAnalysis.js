/**
 * Resume Analysis Model
 * Stores the complete AI analysis output for each job application
 * Part of the Multi-Agent LLM Council System
 */

const mongoose = require('mongoose');

// Schema for storing JD extraction results (Agent 1 output)
const jdExtractionSchema = new mongoose.Schema({
  job_title: String,
  required_skills: [String],
  preferred_skills: [String],
  minimum_experience_years: String,
  education_requirements: String,
  job_responsibilities: [String],
  keywords: [String],
  extracted_at: { type: Date, default: Date.now }
}, { _id: false });

// Schema for storing Resume technical analysis (Agent 2 output)
const resumeAnalysisSchema = new mongoose.Schema({
  skills: [String],
  years_of_experience: String,
  projects: [String],
  education: String,
  certifications: [String],
  tools_and_technologies: [String],
  analyzed_at: { type: Date, default: Date.now }
}, { _id: false });

// Schema for storing Matching & Scoring results (Agent 3 output)
const matchingScoreSchema = new mongoose.Schema({
  skill_match_score: { type: Number, min: 0, max: 40 },
  experience_match_score: { type: Number, min: 0, max: 25 },
  project_relevance_score: { type: Number, min: 0, max: 20 },
  education_score: { type: Number, min: 0, max: 15 },
  overall_score: { type: Number, min: 0, max: 100 },
  matched_skills: [String],
  missing_skills: [String],
  reasoning: String,
  computed_at: { type: Date, default: Date.now }
}, { _id: false });

// Schema for storing Supervisor's final verdict (Agent 4 output)
const supervisorVerdictSchema = new mongoose.Schema({
  final_resume_score: { type: Number, min: 0, max: 100 },
  verdict: { 
    type: String, 
    enum: ['Excellent', 'Good', 'Average', 'Poor'],
    required: true 
  },
  strengths: [String],
  weaknesses: [String],
  confidence_level: { 
    type: String, 
    enum: ['High', 'Medium', 'Low'],
    required: true 
  },
  explanation: String,
  reviewed_at: { type: Date, default: Date.now }
}, { _id: false });

// Main Resume Analysis Schema
const resumeAnalysisMainSchema = new mongoose.Schema({
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobApplication',
    required: true,
    unique: true // One analysis per application
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // File information
  resumeFileInfo: {
    originalName: String,
    filePath: String,
    fileSize: Number,
    mimeType: String,
    uploadedAt: Date
  },
  
  // Extracted text from resume
  resumeText: {
    type: String,
    required: true
  },
  
  // Job Description text
  jobDescriptionText: {
    type: String,
    required: true
  },
  
  // Agent 1: JD Extraction Results
  jdExtraction: jdExtractionSchema,
  
  // Agent 2: Resume Technical Analysis Results
  resumeTechnicalAnalysis: resumeAnalysisSchema,
  
  // Agent 3: Matching & Scoring Results
  matchingScore: matchingScoreSchema,
  
  // Agent 4: Supervisor's Final Verdict
  supervisorVerdict: supervisorVerdictSchema,
  
  // Processing metadata
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  
  processingError: {
    message: String,
    stack: String,
    timestamp: Date
  },
  
  // AI Model metadata
  aiModelMetadata: {
    jdExtractorModel: String,
    resumeAnalyzerModel: String,
    matchingModel: String,
    supervisorModel: String,
    apiProvider: String // 'huggingface', 'openai', 'local', etc.
  },
  
  // Performance metrics
  performanceMetrics: {
    totalProcessingTime: Number, // in milliseconds
    agent1Time: Number,
    agent2Time: Number,
    agent3Time: Number,
    agent4Time: Number
  }
  
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Indexes for efficient querying
resumeAnalysisMainSchema.index({ applicationId: 1 });
resumeAnalysisMainSchema.index({ jobId: 1 });
resumeAnalysisMainSchema.index({ candidateId: 1 });
resumeAnalysisMainSchema.index({ 'supervisorVerdict.final_resume_score': -1 }); // For ranking
resumeAnalysisMainSchema.index({ processingStatus: 1 });
resumeAnalysisMainSchema.index({ createdAt: -1 });

// Compound index for employer queries
resumeAnalysisMainSchema.index({ 
  jobId: 1, 
  'supervisorVerdict.final_resume_score': -1 
});

// Virtual for getting score category
resumeAnalysisMainSchema.virtual('scoreCategory').get(function() {
  const score = this.supervisorVerdict?.final_resume_score || 0;
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Average';
  return 'Poor';
});

// Instance method to check if analysis is complete
resumeAnalysisMainSchema.methods.isAnalysisComplete = function() {
  return this.processingStatus === 'completed' && 
         this.supervisorVerdict && 
         this.supervisorVerdict.final_resume_score !== undefined;
};

// Static method to get top candidates for a job
resumeAnalysisMainSchema.statics.getTopCandidates = function(jobId, limit = 10) {
  return this.find({ 
    jobId, 
    processingStatus: 'completed' 
  })
  .sort({ 'supervisorVerdict.final_resume_score': -1 })
  .limit(limit)
  .populate('candidateId', 'name email')
  .populate('applicationId');
};

// Static method to get analysis statistics for a job
resumeAnalysisMainSchema.statics.getJobStatistics = async function(jobId) {
  const stats = await this.aggregate([
    { $match: { jobId: mongoose.Types.ObjectId(jobId), processingStatus: 'completed' } },
    {
      $group: {
        _id: null,
        totalApplications: { $sum: 1 },
        averageScore: { $avg: '$supervisorVerdict.final_resume_score' },
        maxScore: { $max: '$supervisorVerdict.final_resume_score' },
        minScore: { $min: '$supervisorVerdict.final_resume_score' },
        excellentCount: {
          $sum: { $cond: [{ $gte: ['$supervisorVerdict.final_resume_score', 80] }, 1, 0] }
        },
        goodCount: {
          $sum: { $cond: [
            { $and: [
              { $gte: ['$supervisorVerdict.final_resume_score', 60] },
              { $lt: ['$supervisorVerdict.final_resume_score', 80] }
            ]}, 1, 0
          ]}
        },
        averageCount: {
          $sum: { $cond: [
            { $and: [
              { $gte: ['$supervisorVerdict.final_resume_score', 40] },
              { $lt: ['$supervisorVerdict.final_resume_score', 60] }
            ]}, 1, 0
          ]}
        },
        poorCount: {
          $sum: { $cond: [{ $lt: ['$supervisorVerdict.final_resume_score', 40] }, 1, 0] }
        }
      }
    }
  ]);
  
  return stats[0] || null;
};

module.exports = mongoose.model('ResumeAnalysis', resumeAnalysisMainSchema);
