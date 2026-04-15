// frontend/src/components/candidate/profile/ProfilePhotoSection.jsx
import React, { useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { uploadProfilePhoto, deleteProfilePhoto } from '../../../store/slices/candidateSlice';

const ProfilePhotoSection = ({ profile }) => {
  const dispatch = useDispatch();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
    };
    reader.readAsDataURL(file);

    // Upload file
    uploadPhoto(file);
  };

  const uploadPhoto = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('profilePhoto', file);

      console.log('Uploading photo:', file.name, file.size);
      const result = await dispatch(uploadProfilePhoto(formData)).unwrap();
      console.log('Upload result:', result);
      
      toast.success('Profile photo updated successfully');
      setPreviewUrl(null);
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      toast.error(error || 'Failed to upload photo');
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) {
      return;
    }

    try {
      await dispatch(deleteProfilePhoto()).unwrap();
      toast.success('Profile photo removed successfully');
    } catch (error) {
      console.error('Photo removal error:', error);
      toast.error(error || 'Failed to remove photo');
    }
  };

  const currentPhotoUrl = previewUrl || (profile?.profilePhotoUrl ? `http://localhost:4000${profile.profilePhotoUrl}` : null);

  return (
    <div className="p-6 border-b border-zinc-200">
      <h2 className="text-xl font-semibold text-zinc-900 mb-6">Profile Photo</h2>
      
      <div className="flex items-center space-x-6">
        {/* Photo Display */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-100 border-2 border-zinc-200">
            {currentPhotoUrl ? (
              <img
                src={currentPhotoUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex-1">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {profile?.profilePhotoUrl ? 'Change Photo' : 'Upload Photo'}
            </button>
            
            {profile?.profilePhotoUrl && (
              <button
                onClick={removePhoto}
                disabled={uploading}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Remove Photo
              </button>
            )}
          </div>
          
          <p className="text-sm text-zinc-500 mt-2">
            JPG, PNG or GIF. Max size 5MB. Recommended: 400x400px
          </p>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default ProfilePhotoSection;