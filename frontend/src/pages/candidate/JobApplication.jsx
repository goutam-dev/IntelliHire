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
  Calendar,
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
    <div className="space-y-6">
      <p className="text-sm font-medium text-zinc-600 mb-4 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
        Adjust your skills for this specific application. Changes made here apply only to this role.
      </p>
      
      {/* Add new skill */}
      <div>
        <label className="block text-sm font-bold text-zinc-900 mb-2">
          Add Skills
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a skill and press Enter"
            className="flex-1 px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm transition-all"
          />
          <button
            type="button"
            onClick={() => addSkill()}
            className="px-6 py-3 bg-zinc-900 text-white font-medium rounded-xl hover:bg-zinc-800 transition-colors shadow-sm"
          >
            Add
          </button>
        </div>
      </div>

      {/* Current skills */}
      <div>
        <h4 className="text-sm font-bold text-zinc-900 mb-3 flex items-center gap-2">
          Current Skills
          <span className="bg-zinc-100 text-zinc-600 py-0.5 px-2 rounded-md text-xs">{skills.length}</span>
        </h4>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-sm font-medium shadow-sm"
            >
              <span>{skill}</span>
              <button
                type="button"
                onClick={() => removeSkill(index)}
                className="text-zinc-400 hover:text-white transition-colors"
                title="Remove skill"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        {skills.length === 0 && (
          <div className="text-center py-6 bg-zinc-50 border border-zinc-200 border-dashed rounded-xl">
            <p className="text-zinc-500 text-sm font-medium">No skills added yet.</p>
          </div>
        )}
      </div>

      {/* Skill suggestions */}
      <div>
        <h4 className="text-sm font-bold text-zinc-900 mb-3">
          Suggested Skills (Click to add)
        </h4>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
          {skillSuggestions
            .filter(suggestion => !skills.some(skill => skill.toLowerCase() === suggestion.toLowerCase()))
            .slice(0, 15)
            .map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => addSkill(skill)}
                className="bg-white border border-zinc-200 text-zinc-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-sm"
              >
                + {skill}
              </button>
            ))}
        </div>
      </div>

      {/* Bulk edit option */}
      <div className="pt-4 border-t border-zinc-100">
        <label className="block text-sm font-bold text-zinc-900 mb-2">
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
          className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all text-sm leading-relaxed"
          placeholder="e.g., React, JavaScript, TypeScript, Node.js, Python"
        />
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
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-zinc-200 border-t-zinc-900 mx-auto mb-4"></div>
          <p className="text-sm font-medium text-zinc-600 tracking-wide">Loading application form...</p>
        </div>
      </div>
    );
  }

  if (!currentJob) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto p-8 bg-white rounded-2xl border border-zinc-200 shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-zinc-900 mb-2">Job Not Found</h2>
          <p className="text-sm text-zinc-600 mb-6">The job you're trying to apply for could not be found or is no longer available.</p>
          <button
            onClick={() => navigate("/candidate/jobs")}
            className="w-full px-6 py-3 bg-zinc-900 text-white font-medium rounded-xl hover:bg-zinc-800 transition-colors shadow-sm"
          >
            Browse Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <button
            onClick={() => navigate(returnTo)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors text-sm font-medium -ml-3"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Jobs</span>
          </button>
          <div className="text-sm font-medium bg-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-200/50 text-zinc-600 flex items-center gap-2 max-w-full truncate">
            <span className="hidden sm:inline">Applying for:</span>
            <span className="font-bold text-zinc-900 truncate">
              {currentJob.title}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Success/Error Messages */}
        {error && (
          <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1,y:0}} className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start sm:items-center gap-3 text-red-700 shadow-sm">
            <AlertCircle className="w-5 h-5 mt-0.5 sm:mt-0 flex-shrink-0" />
            <span className="text-sm font-medium leading-relaxed">{error}</span>
            <button
              onClick={() => dispatch(clearError())}
              className="ml-auto p-1 text-red-500 hover:text-red-700 rounded-md hover:bg-red-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {successMessage && (
          <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1,y:0}} className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 shadow-sm">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-bold">{successMessage}</span>
          </motion.div>
        )}

        {/* Job Information Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 sm:p-8 mb-8 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-zinc-800 to-zinc-600" />
          
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 text-white flex items-center justify-center flex-shrink-0 shadow-md font-bold text-xl uppercase tracking-wider">
              {(currentJob.company || currentJob.employer?.companyName || currentJob.employer?.name || "C")[0]}
            </div>
            
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-zinc-900 mb-3 tracking-tight">
                {currentJob.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-3 text-sm font-medium mb-4">
                <div className="flex items-center gap-1.5 text-zinc-700 bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200/50">
                  <Building2 className="w-4 h-4 text-zinc-400" />
                  <span>
                    {currentJob.company ||
                      currentJob.employer?.companyName ||
                      "Company"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-600 bg-zinc-50 px-2.5 py-1 rounded-md border border-zinc-200/50">
                  <MapPin className="w-4 h-4 text-zinc-400" />
                  <span>{currentJob.location}</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-600">
                  <Clock className="w-4 h-4 text-zinc-400" />
                  <span>{currentJob.employmentType}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded-lg text-xs font-bold tracking-wide border border-zinc-200/50">
                  {currentJob.experienceLevel}
                </span>
                {currentJob.salaryRange && (
                  <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold tracking-wide border border-emerald-200/50">
                    {formatSalaryBadge(currentJob.salaryRange)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {requirementMatch && (
          <div
            className={`mb-8 p-5 rounded-2xl border flex items-start gap-4 shadow-sm ${
              requirementMatch.meetsAll
                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50/50 border-amber-200 text-amber-900'
            }`}
          >
            {requirementMatch.meetsAll ? (
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                 <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
            )}
            <div className="pt-1">
              <h4 className={`text-sm font-bold mb-1 ${requirementMatch.meetsAll ? 'text-emerald-800' : 'text-amber-800'}`}>
                 {requirementMatch.meetsAll ? "You're a strong match" : "Review Requirements"}
              </h4>
              <p className="text-sm font-medium opacity-90 leading-relaxed">
                {requirementMatch.meetsAll
                  ? requirementMatch.positiveMessage
                  : requirementMatch.warningMessage}
              </p>
            </div>
          </div>
        )}

        {/* Application Form */}
        <div className="space-y-6 sm:space-y-8">
          {/* Personal Information Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-zinc-100 bg-zinc-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 shadow-sm">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
                      Personal Information
                    </h2>
                    <p className="text-xs font-medium text-zinc-500 mt-0.5">
                      Changes here only apply to this application
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  {editingSections.personalInfo ? (
                    <>
                      <button
                        onClick={() => handleSectionCancel('personalInfo')}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-transparent rounded-xl transition-all"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSectionSave('personalInfo')}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-zinc-900 hover:bg-zinc-800 shadow-sm rounded-xl transition-all"
                      >
                        <Check className="w-4 h-4" />
                        Save
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleSectionEdit('personalInfo')}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 shadow-sm rounded-xl transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit Info
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="p-5 sm:p-6">
              {editingSections.personalInfo ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-zinc-900 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={applicationProfile.personalInfo.name}
                      onChange={(e) =>
                        handlePersonalInfoChange("name", e.target.value)
                      }
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm transition-all"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-900 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={applicationProfile.personalInfo.email}
                      onChange={(e) =>
                        handlePersonalInfoChange("email", e.target.value)
                      }
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm transition-all"
                      placeholder="Enter your email address"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-900 mb-2">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={applicationProfile.personalInfo.phone}
                      onChange={(e) =>
                        handlePersonalInfoChange("phone", e.target.value)
                      }
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm transition-all"
                      placeholder="Enter your phone number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-900 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      value={applicationProfile.personalInfo.location}
                      onChange={(e) =>
                        handlePersonalInfoChange("location", e.target.value)
                      }
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-zinc-50 p-5 rounded-2xl border border-zinc-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <User className="w-4 h-4 text-zinc-600" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Full Name</span>
                      <span className="text-sm font-bold text-zinc-900 truncate">
                        {applicationProfile.personalInfo.name || "Not provided"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Mail className="w-4 h-4 text-zinc-600" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Email</span>
                      <span className="text-sm font-bold text-zinc-900 truncate">
                        {applicationProfile.personalInfo.email || "Not provided"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Phone className="w-4 h-4 text-zinc-600" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Phone</span>
                      <span className="text-sm font-bold text-zinc-900 truncate">
                        {applicationProfile.personalInfo.phone || "Not provided"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <LocationIcon className="w-4 h-4 text-zinc-600" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Location</span>
                      <span className="text-sm font-bold text-zinc-900 truncate">
                        {applicationProfile.personalInfo.location || "Not provided"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Experience Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-zinc-100 bg-zinc-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 shadow-sm">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900 tracking-tight flex items-center gap-2">
                       Work Experience
                       <span className="bg-zinc-200 text-zinc-700 text-xs py-0.5 px-2 rounded-md">{applicationProfile.experience.length} entries</span>
                    </h2>
                    <p className="text-xs font-medium text-zinc-500 mt-0.5">
                      Changes here only apply to this application
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  {editingSections.experience ? (
                    <>
                      <button
                        onClick={() => handleSectionCancel('experience')}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-transparent rounded-xl transition-all"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSectionSave('experience')}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-zinc-900 hover:bg-zinc-800 shadow-sm rounded-xl transition-all"
                      >
                        <Check className="w-4 h-4" />
                        Save
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleSectionEdit('experience')}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 shadow-sm rounded-xl transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit Experience
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="p-5 sm:p-6">
              {editingSections.experience ? (
                <div className="space-y-6">
                  <p className="text-sm font-medium text-zinc-600 mb-2 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                    Edit your work experience entries. You can modify the details for this specific job application.
                  </p>
                  {applicationProfile.experience.map((exp, index) => (
                    <div key={index} className="border border-zinc-200 rounded-2xl p-5 sm:p-6 bg-white shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                        <div>
                          <label className="block text-sm font-bold text-zinc-900 mb-2">
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
                            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm transition-all"
                            placeholder="Enter job title"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-zinc-900 mb-2">
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
                            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm transition-all"
                            placeholder="Enter company name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-zinc-900 mb-2">
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
                            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm transition-all"
                            placeholder="e.g., Jan 2022"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-zinc-900 mb-2">
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
                            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm transition-all"
                            placeholder="e.g., Present or Dec 2023"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-zinc-900 mb-2">
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
                          className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm transition-all leading-relaxed"
                          placeholder="Describe your responsibilities and achievements..."
                        />
                      </div>
                    </div>
                  ))}
                  {applicationProfile.experience.length === 0 && (
                    <div className="text-center py-6 bg-zinc-50 border border-zinc-200 border-dashed rounded-xl">
                      <p className="text-zinc-500 font-medium text-sm">
                        No work experience found in your profile. Please complete your profile first.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {applicationProfile.experience.length > 0 ? (
                    applicationProfile.experience.map((exp, index) => (
                      <div
                        key={index}
                        className="bg-zinc-50 border border-zinc-100 rounded-2xl p-5 sm:p-6"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                          <div>
                            <h3 className="text-base font-bold text-zinc-900 uppercase tracking-tight">
                              {exp.title || exp.jobTitle || 'Job Title'}
                            </h3>
                            <p className="text-sm font-semibold text-zinc-600 mt-1">{exp.companyName || exp.company || 'Company'}</p>
                          </div>
                          <span className="text-xs font-bold text-zinc-500 bg-white px-3 py-1.5 rounded-lg border border-zinc-200/50 shadow-sm inline-flex items-center gap-1.5">
                             <Calendar className="w-3.5 h-3.5" />
                            {formatHumanDate(exp.startDate) || 'Start date not specified'} -{" "}
                            {exp.currentlyWorking || exp.isCurrentJob ? "Present" : (formatHumanDate(exp.endDate) || 'End date not specified')}
                          </span>
                        </div>
                        {exp.description && (
                          <p className="text-sm text-zinc-600 mt-3 leading-relaxed">
                            {exp.description}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 bg-zinc-50 border border-zinc-200 border-dashed rounded-xl">
                      <p className="text-zinc-500 text-sm font-medium">
                        No work experience added yet.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Education Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-zinc-100 bg-zinc-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 shadow-sm">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900 tracking-tight flex items-center gap-2">
                      Education
                      <span className="bg-zinc-200 text-zinc-700 text-xs py-0.5 px-2 rounded-md">{applicationProfile.education.length} entries</span>
                    </h2>
                    <p className="text-xs font-medium text-zinc-500 mt-0.5">
                      Changes here only apply to this application
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  {editingSections.education ? (
                    <>
                      <button
                        onClick={() => handleSectionCancel('education')}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-transparent rounded-xl transition-all"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSectionSave('education')}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-zinc-900 hover:bg-zinc-800 shadow-sm rounded-xl transition-all"
                      >
                        <Check className="w-4 h-4" />
                        Save
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleSectionEdit('education')}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 shadow-sm rounded-xl transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit Education
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="p-5 sm:p-6">
              {editingSections.education ? (
                <div className="space-y-6">
                  <p className="text-sm font-medium text-zinc-600 mb-2 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                    Edit your education entries. You can modify the details for this specific job application.
                  </p>
                  {applicationProfile.education.map((edu, index) => (
                    <div key={index} className="border border-zinc-200 rounded-2xl p-5 sm:p-6 bg-white shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                        <div>
                          <label className="block text-sm font-bold text-zinc-900 mb-2">
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
                            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm transition-all"
                            placeholder="e.g., Bachelor of Science"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-zinc-900 mb-2">
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
                            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm transition-all"
                            placeholder="Enter institution name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-zinc-900 mb-2">
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
                            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm transition-all"
                            placeholder="e.g., 2018"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-zinc-900 mb-2">
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
                            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm transition-all"
                            placeholder="e.g., 2022"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-zinc-900 mb-2">
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
                            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm transition-all"
                            placeholder="e.g., Computer Science"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-zinc-900 mb-2">
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
                            className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm transition-all"
                            placeholder="e.g., 3.8 or A"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {applicationProfile.education.length === 0 && (
                    <div className="text-center py-6 bg-zinc-50 border border-zinc-200 border-dashed rounded-xl">
                      <p className="text-zinc-500 font-medium text-sm">
                        No education found in your profile. Please complete your profile first.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {applicationProfile.education.length > 0 ? (
                    applicationProfile.education.map((edu, index) => (
                      <div
                        key={index}
                        className="bg-zinc-50 border border-zinc-100 rounded-2xl p-5 sm:p-6"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                          <div>
                            <h3 className="text-base font-bold text-zinc-900 uppercase tracking-tight">
                              {edu.degree}
                            </h3>
                            <p className="text-sm font-semibold text-zinc-600 mt-1">{edu.institution}</p>
                          </div>
                          <span className="text-xs font-bold text-zinc-500 bg-white px-3 py-1.5 rounded-lg border border-zinc-200/50 shadow-sm inline-flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {edu.startYear || (edu.startDate ? new Date(edu.startDate).getFullYear() : 'Start')} - {edu.endYear || (edu.endDate ? new Date(edu.endDate).getFullYear() : 'End')}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 mt-3">
                          {edu.fieldOfStudy && (
                            <p className="text-sm font-medium text-zinc-600 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
                              Field: <span className="text-zinc-900">{edu.fieldOfStudy}</span>
                            </p>
                          )}
                          {(edu.gpa || edu.grade) && (
                            <p className="text-sm font-medium text-zinc-600 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
                              GPA: <span className="text-zinc-900">{edu.gpa || edu.grade}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 bg-zinc-50 border border-zinc-200 border-dashed rounded-xl">
                      <p className="text-zinc-500 text-sm font-medium">
                        No education information added yet.
                      </p>
                    </div>
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
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-zinc-100 bg-zinc-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 shadow-sm">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Resume</h2>
                    <p className="text-xs font-medium text-zinc-500 mt-0.5">
                      Required for your application
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md uppercase tracking-wider hidden sm:block">
                  Required
                </span>
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <div className="space-y-4">
                {/* Resume Options */}
                <div className="space-y-3">
                  <label className={`flex items-start gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${applicationForm.resumeOption === "existing" ? "border-zinc-900 bg-zinc-50/50 shadow-sm ring-1 ring-zinc-900" : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"}`}>
                    <div className="pt-1">
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
                        className="w-4 h-4 text-zinc-900 border-zinc-300 focus:ring-zinc-900"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm text-zinc-900">
                        Use existing resume from profile
                      </div>
                      {profileData?.resume ? (
                        <div className="text-sm font-medium text-zinc-600 mt-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="truncate max-w-[200px] sm:max-w-sm flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-zinc-400" />
                            {profileData.resume.originalName}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-500 bg-white px-2 py-1 rounded-md border border-zinc-200 uppercase tracking-widest whitespace-nowrap">
                            Uploaded{" "}
                            {new Date(
                              profileData.resume.uploadedAt
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm font-medium text-rose-600 mt-1 flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5" />
                          No resume found in profile
                        </div>
                      )}
                    </div>
                    {profileData?.resume && (
                      <button
                        onClick={handleResumePreview}
                        className="text-zinc-500 hover:text-zinc-900 transition-colors p-2 bg-white rounded-xl border border-zinc-200 shadow-sm hover:bg-zinc-50 flex-shrink-0"
                        type="button"
                        title="Preview Resume"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </label>

                  <label className={`flex items-start gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${applicationForm.resumeOption === "new" ? "border-zinc-900 bg-zinc-50/50 shadow-sm ring-1 ring-zinc-900" : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"}`}>
                    <div className="pt-1">
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
                        className="w-4 h-4 text-zinc-900 border-zinc-300 focus:ring-zinc-900"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm text-zinc-900">
                        Upload a different resume
                      </div>
                      <div className="text-xs font-semibold text-zinc-500 mt-1 uppercase tracking-wider flex items-center gap-1.5">
                         PDF only, max 5MB
                      </div>
                    </div>
                  </label>
                </div>

                {/* File Upload for New Resume */}
                {applicationForm.resumeOption === "new" && (
                  <div className="mt-5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="border border-dashed border-zinc-300 bg-zinc-50/50 rounded-2xl p-8 text-center hover:border-zinc-400 hover:bg-zinc-50 transition-all">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleResumeFileChange}
                        className="hidden"
                        id="resume-upload"
                      />
                      <label
                        htmlFor="resume-upload"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        <div className="w-14 h-14 rounded-full bg-white border border-zinc-200 shadow-sm flex items-center justify-center mb-4 text-zinc-400 hover:scale-105 transition-transform duration-200">
                          <FileText className="w-6 h-6" />
                        </div>
                        <p className="text-base font-bold text-zinc-900 mb-1">
                          {applicationForm.newResumeFile ? 'Change Resume Document' : 'Select Resume Document'}
                        </p>
                        <p className="text-sm font-medium text-zinc-500 mb-5">
                          Drag and drop or click to browse
                        </p>
                        <div className="px-5 py-2.5 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm rounded-xl hover:bg-zinc-50 hover:text-zinc-900 shadow-sm transition-all">
                          Choose File
                        </div>
                      </label>
                    </div>
                    {applicationForm.newResumeFile && (
                      <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex flex-shrink-0 items-center justify-center">
                            <FileText className="w-4 h-4 text-emerald-600" />
                          </div>
                          <div>
                            <span className="block text-sm text-emerald-900 font-bold truncate max-w-[200px] sm:max-w-md">
                              {applicationForm.newResumeFile.name}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs font-bold text-emerald-700">
                                {(applicationForm.newResumeFile.size / 1024 / 1024).toFixed(2)} MB
                              </span>
                              <span className="w-1 h-1 rounded-full bg-emerald-300"></span>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                Application specific
                              </span>
                            </div>
                          </div>
                        </div>
                        <Check className="w-5 h-5 text-emerald-500 hidden sm:block" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Video Introduction Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-zinc-100 bg-zinc-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 shadow-sm">
                    <Film className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
                      Video Introduction
                    </h2>
                    <p className="text-xs font-medium text-zinc-500 mt-0.5">
                      Required for job applications
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md uppercase tracking-wider hidden sm:block">
                  Required
                </span>
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <div className="space-y-4">
                {/* Video Options */}
                <div className="space-y-3">
                  <label className={`flex items-start gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${applicationForm.videoOption === "existing" && profileData?.video ? "border-zinc-900 bg-zinc-50/50 shadow-sm ring-1 ring-zinc-900" : (!profileData?.video ? "border-zinc-100 bg-zinc-50 opacity-50 cursor-not-allowed" : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50")}`}>
                    <div className="pt-1">
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
                        className="w-4 h-4 text-zinc-900 border-zinc-300 focus:ring-zinc-900"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm text-zinc-900">
                        Use video from my profile
                      </div>
                      {profileData?.video ? (
                        <div className="text-sm font-medium text-zinc-600 mt-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="truncate max-w-[200px] sm:max-w-sm flex items-center gap-2">
                             <Video className="w-3.5 h-3.5 text-zinc-400" />
                            {profileData.video.originalName || profileData.video.filename}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-500 bg-white px-2 py-1 rounded-md border border-zinc-200 uppercase tracking-widest whitespace-nowrap">
                            Uploaded{" "}
                            {new Date(profileData.video.uploadedAt).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm font-medium text-amber-600 mt-1 flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5" />
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
                        className="text-zinc-500 hover:text-zinc-900 transition-colors p-2 bg-white rounded-xl border border-zinc-200 shadow-sm hover:bg-zinc-50 flex-shrink-0"
                        type="button"
                        title="Preview video"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                  </label>

                  <label className={`flex items-start gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${applicationForm.videoOption === "new" ? "border-zinc-900 bg-zinc-50/50 shadow-sm ring-1 ring-zinc-900" : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"}`}>
                    <div className="pt-1">
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
                        className="w-4 h-4 text-zinc-900 border-zinc-300 focus:ring-zinc-900"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-sm text-zinc-900">
                        Upload a new video
                      </div>
                      <div className="text-xs font-semibold text-zinc-500 mt-1 uppercase tracking-wider flex items-center gap-1.5">
                        MP4, WEBM, MOV, AVI — max 50MB
                      </div>
                    </div>
                  </label>
                </div>

                {/* File Upload for New Video */}
                {applicationForm.videoOption === "new" && (
                  <div className="mt-5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="border border-dashed border-zinc-300 bg-zinc-50/50 rounded-2xl p-8 text-center hover:border-zinc-400 hover:bg-zinc-50 transition-all">
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                        onChange={handleVideoFileChange}
                        className="hidden"
                        id="video-upload"
                      />
                      <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center">
                        <div className="w-14 h-14 rounded-full bg-white border border-zinc-200 shadow-sm flex items-center justify-center mb-4 text-zinc-400 hover:scale-105 transition-transform duration-200">
                          <Video className="w-6 h-6" />
                        </div>
                        <p className="text-base font-bold text-zinc-900 mb-1">
                          {applicationForm.newVideoFile ? 'Change Video' : 'Select Video'}
                        </p>
                        <p className="text-sm font-medium text-zinc-500 mb-5">
                          MP4, WEBM, MOV, AVI — max 50MB
                        </p>
                        <div className="px-5 py-2.5 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm rounded-xl hover:bg-zinc-50 hover:text-zinc-900 shadow-sm transition-all focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2">
                          Choose File
                        </div>
                      </label>
                    </div>

                     <div className="mt-3 flex items-center justify-center gap-3">
                        <span className="h-px w-12 bg-zinc-200"></span>
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">or</span>
                        <span className="h-px w-12 bg-zinc-200"></span>
                    </div>

                    <div className="mt-3 border border-zinc-200 rounded-2xl p-5 sm:p-6 bg-zinc-50/50">
                      <div className="text-xs font-medium text-zinc-600 mb-4 bg-white p-3 rounded-xl border border-zinc-200/60 shadow-sm leading-relaxed">
                        <span className="font-bold text-zinc-900">Pro Tip: </span> Record in a quiet room, keep your face clearly visible, and speak clearly for 20-40 seconds for best results.
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-zinc-900">Record video directly</p>
                          <p className="text-xs font-medium text-zinc-500 mt-0.5">Use your current camera & microphone.</p>
                        </div>
                        <button
                          type="button"
                          onClick={isRecorderOpen ? handleCloseRecorder : handleOpenRecorder}
                          className="px-4 py-2.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 text-sm font-bold shadow-sm transition-all flex-shrink-0 whitespace-nowrap"
                        >
                          {isRecorderOpen ? 'Close Recorder' : 'Open Recorder'}
                        </button>
                      </div>

                      {recordingError && (
                        <div className="mt-4 p-3 rounded-xl border border-rose-200 bg-rose-50 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                          <p className="text-xs font-medium text-rose-800">{recordingError}</p>
                        </div>
                      )}

                      {isRecorderOpen && (
                        <div className="mt-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="relative rounded-2xl border border-zinc-200 bg-black overflow-hidden shadow-sm">
                            <video
                              ref={recorderVideoRef}
                              autoPlay
                              muted
                              playsInline
                              className="w-full max-h-72 object-cover"
                            />
                            {isRecordingVideo && (
                               <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                                   <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                                   <span className="text-xs font-bold text-white tracking-widest uppercase">REC</span>
                               </div>
                            )}
                          </div>

                          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className={`font-bold flex items-center gap-1.5 px-2 py-1 rounded-md border ${hasMicTrack ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>
                                {hasMicTrack ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                                {hasMicTrack ? 'Mic Ready' : 'Mic Not Detected'}
                              </span>
                              <span className="text-zinc-500 font-medium">Input Level</span>
                            </div>
                            <div className="h-2 rounded-full bg-zinc-100 overflow-hidden shadow-inner border border-zinc-200/50">
                              <div
                                className={`h-full transition-all duration-100 ease-out ${audioLevel > 0.04 ? 'bg-zinc-900' : 'bg-zinc-400'}`}
                                style={{ width: `${Math.round(Math.min(1, audioLevel) * 100)}%` }}
                              />
                            </div>
                            <p className="text-[11px] font-medium text-zinc-500">
                              Speak now to test your microphone before recording.
                            </p>
                          </div>

                          <div className="flex flex-col sm:flex-row items-center gap-3">
                            {!isRecordingVideo ? (
                              <button
                                type="button"
                                onClick={handleStartRecording}
                                disabled={!hasMicTrack}
                                className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:bg-zinc-300 disabled:text-zinc-500 disabled:cursor-not-allowed text-sm font-bold shadow-sm transition-all focus:ring-2 focus:ring-rose-600 focus:ring-offset-2 flex items-center justify-center gap-2"
                              >
                                <div className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0"></div>
                                Start Recording
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={handleStopRecording}
                                className="w-full sm:w-auto px-5 py-2.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 text-sm font-bold shadow-sm transition-all focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 flex items-center justify-center gap-2"
                              >
                                <div className="w-3 h-3 rounded-sm bg-white flex-shrink-0"></div>
                                Stop Recording
                              </button>
                            )}
                          </div>
                          {recordingInfo && (
                            <p className="text-[11px] font-medium text-zinc-500 bg-zinc-100 px-3 py-2 rounded-lg inline-block">{recordingInfo}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {recordedVideoUrl && (
                      <div className="mt-5 p-4 sm:p-5 bg-white border border-zinc-200 rounded-2xl shadow-sm animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-2 mb-3">
                           <Play className="w-4 h-4 text-zinc-700" />
                           <p className="text-sm font-bold text-zinc-900">Recorded Preview</p>
                        </div>
                        <div className="rounded-xl overflow-hidden border border-zinc-200 bg-black shadow-sm relative">
                           <video
                             controls
                             src={recordedVideoUrl}
                             className="w-full max-h-64 object-contain"
                           />
                        </div>
                      </div>
                    )}

                    {applicationForm.newVideoFile && (
                      <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex flex-shrink-0 items-center justify-center">
                             <Film className="w-4 h-4 text-emerald-600" />
                           </div>
                           <div>
                             <span className="block text-sm text-emerald-900 font-bold truncate max-w-[200px] sm:max-w-xs">
                               {applicationForm.newVideoFile.name}
                             </span>
                             <div className="flex items-center gap-2 mt-0.5">
                               <span className="text-xs font-bold text-emerald-700">
                                 {(applicationForm.newVideoFile.size / 1024 / 1024).toFixed(2)} MB
                               </span>
                               <span className="w-1 h-1 rounded-full bg-emerald-300"></span>
                               <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-600">
                                 Application specific
                               </span>
                             </div>
                           </div>
                         </div>
                         <Check className="w-5 h-5 text-emerald-500 hidden sm:block" />
                      </div>
                    )}
                  </div>
                )}

                {/* Warning if no video will be provided */}
                {applicationForm.videoOption === "existing" && !profileData?.video && (
                  <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 animate-in fade-in duration-300">
                    <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-rose-900 mb-1">
                        Video Introduction Required
                      </p>
                      <p className="text-sm font-medium text-rose-700">
                        You must provide a video introduction to submit this application.
                        Select "Upload a new video" above or{" "}
                        <a
                          href="/candidate/profile"
                          className="font-bold underline hover:text-rose-900 transition-colors"
                          target="_blank"
                          rel="noreferrer"
                        >
                          add one to your profile
                        </a>.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cover Letter Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-zinc-100 bg-zinc-50/50">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 shadow-sm">
                     <FileText className="w-5 h-5" />
                   </div>
                   <div>
                     <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
                       Cover Letter
                     </h2>
                     <p className="text-xs font-medium text-zinc-500 mt-0.5">
                       Tell us why you are a great fit
                     </p>
                   </div>
                 </div>
                 <span className="text-[10px] font-bold text-zinc-600 bg-zinc-200/80 px-2 py-0.5 rounded-md uppercase tracking-wider">
                   Optional
                 </span>
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <div className="space-y-4">
                <textarea
                  value={applicationForm.coverLetter}
                  onChange={handleCoverLetterChange}
                  placeholder="Write a brief cover letter explaining why you're interested in this position and what makes you a good fit..."
                  className="w-full h-32 px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all resize-none text-sm text-zinc-800 placeholder:text-zinc-400 font-medium"
                />
                <div className="flex justify-between text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  <span>Personalize your application</span>
                  <span className={applicationForm.coverLetter.length >= 500 ? "text-rose-500" : ""}>
                    {applicationForm.coverLetter.length}/500 chars
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Confirmation and Submit */}
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
            <div className="p-5 sm:p-6">
              <div className="space-y-6">
                <label className="flex items-start gap-4 cursor-pointer group rounded-xl hover:bg-zinc-50/50 p-2 -m-2 transition-colors">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input
                      type="checkbox"
                      checked={applicationForm.profileAccuracyConfirmed}
                      onChange={(e) =>
                        setApplicationForm((prev) => ({
                          ...prev,
                          profileAccuracyConfirmed: e.target.checked,
                        }))
                      }
                      className="peer w-5 h-5 appearance-none border-2 border-zinc-300 rounded focus:ring-2 focus:ring-zinc-900 focus:ring-offset-1 checked:bg-zinc-900 checked:border-zinc-900 transition-all cursor-pointer"
                    />
                    <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                  </div>
                  <div className="text-sm font-medium leading-relaxed text-zinc-700 select-none group-hover:text-zinc-900 transition-colors">
                    I confirm that the information provided in my profile is
                    accurate and up-to-date. I understand that any false
                    information may result in the rejection of my application.
                  </div>
                </label>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-zinc-100">
                  <button
                    onClick={() => navigate(returnTo)}
                    className="flex-1 px-6 py-3 border-2 border-zinc-200 text-zinc-700 bg-white font-bold rounded-xl hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-900 transition-all focus:ring-2 focus:ring-inset focus:ring-zinc-900"
                  >
                    Back to Jobs
                  </button>
                  
                  {hasApplied ? (
                    <div className="flex-[2] space-y-3">
                      <button
                        disabled
                        className="w-full px-6 py-3 bg-emerald-50 text-emerald-800 font-bold rounded-xl cursor-not-allowed flex items-center justify-center gap-2 border-2 border-emerald-200"
                      >
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                        Application Submitted
                      </button>
                      <div className="text-center flex flex-col items-center gap-1">
                        <p className="text-sm font-medium text-emerald-800/80">
                          Applied {existingApplication?.appliedAgo} • Status: <span className="font-bold text-emerald-900 capitalize">{existingApplication?.status}</span>
                        </p>
                        <button
                          onClick={() => navigate('/candidate/applications', {
                            state: { highlightApplication: existingApplication?.applicationId }
                          })}
                          className="text-sm font-bold text-emerald-700 hover:text-emerald-900 underline underline-offset-4 decoration-emerald-300 hover:decoration-emerald-500 transition-all"
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
                      className="flex-[2] group px-6 py-3 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-zinc-900 transition-all flex items-center justify-center gap-2 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900"
                    >
                      {isSubmitting || loading.submitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-zinc-400 border-t-white rounded-full animate-spin"></div>
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
                          <span>Submit Application</span>
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
