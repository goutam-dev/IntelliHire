import React, { useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react";
import { uploadResume } from "../../store/slices/candidateSlice";
import { fetchProfileCompletion } from "../../store/slices/profileCompletionSlice";

const ResumeUpload = ({ onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const { profile, loading } = useSelector((state) => state.candidate);
  const fileInputRef = useRef(null);

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file) => {
    setError(null);

    // Validate file type
    if (file.type !== "application/pdf") {
      setError("Please select a PDF file");
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    setSelectedFile(file);
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("resume", selectedFile);

    try {
      setUploadProgress(0);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      console.log('Uploading resume:', selectedFile.name); // Debug log
      const result = await dispatch(uploadResume(formData)).unwrap();
      console.log('Resume upload result:', result); // Debug log

      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadSuccess(true);

      // Refresh profile completion
      await dispatch(fetchProfileCompletion());

      setTimeout(() => {
        onSuccess && onSuccess(result);
        onClose && onClose();
      }, 1000);
    } catch (error) {
      console.error('Resume upload error:', error); // Debug log
      setError(error.message || "Failed to upload resume");
      setUploadProgress(0);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-2 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => {
            if (!loading && uploadProgress === 0) {
              onClose && onClose();
            }
          }}
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md mx-auto border border-gray-200"
        >
          <div className="p-4 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center">
                <div className="bg-blue-100 p-2 rounded-lg mr-2 sm:mr-3">
                  <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                  Upload Resume
                </h2>
              </div>
              <button
                onClick={() => {
                  if (!loading && uploadProgress === 0) {
                    onClose && onClose();
                  }
                }}
                disabled={loading || uploadProgress > 0}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Current Resume Info */}
            {profile?.resume?.fileName && !selectedFile && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <FileText className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm text-green-800">
                    Current: {profile.resume.fileName}
                  </span>
                </div>
              </div>
            )}

            {/* Upload Area */}
            <div
              className={`relative border-2 border-dashed rounded-lg sm:rounded-xl p-4 sm:p-6 md:p-8 text-center transition-colors ${
                dragActive
                  ? "border-blue-400 bg-blue-50"
                  : selectedFile
                  ? "border-green-400 bg-green-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileInputChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              {!selectedFile ? (
                <div>
                  <Upload className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <p className="text-base sm:text-lg font-medium text-gray-900 mb-1 sm:mb-2">
                    Drop your resume here
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-4">
                    or click to browse files
                  </p>
                  <p className="text-xs text-gray-400">PDF only, max 5MB</p>
                </div>
              ) : (
                <div>
                  <FileText className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-green-500 mx-auto mb-3 sm:mb-4" />
                  <p className="text-sm sm:text-base md:text-lg font-medium text-gray-900 mb-1 break-all">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                    {formatFileSize(selectedFile.size)}
                  </p>

                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="mb-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        Uploading... {uploadProgress}%
                      </p>
                    </div>
                  )}

                  {uploadProgress === 100 && (
                    <div className="flex items-center justify-center text-green-600 mb-4">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      <span className="text-sm font-medium">
                        Upload complete!
                      </span>
                    </div>
                  )}

                  {uploadProgress === 0 && (
                    <button
                      onClick={removeFile}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Remove file
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center"
                >
                  <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                  <span className="text-sm text-red-700">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
              <button
                onClick={onClose}
                className="w-full sm:flex-1 px-4 py-2.5 sm:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
                disabled={
                  loading || (uploadProgress > 0 && uploadProgress < 100)
                }
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={
                  !selectedFile ||
                  loading ||
                  (uploadProgress > 0 && uploadProgress < 100)
                }
                className="w-full sm:flex-1 px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
              >
                {loading || (uploadProgress > 0 && uploadProgress < 100)
                  ? "Uploading..."
                  : "Upload Resume"}
              </button>
            </div>

            {/* Progress Info */}
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                Uploading your resume will increase your profile completion to
                40%
              </p>
            </div>
          </div>

          {/* Loading Overlay */}
          {(loading || uploadProgress > 0 || uploadSuccess) && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <div className="text-center">
                {uploadSuccess ? (
                  <div className="text-green-600">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3" />
                    <p className="text-lg font-medium">Resume Uploaded!</p>
                    <p className="text-sm text-gray-600">
                      Updating your profile...
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    <p className="text-sm font-medium text-gray-700">
                      {uploadProgress > 0
                        ? `Uploading... ${uploadProgress}%`
                        : "Processing..."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ResumeUpload;
