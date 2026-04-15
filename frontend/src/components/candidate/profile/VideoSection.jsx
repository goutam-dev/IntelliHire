import React, { useState, useRef } from 'react';
import { Upload, Trash2, Play, AlertCircle, CheckCircle, Film, X } from 'lucide-react';
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

    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    const formData = new FormData();
    formData.append('profileVideo', file);

    setUploading(true);
    onUpload(formData)
      .then(() => {
        toast.success('Video introduction uploaded successfully');
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
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 border-b border-zinc-100 pb-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center border border-zinc-200">
            <Film className="w-6 h-6 text-zinc-900" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-zinc-900 tracking-tight">Video Introduction</h2>
            <p className="text-sm text-zinc-500 mt-1 max-w-lg">
              Upload a short clip (max {MAX_VIDEO_SIZE_MB}MB) to showcase your personality. Highly recommended to stand out!
            </p>
          </div>
        </div>
      </div>

      {/* Existing video handling */}
      {existingVideo ? (
        <div className="mb-6">
          <div className="border border-green-200 bg-green-50/50 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0 border border-green-200">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-green-900 text-sm">Active Video Introduction</p>
                  <p className="text-sm font-medium text-green-700 truncate mt-0.5">
                    {existingVideo.fileName || 'video-introduction.mp4'}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs font-semibold text-green-600/80">
                    {existingVideo.fileSize && <span className="bg-green-100/50 px-2 py-0.5 rounded-md">{formatFileSize(existingVideo.fileSize)}</span>}
                    {existingVideo.uploadedAt && <span>{formatDate(existingVideo.uploadedAt)}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handlePlayExisting}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-bold text-green-700 bg-white border border-green-200 rounded-xl hover:bg-green-50 shadow-sm transition-all duration-200 hover:-translate-y-0.5"
                >
                  <Play className="w-4 h-4 fill-green-700" />
                  Play
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 text-red-500 hover:text-white border border-red-100 hover:bg-red-500 hover:border-red-500 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                  title="Delete video"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Inline video player */}
            <div className="mt-5 rounded-xl overflow-hidden bg-zinc-900 aspect-video max-h-56 shadow-inner ring-1 ring-black/5 mx-auto">
              <video
                src={getVideoUrl(existingVideo)}
                controls
                className="w-full h-full object-contain"
                preload="metadata"
              />
            </div>
          </div>

          <p className="text-xs font-bold text-zinc-500 mt-4 flex items-center gap-1.5 uppercase tracking-wide">
            <AlertCircle className="w-3.5 h-3.5" />
            Uploading a new video will replace the current one
          </p>
        </div>
      ) : (
        <div className="mb-8 p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-zinc-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-zinc-700">
            <p className="font-bold text-zinc-900">Missing Video Introduction</p>
            <p className="mt-1">
              Adding a short self-intro dramatically increases response rates. Some employers might explicitly require a video introduction.
            </p>
          </div>
        </div>
      )}

      {/* Upload Zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 ease-out group ${
          dragOver
            ? 'border-zinc-900 bg-zinc-50 scale-[1.01]'
            : 'border-zinc-300 hover:border-zinc-500 hover:bg-zinc-50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept={ALLOWED_VIDEO_TYPES.join(',')}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-14 w-14 border-4 border-zinc-200 border-t-zinc-900 mb-4 shadow-sm"></div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Upload className="w-5 h-5 text-zinc-400 animate-pulse" />
              </div>
            </div>
            <p className="text-base font-extrabold text-zinc-900 mb-1">Processing Video</p>
            <p className="text-sm font-medium text-zinc-500">Optimizing format & uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-white border border-zinc-200 shadow-sm rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 ease-out">
              <Upload className="w-8 h-8 text-zinc-400 group-hover:text-zinc-900 transition-colors" />
            </div>
            
            <p className="text-base font-bold text-zinc-900 mb-2">
              Drag & drop your video, or{' '}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-white bg-zinc-900 px-3 py-1 rounded-lg text-sm hover:bg-zinc-800 transition-colors shadow-sm ml-1"
              >
                Browse Files
              </button>
            </p>
            <p className="text-sm font-medium text-zinc-500">
              Supports MP4, WEBM, MOV up to {MAX_VIDEO_SIZE_MB}MB
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoSection;
