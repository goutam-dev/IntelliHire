// frontend/src/components/candidate/CandidateHeader.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useClerk, useUser } from '@clerk/clerk-react';
import NotificationBell from '../common/NotificationBell';
import { useNotifications } from '../../hooks/useNotifications';

// Icons
const LogoMark = ({ className = "h-6 w-6" }) => (
  <motion.svg
    className={className}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    whileHover={{ scale: 1.05 }}
    transition={{ duration: 0.2 }}
  >
    <rect x="3" y="5" width="26" height="22" rx="6" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M9 11H16.5C19.5376 11 22 13.4624 22 16.5C22 19.5376 19.5376 22 16.5 22H9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M9 16H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </motion.svg>
);

const CandidateHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const profile = useSelector(state => state.candidate.profile);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Get user data from Clerk (source of truth for auth data)
  const fullName = clerkUser?.fullName || profile?.user?.fullName || 'User';
  const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const profilePhotoUrl = clerkUser?.imageUrl || (profile?.profilePhotoUrl ? `http://localhost:4000${profile.profilePhotoUrl}` : null);

  // MongoDB user _id for WebSocket auth
  const mongoUserId = profile?.user?._id || profile?._id;
  useNotifications(mongoUserId);
  
  const navLinks = [
    { label: "Dashboard", id: "dashboard", path: "/candidate/dashboard" },
    { label: "Browse Jobs", id: "jobs", path: "/candidate/jobs" },
    { label: "My Applications", id: "applications", path: "/candidate/applications" },
    { label: "Profile", id: "profile", path: "/candidate/profile" },
  ];

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleNavClick = (path) => {
    navigate(path);
    setMobileOpen(false);
    setProfileDropdownOpen(false);
  };

  const handleMobileMenu = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileClick = () => {
    setProfileDropdownOpen(!profileDropdownOpen);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <motion.header 
      className="sticky top-0 z-50 bg-white/85 backdrop-blur border-b border-slate-200"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-4">
        {/* Logo */}
        <motion.div 
          className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900 cursor-pointer"
          whileHover={{ scale: 1.02 }}
          onClick={() => handleNavClick('/candidate/dashboard')}
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900">
            <LogoMark className="h-6 w-6" />
          </span>
          <span className="hidden sm:inline">IntelliHire</span>
        </motion.div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm text-slate-600">
          {navLinks.map((link) => (
            <motion.button
              key={link.id}
              onClick={() => handleNavClick(link.path)}
              className={`hover:text-slate-900 transition-colors relative px-2 py-1 ${
                isActive(link.path) ? 'text-slate-900 font-medium' : ''
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {link.label}
              {isActive(link.path) && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"
                  layoutId="activeSection"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          ))}
        </nav>

        {/* Desktop Profile with Dropdown */}
        <div className="hidden md:flex items-center gap-3">
          {/* Notification Bell */}
          <NotificationBell />

          <div className="relative">
            <motion.button
              onClick={handleProfileClick}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-slate-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {profilePhotoUrl ? (
                <motion.img
                  src={profilePhotoUrl}
                  alt="Profile"
                  className="h-8 w-8 rounded-full object-cover border border-slate-200"
                  whileHover={{ rotate: 5 }}
                />
              ) : (
                <motion.span 
                  className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm"
                  whileHover={{ rotate: 5 }}
                >
                  {initials}
                </motion.span>
              )}
              <span className="hidden lg:inline">{fullName}</span>
              <motion.svg 
                className={`h-4 w-4 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </motion.svg>
            </motion.button>
            
            {/* Profile Dropdown */}
            <AnimatePresence>
              {profileDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white shadow-lg py-2 z-50"
                >
                  <motion.button
                    onClick={() => handleNavClick('/candidate/profile')}
                    className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    whileHover={{ x: 4 }}
                  >
                    Edit Profile
                  </motion.button>
                  <div className="border-t border-slate-100 my-1"></div>
                  <motion.button 
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-50"
                    whileHover={{ x: 4 }}
                  >
                    Logout
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          {/* Bell visible on mobile too */}
          <NotificationBell />
          <motion.button
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-700 hover:border-slate-300"
            onClick={handleMobileMenu}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur overflow-hidden"
          >
            <div className="px-4 sm:px-6 py-4 space-y-2">
              {navLinks.map((link) => (
                <motion.button
                  key={link.id}
                  onClick={() => handleNavClick(link.path)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                    isActive(link.path) 
                      ? 'bg-slate-100 text-slate-900' 
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {link.label}
                </motion.button>
              ))}
              
              {/* Mobile Profile Section */}
              <div className="border-t border-slate-200 pt-4 mt-2">
                <div className="flex items-center gap-3 px-4 py-2">
                  {profilePhotoUrl ? (
                    <img
                      src={profilePhotoUrl}
                      alt="Profile"
                      className="h-8 w-8 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <span className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                      {initials}
                    </span>
                  )}
                  <span className="text-slate-900 font-medium">{fullName}</span>
                </div>
                <motion.button
                  onClick={() => handleNavClick('/candidate/profile')}
                  className="block rounded-xl px-4 py-2 text-slate-700 hover:bg-slate-50 w-full text-left"
                  whileHover={{ x: 8 }}
                >
                  Edit Profile
                </motion.button>
                <motion.button 
                  onClick={handleLogout}
                  className="block w-full text-left rounded-xl px-4 py-2 text-red-600 hover:bg-slate-50"
                  whileHover={{ x: 8 }}
                >
                  Logout
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default CandidateHeader;