import React, { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import { FileText, Upload, Trash2, Download, CheckCircle2, AlertCircle } from 'lucide-react';

const ResumeSection = ({ profile, onUpload, onDelete }) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return false;
    }
    return true;
  };

  const handleFileSelect = (file) => {
    if (!validateFile(file)) return;
    const formData = new FormData();
    formData.append('resume', file);
    
    setUploading(true);
    onUpload(formData)
      .then(() => toast.success('Resume uploaded successfully'))
      .catch((error) => {
        console.error('Upload error:', error);
        toast.error('Failed to upload resume');
      })
      .finally(() => setUploading(false));
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete your resume?')) {
      onDelete()
        .then(() => toast.success('Resume deleted successfully'))
        .catch(() => toast.error('Failed to delete resume'));
    }
  };

  const downloadResume = () => {
    if (profile?.resume?.fileUrl) {
      const link = document.createElement('a');
      link.href = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${profile.resume.fileUrl}`;
      link.download = profile.resume.fileName || 'resume.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const hasResume = profile?.resume?.fileUrl;

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 lg:p-8">
      <div className="flex items-center justify-between mb-8 border-b border-zinc-100 pb-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center border border-zinc-200">
            <FileText className="w-6 h-6 text-zinc-900" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-zinc-900">Professional Resume</h2>
            <p className="text-sm text-zinc-500 mt-1">Upload your most recent PDF resume to help us parse your skills faster.</p>
          </div>
        </div>
      </div>
      
      {hasResume ? (
        <div className="space-y-6">
          <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 border border-red-200 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-extrabold text-zinc-900">
                      {profile.resume.fileName}
                    </h3>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </div>
                  <p className="text-xs font-semibold text-zinc-500 bg-zinc-200/50 inline-block px-2 py-0.5 rounded-md">
                    Uploaded: {new Date(profile.resume.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={downloadResume}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold bg-white text-zinc-900 border border-zinc-200 rounded-xl hover:bg-zinc-50 shadow-sm hover:shadow hover:-translate-y-0.5 transition-all duration-200"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 text-red-500 hover:text-white border border-red-100 hover:bg-red-500 hover:border-red-500 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                  title="Delete Resume"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-zinc-900 mb-3 flex items-center gap-2 uppercase tracking-wide">
              Update Document
            </h3>
            <div
              className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 group ${
                dragOver
                  ? 'border-zinc-900 bg-zinc-50 scale-[1.01]'
                  : 'border-zinc-300 hover:border-zinc-500 hover:bg-zinc-50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileInputChange} accept=".pdf" className="hidden" />
              {uploading ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-zinc-200 border-t-zinc-900 mb-3"></div>
                  <p className="text-sm font-extrabold text-zinc-900">Uploading resume...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 bg-white border border-zinc-200 shadow-sm rounded-2xl flex items-center justify-center mb-4 group-hover:shadow-md transition-shadow">
                    <Upload className="w-6 h-6 text-zinc-400 group-hover:text-zinc-900 transition-colors" />
                  </div>
                  <p className="text-sm font-bold text-zinc-900 mb-1">
                    Drag and drop to replace, or{' '}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-600 hover:text-blue-800 underline decoration-blue-300 underline-offset-4 transition-colors"
                    >
                      browse
                    </button>
                  </p>
                  <p className="text-xs font-semibold text-zinc-500">PDF files only (Max 5MB)</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 group ${
            dragOver
              ? 'border-zinc-900 bg-zinc-50 scale-[1.02]'
              : 'border-zinc-300 hover:border-zinc-500 hover:bg-zinc-50 block'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input type="file" ref={fileInputRef} onChange={handleFileInputChange} accept=".pdf" className="hidden" />
          
          {uploading ? (
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-zinc-200 border-t-zinc-900 mb-5 shadow-sm"></div>
                <div className="absolute inset-0 flex items-center justify-center mb-5 pointer-events-none">
                  <FileText className="w-5 h-5 text-zinc-400 animate-pulse" />
                </div>
              </div>
              <h3 className="text-xl font-extrabold text-zinc-900 mb-2">Analyzing Resume...</h3>
              <p className="text-sm font-medium text-zinc-500">Extracting details and updating your profile</p>
            </div>
          ) : (
            <div className="flex flex-col items-center max-w-sm mx-auto">
              <div className="w-20 h-20 bg-white border border-zinc-200 shadow-sm rounded-[24px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 ease-out">
                <FileText className="w-10 h-10 text-zinc-300 group-hover:text-zinc-900 transition-colors" />
              </div>
              <h3 className="text-lg font-extrabold text-zinc-900 mb-2">Upload your resume</h3>
              <p className="text-sm text-zinc-500 mb-5">
                We'll parse the data to automatically enhance your profile and match you with better jobs.
              </p>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2.5 text-sm font-bold bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Select PDF File
              </button>
              <p className="text-xs font-semibold text-zinc-400 mt-4 uppercase tracking-wide">Max file size: 5MB</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResumeSection;
