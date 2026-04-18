import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Trophy, 
  Star, 
  TrendingUp, 
  Mail, 
  Phone, 
  FileDown,
  Sparkles,
  Brain,
  Award,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { getTopCandidates, getJobStatistics } from '../../services/api/resumeRankingApi';

const verdictStyles = {
  'Excellent': {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    icon: Trophy,
    badge: 'bg-emerald-100 text-emerald-700'
  },
  'Good': {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: Star,
    badge: 'bg-blue-100 text-blue-700'
  },
  'Average': {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    icon: TrendingUp,
    badge: 'bg-amber-100 text-amber-700'
  },
  'Poor': {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-700',
    icon: AlertCircle,
    badge: 'bg-slate-100 text-slate-700'
  }
};

const TopCandidatesDashboard = ({ isOpen, onClose, jobId, jobTitle }) => {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && jobId) {
      loadData();
    }
  }, [isOpen, jobId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [candidatesData, statsData] = await Promise.all([
        getTopCandidates(jobId, 20),
        getJobStatistics(jobId)
      ]);
      
      // Handle response structure
      const candidatesList = candidatesData?.data || candidatesData || [];
      const stats = statsData?.data || statsData || null;
      
      setCandidates(candidatesList);
      setStatistics(stats);
    } catch (err) {
      console.error('Error loading top candidates:', err);
      setError('Failed to load candidate rankings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-slate-600';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-emerald-100';
    if (score >= 60) return 'bg-blue-100';
    if (score >= 40) return 'bg-amber-100';
    return 'bg-slate-100';
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">AI-Ranked Candidates</h2>
                    <p className="text-sm text-slate-500">{jobTitle}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Statistics */}
            {statistics && (
              <div className="mt-4 grid grid-cols-4 gap-4">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Total Applications
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {statistics.totalApplications}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                    Analyzed
                  </p>
                  <p className="mt-1 text-2xl font-bold text-emerald-700">
                    {statistics.analyzedCount}
                  </p>
                </div>
                <div className="rounded-xl bg-blue-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                    Avg Score
                  </p>
                  <p className="mt-1 text-2xl font-bold text-blue-700">
                    {statistics.averageScore?.toFixed(0) || 0}
                  </p>
                </div>
                <div className="rounded-xl bg-violet-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-violet-600">
                    Top Match
                  </p>
                  <p className="mt-1 text-2xl font-bold text-violet-700">
                    {statistics.topScore?.toFixed(0) || 0}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 220px)' }}>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                <p className="mt-4 text-sm text-slate-500">Analyzing candidates with AI...</p>
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
                <p className="mt-2 text-sm text-red-700">{error}</p>
              </div>
            ) : candidates.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center">
                <Sparkles className="mx-auto h-12 w-12 text-slate-400" />
                <p className="mt-4 text-base font-semibold text-slate-900">No Analyzed Candidates</p>
                <p className="mt-2 text-sm text-slate-500">
                  Applications will be analyzed automatically when resumes are submitted.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {candidates.map((candidate, index) => {
                  const verdict = candidate.supervisorVerdict?.verdict || 'Average';
                  const style = verdictStyles[verdict] || verdictStyles['Average'];
                  const VerdictIcon = style.icon;
                  const score = candidate.supervisorVerdict?.final_resume_score || 0;
                  
                  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
                  const resumePath = candidate.application?.resume?.filePath || candidate.candidate?.resume?.filePath || candidate.application?.candidate?.resume?.filePath;
                  const resumeUrl = resumePath ? (resumePath.startsWith('http') ? resumePath : `${API_BASE_URL}${resumePath}`) : '#';

                  return (
                    <motion.div
                      key={candidate._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`rounded-2xl border ${style.border} ${style.bg} p-5`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: Rank & Info */}
                        <div className="flex flex-1 gap-4">
                          {/* Rank Badge */}
                          <div className="flex flex-col items-center">
                            {index < 3 ? (
                              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                                index === 0 ? 'bg-amber-100' : index === 1 ? 'bg-slate-200' : 'bg-orange-100'
                              }`}>
                                <Trophy className={`h-6 w-6 ${
                                  index === 0 ? 'text-amber-600' : index === 1 ? 'text-slate-600' : 'text-orange-600'
                                }`} />
                              </div>
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                                <span className="text-lg font-bold">#{index + 1}</span>
                              </div>
                            )}
                          </div>

                          {/* Candidate Info */}
                          <div className="flex-1">
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <h3 className="text-base font-semibold text-slate-900">
                                  {candidate.candidate?.user?.fullName || candidate.application?.personalInfo?.name || 'Unknown Candidate'}
                                </h3>
                                <p className="text-sm text-slate-600">
                                  {candidate.candidate?.professionalTitle || candidate.application?.candidate?.professionalTitle || 'Professional'}
                                </p>
                              </div>
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${style.badge}`}>
                                <VerdictIcon className="mr-1 inline h-3 w-3" />
                                {verdict}
                              </span>
                            </div>

                            {/* Contact & Resume */}
                            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                              <a 
                                href={`mailto:${candidate.candidate?.user?.email || candidate.application?.personalInfo?.email}`}
                                className="inline-flex items-center gap-1 hover:text-slate-900"
                              >
                                <Mail className="h-4 w-4" />
                                {candidate.candidate?.user?.email || candidate.application?.personalInfo?.email || 'N/A'}
                              </a>
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-4 w-4" />
                                {candidate.candidate?.user?.phoneNumber || candidate.application?.personalInfo?.phone || 'N/A'}
                              </span>
                              <a 
                                href={resumeUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 hover:text-slate-900"
                              >
                                <FileDown className="h-4 w-4" />
                                Resume
                              </a>
                            </div>

                            {/* AI Insights */}
                            <div className="mt-3 space-y-2">
                              {/* Strengths */}
                              {candidate.supervisorVerdict?.strengths?.slice(0, 2).map((strength, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs">
                                  <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
                                  <span className="text-slate-700">{strength}</span>
                                </div>
                              ))}
                              {/* Weaknesses */}
                              {candidate.supervisorVerdict?.weaknesses?.slice(0, 1).map((weakness, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs">
                                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-600" />
                                  <span className="text-slate-700">{weakness}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Right: Score */}
                        <div className="flex flex-col items-center">
                          <div className={`flex h-20 w-20 items-center justify-center rounded-2xl ${getScoreBg(score)}`}>
                            <div className="text-center">
                              <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
                                {score}
                              </div>
                              <div className={`text-xs font-medium ${getScoreColor(score)}`}>
                                / 100
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                            <Award className="h-3 w-3" />
                            AI Score
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TopCandidatesDashboard;
