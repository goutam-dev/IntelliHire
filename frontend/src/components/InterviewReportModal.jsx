import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Award,
  Camera,
  CheckCircle,
  Mic2,
  Shield,
  X,
  XCircle,
  Clock,
  MessageSquare,
  Activity,
  ChevronRight,
  Eye,
  Zap,
  Video,
  Info,
} from 'lucide-react';

const CHEATING_THRESHOLD = 10;

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const toBackendOrigin = () => {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (!base) return window.location.origin;
  try {
    return new URL(base).origin;
  } catch {
    return window.location.origin;
  }
};

const getCandidateOrigins = () => {
  const candidates = [];
  const pushUnique = (origin) => {
    if (!origin || candidates.includes(origin)) return;
    candidates.push(origin);
  };
  pushUnique(toBackendOrigin());
  pushUnique(window.location.origin);
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    pushUnique(`http://${window.location.hostname}:4000`);
  }
  return candidates;
};

const resolveAssetCandidates = (input) => {
  if (!input) return [];
  if (/^data:/i.test(input)) return [input];
  if (/^https?:\/\//i.test(input)) return [input];
  const normalized = input.startsWith('/') ? input : `/${input}`;
  return getCandidateOrigins().map((origin) => `${origin}${normalized}`);
};

const toClock = (seconds) => {
  if (typeof seconds !== 'number' || Number.isNaN(seconds)) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const toFriendlyDuration = (seconds) => {
  if (typeof seconds !== 'number' || Number.isNaN(seconds) || seconds <= 0) return 'N/A';
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
};

const getScoreColor = (score) => {
  if (score == null) return { text: '#64748b', ring: '#cbd5e1', bg: '#f8fafc' }; // slate
  if (score >= 7) return { text: '#059669', ring: '#10b981', bg: '#ecfdf5' }; // emerald
  if (score >= 5) return { text: '#d97706', ring: '#f59e0b', bg: '#fffbeb' }; // amber
  return { text: '#dc2626', ring: '#ef4444', bg: '#fef2f2' }; // rose
};

const ScoreRing = ({ score, size = 80, label }) => {
  const colors = getScoreColor(score);
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score != null ? (score / 10) * circumference : 0;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg] drop-shadow-md">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth="6" />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke={colors.ring} strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-black" style={{ color: colors.text }}>
            {score ?? '—'}
          </span>
        </div>
      </div>
      {label && <span className="text-xs text-slate-500 font-semibold tracking-wide uppercase">{label}</span>}
    </div>
  );
};

const StatPill = ({ value, label, color = '#64748b', icon: Icon }) => (
  <div className="flex flex-col gap-2 rounded-3xl bg-white p-5 ring-1 ring-slate-900/5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
    <div className="flex items-center gap-2.5">
      <div className="p-2 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15`, color }}>
        {Icon && <Icon className="h-4 w-4" />}
      </div>
      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</span>
    </div>
    <span className="text-3xl font-black text-slate-800 ml-1">{value}</span>
  </div>
);


const TABS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'proctoring', label: 'Proctoring', icon: Shield },
  { id: 'qa', label: 'Q&A', icon: MessageSquare },
];

const PROCTOR_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'screen', label: 'Screen' },
  { id: 'voice', label: 'Voice' },
  { id: 'face', label: 'Face' },
  { id: 'object', label: 'Object' },
];

/**
 * Video player that tries multiple origin candidates for the registration video URL,
 * falling back gracefully if one origin fails (same pattern used for snapshots/audio).
 */
function RegistrationVideoPlayer({ filePath }) {
  const [srcIndex, setSrcIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const candidates = useMemo(() => resolveAssetCandidates(filePath), [filePath]);

  if (failed || candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 bg-slate-800 text-slate-400">
        <AlertTriangle className="h-8 w-8 text-rose-400" />
        <p className="text-sm font-bold text-rose-300">Failed to load registration video</p>
      </div>
    );
  }

  return (
    <video
      controls
      preload="metadata"
      className="w-full max-h-[480px] object-contain"
      src={candidates[srcIndex]}
      onError={() => {
        if (srcIndex < candidates.length - 1) {
          setSrcIndex((prev) => prev + 1);
        } else {
          setFailed(true);
        }
      }}
    >
      Your browser does not support the video tag.
    </video>
  );
}

export default function InterviewReportModal({ isOpen, onClose, report, candidateName }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [proctorFilter, setProctorFilter] = useState('all');
  const [snapshotPreview, setSnapshotPreview] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);

  const scoring = report?.scoring || {};
  const turns = report?.turns || [];
  const avgScore = scoring.averageScore;

  const voice = report?.voiceProctoring || {};
  const face = report?.faceProctoring || {};
  const integrity = report?.integrity || {};

  const voiceMismatches = voice.mismatches || [];
  const faceAlerts = face.faceAlerts || [];
  const faceObservations = face.faceObservations || [];
  const objectAlerts = face.objectAlerts || [];
  const integrityEvents = integrity.events || [];

  const timelineEvents = useMemo(() => {
    const startedAtMs = report?.startedAt ? new Date(report.startedAt).getTime() : null;
    const toRelativeSeconds = (isoValue) => {
      if (!isoValue || !startedAtMs) return null;
      const eventMs = new Date(isoValue).getTime();
      if (!Number.isFinite(eventMs)) return null;
      return Math.max(0, Math.round((eventMs - startedAtMs) / 1000));
    };

    const all = [
      ...integrityEvents.map((item, idx) => {
        const snapshotCandidates = [
          ...(Array.isArray(item.snapshotPaths) ? item.snapshotPaths : []),
          ...(item.snapshotUrl ? [item.snapshotUrl] : []),
        ].flatMap((entry) => resolveAssetCandidates(entry));

        return {
          id: `screen-${idx}`,
          type: 'screen',
          timestamp: toRelativeSeconds(item.lastAt || item.firstAt),
          title: item.label || item.eventType || 'Screen integrity violation',
          description: `Count: ${item.count ?? 1} · Penalty: ${item.totalPoints ?? item.points ?? 0}`,
          mediaCandidates: snapshotCandidates,
          mediaLabel: 'View screenshot',
          mediaKind: 'image',
          color: '#3b82f6',
        };
      }),
      ...voiceMismatches.map((item, idx) => ({
        id: `voice-${idx}`,
        type: 'voice',
        timestamp: item.timestamp,
        title: 'Voice mismatch detected',
        description: `Similarity score: ${typeof item.rawScore === 'number' ? item.rawScore.toFixed(3) : 'N/A'}`,
        mediaCandidates: resolveAssetCandidates(item.clipUrl || item.clipPath),
        mediaLabel: 'Play audio clip',
        color: '#8b5cf6', // violet-500
      })),
      ...faceAlerts.map((item, idx) => ({
        id: `face-${idx}`,
        type: 'face',
        timestamp: item.timestamp,
        title: item.violationType || item.status || 'Face alert',
        description: `Faces detected: ${item.numFaces ?? 'N/A'} · Similarity: ${item.similarity ?? 'N/A'}`,
        mediaCandidates: resolveAssetCandidates(item.snapshotUrl || item.snapshotPath),
        mediaLabel: 'View snapshot',
        mediaKind: 'image',
        color: '#ef4444', // red-500
      })),
      ...faceObservations.map((item, idx) => ({
        id: `face-observation-${idx}`,
        type: 'face',
        timestamp: item.timestamp,
        title: 'Face status: uncertain',
        description: `Reason: ${item.reason || 'quality_uncertain'} · Liveness: ${item.livenessScore ?? 'N/A'}`,
        mediaCandidates: resolveAssetCandidates(item.snapshotUrl || item.snapshotPath),
        mediaLabel: 'View snapshot',
        mediaKind: 'image',
        color: '#f59e0b', // amber-500
      })),
      ...objectAlerts.map((item, idx) => ({
        id: `object-${idx}`,
        type: 'object',
        timestamp: item.timestamp,
        title: 'Suspicious object detected',
        description: Array.isArray(item.alertTypes) && item.alertTypes.length > 0
          ? item.alertTypes.join(', ')
          : 'Object alert',
        mediaCandidates: resolveAssetCandidates(item.snapshotUrl || item.snapshotPath),
        mediaLabel: 'View snapshot',
        mediaKind: 'image',
        color: '#f97316', // orange-500
      })),
    ];

    return all
      .filter((event) => proctorFilter === 'all' || event.type === proctorFilter)
      .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
  }, [integrityEvents, report?.startedAt, voiceMismatches, faceAlerts, faceObservations, objectAlerts, proctorFilter]);

  if (!isOpen || !report) return null;

  const verdict =
    scoring.overallVerdict ||
    (avgScore >= 7 ? 'Strong Performance' : avgScore >= 5 ? 'Moderate Performance' : 'Needs Improvement');

  const integrityThreshold = integrity.threshold || CHEATING_THRESHOLD;
  const integrityTotal = integrity.totalScore || 0;
  const integrityStatus =
    integrityTotal === 0
      ? 'Clean'
      : integrityTotal < integrityThreshold * 0.4
      ? 'Minor flags'
      : integrityTotal < integrityThreshold
      ? 'Moderate flags'
      : 'High flags';

  const integrityColor =
    integrityTotal === 0
      ? '#10b981'
      : integrityTotal < integrityThreshold * 0.4
      ? '#f59e0b'
      : integrityTotal < integrityThreshold
      ? '#f97316'
      : '#ef4444';

  const completedDate =
    report.completedAt || report.startedAt
      ? new Date(report.completedAt || report.startedAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'N/A';


  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/20 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} // elegant ease out
          className="w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden bg-white/95 backdrop-blur-3xl rounded-[28px] ring-1 ring-slate-900/5 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.15)]"
        >
          {/* ── Header ── */}
          <div className="flex-shrink-0 px-8 pt-8 pb-4">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/20 shadow-sm">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none">AI Interview Report</h2>
                  <p className="text-sm mt-1.5 text-slate-500 font-medium">
                    {candidateName || 'Candidate'} <span className="opacity-50 mx-1">•</span> {report.jobTitle || 'Position'} <span className="opacity-50 mx-1">•</span> {completedDate}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="rounded-xl p-2.5 bg-white ring-1 ring-slate-900/5 shadow-sm text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Segmented Control Tabs */}
            <div className="flex p-1 rounded-2xl bg-slate-100/80 w-fit">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold transition-all duration-300 ${
                      active
                        ? 'bg-white text-indigo-600 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] ring-1 ring-slate-900/5'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Scrollable Body ── */}
          <div className="flex-1 overflow-y-auto px-8 pb-8 pt-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>

            {/* ══ OVERVIEW TAB ══ */}
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Score Hero */}
                  <div className="rounded-[28px] p-8 pt-14 flex flex-col sm:flex-row items-center gap-8 relative overflow-hidden bg-gradient-to-br from-indigo-50/50 via-white to-emerald-50/50 ring-1 ring-slate-900/5 shadow-sm">
                    {/* Decorative blurred blob */}
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-300/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute top-4 left-0 right-0 text-center text-sm font-extrabold uppercase tracking-widest text-slate-500">Scores</div>
                    <ScoreRing score={avgScore} size={110} />
                    <div className="flex-1 text-center sm:text-left z-10">
                      <p className="text-3xl font-black text-slate-800 tracking-tight">{verdict}</p>
                      <p className="text-base mt-1.5 text-slate-500 font-medium font-serif italic">
                        {turns.length} questions · {toFriendlyDuration(report.totalDurationSec)} analysis
                      </p>
                    </div>
                    <div className="flex items-center gap-6 z-10 bg-white/60 backdrop-blur-md p-4 rounded-3xl ring-1 ring-slate-900/5 shadow-sm">
                      <ScoreRing score={scoring.technicalScore} size={64} label="Technical" />
                      <ScoreRing score={scoring.communicationScore} size={64} label="Comms" />
                      <ScoreRing score={scoring.problemSolvingScore} size={64} label="Logic" />
                    </div>
                  </div>

                  {/* Stat Pills Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatPill icon={Clock} label="Duration" value={toFriendlyDuration(report.totalDurationSec)} color="#6366f1" />
                    <StatPill icon={Mic2} label="Voice Flags" value={voice.totalMismatches ?? 0} color={voice.totalMismatches > 0 ? '#ef4444' : '#10b981'} />
                    <StatPill icon={Camera} label="Visual Alerts" value={(face.totalFaceAlerts ?? faceAlerts.length) + (face.totalObjectAlerts ?? objectAlerts.length)} color={((face.totalFaceAlerts ?? faceAlerts.length) + (face.totalObjectAlerts ?? objectAlerts.length)) > 0 ? '#f59e0b' : '#10b981'} />
                    <StatPill icon={Shield} label="Integrity" value={integrityStatus} color={integrityColor} />
                  </div>

                  {/* Details Cards */}
                  <div className="grid lg:grid-cols-3 gap-4">
                    <div className="bg-white rounded-[24px] p-6 ring-1 ring-slate-900/5 shadow-sm lg:col-span-1">
                      <div className="flex items-center gap-2.5 mb-4">
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-600">Key Strengths</h3>
                      </div>
                      {(scoring.strengths || []).length > 0 ? (
                        <ul className="space-y-3">
                          {(scoring.strengths || []).map((item, index) => (
                            <li key={`${item}-${index}`} className="flex items-start gap-2.5 text-sm md:text-base font-medium text-slate-600">
                              <span className="text-emerald-500 mt-0.5 text-lg leading-none">•</span>
                              <span className="leading-snug">{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-400 italic">No strengths recorded.</p>
                      )}
                    </div>

                    <div className="bg-white rounded-[24px] p-6 ring-1 ring-slate-900/5 shadow-sm lg:col-span-1">
                      <div className="flex items-center gap-2.5 mb-4">
                        <AlertTriangle className="h-5 w-5 text-rose-500" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-rose-600">Improvement Areas</h3>
                      </div>
                      {(scoring.weaknesses || []).length > 0 ? (
                        <ul className="space-y-3">
                          {(scoring.weaknesses || []).map((item, index) => (
                            <li key={`${item}-${index}`} className="flex items-start gap-2.5 text-sm md:text-base font-medium text-slate-600">
                              <span className="text-rose-400 mt-0.5 text-lg leading-none">•</span>
                              <span className="leading-snug">{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-400 italic">No weaknesses recorded.</p>
                      )}
                    </div>

                    <div className="bg-white rounded-[24px] p-6 ring-1 ring-slate-900/5 shadow-sm lg:col-span-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2.5 mb-4">
                          <Shield className="h-5 w-5 text-indigo-500" />
                          <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-600">Platform Integrity</h3>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">Verdict</p>
                            <p className="text-lg font-black" style={{ color: integrityColor }}>{integrity.verdict || integrityStatus}</p>
                          </div>
                          <div className="w-full h-px bg-slate-100" />
                          <div>
                            <p className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">Penalty Score</p>
                            <p className="text-lg font-black text-slate-800">{integrityTotal} <span className="text-slate-400 text-sm font-medium">/ {integrityThreshold} limit</span></p>
                          </div>
                        </div>
                      </div>
                      {integrity.terminationReason && (
                        <div className="mt-4 p-3 bg-slate-50 rounded-xl ring-1 ring-slate-900/5">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Termination</p>
                          <p className="text-sm font-medium text-slate-700 truncate">{integrity.terminationReason}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Registration Video — Baseline Reference */}
                  {report.registrationVideo ? (
                    <div className="bg-white rounded-[24px] p-6 ring-1 ring-slate-900/5 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-500/20">
                          <Video className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700">Registration Video</h3>
                          <p className="text-xs text-slate-400 mt-0.5 font-medium">Submitted during job application · Used for face &amp; voice enrollment baseline</p>
                        </div>
                      </div>

                      {/* Info callout */}
                      <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-violet-50/60 ring-1 ring-violet-200/60 mb-4">
                        <Info className="h-4 w-4 text-violet-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs font-medium text-violet-700 leading-relaxed">
                          This is the original video the candidate recorded when registering their application.
                          The face and voice embeddings used during proctoring were generated from this video.
                          Use it as a baseline to cross-verify any face or voice alerts flagged during the interview.
                        </p>
                      </div>

                      <div className="rounded-2xl overflow-hidden bg-slate-900 ring-1 ring-slate-900/10 shadow-inner">
                        <RegistrationVideoPlayer filePath={report.registrationVideo.filePath} />
                      </div>

                      {report.registrationVideo.uploadDate && (
                        <p className="mt-3 text-xs text-slate-400 font-medium">
                          Uploaded: {new Date(report.registrationVideo.uploadDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {report.registrationVideo.originalName && (
                            <span className="ml-2 opacity-60">· {report.registrationVideo.originalName}</span>
                          )}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white rounded-[24px] p-6 ring-1 ring-slate-900/5 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 ring-1 ring-slate-200">
                          <Video className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Registration Video</h3>
                          <p className="text-xs text-slate-400 mt-0.5 font-medium">Application baseline video</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-center justify-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center gap-2">
                        <Video className="h-7 w-7 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-400">Registration video not available</p>
                        <p className="text-xs text-slate-400 font-medium">The candidate's registration video could not be found.</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ══ PROCTORING TAB ══ */}
              {activeTab === 'proctoring' && (
                <motion.div
                  key="proctoring"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-[24px] p-6 ring-1 ring-slate-900/5 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-violet-50 text-violet-600 rounded-xl"><Mic2 className="h-5 w-5" /></div>
                        <span className="text-sm font-bold uppercase tracking-widest text-slate-700">Voice Proctoring</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-slate-50">
                          <span className="text-sm font-semibold tracking-wide text-slate-500">Enrollment</span>
                          <span className="font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg text-xs tracking-wide">{voice.enrollmentStatus || 'not_enrolled'}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm font-semibold tracking-wide text-slate-500">Mismatches</span>
                          <span className="font-bold" style={{ color: (voice.totalMismatches ?? 0) > 0 ? '#ef4444' : '#10b981' }}>
                            {voice.totalMismatches ?? 0} / {voice.totalSegmentsAnalyzed ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-[24px] p-6 ring-1 ring-slate-900/5 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-sky-50 text-sky-600 rounded-xl"><Camera className="h-5 w-5" /></div>
                        <span className="text-sm font-bold uppercase tracking-widest text-slate-700">Visual Proctoring</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-slate-50">
                          <span className="text-sm font-semibold tracking-wide text-slate-500">Face Alerts</span>
                          <span className="font-black text-lg" style={{ color: (face.totalFaceAlerts ?? faceAlerts.length) > 0 ? '#ef4444' : '#10b981' }}>
                            {face.totalFaceAlerts ?? faceAlerts.length}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm font-semibold tracking-wide text-slate-500">Object Alerts</span>
                          <span className="font-black text-lg" style={{ color: (face.totalObjectAlerts ?? objectAlerts.length) > 0 ? '#f97316' : '#10b981' }}>
                            {face.totalObjectAlerts ?? objectAlerts.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-[24px] p-6 ring-1 ring-slate-900/5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700">Alert Timeline</h3>
                      <div className="flex gap-2">
                        {PROCTOR_FILTERS.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => setProctorFilter(f.id)}
                            className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-all ${
                              proctorFilter === f.id
                                ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200'
                                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {timelineEvents.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <CheckCircle className="h-8 w-8 text-emerald-400 mb-2" />
                        <p className="text-sm font-semibold text-slate-500">No alerts found for this filter</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {timelineEvents.map((event) => (
                          <div
                            key={event.id}
                            className="flex items-start gap-4 p-4 rounded-2xl bg-white ring-1 ring-slate-900/5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-md transition-all"
                          >
                            <div className="w-1.5 self-stretch rounded-full" style={{ backgroundColor: event.color }} />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-base font-bold text-slate-800">{event.title}</p>
                                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold font-mono">
                                  {toClock(event.timestamp)}
                                </span>
                              </div>
                              <p className="text-sm text-slate-500 font-medium">{event.description}</p>
                              {event.mediaCandidates?.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (event.mediaKind === 'image') {
                                      setSnapshotPreview({ candidates: event.mediaCandidates, index: 0, failed: false, title: event.title, time: toClock(event.timestamp) });
                                    } else {
                                      setAudioPreview({ candidates: event.mediaCandidates, index: 0, failed: false, title: event.title, time: toClock(event.timestamp) });
                                    }
                                  }}
                                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 text-xs text-indigo-600 font-bold transition-colors"
                                >
                                  {event.mediaKind === 'image' ? <Eye className="h-3.5 w-3.5" /> : <Mic2 className="h-3.5 w-3.5" />}
                                  {event.mediaLabel}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ══ Q&A TAB ══ */}
              {activeTab === 'qa' && (
                <motion.div
                  key="qa"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {turns.length === 0 ? (
                    <div className="py-12 text-center bg-slate-50 rounded-[24px] border border-dashed border-slate-200">
                      <p className="text-sm font-semibold text-slate-500">No interview turns available.</p>
                    </div>
                  ) : (
                    turns.map((turn, index) => {
                      const sc = turn.evaluation?.score;
                      const colors = getScoreColor(sc);
                      return (
                        <div key={`${turn.index ?? index}-${index}`} className="bg-white rounded-[24px] p-6 sm:p-8 ring-1 ring-slate-900/5 shadow-sm">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 font-black text-sm ring-1 ring-indigo-500/20">
                                {index + 1}
                              </span>
                              <p className="text-base font-bold text-slate-800 uppercase tracking-widest text-[13px]">Question</p>
                            </div>
                            <div
                              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-black ring-1"
                              style={{ backgroundColor: colors.bg, color: colors.text, borderColor: `${colors.ring}40` }}
                            >
                              <span>{sc ?? 'N/A'}</span>
                              <span className="opacity-50 font-medium">/ 10</span>
                            </div>
                          </div>

                          <p className="text-lg md:text-xl font-bold text-slate-800 mb-6 leading-relaxed">
                            {turn.question || 'No question text.'}
                          </p>

                          <div className="space-y-3">
                            <div className="rounded-2xl p-5 bg-slate-50 ring-1 ring-slate-900/5">
                              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Candidate Answer</p>
                              <p className="text-[15px] leading-relaxed text-slate-700 font-medium">
                                {turn.answer || <span className="italic opacity-50">No response captured.</span>}
                              </p>
                            </div>

                            <div className="rounded-2xl p-5 bg-indigo-50/50 ring-1 ring-indigo-500/10 relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400 rounded-l-2xl"/>
                              <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-2">AI Feedback</p>
                              <p className="text-[15px] leading-relaxed text-slate-700 font-medium">
                                {turn.evaluation?.feedback || 'No AI feedback recorded.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── Snapshot Lightbox ── */}
        <AnimatePresence>
          {snapshotPreview && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8 bg-slate-900/40 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.95, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="w-full max-w-4xl bg-white rounded-[28px] overflow-hidden shadow-2xl ring-1 ring-slate-900/10 flex flex-col max-h-[90vh]"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">{snapshotPreview.title}</h3>
                    <p className="text-sm font-medium text-slate-500 mt-0.5">Recorded at <span className="font-mono">{snapshotPreview.time}</span></p>
                  </div>
                  <button
                    onClick={() => setSnapshotPreview(null)}
                    className="p-2.5 rounded-full bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-auto bg-slate-50 p-6 flex items-center justify-center">
                  {!snapshotPreview.failed ? (
                    <img
                      src={snapshotPreview.candidates[snapshotPreview.index]}
                      alt="Proctoring evidence"
                      onError={() => {
                        if (snapshotPreview.index < snapshotPreview.candidates.length - 1) {
                          setSnapshotPreview((prev) => ({ ...prev, index: prev.index + 1 }));
                        } else {
                          setSnapshotPreview((prev) => ({ ...prev, failed: true }));
                        }
                      }}
                      className="max-h-full w-auto rounded-2xl shadow-sm ring-1 ring-slate-900/5 object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 p-8 bg-rose-50 text-rose-500 rounded-2xl ring-1 ring-rose-500/20">
                      <AlertTriangle className="h-8 w-8 text-rose-400" />
                      <p className="text-sm font-bold">Failed to load snapshot image</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Voice Clip Lightbox ── */}
        <AnimatePresence>
          {audioPreview && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8 bg-slate-900/40 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.95, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="w-full max-w-2xl bg-white rounded-[28px] overflow-hidden shadow-2xl ring-1 ring-slate-900/10 flex flex-col"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">{audioPreview.title}</h3>
                    <p className="text-sm font-medium text-slate-500 mt-0.5">Recorded at <span className="font-mono">{audioPreview.time}</span></p>
                  </div>
                  <button
                    onClick={() => setAudioPreview(null)}
                    className="p-2.5 rounded-full bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6 bg-slate-50">
                  {!audioPreview.failed ? (
                    <audio
                      className="w-full"
                      controls
                      autoPlay
                      preload="metadata"
                      src={audioPreview.candidates[audioPreview.index]}
                      onError={() => {
                        if (audioPreview.index < audioPreview.candidates.length - 1) {
                          setAudioPreview((prev) => ({ ...prev, index: prev.index + 1 }));
                        } else {
                          setAudioPreview((prev) => ({ ...prev, failed: true }));
                        }
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 p-6 bg-rose-50 text-rose-500 rounded-2xl ring-1 ring-rose-500/20">
                      <AlertTriangle className="h-8 w-8 text-rose-400" />
                      <p className="text-sm font-bold">Failed to load voice clip</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
}
