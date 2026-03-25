import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, CheckCircle, AlertTriangle, Shield, Mic2, Camera, XCircle, X } from 'lucide-react';

const CHEATING_THRESHOLD = 10;

const slideUp = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } }
};

function ScreenshotLightbox({ src, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex justify-center items-center bg-black/90 p-4" onClick={onClose}>
      <div className="relative max-w-5xl w-full h-full flex justify-center items-center">
        <button className="absolute top-4 right-4 bg-slate-800 text-white rounded-full p-2 hover:bg-slate-700" onClick={onClose}>
          <X size={20} />
        </button>
        <img src={src} className="max-w-full max-h-full object-contain rounded shadow-2xl" onClick={e => e.stopPropagation()} alt="Cheating proof" />
      </div>
    </div>
  );
}

function ScreenshotRow({ screenshots }) {
  const [lightboxSrc, setLightboxSrc] = React.useState(null);
  if (!screenshots || screenshots.length === 0) return null;

  return (
    <>
      <tr>
        <td colSpan="3" className="pb-3 pt-1">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
            {screenshots.slice(0, 5).map((src, i) => (
              <button
                key={i}
                onClick={() => setLightboxSrc(src)}
                className="relative flex-shrink-0 border border-slate-200 rounded overflow-hidden group hover:border-slate-300 transition-colors"
                title="Click to expand"
              >
                <img src={src} alt={`Screenshot ${i + 1}`} className="h-20 w-auto object-cover block" />
              </button>
            ))}
          </div>
        </td>
      </tr>
      {lightboxSrc && <ScreenshotLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </>
  );
}

export default function InterviewReportModal({ isOpen, onClose, report, candidateName }) {
  if (!isOpen || !report) return null;

  const scoring = report.scoring || {};
  const turns = report.turns || [];
  const avgScore = scoring.averageScore;
  const scored = turns.filter(t => t.evaluation?.score != null);

  const vp = report.voiceProctoring || {};
  const vpTotal = vp.totalMismatches ?? 0;
  const vpAnalyzed = vp.totalSegmentsAnalyzed ?? 0;
  const vpMatches = vp.matchCount ?? 0;
  const vpEnrolled = vp.enrollmentStatus;
  const vpMismatches = vp.mismatches ?? [];

  const fp = report.faceProctoring || {};
  const fpEnrollment = fp.enrollmentStatus || 'not_enrolled';
  const fpFaceAlerts = fp.faceAlerts || [];
  const fpObjectAlerts = fp.objectAlerts || [];
  const fpTotalFace = fp.totalFaceAlerts ?? fpFaceAlerts.length;
  const fpTotalObject = fp.totalObjectAlerts ?? fpObjectAlerts.length;

  const cheatingReport = report.integrity?.events || [];
  const totalCheatingScore = report.integrity?.totalScore || 0;

  // Emulate screenshot captures from events mapping
  const screenshotCaptures = cheatingReport.reduce((acc, row) => {
    if (row.screenshots && row.screenshots.length > 0) {
      acc[row.eventType] = row.screenshots;
    }
    return acc;
  }, {});

  const scoreColor = avgScore >= 7 ? 'text-emerald-600 bg-emerald-100 border-emerald-200' : 
                     avgScore >= 5 ? 'text-amber-600 bg-amber-100 border-amber-200' : 
                     'text-rose-600 bg-rose-100 border-rose-200';
                     
  const verdict = scoring.overallVerdict || (avgScore >= 7 ? 'Strong Performance' : avgScore >= 5 ? 'Moderate Performance' : 'Needs Improvement');

  const integrityColor = totalCheatingScore === 0 ? 'text-emerald-600' :
    totalCheatingScore < CHEATING_THRESHOLD * 0.4 ? 'text-sky-600' :
      totalCheatingScore < CHEATING_THRESHOLD * 0.7 ? 'text-amber-600' : 'text-rose-600';
      
  const integrityLabel = totalCheatingScore === 0 ? 'Clean' :
    totalCheatingScore < CHEATING_THRESHOLD * 0.4 ? 'Minor Flags' :
      totalCheatingScore >= CHEATING_THRESHOLD ? 'Terminated' : 'Moderate Flags';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Award className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">AI Interview Report</h2>
                <p className="text-sm text-slate-500">{candidateName} • {report.jobTitle} • {new Date(report.completedAt || report.startedAt).toLocaleDateString()}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Performance summary */}
            <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-50 rounded-xl p-6 border border-slate-200">
              <div className={`flex flex-col items-center justify-center h-24 w-24 rounded-full border-4 ${scoreColor.split(' ')[2]} bg-white shadow-sm`}>
                <span className={`text-3xl font-black ${scoreColor.split(' ')[0]}`}>{avgScore ?? '—'}</span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">out of 10</span>
              </div>
              <div>
                <h3 className={`text-xl font-bold ${scoreColor.split(' ')[0]}`}>{verdict}</h3>
                <p className="text-sm text-slate-600 mt-1">{scored.length} questions answered in {Math.round(report.totalDurationSec / 60)} minutes</p>
              </div>
            </div>

            {/* Detailed scores */}
            {(scoring.technicalScore || scoring.communicationScore || scoring.problemSolvingScore) && (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Technical', score: scoring.technicalScore },
                  { label: 'Communication', score: scoring.communicationScore },
                  { label: 'Problem Solving', score: scoring.problemSolvingScore },
                ].filter(s => s.score != null).map(s => (
                  <div key={s.label} className="bg-white rounded-xl p-4 text-center border border-slate-200 shadow-sm">
                    <p className={`text-2xl font-bold ${s.score >= 7 ? 'text-emerald-600' : s.score >= 5 ? 'text-amber-600' : 'text-rose-600'}`}>{s.score}</p>
                    <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Strengths & Weaknesses */}
            {(scoring.strengths?.length > 0 || scoring.weaknesses?.length > 0) && (
              <div className="grid md:grid-cols-2 gap-4">
                {scoring.strengths?.length > 0 && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5">
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-3 flex items-center gap-1.5"><CheckCircle size={14} /> Strengths</p>
                    <ul className="space-y-2">
                      {scoring.strengths.map((s, i) => <li key={i} className="text-sm text-emerald-800 leading-snug">• {s}</li>)}
                    </ul>
                  </div>
                )}
                {scoring.weaknesses?.length > 0 && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-5">
                    <p className="text-xs font-bold text-rose-700 uppercase tracking-widest mb-3 flex items-center gap-1.5"><AlertTriangle size={14} /> Areas to Improve</p>
                    <ul className="space-y-2">
                      {scoring.weaknesses.map((w, i) => <li key={i} className="text-sm text-rose-800 leading-snug">• {w}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Proctoring Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              
              {/* Voice Verification Report */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-widest">
                    <Mic2 size={14} className="text-indigo-500"/> Voice Proctoring
                  </div>
                  <span className={`text-sm font-bold ${vpEnrolled !== 'enrolled' ? 'text-slate-500' :
                    vpTotal === 0 ? 'text-emerald-600' :
                      vpTotal < 3 ? 'text-amber-600' : 'text-rose-600'
                    }`}>
                    {vpEnrolled !== 'enrolled'
                      ? (vpEnrolled === 'failed' ? 'Failed' : 'Not Enrolled')
                      : vpTotal === 0 ? 'Clean'
                        : `${vpTotal} Mismatches`}
                  </span>
                </div>
                <div className="p-5 flex-1 space-y-3 bg-white">
                  {vpEnrolled !== 'enrolled' ? (
                    <p className="text-sm text-slate-500 flex items-center gap-2"><XCircle size={16} className="text-slate-400"/> Voice proctoring inactive.</p>
                  ) : vpTotal === 0 ? (
                    <p className="text-sm text-emerald-600 flex items-center gap-2"><CheckCircle size={16}/> Voice matched perfectly.</p>
                  ) : (
                    <>
                      <div className="flex gap-4 text-xs font-medium text-slate-500">
                        <span>Analyzed: <span className="text-slate-800">{vpAnalyzed}</span></span>
                        <span>Mismatches: <span className="text-rose-600">{vpTotal}</span></span>
                      </div>
                      {vpMismatches.length > 0 && (
                        <div className="space-y-2 mt-2 max-h-32 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                          {vpMismatches.map((m, i) => (
                            <div key={i} className="flex justify-between items-center bg-rose-50 text-rose-800 text-xs px-3 py-2 rounded-lg border border-rose-100">
                              <div className="flex gap-3">
                                <span className="font-mono bg-white px-1.5 py-0.5 rounded text-rose-600">t={typeof m.timestamp === 'number' ? m.timestamp.toFixed(1) : '—'}s</span>
                                <span>score: {typeof m.rawScore === 'number' ? m.rawScore.toFixed(3) : '—'}</span>
                              </div>
                              {m.clipUrl && (
                                <a href={m.clipUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 font-semibold bg-white px-2 py-0.5 rounded shadow-sm">Play Clip</a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Face/Object Verification Report */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-widest">
                    <Camera size={14} className="text-indigo-500" /> Video Proctoring
                  </div>
                  <span className={`text-sm font-bold ${fpEnrollment !== 'enrolled' ? 'text-slate-500' :
                    (fpTotalFace + fpTotalObject) === 0 ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                    {fpEnrollment !== 'enrolled'
                      ? (fpEnrollment === 'failed' ? 'Failed' : 'Not Enrolled')
                      : (fpTotalFace + fpTotalObject) === 0
                        ? 'Clean'
                        : `${fpTotalFace + fpTotalObject} Alerts`}
                  </span>
                </div>
                <div className="p-5 flex-1 space-y-3 bg-white">
                  {fpEnrollment !== 'enrolled' ? (
                     <p className="text-sm text-slate-500 flex items-center gap-2"><XCircle size={16} className="text-slate-400"/> Video proctoring inactive.</p>
                  ) : (fpTotalFace + fpTotalObject) === 0 ? (
                     <p className="text-sm text-emerald-600 flex items-center gap-2"><CheckCircle size={16}/> No visual violations detected.</p>
                  ) : (
                    <>
                      <div className="flex gap-4 text-xs font-medium text-slate-500 border-b border-slate-100 pb-2">
                        <span>Face alerts: <span className="text-amber-600">{fpTotalFace}</span></span>
                        <span>Object alerts: <span className="text-amber-600">{fpTotalObject}</span></span>
                      </div>
                      
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                        {fpFaceAlerts.map((item, i) => (
                           <div key={`face-${i}`} className="flex justify-between items-center bg-amber-50 text-amber-800 text-xs px-3 py-2 rounded-lg border border-amber-100">
                              <span className="font-mono bg-white px-1.5 py-0.5 rounded text-amber-600">t={typeof item.timestamp === 'number' ? item.timestamp.toFixed(1) : '—'}s</span>
                              <span className="capitalize">{item.violationType || item.status || 'Face Alert'}</span>
                              {item.snapshotUrl && (
                                <a href={item.snapshotUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 font-semibold bg-white px-2 py-0.5 rounded shadow-sm">View Proof</a>
                              )}
                           </div>
                        ))}
                        {fpObjectAlerts.map((item, i) => (
                           <div key={`obj-${i}`} className="flex justify-between items-center bg-amber-50 text-amber-800 text-xs px-3 py-2 rounded-lg border border-amber-100">
                              <span className="font-mono bg-white px-1.5 py-0.5 rounded text-amber-600">t={typeof item.timestamp === 'number' ? item.timestamp.toFixed(1) : '—'}s</span>
                              <span>{Array.isArray(item.alertTypes) && item.alertTypes.length > 0 ? item.alertTypes.join(', ') : 'Object Alert'}</span>
                              {item.snapshotUrl && (
                                <a href={item.snapshotUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 font-semibold bg-white px-2 py-0.5 rounded shadow-sm">View Proof</a>
                              )}
                           </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Integrity Report */}
            {cheatingReport.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-widest">
                    <Shield size={14} className="text-indigo-500" /> Platform Integrity Report
                  </div>
                  <span className={`text-sm font-bold ${integrityColor}`}>{integrityLabel} ({totalCheatingScore}/{report.integrity?.threshold || 10})</span>
                </div>
                <div className="p-0">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-5 py-2.5 font-semibold text-slate-600 text-xs tracking-wider">Event / Violation</th>
                        <th className="text-center px-5 py-2.5 font-semibold text-slate-600 text-xs tracking-wider">Count</th>
                        <th className="text-right px-5 py-2.5 font-semibold text-slate-600 text-xs tracking-wider">Penalty Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cheatingReport.map(row => (
                        <React.Fragment key={row.eventType}>
                          <tr className="hover:bg-slate-50/50">
                            <td className="px-5 py-3 flex items-center gap-2 text-slate-700 font-medium">
                              {(screenshotCaptures[row.eventType]?.length > 0) && <Camera size={14} className="text-indigo-500" />}
                              {row.label}
                            </td>
                            <td className="px-5 py-3 text-center font-mono text-slate-600">{row.count}</td>
                            <td className="px-5 py-3 text-right font-mono font-bold text-rose-600">+{row.totalPoints}</td>
                          </tr>
                          <ScreenshotRow screenshots={screenshotCaptures[row.eventType]} />
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Per-question breakdown */}
            {turns.length > 0 && (
              <div>
                <p className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-5 bg-indigo-500 rounded-full inline-block"></span>
                  Question Breakdown
                </p>
                <div className="space-y-4">
                  {turns.filter(t => t.evaluation).map((t, i) => {
                    const qColor = (t.evaluation?.score ?? 0) >= 7 ? 'text-emerald-600 bg-emerald-100' :
                                   (t.evaluation?.score ?? 0) >= 5 ? 'text-amber-600 bg-amber-100' : 'text-rose-600 bg-rose-100';
                    return (
                      <div key={i} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-indigo-400 transition-colors"></div>
                        <div className="pl-4">
                          <div className="flex items-start gap-4 mb-3">
                            <div className="flex-1">
                              <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1 block">Question {i + 1}</span>
                              <p className="text-base text-slate-800 font-medium leading-relaxed">{t.question}</p>
                            </div>
                            <div className={`flex flex-col items-center justify-center h-12 w-12 rounded-lg ${qColor} flex-shrink-0 shadow-sm`}>
                              <span className="text-lg font-bold leading-none">{t.evaluation?.score ?? '—'}</span>
                              <span className="text-[9px] font-bold uppercase mt-0.5 opacity-80">/ 10</span>
                            </div>
                          </div>
                          <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 mt-4 space-y-3">
                            <div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Candidate's Response</span>
                                {t.answer && !t.answer.startsWith('(no response') ? (
                                    <p className="text-sm text-slate-700 italic leading-relaxed">"{t.answer}"</p>
                                ) : (
                                    <p className="text-sm text-slate-400 italic">No response provided</p>
                                )}
                            </div>
                            <div className="pt-3 border-t border-slate-200/60">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">AI Evaluation</span>
                                <p className="text-sm text-slate-600">{t.evaluation?.feedback}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
