// frontend/src/components/candidate/profile/VideoSection.jsx
import React, { useState, useRef } from 'react';
import { Video, Upload, Trash2, Play, AlertCircle, CheckCircle, Film } from 'lucide-react';
import { toast } from 'react-toastify';

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
const MAX_VIDEO_SIZE_MB = 50;

const VideoSection = ({ profile, onUpload, onDelete }) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const existingVideo = profile?.video?.fileUrl ? profile.video : null;

  const getVideoUrl = (video) => {
    if (!video) return null;
    const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const url = video.fileUrl;
    return url.startsWith('http') ? url : `${base}${url}`;
  };

  const validateFile = (file) => {
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      toast.error('Only MP4, WEBM, MOV, and AVI video files are allowed');
      return false;
    }
    if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      toast.error(`Video file size must be less than ${MAX_VIDEO_SIZE_MB}MB`);
      return false;
    }
    return true;
  };

  const handleFileSelect = (file) => {
    if (!validateFile(file)) return;

    // Create a local preview
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    const formData = new FormData();
    formData.append('profileVideo', file);

    setUploading(true);
    onUpload(formData)
      .then(() => {
        toast.success('Video introduction uploaded successfully');
        // Clean up local URL after upload
        URL.revokeObjectURL(localUrl);
        setPreviewUrl(null);
      })
      .catch((error) => {
        console.error('Upload error:', error);
        toast.error('Failed to upload video');
        URL.revokeObjectURL(localUrl);
        setPreviewUrl(null);
      })
      .finally(() => {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      });
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
    if (window.confirm('Are you sure you want to delete your video introduction?')) {
      onDelete()
        .then(() => {
          toast.success('Video introduction deleted successfully');
        })
        .catch(() => {
          toast.error('Failed to delete video');
        });
    }
  };

  const handlePlayExisting = () => {
    const url = getVideoUrl(existingVideo);
    if (url) window.open(url, '_blank');
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <Film className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Video Introduction</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Upload a short video (max {MAX_VIDEO_SIZE_MB}MB) to introduce yourself to employers.
              This is <span className="font-medium text-gray-700">optional</span> on your profile
              but <span className="font-medium text-purple-700">required</span> when applying for jobs.
            </p>
          </div>
        </div>
      </div>

      {/* Existing video */}
      {existingVideo ? (
        <div className="mb-6">
          <div className="border border-green-200 bg-green-50 rounded-xl p-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-green-900 text-sm">Video Introduction Uploaded</p>
                </div>
                <p className="text-sm text-green-700 truncate">
                  {existingVideo.fileName || 'video-introduction'}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-green-600">
                  {existingVideo.fileSize && <span>{formatFileSize(existingVideo.fileSize)}</span>}
                  {existingVideo.uploadedAt && <span>Uploaded {formatDate(existingVideo.uploadedAt)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handlePlayExisting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-green-700 bg-white border border-green-300 rounded-lg hover:bg-green-50 transition-colors"
                  title="Preview video"
                >
                  <Play className="w-3.5 h-3.5" />
                  Preview
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete video"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Inline video player */}
            <div className="mt-4 rounded-lg overflow-hidden bg-black aspect-video max-h-48">
              <video
                src={getVideoUrl(existingVideo)}
                controls
                className="w-full h-full object-contain"
                preload="metadata"
              />
            </div>
          </div>

          <p className="text-sm text-gray-500 mt-3 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            Uploading a new video will replace the current one.
          </p>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">No video introduction uploaded yet</p>
            <p className="mt-1">
              While optional on your profile, a video introduction will be{' '}
              <strong>required when applying to jobs</strong>. Upload one now
              so you can reuse it across applications.
            </p>
          </div>
        </div>
      )}

      {/* Upload area */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          dragOver
            ? 'border-purple-400 bg-purple-50'
            : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/30'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
            <p className="text-sm font-medium text-purple-700">Uploading video...</p>
            <p className="text-xs text-gray-500">This may take a moment for large files</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
              <Video className="w-7 h-7 text-purple-600" />
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">
                {existingVideo ? 'Replace Video' : 'Upload Video Introduction'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Drag & drop or click to browse
              </p>
              <p className="text-xs text-gray-400 mt-1">
                MP4, WEBM, MOV, AVI — max {MAX_VIDEO_SIZE_MB}MB
              </p>
            </div>
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-2 px-5 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <Upload className="w-4 h-4" />
              Choose File
            </button>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="mt-6 bg-gray-50 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Tips for a great video introduction</h4>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>Keep it between 1–3 minutes</li>
          <li>Introduce yourself and mention your key skills</li>
          <li>Use good lighting and speak clearly</li>
          <li>Mention what kind of role you are looking for</li>
          <li>Record in landscape orientation for best quality</li>
        </ul>
      </div>
    </div>
  );
};

export default VideoSection;
