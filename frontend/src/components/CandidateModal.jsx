import React, { useEffect, useState } from 'react';
import { X, Mail, Phone, MapPin } from 'lucide-react';
import { resolveUploadUrl } from '../utils/mediaUrl';

const Section = ({ title, children }) => (
  <div>
    <h4 className="text-sm font-semibold text-slate-900 mb-3">{title}</h4>
    <div className="space-y-3">{children}</div>
  </div>
);

const CandidateModal = ({ open, onClose, application }) => {
  const candidate = application?.candidate;
  const user = candidate?.user;
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);
  const candidatePhotoUrl = resolveUploadUrl(candidate?.profilePhotoUrl || null);

  useEffect(() => {
    setPhotoLoadFailed(false);
  }, [candidatePhotoUrl]);

  if (!open) return null;

  // Construct resume URL
  const resumePath = candidate?.resume?.filePath || candidate?.resume?.fileUrl || 
                      application?.resume?.filePath || application?.resume?.fileUrl;
  const resumeUrl = resolveUploadUrl(resumePath) || '#';
  const resumeName = candidate?.resume?.fileName || application?.resume?.fileName || 
                     application?.resume?.originalName || 'View resume';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full border-2 border-white shadow-sm flex items-center justify-center shrink-0 overflow-hidden bg-blue-100">
              {candidatePhotoUrl && !photoLoadFailed ? (
                <img
                  src={candidatePhotoUrl}
                  alt={user?.fullName || 'Candidate'}
                  className="h-full w-full object-cover"
                  onError={() => setPhotoLoadFailed(true)}
                />
              ) : (
                <span className="text-xl font-bold text-blue-700">
                  {user?.fullName?.charAt(0) || 'C'}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">{user?.fullName || 'Candidate'}</h3>
              <p className="text-sm font-medium text-slate-500 mt-0.5">{candidate?.professionalTitle || 'Professional'}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-slate-200/50 transition-colors">
            <X className="h-5 w-5 text-slate-500 hover:text-slate-700" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto flex-1 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Column */}
            <div className="space-y-8">
              <Section title="Contact Information">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 text-sm text-slate-700 font-medium">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <a href={`mailto:${user?.email}`} className="hover:text-blue-600 transition-colors">
                      {user?.email || 'No email provided'}
                    </a>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-slate-700 font-medium">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>{user?.phoneNumber || 'No phone provided'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-slate-700 font-medium">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span>{candidate?.location || 'No location provided'}</span>
                  </div>
                </div>
              </Section>

              <Section title="Skills">
                {(candidate?.skills || []).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {candidate.skills.map((skill, idx) => (
                      <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No skills listed.</p>
                )}
              </Section>

              <Section title="Resume Document">
                <a
                  href={resumeUrl}
                  target="_blank"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 bg-blue-50/50 hover:bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-100 transition-all w-full justify-center"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  {resumeName}
                </a>
              </Section>
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              <Section title="Education">
                {(candidate?.education || []).length === 0 ? (
                  <p className="text-sm text-slate-500 italic bg-slate-50 p-3 rounded-lg border border-slate-100">No education listed.</p>
                ) : (
                  <div className="space-y-3">
                    {(candidate?.education || []).map((edu, idx) => (
                      <div key={idx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <p className="text-sm font-bold text-slate-800">{edu.degree} in {edu.fieldOfStudy}</p>
                        <p className="text-sm text-slate-500 mt-0.5 font-medium">{edu.institution}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title="Experience">
                {(candidate?.experience || []).length === 0 ? (
                  <p className="text-sm text-slate-500 italic bg-slate-50 p-3 rounded-lg border border-slate-100">No experience listed.</p>
                ) : (
                  <div className="space-y-3">
                    {(candidate?.experience || []).map((exp, idx) => (
                      <div key={idx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <p className="text-sm font-bold text-slate-800">{exp.title}</p>
                        <p className="text-sm text-slate-500 mt-0.5 font-medium">{exp.companyName}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
};

export default CandidateModal;