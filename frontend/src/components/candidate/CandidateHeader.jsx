// frontend/src/components/candidate/CandidateHeader.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { useClerk, useUser } from '@clerk/clerk-react';
import NotificationBell from '../common/NotificationBell';
import { useNotifications } from '../../hooks/useNotifications';
import { ChevronDown, Menu, X, User } from 'lucide-react';

// Sleek minimal Logo Mark
const LogoMark = ({ className = "h-5 w-5" }) => (
  <motion.svg
    className={className}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    whileHover={{ scale: 1.05 }}
    transition={{ duration: 0.2 }}
  >
    <rect x="3" y="5" width="26" height="22" rx="4" stroke="currentColor" strokeWidth="1.5" />
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

  const fullName = clerkUser?.fullName || profile?.user?.fullName || 'User';
  const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const profilePhotoUrl = clerkUser?.imageUrl || (profile?.profilePhotoUrl ? `http://localhost:4000${profile.profilePhotoUrl}` : null);

  const mongoUserId = profile?.user?._id || profile?._id;
  useNotifications(mongoUserId);
  
  const navLinks = [
    { label: "Dashboard", id: "dashboard", path: "/candidate/dashboard" },
    { label: "Browse Jobs", id: "jobs", path: "/candidate/jobs" },
    { label: "Applications", id: "applications", path: "/candidate/applications" },
  ];

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleNavClick = (path) => {
    navigate(path);
    setMobileOpen(false);
    setProfileDropdownOpen(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <motion.header 
      className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 h-[72px]">
        {/* Left: Logo */}
        <div className="flex-1 flex items-center">
          <motion.div 
            className="flex items-center gap-3 text-[16px] font-bold tracking-tight text-zinc-950 cursor-pointer"
            whileHover={{ scale: 1.02 }}
            onClick={() => handleNavClick('/candidate/dashboard')}
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-950 text-white shadow-sm">
              <LogoMark />
            </span>
            <span className="hidden sm:inline">IntelliHire</span>
          </motion.div>
        </div>
        
        {/* Center: Nav links */}
        <nav className="hidden md:flex items-center justify-center gap-2 text-[14px] font-medium text-zinc-500">
          {navLinks.map((link) => (
            <motion.button
              key={link.id}
              onClick={() => handleNavClick(link.path)}
              className={`relative px-4 py-2 rounded-lg hover:text-zinc-950 transition-colors ${
                isActive(link.path) ? 'text-zinc-950 bg-zinc-50' : 'hover:bg-zinc-50/50'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {link.label}
            </motion.button>
          ))}
        </nav>

        {/* Right: Actions & Profile */}
        <div className="flex-1 flex items-center justify-end gap-5">
          <NotificationBell />

          <div className="hidden md:block w-px h-6 bg-zinc-200" />

          <div className="relative hidden md:block">
            <motion.button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-3 rounded-xl pl-1.5 pr-4 py-1.5 bg-white hover:bg-zinc-50 border border-zinc-200 transition-colors shadow-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {profilePhotoUrl ? (
                <img
                  src={profilePhotoUrl}
                  alt="Profile"
                  className="h-8 w-8 rounded-full object-cover border border-zinc-200 bg-white"
                />
              ) : (
                <span className="h-8 w-8 rounded-full bg-zinc-100 border border-zinc-300 flex items-center justify-center text-zinc-600 font-semibold text-[13px]">
                  {initials}
                </span>
              )}
              <span className="text-[14px] font-medium text-zinc-800">{fullName}</span>
              <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} />
            </motion.button>
            
            <AnimatePresence>
              {profileDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-3 w-60 rounded-xl border border-zinc-200 bg-white shadow-xl shadow-zinc-200/50 py-2 z-50 overflow-hidden"
                >
                  <div className="px-5 py-3 mb-1 bg-zinc-50/50 border-b border-zinc-100">
                    <p className="text-[12px] font-medium text-zinc-500 uppercase tracking-wider">Signed in as</p>
                    <p className="text-[14px] font-bold text-zinc-900 truncate mt-1">{fullName}</p>
                  </div>
                  
                  <motion.button
                    onClick={() => handleNavClick('/candidate/profile')}
                    className="flex w-full items-center gap-3 px-5 py-2.5 text-[14px] font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Profile Settings
                  </motion.button>
                  
                  <div className="h-px bg-zinc-100 my-1.5" />
                  
                  <motion.button 
                    onClick={handleLogout}
                    className="flex w-full items-center px-5 py-2.5 text-[14px] font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    Sign out
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-zinc-600 hover:bg-zinc-100"
            onClick={() => setMobileOpen(!mobileOpen)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-zinc-200 bg-white"
          >
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <motion.button
                  key={link.id}
                  onClick={() => handleNavClick(link.path)}
                  className={`w-full text-left px-4 py-3 rounded-lg text-[14px] font-medium transition-colors ${
                    isActive(link.path) 
                      ? 'bg-zinc-50 text-zinc-900' 
                      : 'text-zinc-600 hover:bg-zinc-50/80 hover:text-zinc-900'
                  }`}
                >
                  {link.label}
                </motion.button>
              ))}
              
              <div className="mt-4 pt-4 border-t border-zinc-100">
                <div className="flex items-center gap-3 px-4 py-2 mb-2">
                  {profilePhotoUrl ? (
                    <img
                      src={profilePhotoUrl}
                      alt="Profile"
                      className="h-9 w-9 rounded-full object-cover border border-zinc-200"
                    />
                  ) : (
                    <span className="h-9 w-9 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-600 font-semibold text-sm">
                      {initials}
                    </span>
                  )}
                  <div>
                    <p className="text-[14px] font-semibold text-zinc-900">{fullName}</p>
                    <p className="text-[11px] text-zinc-500">Candidate Profile</p>
                  </div>
                </div>
                <motion.button
                  onClick={() => handleNavClick('/candidate/profile')}
                  className="w-full text-left px-4 py-3 text-[14px] font-medium text-zinc-600 hover:bg-zinc-50 rounded-lg"
                >
                  Profile Settings
                </motion.button>
                <motion.button 
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-[14px] font-medium text-rose-600 hover:bg-rose-50 rounded-lg"
                >
                  Sign out
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