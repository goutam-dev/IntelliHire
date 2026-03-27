import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Award,
  Camera,
  CheckCircle,
  Download,
  Mic2,
  Shield,
  X,
  XCircle,
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

  // Common local dev fallback when frontend runs on 5173 and backend on 4000.
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    pushUnique(`http://${window.location.hostname}:4000`);
  }

  return candidates;
};

const resolveAssetCandidates = (input) => {
  if (!input) return [];
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

const scorePillClass = (score) => {
  if (score == null) return 'text-slate-700 bg-slate-100 border-slate-200';
  if (score >= 7) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (score >= 5) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-rose-700 bg-rose-50 border-rose-200';
};

function buildPrintableHtml({ report, candidateName }) {
  const scoring = report.scoring || {};
  const turns = report.turns || [];
  const vp = report.voiceProctoring || {};
  const fp = report.faceProctoring || {};
  const integrity = report.integrity || {};
  const completed = report.completedAt || report.startedAt;

  const qaRows = turns
    .map(
      (turn, i) => `
      <div style="margin-bottom:14px;padding:12px;border:1px solid #e2e8f0;border-radius:8px;">
        <div style="font-weight:700;color:#0f172a;margin-bottom:6px;">Q${i + 1}: ${escapeHtml(turn.question || 'N/A')}</div>
        <div style="font-size:13px;color:#334155;margin-bottom:6px;"><strong>Answer:</strong> ${escapeHtml(turn.answer || 'No response')}</div>
        <div style="font-size:13px;color:#475569;"><strong>AI feedback:</strong> ${escapeHtml(turn.evaluation?.feedback || 'N/A')} ${turn.evaluation?.score != null ? `(Score: ${turn.evaluation.score}/10)` : ''}</div>
      </div>
    `
    )
    .join('');

  const voiceRows = (vp.mismatches || [])
    .map(
      (m, i) => `
      <tr>
        <td style="padding:8px;border:1px solid #e2e8f0;">${i + 1}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(toClock(m.timestamp))}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;">${typeof m.rawScore === 'number' ? m.rawScore.toFixed(3) : 'N/A'}</td>
      </tr>
    `
    )
    .join('');

  const faceRows = (fp.faceAlerts || [])
    .map(
      (m, i) => `
      <tr>
        <td style="padding:8px;border:1px solid #e2e8f0;">${i + 1}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(toClock(m.timestamp))}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(m.violationType || m.status || 'Face alert')}</td>
      </tr>
    `
    )
    .join('');

  const objectRows = (fp.objectAlerts || [])
    .map(
      (m, i) => `
      <tr>
        <td style="padding:8px;border:1px solid #e2e8f0;">${i + 1}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(toClock(m.timestamp))}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(Array.isArray(m.alertTypes) ? m.alertTypes.join(', ') : 'Object alert')}</td>
      </tr>
    `
    )
    .join('');

  const integrityRows = (integrity.events || [])
    .map(
      (row) => `
      <tr>
        <td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(row.label || row.eventType || 'Event')}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${escapeHtml(row.count ?? 0)}</td>
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${escapeHtml(row.totalPoints ?? 0)}</td>
      </tr>
    `
    )
    .join('');

  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>AI Interview Report</title>
      <style>
        body { font-family: Segoe UI, Arial, sans-serif; color: #0f172a; margin: 24px; }
        h1, h2 { margin: 0 0 10px 0; }
        h2 { margin-top: 20px; font-size: 18px; }
        p { margin: 4px 0; color: #334155; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
        th { background: #f8fafc; text-align: left; padding: 8px; border: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <h1>AI Interview Report</h1>
      <p><strong>Candidate:</strong> ${escapeHtml(candidateName || 'Candidate')}</p>
      <p><strong>Position:</strong> ${escapeHtml(report.jobTitle || 'N/A')}</p>
      <p><strong>Date:</strong> ${completed ? escapeHtml(new Date(completed).toLocaleString()) : 'N/A'}</p>
      <p><strong>Verdict:</strong> ${escapeHtml(scoring.overallVerdict || 'N/A')}</p>
      <p><strong>Average Score:</strong> ${escapeHtml(scoring.averageScore ?? 'N/A')} / 10</p>
      <p><strong>Duration:</strong> ${escapeHtml(toFriendlyDuration(report.totalDurationSec))}</p>

      <h2>Proctoring Summary</h2>
      <p><strong>Voice mismatches:</strong> ${escapeHtml(vp.totalMismatches ?? 0)} / ${escapeHtml(vp.totalSegmentsAnalyzed ?? 0)} segments</p>
      <p><strong>Face alerts:</strong> ${escapeHtml(fp.totalFaceAlerts ?? (fp.faceAlerts || []).length)}</p>
      <p><strong>Object alerts:</strong> ${escapeHtml(fp.totalObjectAlerts ?? (fp.objectAlerts || []).length)}</p>
      <p><strong>Integrity score:</strong> ${escapeHtml(integrity.totalScore ?? 0)} / ${escapeHtml(integrity.threshold ?? CHEATING_THRESHOLD)}</p>

      <h2>Voice Alert Details</h2>
      <table>
        <thead><tr><th>#</th><th>Timestamp</th><th>Score</th></tr></thead>
        <tbody>${voiceRows || '<tr><td colspan="3" style="padding:8px;border:1px solid #e2e8f0;">No voice mismatches recorded</td></tr>'}</tbody>
      </table>

      <h2>Face Alert Details</h2>
      <table>
        <thead><tr><th>#</th><th>Timestamp</th><th>Violation</th></tr></thead>
        <tbody>${faceRows || '<tr><td colspan="3" style="padding:8px;border:1px solid #e2e8f0;">No face alerts recorded</td></tr>'}</tbody>
      </table>

      <h2>Object Alert Details</h2>
      <table>
        <thead><tr><th>#</th><th>Timestamp</th><th>Type</th></tr></thead>
        <tbody>${objectRows || '<tr><td colspan="3" style="padding:8px;border:1px solid #e2e8f0;">No object alerts recorded</td></tr>'}</tbody>
      </table>

      <h2>Platform Integrity Events</h2>
      <table>
        <thead><tr><th>Event</th><th>Count</th><th>Penalty</th></tr></thead>
        <tbody>${integrityRows || '<tr><td colspan="3" style="padding:8px;border:1px solid #e2e8f0;">No integrity events recorded</td></tr>'}</tbody>
      </table>

      <h2>Question and Answer Details</h2>
      ${qaRows || '<p>No question/answer history available.</p>'}
    </body>
  </html>`;
}

export default function InterviewReportModal({ isOpen, onClose, report, candidateName }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [proctorFilter, setProctorFilter] = useState('all');
  const [snapshotPreview, setSnapshotPreview] = useState(null);

  const scoring = report?.scoring || {};
  const turns = report?.turns || [];
  const avgScore = scoring.averageScore;

  const voice = report?.voiceProctoring || {};
  const face = report?.faceProctoring || {};
  const integrity = report?.integrity || {};

  const voiceMismatches = voice.mismatches || [];
  const faceAlerts = face.faceAlerts || [];
  const objectAlerts = face.objectAlerts || [];

  const timelineEvents = useMemo(() => {
    const all = [
      ...voiceMismatches.map((item, idx) => ({
        id: `voice-${idx}`,
        type: 'voice',
        timestamp: item.timestamp,
        title: 'Voice mismatch detected',
        description: `Raw score: ${typeof item.rawScore === 'number' ? item.rawScore.toFixed(3) : 'N/A'}`,
        mediaCandidates: resolveAssetCandidates(item.clipUrl || item.clipPath),
        mediaLabel: 'Play audio clip',
      })),
      ...faceAlerts.map((item, idx) => ({
        id: `face-${idx}`,
        type: 'face',
        timestamp: item.timestamp,
        title: item.violationType || item.status || 'Face alert',
        description: `Faces: ${item.numFaces ?? 'N/A'} | Similarity: ${item.similarity ?? 'N/A'}`,
        mediaCandidates: resolveAssetCandidates(item.snapshotUrl || item.snapshotPath),
        mediaLabel: 'View snapshot',
        mediaKind: 'image',
      })),
      ...objectAlerts.map((item, idx) => ({
        id: `object-${idx}`,
        type: 'object',
        timestamp: item.timestamp,
        title: 'Suspicious object/person activity',
        description: Array.isArray(item.alertTypes) && item.alertTypes.length > 0
          ? item.alertTypes.join(', ')
          : 'Object alert',
        mediaCandidates: resolveAssetCandidates(item.snapshotUrl || item.snapshotPath),
        mediaLabel: 'View snapshot',
        mediaKind: 'image',
      })),
    ];

    return all
      .filter((event) => proctorFilter === 'all' || event.type === proctorFilter)
      .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
  }, [voiceMismatches, faceAlerts, objectAlerts, proctorFilter]);

  if (!isOpen || !report) return null;

  const verdict = scoring.overallVerdict || (avgScore >= 7 ? 'Strong Performance' : avgScore >= 5 ? 'Moderate Performance' : 'Needs Improvement');

  const integrityThreshold = integrity.threshold || CHEATING_THRESHOLD;
  const integrityTotal = integrity.totalScore || 0;
  const integrityStatus = integrityTotal === 0
    ? 'Clean'
    : integrityTotal < integrityThreshold * 0.4
      ? 'Minor flags'
      : integrityTotal < integrityThreshold
        ? 'Moderate flags'
        : 'High flags';

  const handleDownloadPdf = () => {
    const reportHtml = buildPrintableHtml({ report, candidateName });
    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900');
    if (!printWindow) {
      alert('Popup blocked. Please allow popups to download the PDF report.');
      return;
    }

    printWindow.document.write(reportHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.98 }}
          className="w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-blue-50 to-cyan-50 px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-800">
                  <Award className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-bold">AI Interview Report</h2>
                </div>
                <p className="text-sm text-slate-600">
                  {candidateName || 'Candidate'} • {report.jobTitle || 'Position'} • {report.completedAt || report.startedAt ? new Date(report.completedAt || report.startedAt).toLocaleString() : 'N/A'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Download className="h-4 w-4" /> Download PDF
                </button>
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'proctoring', label: 'Proctoring Details' },
                { id: 'qa', label: 'Q&A Breakdown' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'overview' && (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className={`rounded-xl border p-4 ${scorePillClass(avgScore)}`}>
                    <p className="text-xs font-semibold uppercase tracking-wider">Average Score</p>
                    <p className="mt-2 text-2xl font-bold">{avgScore ?? 'N/A'} / 10</p>
                    <p className="mt-1 text-sm">{verdict}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Interview Duration</p>
                    <p className="mt-2 text-2xl font-bold text-slate-800">{toFriendlyDuration(report.totalDurationSec)}</p>
                    <p className="mt-1 text-sm text-slate-500">{turns.length} total questions</p>
                  </div>
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">Voice Mismatches</p>
                    <p className="mt-2 text-2xl font-bold text-rose-700">{voice.totalMismatches ?? 0}</p>
                    <p className="mt-1 text-sm text-rose-700">From {voice.totalSegmentsAnalyzed ?? 0} analyzed segments</p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Visual Alerts</p>
                    <p className="mt-2 text-2xl font-bold text-amber-700">{(face.totalFaceAlerts ?? faceAlerts.length) + (face.totalObjectAlerts ?? objectAlerts.length)}</p>
                    <p className="mt-1 text-sm text-amber-700">Face: {face.totalFaceAlerts ?? faceAlerts.length}, Object: {face.totalObjectAlerts ?? objectAlerts.length}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-600">Score Breakdown</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between"><span className="text-slate-500">Technical</span><span className="font-semibold text-slate-800">{scoring.technicalScore ?? 'N/A'}</span></div>
                      <div className="flex items-center justify-between"><span className="text-slate-500">Communication</span><span className="font-semibold text-slate-800">{scoring.communicationScore ?? 'N/A'}</span></div>
                      <div className="flex items-center justify-between"><span className="text-slate-500">Problem Solving</span><span className="font-semibold text-slate-800">{scoring.problemSolvingScore ?? 'N/A'}</span></div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-600">
                      <Shield className="h-4 w-4 text-blue-600" /> Platform Integrity
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between"><span className="text-slate-500">Verdict</span><span className="font-semibold text-slate-800">{integrity.verdict || integrityStatus}</span></div>
                      <div className="flex items-center justify-between"><span className="text-slate-500">Penalty Score</span><span className="font-semibold text-slate-800">{integrityTotal} / {integrityThreshold}</span></div>
                      <div className="flex items-center justify-between"><span className="text-slate-500">Termination Reason</span><span className="max-w-[65%] truncate text-right font-semibold text-slate-800">{integrity.terminationReason || 'N/A'}</span></div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-emerald-700">
                      <CheckCircle className="h-4 w-4" /> Strengths
                    </h3>
                    {(scoring.strengths || []).length > 0 ? (
                      <ul className="space-y-1 text-sm text-emerald-800">
                        {(scoring.strengths || []).map((item, index) => <li key={`${item}-${index}`}>• {item}</li>)}
                      </ul>
                    ) : (
                      <p className="text-sm text-emerald-700">No strengths recorded.</p>
                    )}
                  </div>
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-rose-700">
                      <AlertTriangle className="h-4 w-4" /> Improvement Areas
                    </h3>
                    {(scoring.weaknesses || []).length > 0 ? (
                      <ul className="space-y-1 text-sm text-rose-800">
                        {(scoring.weaknesses || []).map((item, index) => <li key={`${item}-${index}`}>• {item}</li>)}
                      </ul>
                    ) : (
                      <p className="text-sm text-rose-700">No weaknesses recorded.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'proctoring' && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-600">
                      <Mic2 className="h-4 w-4 text-blue-600" /> Voice Proctoring
                    </h3>
                    <p className="text-sm text-slate-700">Enrollment: <span className="font-semibold">{voice.enrollmentStatus || 'not_enrolled'}</span></p>
                    <p className="text-sm text-slate-700">Mismatches: <span className="font-semibold">{voice.totalMismatches ?? 0}</span> / {voice.totalSegmentsAnalyzed ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-600">
                      <Camera className="h-4 w-4 text-blue-600" /> Face and Object Proctoring
                    </h3>
                    <p className="text-sm text-slate-700">Enrollment: <span className="font-semibold">{face.enrollmentStatus || 'not_enrolled'}</span></p>
                    <p className="text-sm text-slate-700">Face alerts: <span className="font-semibold">{face.totalFaceAlerts ?? faceAlerts.length}</span></p>
                    <p className="text-sm text-slate-700">Object alerts: <span className="font-semibold">{face.totalObjectAlerts ?? objectAlerts.length}</span></p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'all', label: 'All Alerts' },
                    { id: 'voice', label: 'Voice' },
                    { id: 'face', label: 'Face' },
                    { id: 'object', label: 'Object' },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setProctorFilter(filter.id)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                        proctorFilter === filter.id
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">Alert Timeline</h3>
                  {timelineEvents.length === 0 && (
                    <p className="flex items-center gap-2 text-sm text-slate-500">
                      <XCircle className="h-4 w-4" /> No alerts for this filter.
                    </p>
                  )}
                  {timelineEvents.map((event) => (
                    <div key={event.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-slate-800">{event.title}</p>
                        <span className="rounded-md bg-white px-2 py-1 text-xs font-mono text-slate-600">t={toClock(event.timestamp)}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{event.description}</p>
                      {event.mediaCandidates?.length > 0 && event.mediaKind === 'image' && (
                        <button
                          type="button"
                          onClick={() => setSnapshotPreview({
                            candidates: event.mediaCandidates,
                            index: 0,
                            failed: false,
                            title: event.title,
                            time: toClock(event.timestamp),
                          })}
                          className="mt-2 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700"
                        >
                          {event.mediaLabel}
                        </button>
                      )}
                      {event.mediaCandidates?.length > 0 && event.mediaKind !== 'image' && (
                        <a
                          href={event.mediaCandidates[0]}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700"
                        >
                          {event.mediaLabel}
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                {(integrity.events || []).length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-600">Platform Integrity Events</h3>
                    <div className="space-y-2">
                      {(integrity.events || []).map((row, index) => (
                        <div key={`${row.eventType || 'event'}-${index}`} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
                          <span className="text-slate-700">{row.label || row.eventType || 'Event'}</span>
                          <span className="font-mono text-slate-700">count {row.count ?? 0} | penalty {row.totalPoints ?? 0}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'qa' && (
              <div className="space-y-3">
                {turns.length === 0 && <p className="text-sm text-slate-500">No interview turns available.</p>}
                {turns.map((turn, index) => (
                  <div key={`${turn.index ?? index}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-semibold text-slate-800">Question {index + 1}</p>
                      <span className={`rounded-md border px-2 py-1 text-xs font-bold ${scorePillClass(turn.evaluation?.score)}`}>
                        Score {turn.evaluation?.score ?? 'N/A'} / 10
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-700">{turn.question || 'No question text.'}</p>
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Candidate Answer</p>
                      <p className="mt-1 text-sm text-slate-700">{turn.answer || 'No response captured.'}</p>
                    </div>
                    <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">AI Evaluation</p>
                      <p className="mt-1 text-sm text-slate-700">{turn.evaluation?.feedback || 'No AI feedback recorded.'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {snapshotPreview && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/80 p-4">
              <div className="relative max-h-full w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{snapshotPreview.title}</p>
                    <p className="text-xs text-slate-500">t={snapshotPreview.time}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSnapshotPreview(null)}
                    className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="max-h-[70vh] overflow-auto bg-slate-100 p-3">
                  {!snapshotPreview.failed ? (
                    <img
                      src={snapshotPreview.candidates[snapshotPreview.index]}
                      alt="Proctoring snapshot"
                      onError={() => {
                        if (snapshotPreview.index < snapshotPreview.candidates.length - 1) {
                          setSnapshotPreview((prev) => ({ ...prev, index: prev.index + 1 }));
                        } else {
                          setSnapshotPreview((prev) => ({ ...prev, failed: true }));
                        }
                      }}
                      className="mx-auto max-h-[66vh] w-auto rounded-lg object-contain"
                    />
                  ) : (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                      Failed to load snapshot image from available URLs.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
