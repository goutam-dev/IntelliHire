import React from 'react';
import { X } from 'lucide-react';

const Section = ({ title, children }) => (
  <div>
    <h4 className="text-sm font-semibold text-slate-900 mb-2">{title}</h4>
    <div className="space-y-2">{children}</div>
  </div>
);

const CandidateModal = ({ open, onClose, application }) => {
  if (!open) return null;
  const candidate = application?.candidate;
  const user = candidate?.user;

  // Construct resume URL
  const resumePath = candidate?.resume?.filePath || candidate?.resume?.fileUrl || 
                      application?.resume?.filePath || application?.resume?.fileUrl;
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
  const resumeUrl = resumePath ? (resumePath.startsWith('http') ? resumePath : `${API_BASE_URL}${resumePath.startsWith('/') ? '' : '/'}${resumePath}`) : '#';
  const resumeName = candidate?.resume?.fileName || application?.resume?.fileName || 
                     application?.resume?.originalName || 'View resume';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white border border-slate-200 shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 shrink-0">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{user?.fullName || 'Candidate'}</h3>
            <p className="text-sm text-slate-600">{candidate?.professionalTitle}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-50">
            <X className="h-5 w-5 text-slate-700" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto flex-1">
          <Section title="Profile">
            <p className="text-sm text-slate-700">Email: {user?.email}</p>
            <p className="text-sm text-slate-700">Phone: {user?.phoneNumber || '—'}</p>
            <p className="text-sm text-slate-700">Location: {candidate?.location || '—'}</p>
            <p className="text-sm text-slate-700">Skills: {(candidate?.skills || []).join(', ') || '—'}</p>
          </Section>

          <Section title="Resume">
            <a
              href={resumeUrl}
              target="_blank"
              className="text-sm text-blue-700 hover:text-blue-900"
            >
              {resumeName}
            </a>
          </Section>

          <Section title="Education">
            {(candidate?.education || []).length === 0 && (
              <p className="text-sm text-slate-700">No education listed.</p>
            )}
            {(candidate?.education || []).map((edu, idx) => (
              <div key={idx} className="text-sm text-slate-700">
                <p className="font-medium">{edu.degree} in {edu.fieldOfStudy}</p>
                <p>{edu.institution}</p>
              </div>
            ))}
          </Section>

          <Section title="Experience">
            {(candidate?.experience || []).length === 0 && (
              <p className="text-sm text-slate-700">No experience listed.</p>
            )}
            {(candidate?.experience || []).map((exp, idx) => (
              <div key={idx} className="text-sm text-slate-700">
                <p className="font-medium">{exp.title} at {exp.companyName}</p>
              </div>
            ))}
          </Section>

          <Section title="History">
            <div className="text-sm text-slate-700">
              <p className="font-medium">Current Status: {application?.status}</p>
              <p>Applied: {application?.createdAt ? new Date(application.createdAt).toLocaleString() : 'Date N/A'}</p>
              {application?.reviewedAt && <p>Reviewed: {new Date(application.reviewedAt).toLocaleString()}</p>}
            </div>
          </Section>

          <Section title="Notes">
            <p className="text-sm text-slate-700">{application?.employerNotes || application?.feedback || '—'}</p>
          </Section>
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end shrink-0">
          <button onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50">Close</button>
        </div>
      </div>
    </div>
  );
};

export default CandidateModal;