// frontend/src/components/common/ProfileImageUpload.jsx
import React, { useState, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Upload, X, Camera, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';

const ProfileImageUpload = ({ theme = 'candidate' }) => {
  const { user } = useUser();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      await user.setProfileImage({ file });
      toast.success('Profile photo updated successfully');
    } catch (error) {
      console.error('Profile image upload error:', error);
      toast.error(error.errors?.[0]?.message || 'Failed to upload profile photo');
    } finally {
      setUploading(false);
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = async () => {
    if (!user.hasImage) return;

    setDeleting(true);
    try {
      await user.setProfileImage({ file: null });
      toast.success('Profile photo removed successfully');
    } catch (error) {
      console.error('Profile image deletion error:', error);
      toast.error('Failed to remove profile photo');
    } finally {
      setDeleting(false);
    }
  };

  const primaryColor = theme === 'employer' ? 'slate-900' : 'blue-600';
  const primaryHoverColor = theme === 'employer' ? 'slate-800' : 'blue-700';

  return (
    <div className="p-6 border-b border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Photo</h3>
      
      <div className="flex items-center space-x-6">
        {/* Profile Image Display */}
        <div className="relative">
          <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
            {user?.imageUrl ? (
              <img 
                src={user.imageUrl} 
                alt={user.fullName || 'Profile'} 
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                <Camera className="h-10 w-10 text-gray-400" />
              </div>
            )}
          </div>
          
          {/* Loading Overlay */}
          {(uploading || deleting) && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          )}
        </div>

        {/* Upload Controls */}
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading || deleting}
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || deleting}
              className={`inline-flex items-center px-4 py-2 bg-${primaryColor} text-white rounded-md hover:bg-${primaryHoverColor} disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload Photo'}
            </button>

            {user?.hasImage && (
              <button
                onClick={handleDeleteImage}
                disabled={uploading || deleting}
                className="inline-flex items-center px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <X className="h-4 w-4 mr-2" />
                {deleting ? 'Removing...' : 'Remove'}
              </button>
            )}
          </div>
          
          <p className="mt-2 text-xs text-gray-500">
            JPG, PNG or GIF. Max size 5MB. Recommended: Square image, at least 200x200px.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileImageUpload;
