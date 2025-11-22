// frontend/src/components/candidate/profile/ResumeSection.jsx
import React, { useState, useRef } from 'react';
import { toast } from 'react-toastify';

const ResumeSection = ({ profile, onUpload, onDelete }) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    // Check file type
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return false;
    }

    // Check file size (5MB max)
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
      .then(() => {
        toast.success('Resume uploaded successfully');
      })
      .catch((error) => {
        console.error('Upload error:', error);
        toast.error('Failed to upload resume');
      })
      .finally(() => {
        setUploading(false);
      });
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
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
        .then(() => {
          toast.success('Resume deleted successfully');
        })
        .catch((error) => {
          console.error('Delete error:', error);
          toast.error('Failed to delete resume');
        });
    }
  };

  const downloadResume = () => {
    if (profile?.resume?.fileUrl) {
      const link = document.createElement('a');
      link.href = `http://localhost:4000${profile.resume.fileUrl}`;
      link.download = profile.resume.fileName || 'resume.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const hasResume = profile?.resume?.fileUrl;

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Resume</h2>
      
      {hasResume ? (
        /* Current Resume Display */
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    {profile.resume.fileName}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Uploaded on {new Date(profile.resume.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={downloadResume}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Download
                </button>
                <button
                  onClick={handleDelete}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>

          {/* Upload New Resume */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Upload New Resume</h3>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragOver
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {uploading ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                  <p className="text-sm text-gray-600">Uploading resume...</p>
                </div>
              ) : (
                <div>
                  <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-sm text-gray-600 mb-2">
                    Drop your new resume here, or{' '}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      browse files
                    </button>
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF only, max 5MB
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* No Resume - Upload Area */
        <div>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {uploading ? (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-lg font-medium text-gray-900 mb-2">Uploading Resume</p>
                <p className="text-sm text-gray-600">Please wait while we process your file...</p>
              </div>
            ) : (
              <div>
                <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Your Resume</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Drag and drop your resume here, or click to browse
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  Choose File
                </button>
                <p className="text-xs text-gray-500 mt-3">
                  PDF format only • Maximum file size: 5MB
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <svg className="flex-shrink-0 w-5 h-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Resume Tips</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Keep your resume to 1-2 pages</li>
                    <li>Use a clean, professional format</li>
                    <li>Include relevant keywords for your industry</li>
                    <li>Quantify your achievements with numbers</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  );
};

export default ResumeSection;