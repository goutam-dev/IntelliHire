import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FileText, Lightbulb, Sparkles, AlignLeft, CheckCircle2 } from 'lucide-react';

const SummarySection = ({ profile, onUpdate, onUnsavedChanges }) => {
  const [summary, setSummary] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const maxLength = 500;

  useEffect(() => {
    if (profile?.summary) {
      setSummary(profile.summary);
    }
  }, [profile]);

  useEffect(() => {
    onUnsavedChanges(hasChanges);
  }, [hasChanges, onUnsavedChanges]);

  const handleChange = (e) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setSummary(value);
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({ summary });
      setHasChanges(false);
      toast.success('Professional summary updated successfully');
    } catch (error) {
      console.error('Update summary error:', error);
      toast.error('Failed to update summary');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSummary(profile?.summary || '');
    setHasChanges(false);
  };

  const remainingChars = maxLength - summary.length;
  const isNearLimit = remainingChars <= 50;

  const sampleSummaries = [
    "Experienced software engineer with 5+ years developing scalable web applications using React, Node.js, and AWS. Passionate about clean code, user experience, and mentoring junior developers. Led cross-functional teams to deliver projects 20% ahead of schedule.",
    "Results-driven marketing professional with expertise in digital campaigns, content strategy, and data analytics. Increased brand engagement by 150% and generated $2M+ in revenue through innovative social media strategies. Skilled in SEO, PPC, and marketing automation.",
  ];

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6 border-b border-zinc-100 pb-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center border border-zinc-200">
            <AlignLeft className="w-6 h-6 text-zinc-900" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-zinc-900 mb-1">Impact Summary</h2>
            <p className="text-sm text-zinc-500">
              Provide a brief overview of your professional background and top achievements.
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="relative">
          <label className="block text-sm font-bold text-zinc-900 mb-2">
            Your Narrative
          </label>
          <div className="relative group">
            <textarea
              value={summary}
              onChange={handleChange}
              rows={6}
              placeholder="E.g. Full-stack developer with 5 years building high-traffic platforms..."
              className="w-full px-4 py-3 bg-zinc-50/50 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 resize-none text-zinc-900 text-sm font-medium placeholder:font-normal transition-all shadow-sm group-hover:border-zinc-400"
            />
            <div className={`absolute bottom-3 right-3 text-xs font-bold px-2 py-1 rounded-md backdrop-blur-sm ${
              isNearLimit ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-white/80 text-zinc-400 border border-zinc-200'
            }`}>
              {remainingChars} left
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-extrabold flex items-center gap-2 text-zinc-900 uppercase tracking-widest mb-3">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              Pro Tips
            </h3>
            <ul className="text-sm font-medium text-zinc-600 space-y-2.5">
              <li className="flex items-start gap-2"><div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-zinc-400 flex-shrink-0"/> Keep it under 4 sentences</li>
              <li className="flex items-start gap-2"><div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-zinc-400 flex-shrink-0"/> Highlight metrics over tasks</li>
              <li className="flex items-start gap-2"><div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-zinc-400 flex-shrink-0"/> Mention your desired next move</li>
            </ul>
          </div>

          {!summary && (
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-extrabold flex items-center gap-2 text-zinc-900 uppercase tracking-widest mb-3">
                <Sparkles className="w-4 h-4 text-blue-500" />
                Templates
              </h3>
              <div className="space-y-3">
                {sampleSummaries.map((sample, index) => (
                  <div key={index} className="bg-white border border-blue-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group" onClick={() => { setSummary(sample); setHasChanges(true); }}>
                    <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed mb-2 font-medium">{sample}</p>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide group-hover:text-blue-800 transition-colors flex items-center gap-1">
                      Use template &rarr;
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {hasChanges && (
          <div className="flex justify-end space-x-3 pt-6 border-t border-zinc-100 mt-6">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-5 py-2.5 text-sm font-bold text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 shadow-sm transition-colors disabled:opacity-50"
            >
              Discard Wait
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 text-sm font-bold bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 shadow-md hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-zinc-400 border-t-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Lock it in
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SummarySection;
