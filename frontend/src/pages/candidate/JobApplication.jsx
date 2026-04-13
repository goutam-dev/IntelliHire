import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Clock,
  FileText,
  Check,
  AlertCircle,
  Edit3,
  GraduationCap,
  Briefcase,
  Target,
  User,
  Mail,
  Phone,
  MapPin as LocationIcon,
  X,
  CheckCircle,
  Eye,
  Video,
  Film,
  Play,
} from "lucide-react";

import {
  fetchProfileData,
  submitJobApplication,
  checkApplicationStatus,
  clearError,
  clearSuccessMessage,
} from "../../store/slices/jobApplicationsSlice";
import { fetchJobById } from "../../store/slices/jobSlice";
import { getCurrencySymbol } from "../../constants/jobConstants";

// Import form components
// ResumeUpload removed - using inline file picker for job applications

// Skills editing component for job applications
const SkillsEditingSection = ({ skills, onSkillsUpdate }) => {
  const [newSkill, setNewSkill] = useState('');
  
  // Popular skills suggestions
  const skillSuggestions = [
    'JavaScript', 'Python', 'React', 'Node.js', 'HTML/CSS', 'Java', 'C++', 'SQL',
    'MongoDB', 'PostgreSQL', 'Git', 'Docker', 'AWS', 'Azure', 'TypeScript',
    'Vue.js', 'Angular', 'Express.js', 'Django', 'Flask', 'Spring Boot',
    'Machine Learning', 'Data Analysis', 'Project Management', 'Agile/Scrum',
    'Communication', 'Leadership', 'Problem Solving', 'Team Collaboration'
  ];

  const addSkill = (skillToAdd = null) => {
    const skill = skillToAdd || newSkill.trim();
    if (!skill) return;
    
    if (skills.some(existingSkill => existingSkill.toLowerCase() === skill.toLowerCase())) {
      if (!skillToAdd) setNewSkill('');
      return; // Skill already exists
    }
    
    onSkillsUpdate([...skills, skill]);
    if (!skillToAdd) setNewSkill('');
  };

  const removeSkill = (indexToRemove) => {
    onSkillsUpdate(skills.filter((_, index) => index !== indexToRemove));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 mb-4">
        Edit your skills for this job application. These changes will only apply to this application.
      </p>
      
      {/* Add new skill */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Add Skills
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a skill and press Enter"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={addSkill}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Current skills */}
      <div>
        <h4 className="text-sm font-medium text-slate-700 mb-3">
          Current Skills ({skills.length})
        </h4>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200"
            >
              <span>{skill}</span>
              <button
                type="button"
                onClick={() => removeSkill(index)}
                className="text-blue-500 hover:text-blue-700 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        {skills.length === 0 && (
          <p className="text-slate-500 text-sm">No skills added yet.</p>
        )}
      </div>

      {/* Skill suggestions */}
      <div>
        <h4 className="text-sm font-medium text-slate-700 mb-3">
          Popular Skills (Click to add)
        </h4>
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
          {skillSuggestions
            .filter(suggestion => !skills.some(skill => skill.toLowerCase() === suggestion.toLowerCase()))
            .slice(0, 15)
            .map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => addSkill(skill)}
                className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full text-sm hover:bg-slate-200 transition-colors"
              >
                {skill}
              </button>
            ))}
        </div>
      </div>

      {/* Bulk edit option */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Or edit as comma-separated text
        </label>
        <textarea
          value={skills.join(', ')}
          onChange={(e) => {
            const skillsArray = e.target.value
              .split(',')
              .map(skill => skill.trim())
              .filter(skill => skill.length > 0);
            onSkillsUpdate(skillsArray);
          }}
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., React, JavaScript, TypeScript, Node.js, Python"
        />
        <p className="text-xs text-slate-500 mt-1">
          Separate skills with commas
        </p>
      </div>
    </div>
  );
};

const formatHumanDate = (value) => {
  if (!value) return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }

    return trimmed;
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }

  return String(value);
};

const JobApplication = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  // Get job data from location state or fetch it
  const jobFromState = location.state?.job;
  const returnTo = location.state?.returnTo || "/candidate/jobs";

  // Redux state
  const { currentJob: selectedJob, currentJobLoading: jobLoading } = useSelector(
    (state) => state.jobs
  );
  const { 
    profileData, 
    loading, 
    error, 
    successMessage, 
    applicationStatuses 
  } = useSelector((state) => state.jobApplications);

  // Debug logging
  console.log('JobApplication Debug:', {
    jobId,
    jobFromState,
    selectedJob,
    jobLoading,
    profileData,
    loading,
    error
  });

  // Local state for application-specific profile data
  const [applicationProfile, setApplicationProfile] = useState({
    personalInfo: {
      name: "",
      email: "",
      phone: "",
      location: "",
    },
    experience: [],
    education: [],
    skills: [],
  });

  // Form states
  const [editingSections, setEditingSections] = useState({
    personalInfo: false,
    experience: false,
    education: false,
    skills: false,
  });

  // Application form state
  const [applicationForm, setApplicationForm] = useState({
    resumeOption: "existing", // 'existing' or 'new'
    newResumeFile: null,
    videoOption: "existing", // 'existing' or 'new'
    newVideoFile: null,
    coverLetter: "",
    profileAccuracyConfirmed: false,
  });

  // UI states
  const [isSubmitting, setIsSubmitting] = useState(false);

  // In-page video recorder state (used for application video)
  const [isRecorderOpen, setIsRecorderOpen] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState("");
  const [recordingError, setRecordingError] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasMicTrack, setHasMicTrack] = useState(true);
  const [recordingInfo, setRecordingInfo] = useState('');
  const recorderVideoRef = useRef(null);
  const recorderStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const micAudioCtxRef = useRef(null);
  const micAnalyserRef = useRef(null);
  const micRafRef = useRef(null);

  const handleResumePreview = () => {
    console.log('Resume data:', profileData?.resume); // Debug log
    
    if (!profileData?.resume) {
      alert('No resume found in profile.');
      return;
    }

    const resume = profileData.resume;
    let resumeUrl = null;

    // Try different URL formats
    if (resume.fileUrl) {
      resumeUrl = resume.fileUrl;
    } else if (resume.path) {
      // Construct URL from path
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';
      resumeUrl = resume.path.startsWith('/') ? `${baseUrl}${resume.path}` : `${baseUrl}/${resume.path}`;
    } else if (resume.url) {
      resumeUrl = resume.url;
    }

    if (resumeUrl) {
      console.log('Opening resume URL:', resumeUrl); // Debug log
      window.open(resumeUrl, '_blank');
    } else {
      // Show resume info if URL not available
      const resumeInfo = [
        `Resume: ${resume.originalName || resume.filename || 'Unknown'}`,
        `Uploaded: ${resume.uploadedAt ? new Date(resume.uploadedAt).toLocaleDateString() : 'Unknown date'}`,
        `Size: ${resume.size ? (resume.size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown'}`,
        '',
        'File preview not available. Please contact support if this issue persists.'
      ].join('\n');
      
      alert(resumeInfo);
    }
  };

  // Get the current job data
  const currentJob = jobFromState || selectedJob;

  const formatSalaryBadge = (salaryRange) => {
    if (!salaryRange || (!salaryRange.min && !salaryRange.max)) return null;

    const symbol = getCurrencySymbol(salaryRange.currency || "USD");
    const formatAmount = (amount) => Number(amount).toLocaleString("en-US", {
      maximumFractionDigits: 0,
    });

    if (salaryRange.min && salaryRange.max) {
      return `${symbol}${formatAmount(salaryRange.min)} - ${symbol}${formatAmount(salaryRange.max)}`;
    }

    if (salaryRange.min) {
      return `From ${symbol}${formatAmount(salaryRange.min)}`;
    }

    return `Up to ${symbol}${formatAmount(salaryRange.max)}`;
  };

  // Debug: Log job data to check company field
  useEffect(() => {
    console.log('Current Job Data:', currentJob);
    console.log('Company:', currentJob?.company);
    console.log('Employer:', currentJob?.employer);
  }, [currentJob]);

  // Get application status for this job
  const applicationStatus = applicationStatuses[jobId];
  const hasApplied = applicationStatus?.hasApplied || false;
  const existingApplication = applicationStatus?.application;
  const requirementMatch = profileData?.jobRequirementMatch;

  // Load data on component mount
  useEffect(() => {
    // Fetch job data if not available
    if (!jobFromState && jobId) {
      dispatch(fetchJobById(jobId));
    }

    // Fetch profile data
    dispatch(fetchProfileData(jobId));

    // Check application status for this job
    if (jobId) {
      dispatch(checkApplicationStatus(jobId));
    }
  }, [dispatch, jobId, jobFromState]);

  // Update application profile when profile data is loaded
  useEffect(() => {
    if (profileData) {
      setApplicationProfile({
        personalInfo: {
          name: profileData.personalInfo?.name || "",
          email: profileData.personalInfo?.email || "",
          phone: profileData.personalInfo?.phone || "",
          location: profileData.personalInfo?.location || "",
        },
        experience: profileData.experience || [],
        education: profileData.education || [],
        skills: profileData.skills || [],
      });
    }
  }, [profileData]);

  // Clear messages after some time
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        dispatch(clearSuccessMessage());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, dispatch]);

  const handleSectionEdit = (section) => {
    setEditingSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleSectionSave = (section) => {
    // Validate required fields before saving
    if (section === 'personalInfo') {
      const { name, email, phone } = applicationProfile.personalInfo;
      if (!name.trim() || !email.trim() || !phone.trim()) {
        alert('Name, email, and phone are required fields.');
        return;
      }
    }
    
    setEditingSections((prev) => ({
      ...prev,
      [section]: false,
    }));
  };

  const handleSectionCancel = (section) => {
    // Reset to original profile data
    if (profileData) {
      if (section === 'personalInfo') {
        setApplicationProfile(prev => ({
          ...prev,
          personalInfo: {
            name: profileData.personalInfo?.name || "",
            email: profileData.personalInfo?.email || "",
            phone: profileData.personalInfo?.phone || "",
            location: profileData.personalInfo?.location || "",
          }
        }));
      } else if (section === 'experience') {
        setApplicationProfile(prev => ({
          ...prev,
          experience: profileData.experience || []
        }));
      } else if (section === 'education') {
        setApplicationProfile(prev => ({
          ...prev,
          education: profileData.education || []
        }));
      } else if (section === 'skills') {
        setApplicationProfile(prev => ({
          ...prev,
          skills: profileData.skills || []
        }));
      }
    }
    
    setEditingSections((prev) => ({
      ...prev,
      [section]: false,
    }));
  };

  const handlePersonalInfoChange = (field, value) => {
    setApplicationProfile((prev) => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [field]: value,
      },
    }));
  };

  const handleExperienceUpdate = (updatedExperience) => {
    setApplicationProfile((prev) => ({
      ...prev,
      experience: updatedExperience,
    }));
  };

  const handleEducationUpdate = (updatedEducation) => {
    setApplicationProfile((prev) => ({
      ...prev,
      education: updatedEducation,
    }));
  };

  const handleSkillsUpdate = (updatedSkills) => {
    setApplicationProfile((prev) => ({
      ...prev,
      skills: updatedSkills,
    }));
  };



  const handleResumeFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      alert('Please select a PDF file.');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB.');
      return;
    }

    setApplicationForm((prev) => ({
      ...prev,
      newResumeFile: file,
    }));
  };

  const handleVideoFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid video file (MP4, WEBM, MOV, or AVI).');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('Video file size must be less than 50MB.');
      return;
    }

    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl('');
    }

    setApplicationForm((prev) => ({
      ...prev,
      newVideoFile: file,
    }));
  };

  const cleanupRecorderStream = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];

    if (recorderStreamRef.current) {
      recorderStreamRef.current.getTracks().forEach((track) => track.stop());
      recorderStreamRef.current = null;
    }

    if (recorderVideoRef.current) {
      recorderVideoRef.current.srcObject = null;
    }

    if (micRafRef.current) {
      cancelAnimationFrame(micRafRef.current);
      micRafRef.current = null;
    }

    if (micAudioCtxRef.current) {
      micAudioCtxRef.current.close().catch(() => {});
      micAudioCtxRef.current = null;
    }

    micAnalyserRef.current = null;
    setAudioLevel(0);
    setHasMicTrack(true);
    setRecordingInfo('');
  }, []);

  const handleOpenRecorder = async () => {
    setRecordingError("");
    setRecordingInfo('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30, min: 24 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });

      const audioTracks = stream.getAudioTracks();
      const micPresent = audioTracks.length > 0;
      setHasMicTrack(micPresent);

      if (!micPresent) {
        stream.getTracks().forEach((t) => t.stop());
        setRecordingError('Microphone track was not detected. Please enable microphone permission and try again.');
        return;
      }

      recorderStreamRef.current = stream;
      setIsRecorderOpen(true);

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.7;
        source.connect(analyser);

        micAudioCtxRef.current = audioCtx;
        micAnalyserRef.current = analyser;

        const data = new Uint8Array(analyser.fftSize);
        const tick = () => {
          const node = micAnalyserRef.current;
          if (!node) return;
          node.getByteTimeDomainData(data);
          let sumSq = 0;
          for (let i = 0; i < data.length; i += 1) {
            const centered = (data[i] - 128) / 128;
            sumSq += centered * centered;
          }
          const rms = Math.sqrt(sumSq / data.length);
          const normalized = Math.min(1, rms * 8);
          setAudioLevel(normalized);
          micRafRef.current = requestAnimationFrame(tick);
        };
        tick();
      }
    } catch (err) {
      setRecordingError('Could not access camera/microphone. Please allow permissions and try again.');
    }
  };

  const handleStartRecording = () => {
    const stream = recorderStreamRef.current;
    if (!stream) {
      setRecordingError('Recorder is not initialized.');
      return;
    }

    if (!hasMicTrack) {
      setRecordingError('Microphone is not available. Please enable it before recording.');
      return;
    }

    const supportedTypes = [
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9,opus',
      'video/mp4',
      'video/webm',
    ];
    const mimeType = supportedTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';

    try {
      recordedChunksRef.current = [];
      const recorderOptions = mimeType
        ? {
            mimeType,
            audioBitsPerSecond: 128000,
            videoBitsPerSecond: 3500000,
          }
        : {
            audioBitsPerSecond: 128000,
            videoBitsPerSecond: 3500000,
          };
      const recorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = recorder;
      setRecordingInfo(`Recording format: ${recorder.mimeType || mimeType || 'browser-default'}`);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        setIsRecordingVideo(false);
        const finalMimeType = recorder.mimeType || 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type: finalMimeType });

        if (!blob.size) {
          setRecordingError('Recording failed. Please try again.');
          return;
        }

        if (blob.size > 50 * 1024 * 1024) {
          setRecordingError('Recorded video exceeds 50MB. Please record a shorter introduction.');
          return;
        }

        const extension = finalMimeType.includes('mp4') ? 'mp4' : 'webm';
        const file = new File([blob], `application-intro-${Date.now()}.${extension}`, {
          type: finalMimeType,
        });

        if (recordedVideoUrl) {
          URL.revokeObjectURL(recordedVideoUrl);
        }
        const previewUrl = URL.createObjectURL(blob);
        setRecordedVideoUrl(previewUrl);

        setApplicationForm((prev) => ({
          ...prev,
          videoOption: 'new',
          newVideoFile: file,
        }));
      };

      recorder.start(250);
      setIsRecordingVideo(true);
      setRecordingError('');
    } catch {
      setRecordingError('Could not start recording. Please try again.');
    }
  };

  const handleStopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  };

  const handleCloseRecorder = () => {
    cleanupRecorderStream();
    setIsRecorderOpen(false);
    setIsRecordingVideo(false);
  };

  useEffect(() => {
    if (isRecorderOpen && recorderVideoRef.current && recorderStreamRef.current) {
      recorderVideoRef.current.srcObject = recorderStreamRef.current;
    }
  }, [isRecorderOpen]);

  useEffect(() => {
    return () => {
      cleanupRecorderStream();
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
      }
    };
  }, [cleanupRecorderStream, recordedVideoUrl]);

  const handleCoverLetterChange = (e) => {
    const value = e.target.value;
    if (value.length <= 500) {
      setApplicationForm((prev) => ({
        ...prev,
        coverLetter: value,
      }));
    }
  };

  const handleSubmitApplication = async () => {
    // Check if user has already applied (safety check)
    if (hasApplied) {
      alert("You have already applied to this job.");
      return;
    }

    if (!applicationForm.profileAccuracyConfirmed) {
      alert("Please confirm that your profile information is accurate.");
      return;
    }

    // Validate required personal info
    const { name, email, phone } = applicationProfile.personalInfo;
    if (!name.trim() || !email.trim() || !phone.trim()) {
      alert('Please fill in all required personal information (Name, Email, Phone).');
      return;
    }

    // Validate video: must have either an existing profile video (when opting "existing") or a new file
    if (applicationForm.videoOption === 'existing' && !profileData?.video) {
      alert('You do not have a video introduction in your profile. Please upload a new video for this application.');
      return;
    }
    if (applicationForm.videoOption === 'new' && !applicationForm.newVideoFile) {
      alert('Please select a video file to upload with your application.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();

      // Add job ID
      formData.append("jobId", jobId);

      // Add application-specific profile data
      formData.append("applicationProfile", JSON.stringify(applicationProfile));

      // Add resume
      if (
        applicationForm.resumeOption === "new" &&
        applicationForm.newResumeFile
      ) {
        formData.append("resume", applicationForm.newResumeFile);
      } else {
        formData.append("useExistingResume", "true");
      }

      // Add video
      if (applicationForm.videoOption === "new" && applicationForm.newVideoFile) {
        formData.append("applicationVideo", applicationForm.newVideoFile);
      } else {
        formData.append("useExistingVideo", "true");
      }

      // Add cover letter
      if (applicationForm.coverLetter.trim()) {
        formData.append("coverLetter", applicationForm.coverLetter);
      }

      // Add profile accuracy confirmation
      formData.append("profileAccuracyConfirmed", "true");

      const result = await dispatch(submitJobApplication(formData)).unwrap();

      // Force refresh application status to ensure UI is updated immediately
      dispatch(checkApplicationStatus(jobId));

      // Show success message and redirect after a short delay
      setTimeout(() => {
        navigate(returnTo, {
          state: {
            message: "Application submitted successfully!",
            appliedJobId: jobId,
            applicationId: result.applicationId,
            forceRefresh: true // Flag to force refresh in BrowseJobs
          },
        });
      }, 2000);
    } catch (error) {
      console.error("Application submission failed:", error);
      // Error is handled by Redux and shown in UI
    } finally {
      setIsSubmitting(false);
    }
  };

  if (jobLoading || loading.fetchingProfile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading application form...</p>
        </div>
      </div>
    );
  }

  if (!currentJob) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Job Not Found
          </h2>
          <p className="text-slate-600 mb-4">
            The job you're trying to apply for could not be found.
          </p>
          <button
            onClick={() => navigate("/candidate/jobs")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(returnTo)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Jobs</span>
            </button>
            <div className="text-sm text-slate-500">
              Application for:{" "}
              <span className="font-medium text-slate-900">
                {currentJob.title}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Success/Error Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
            <button
              onClick={() => dispatch(clearError())}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Job Information Card */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                {currentJob.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                <div className="flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  <span>
                    {currentJob.company ||
                      currentJob.employer?.companyName ||
                      "Company"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{currentJob.location}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{currentJob.employmentType}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                  {currentJob.experienceLevel}
                </div>
                {currentJob.salaryRange && (
                  <div className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                    {formatSalaryBadge(currentJob.salaryRange)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {requirementMatch && (
          <div
            className={`mb-8 p-4 rounded-lg border flex items-start gap-3 ${
              requirementMatch.meetsAll
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {requirementMatch.meetsAll ? (
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">
              {requirementMatch.meetsAll
                ? requirementMatch.positiveMessage
                : requirementMatch.warningMessage}
            </p>
          </div>
        )}

        {/* Application Form */}
        <div className="space-y-8">
          {/* Personal Information Section */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Personal Information
                    </h2>
                    <p className="text-xs text-slate-500">
                      Changes here only apply to this application
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {editingSections.personalInfo ? (
                    <>
                      <button
                        onClick={() => handleSectionCancel('personalInfo')}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSectionSave('personalInfo')}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Save
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleSectionEdit('personalInfo')}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6">
              {editingSections.personalInfo ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={applicationProfile.personalInfo.name}
                      onChange={(e) =>
                        handlePersonalInfoChange("name", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={applicationProfile.personalInfo.email}
                      onChange={(e) =>
                        handlePersonalInfoChange("email", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your email address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={applicationProfile.personalInfo.phone}
                      onChange={(e) =>
                        handlePersonalInfoChange("phone", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your phone number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      value={applicationProfile.personalInfo.location}
                      onChange={(e) =>
                        handlePersonalInfoChange("location", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-900">
                      {applicationProfile.personalInfo.name || "Not provided"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-900">
                      {applicationProfile.personalInfo.email || "Not provided"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-900">
                      {applicationProfile.personalInfo.phone || "Not provided"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <LocationIcon className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-900">
                      {applicationProfile.personalInfo.location ||
                        "Not provided"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Experience Section */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Work Experience
                    </h2>
                    <p className="text-xs text-slate-500">
                      Changes here only apply to this application
                    </p>
                  </div>
                  <span className="text-sm text-slate-500 ml-2">
                    ({applicationProfile.experience.length} entries)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {editingSections.experience ? (
                    <>
                      <button
                        onClick={() => handleSectionCancel('experience')}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSectionSave('experience')}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Save
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleSectionEdit('experience')}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6">
              {editingSections.experience ? (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600 mb-4">
                    Edit your work experience entries. You can modify the details for this specific job application.
                  </p>
                  {applicationProfile.experience.map((exp, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Job Title <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={exp.title || exp.jobTitle || ''}
                            onChange={(e) => {
                              const updatedExp = [...applicationProfile.experience];
                              updatedExp[index] = { ...updatedExp[index], title: e.target.value };
                              handleExperienceUpdate(updatedExp);
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter job title"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Company <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={exp.companyName || exp.company || ''}
                            onChange={(e) => {
                              const updatedExp = [...applicationProfile.experience];
                              updatedExp[index] = { ...updatedExp[index], companyName: e.target.value };
                              handleExperienceUpdate(updatedExp);
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter company name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Start Date
                          </label>
                          <input
                            type="text"
                            value={formatHumanDate(exp.startDate)}
                            onChange={(e) => {
                              const updatedExp = [...applicationProfile.experience];
                              updatedExp[index] = { ...updatedExp[index], startDate: e.target.value };
                              handleExperienceUpdate(updatedExp);
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., Jan 2022"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            End Date
                          </label>
                          <input
                            type="text"
                            value={exp.currentlyWorking ? 'Present' : formatHumanDate(exp.endDate)}
                            onChange={(e) => {
                              const updatedExp = [...applicationProfile.experience];
                              if (e.target.value.toLowerCase() === 'present') {
                                updatedExp[index] = { ...updatedExp[index], currentlyWorking: true, endDate: null };
                              } else {
                                updatedExp[index] = { ...updatedExp[index], currentlyWorking: false, endDate: e.target.value };
                              }
                              handleExperienceUpdate(updatedExp);
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., Present or Dec 2023"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Description
                        </label>
                        <textarea
                          value={exp.description || ''}
                          onChange={(e) => {
                            const updatedExp = [...applicationProfile.experience];
                            updatedExp[index] = { ...updatedExp[index], description: e.target.value };
                            handleExperienceUpdate(updatedExp);
                          }}
                          rows={3}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Describe your responsibilities and achievements..."
                        />
                      </div>
                    </div>
                  ))}
                  {applicationProfile.experience.length === 0 && (
                    <p className="text-slate-500 text-center py-4">
                      No work experience found in your profile. Please complete your profile first.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {applicationProfile.experience.length > 0 ? (
                    applicationProfile.experience.map((exp, index) => (
                      <div
                        key={index}
                        className="border border-slate-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              {exp.title || exp.jobTitle || 'Job Title'}
                            </h3>
                            <p className="text-slate-600">{exp.companyName || exp.company || 'Company'}</p>
                          </div>
                          <span className="text-sm text-slate-500">
                            {formatHumanDate(exp.startDate) || 'Start date not specified'} -{" "}
                            {exp.currentlyWorking || exp.isCurrentJob ? "Present" : (formatHumanDate(exp.endDate) || 'End date not specified')}
                          </span>
                        </div>
                        {exp.description && (
                          <p className="text-sm text-slate-600 mt-2">
                            {exp.description}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-center py-4">
                      No work experience added yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Education Section */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Education
                    </h2>
                    <p className="text-xs text-slate-500">
                      Changes here only apply to this application
                    </p>
                  </div>
                  <span className="text-sm text-slate-500 ml-2">
                    ({applicationProfile.education.length} entries)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {editingSections.education ? (
                    <>
                      <button
                        onClick={() => handleSectionCancel('education')}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSectionSave('education')}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Save
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleSectionEdit('education')}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6">
              {editingSections.education ? (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600 mb-4">
                    Edit your education entries. You can modify the details for this specific job application.
                  </p>
                  {applicationProfile.education.map((edu, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Degree <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={edu.degree || ''}
                            onChange={(e) => {
                              const updatedEdu = [...applicationProfile.education];
                              updatedEdu[index] = { ...updatedEdu[index], degree: e.target.value };
                              handleEducationUpdate(updatedEdu);
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., Bachelor of Science"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Institution <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={edu.institution || ''}
                            onChange={(e) => {
                              const updatedEdu = [...applicationProfile.education];
                              updatedEdu[index] = { ...updatedEdu[index], institution: e.target.value };
                              handleEducationUpdate(updatedEdu);
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter institution name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Start Year
                          </label>
                          <input
                            type="text"
                            value={edu.startYear || (edu.startDate ? new Date(edu.startDate).getFullYear() : '') || ''}
                            onChange={(e) => {
                              const updatedEdu = [...applicationProfile.education];
                              updatedEdu[index] = { ...updatedEdu[index], startYear: e.target.value };
                              handleEducationUpdate(updatedEdu);
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., 2018"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            End Year
                          </label>
                          <input
                            type="text"
                            value={edu.endYear || (edu.endDate ? new Date(edu.endDate).getFullYear() : '') || ''}
                            onChange={(e) => {
                              const updatedEdu = [...applicationProfile.education];
                              updatedEdu[index] = { ...updatedEdu[index], endYear: e.target.value };
                              handleEducationUpdate(updatedEdu);
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., 2022"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Field of Study
                          </label>
                          <input
                            type="text"
                            value={edu.fieldOfStudy || ''}
                            onChange={(e) => {
                              const updatedEdu = [...applicationProfile.education];
                              updatedEdu[index] = { ...updatedEdu[index], fieldOfStudy: e.target.value };
                              handleEducationUpdate(updatedEdu);
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., Computer Science"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            GPA
                          </label>
                          <input
                            type="text"
                            value={edu.gpa || edu.grade || ''}
                            onChange={(e) => {
                              const updatedEdu = [...applicationProfile.education];
                              updatedEdu[index] = { ...updatedEdu[index], gpa: e.target.value };
                              handleEducationUpdate(updatedEdu);
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., 3.8 or A"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {applicationProfile.education.length === 0 && (
                    <p className="text-slate-500 text-center py-4">
                      No education found in your profile. Please complete your profile first.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {applicationProfile.education.length > 0 ? (
                    applicationProfile.education.map((edu, index) => (
                      <div
                        key={index}
                        className="border border-slate-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              {edu.degree}
                            </h3>
                            <p className="text-slate-600">{edu.institution}</p>
                          </div>
                          <span className="text-sm text-slate-500">
                            {edu.startYear || (edu.startDate ? new Date(edu.startDate).getFullYear() : 'Start')} - {edu.endYear || (edu.endDate ? new Date(edu.endDate).getFullYear() : 'End')}
                          </span>
                        </div>
                        {edu.fieldOfStudy && (
                          <p className="text-sm text-slate-600">
                            Field: {edu.fieldOfStudy}
                          </p>
                        )}
                        {(edu.gpa || edu.grade) && (
                          <p className="text-sm text-slate-600">
                            GPA: {edu.gpa || edu.grade}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-center py-4">
                      No education information added yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Skills Section */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Skills
                    </h2>
                    <p className="text-xs text-slate-500">
                      Changes here only apply to this application
                    </p>
                  </div>
                  <span className="text-sm text-slate-500 ml-2">
                    ({applicationProfile.skills.length} skills)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {editingSections.skills ? (
                    <>
                      <button
                        onClick={() => handleSectionCancel('skills')}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSectionSave('skills')}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Save
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleSectionEdit('skills')}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit Skills
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6">
              {editingSections.skills ? (
                <SkillsEditingSection 
                  skills={applicationProfile.skills}
                  onSkillsUpdate={handleSkillsUpdate}
                />
              )
               : (
                <div>
                  {applicationProfile.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {applicationProfile.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-4">
                      No skills added yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Resume Section */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-slate-900">Resume</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {/* Resume Options */}
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="resumeOption"
                      value="existing"
                      checked={applicationForm.resumeOption === "existing"}
                      onChange={(e) =>
                        setApplicationForm((prev) => ({
                          ...prev,
                          resumeOption: e.target.value,
                        }))
                      }
                      className="text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">
                        Use existing resume from profile
                      </div>
                      {profileData?.resume ? (
                        <div className="text-sm text-slate-600 mt-1">
                          {profileData.resume.originalName}
                          <span className="ml-2 text-xs text-slate-500">
                            (Uploaded{" "}
                            {new Date(
                              profileData.resume.uploadedAt
                            ).toLocaleDateString()}
                            )
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm text-red-600 mt-1">
                          No resume found in profile
                        </div>
                      )}
                    </div>
                    {profileData?.resume && (
                      <button
                        onClick={handleResumePreview}
                        className="text-blue-600 hover:text-blue-700"
                        type="button"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="resumeOption"
                      value="new"
                      checked={applicationForm.resumeOption === "new"}
                      onChange={(e) =>
                        setApplicationForm((prev) => ({
                          ...prev,
                          resumeOption: e.target.value,
                        }))
                      }
                      className="text-blue-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">
                        Upload a different resume
                      </div>
                      <div className="text-sm text-slate-600 mt-1">
                        PDF only, max 5MB
                      </div>
                    </div>
                  </label>
                </div>

                {/* File Upload for New Resume */}
                {applicationForm.resumeOption === "new" && (
                  <div className="mt-4">
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleResumeFileChange}
                        className="hidden"
                        id="resume-upload"
                      />
                      <label
                        htmlFor="resume-upload"
                        className="cursor-pointer"
                      >
                        <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-lg font-medium text-slate-900 mb-2">
                          {applicationForm.newResumeFile ? 'Change Resume' : 'Select Resume'}
                        </p>
                        <p className="text-sm text-slate-500 mb-4">
                          PDF only, max 5MB
                        </p>
                        <div className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block">
                          Choose File
                        </div>
                      </label>
                    </div>
                    {applicationForm.newResumeFile && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-green-800 font-medium">
                            Selected: {applicationForm.newResumeFile.name}
                          </span>
                          <span className="text-xs text-green-600">
                            ({(applicationForm.newResumeFile.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <p className="text-xs text-green-600 mt-1">
                          This resume will only be used for this job application
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Video Introduction Section */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-purple-600" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Video Introduction
                  </h2>
                  <p className="text-xs text-slate-500">
                    Required for job applications
                  </p>
                </div>
                <span className="ml-auto text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                  Required
                </span>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {/* Video Options */}
                <div className="space-y-3">
                  <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 ${!profileData?.video ? 'opacity-50 cursor-not-allowed' : 'border-slate-200'}`}>
                    <input
                      type="radio"
                      name="videoOption"
                      value="existing"
                      checked={applicationForm.videoOption === "existing"}
                      disabled={!profileData?.video}
                      onChange={(e) =>
                        setApplicationForm((prev) => ({
                          ...prev,
                          videoOption: e.target.value,
                        }))
                      }
                      className="text-purple-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">
                        Use video from my profile
                      </div>
                      {profileData?.video ? (
                        <div className="text-sm text-slate-600 mt-1">
                          {profileData.video.originalName || profileData.video.filename}
                          <span className="ml-2 text-xs text-slate-500">
                            (Uploaded{" "}
                            {new Date(profileData.video.uploadedAt).toLocaleDateString()})
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm text-amber-600 mt-1">
                          No video found in your profile — upload a new one below
                        </div>
                      )}
                    </div>
                    {profileData?.video && applicationForm.videoOption === "existing" && (
                      <button
                        onClick={() => {
                          const base = import.meta.env.VITE_API_URL || 'http://localhost:4000';
                          const url = profileData.video.fileUrl;
                          window.open(url?.startsWith('http') ? url : `${base}${url}`, '_blank');
                        }}
                        className="text-purple-600 hover:text-purple-700"
                        type="button"
                        title="Preview video"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name="videoOption"
                      value="new"
                      checked={applicationForm.videoOption === "new"}
                      onChange={(e) =>
                        setApplicationForm((prev) => ({
                          ...prev,
                          videoOption: e.target.value,
                        }))
                      }
                      className="text-purple-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">
                        Upload a new video
                      </div>
                      <div className="text-sm text-slate-600 mt-1">
                        MP4, WEBM, MOV, AVI — max 50MB
                      </div>
                    </div>
                  </label>
                </div>

                {/* File Upload for New Video */}
                {applicationForm.videoOption === "new" && (
                  <div className="mt-4">
                    <div className="border-2 border-dashed border-purple-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                        onChange={handleVideoFileChange}
                        className="hidden"
                        id="video-upload"
                      />
                      <label htmlFor="video-upload" className="cursor-pointer">
                        <Video className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                        <p className="text-lg font-medium text-slate-900 mb-2">
                          {applicationForm.newVideoFile ? 'Change Video' : 'Select Video'}
                        </p>
                        <p className="text-sm text-slate-500 mb-4">
                          MP4, WEBM, MOV, AVI — max 50MB
                        </p>
                        <div className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors inline-block">
                          Choose File
                        </div>
                      </label>
                    </div>

                    <div className="mt-3 text-center text-xs text-slate-500">or</div>

                    <div className="mt-3 border border-purple-200 rounded-lg p-4 bg-purple-50/40">
                      <div className="text-xs text-slate-600 mb-3">
                        Best quality for voice verification: record in a quiet room, keep laptop/phone mic near you, and speak clearly for 20-40 seconds.
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">Record video here</p>
                          <p className="text-xs text-slate-600">Uses your current camera + microphone setup for this device/environment.</p>
                        </div>
                        <button
                          type="button"
                          onClick={isRecorderOpen ? handleCloseRecorder : handleOpenRecorder}
                          className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm transition-colors"
                        >
                          {isRecorderOpen ? 'Close Recorder' : 'Open Recorder'}
                        </button>
                      </div>

                      {recordingError && (
                        <div className="mt-3 p-2.5 rounded-md border border-red-200 bg-red-50 text-red-700 text-xs">
                          {recordingError}
                        </div>
                      )}

                      {isRecorderOpen && (
                        <div className="mt-4 space-y-3">
                          <video
                            ref={recorderVideoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full max-h-72 rounded-lg border border-slate-200 bg-black"
                          />
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className={hasMicTrack ? 'text-emerald-700 font-medium' : 'text-red-700 font-medium'}>
                                {hasMicTrack ? 'Mic detected' : 'Mic not detected'}
                              </span>
                              <span className="text-slate-500">Live mic level</span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className={`h-full transition-all duration-75 ${audioLevel > 0.04 ? 'bg-emerald-500' : 'bg-slate-400'}`}
                                style={{ width: `${Math.round(Math.min(1, audioLevel) * 100)}%` }}
                              />
                            </div>
                            <p className="text-[11px] text-slate-500">
                              Speak now and ensure the bar moves before recording.
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!isRecordingVideo ? (
                              <button
                                type="button"
                                onClick={handleStartRecording}
                                disabled={!hasMicTrack}
                                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-sm transition-colors"
                              >
                                Start Recording
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={handleStopRecording}
                                className="px-3 py-2 bg-slate-900 text-white rounded-lg hover:bg-black text-sm transition-colors"
                              >
                                Stop Recording
                              </button>
                            )}
                            {isRecordingVideo && <span className="text-xs text-red-600 font-medium">Recording…</span>}
                          </div>
                          {recordingInfo && (
                            <p className="text-[11px] text-slate-500">{recordingInfo}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {recordedVideoUrl && (
                      <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <p className="text-xs text-emerald-700 font-medium mb-2">Recorded preview</p>
                        <video
                          controls
                          src={recordedVideoUrl}
                          className="w-full max-h-64 rounded border border-emerald-200 bg-black"
                        />
                      </div>
                    )}

                    {applicationForm.newVideoFile && (
                      <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Film className="w-4 h-4 text-purple-600" />
                          <span className="text-sm text-purple-800 font-medium">
                            Selected: {applicationForm.newVideoFile.name}
                          </span>
                          <span className="text-xs text-purple-600">
                            ({(applicationForm.newVideoFile.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <p className="text-xs text-purple-600 mt-1">
                          This video will only be used for this job application
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Warning if no video will be provided */}
                {applicationForm.videoOption === "existing" && !profileData?.video && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">
                      You must provide a video introduction to submit this application.
                      Please select "Upload a new video" or{" "}
                      <a
                        href="/candidate/profile"
                        className="underline font-medium"
                        target="_blank"
                        rel="noreferrer"
                      >
                        upload one to your profile first
                      </a>.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cover Letter Section */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-slate-900">
                  Cover Letter
                </h2>
                <span className="text-sm text-slate-500">(Optional)</span>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-2">
                <textarea
                  value={applicationForm.coverLetter}
                  onChange={handleCoverLetterChange}
                  placeholder="Write a brief cover letter explaining why you're interested in this position and what makes you a good fit..."
                  className="w-full h-32 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Personalize your application with a cover letter</span>
                  <span>
                    {applicationForm.coverLetter.length}/500 characters
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Confirmation and Submit */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6">
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applicationForm.profileAccuracyConfirmed}
                    onChange={(e) =>
                      setApplicationForm((prev) => ({
                        ...prev,
                        profileAccuracyConfirmed: e.target.checked,
                      }))
                    }
                    className="mt-1 text-blue-600"
                  />
                  <div className="text-sm text-slate-700">
                    I confirm that the information provided in my profile is
                    accurate and up-to-date. I understand that any false
                    information may result in the rejection of my application.
                  </div>
                </label>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => navigate(returnTo)}
                    className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Back to Jobs
                  </button>
                  
                  {hasApplied ? (
                    <div className="flex-1 space-y-3">
                      <button
                        disabled
                        className="w-full px-6 py-3 bg-green-100 text-green-800 rounded-lg cursor-not-allowed flex items-center justify-center gap-2 border border-green-200"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Already Applied
                      </button>
                      <div className="text-center">
                        <p className="text-sm text-slate-600 mb-2">
                          Applied {existingApplication?.appliedAgo} • Status: <span className="font-medium text-slate-900">{existingApplication?.status}</span>
                        </p>
                        <button
                          onClick={() => navigate('/candidate/applications', {
                            state: { highlightApplication: existingApplication?.applicationId }
                          })}
                          className="text-sm text-blue-600 hover:text-blue-700 underline"
                        >
                          View in My Applications
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleSubmitApplication}
                      disabled={
                        !applicationForm.profileAccuracyConfirmed ||
                        isSubmitting ||
                        loading.submitting
                      }
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {isSubmitting || loading.submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Submit Application
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};

export default JobApplication;
