// frontend/src/pages/candidate/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
// CandidateHeader is now handled by CandidateLayout
import ProfileSection from "../../components/candidate/dashboard/ProfileSection";
import ApplicationStats from "../../components/candidate/dashboard/ApplicationStats";
import RecentApplications from "../../components/candidate/dashboard/RecentApplications";
import QuickActions from "../../components/candidate/dashboard/QuickActions";
import WelcomeSection from "../../components/candidate/dashboard/WelcomeSection";
import TrustSection from "../../components/candidate/dashboard/TrustSection";

import ResumeUpload from "../../components/candidate/ResumeUpload";
import EducationForm from "../../components/candidate/EducationForm";
import ExperienceForm from "../../components/candidate/ExperienceForm";
import SkillsForm from "../../components/candidate/SkillsForm";
import { fetchCandidateProfile } from "../../store/slices/candidateSlice";

// Animation variants
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

const staggerChildren = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "backOut",
    },
  },
};

const slideIn = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

const CandidateDashboard = () => {
  const dispatch = useDispatch();
  const { profile, loading, error } = useSelector((state) => state.candidate);
  const { isComplete } = useSelector((state) => state.profileCompletion);

  // Modal states - moved from ProfileCompletion to Dashboard level
  const [showResumeUpload, setShowResumeUpload] = useState(false);
  const [showEducationForm, setShowEducationForm] = useState(false);
  const [showExperienceForm, setShowExperienceForm] = useState(false);
  const [showSkillsForm, setShowSkillsForm] = useState(false);

  // Modal handlers
  const handleModalOpen = (modalType) => {
    switch (modalType) {
      case "resume":
        setShowResumeUpload(true);
        break;
      case "education":
        setShowEducationForm(true);
        break;
      case "experience":
        setShowExperienceForm(true);
        break;
      case "skills":
        setShowSkillsForm(true);
        break;
      case "profile-edit":
        // Handle profile edit - could open a comprehensive profile edit modal
        // For now, we'll open the skills form as an example
        setShowSkillsForm(true);
        break;
      default:
        break;
    }
  };

  const handleModalClose = (modalType) => {
    switch (modalType) {
      case "resume":
        setShowResumeUpload(false);
        break;
      case "education":
        setShowEducationForm(false);
        break;
      case "experience":
        setShowExperienceForm(false);
        break;
      case "skills":
        setShowSkillsForm(false);
        break;
      default:
        break;
    }
  };

  // Loading and error states are now handled by CandidateLayout
  // Use real data from profile
  const profileCompletion = profile?.profileCompletion?.percentage || 0;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerChildren}
        className="space-y-6"
      >
          {/* Welcome Section */}
          <WelcomeSection />

          {/* Profile Completion & Stats Grid */}
          <motion.div
            variants={fadeUp}
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          >
            <div className="lg:col-span-2">
              <ProfileSection onModalOpen={handleModalOpen} />
            </div>

            {/* Application Statistics & Quick Actions */}
            <div className="space-y-4">
              <ApplicationStats />
              <QuickActions onModalOpen={handleModalOpen} />
            </div>
          </motion.div>



          {/* Recent Applications - No longer using showAllApplications from uiSlice */}
          <RecentApplications />

          {/* Trust Section */}
          <TrustSection />
      </motion.div>

      {/* Modals - Rendered at Dashboard level for proper positioning */}
      <AnimatePresence>
        {showResumeUpload && (
          <ResumeUpload
            onClose={() => handleModalClose("resume")}
            onSuccess={() => handleModalClose("resume")}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEducationForm && (
          <EducationForm
            onClose={() => handleModalClose("education")}
            onSuccess={() => handleModalClose("education")}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExperienceForm && (
          <ExperienceForm
            onClose={() => handleModalClose("experience")}
            onSuccess={() => handleModalClose("experience")}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSkillsForm && (
          <SkillsForm
            onClose={() => handleModalClose("skills")}
            onSuccess={() => handleModalClose("skills")}
          />
        )}
      </AnimatePresence>
    </main>
  );
};

export default CandidateDashboard;
