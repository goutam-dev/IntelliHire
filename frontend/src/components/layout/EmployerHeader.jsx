import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, LogOut, User, Briefcase, LayoutDashboard } from 'lucide-react';
import { useClerk, useUser } from '@clerk/clerk-react';
import { useSelector } from 'react-redux';
import NotificationBell from '../common/NotificationBell';
import { useNotifications } from '../../hooks/useNotifications';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerChildren = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const LogoMark = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect
      x="3"
      y="5"
      width="26"
      height="22"
      rx="6"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M9 11H16.5C19.5376 11 22 13.4624 22 16.5C22 19.5376 19.5376 22 16.5 22H9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 16H19"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const MenuIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M5 7H19"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5 12H19"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5 17H19"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CloseIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M6 6L18 18"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M18 6L6 18"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const EmployerHeader = ({ userName = 'John Doe', companyName = 'Acme Inc.', userImage, onLogout }) => {
  const navigate = useNavigate();
  const { signOut } = useClerk();
  const { user } = useUser();
  const displayImage = userImage || user?.imageUrl;
  
  const profile = useSelector((state) => state.employer.profile);
  const mongoUserId = profile?.user?._id || profile?._id;
  useNotifications(mongoUserId);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const navLinks = [
    { label: 'Dashboard', href: '/employer/dashboard', icon: LayoutDashboard },
    { label: 'My Jobs', href: '/employer/jobs', icon: Briefcase },
    { label: 'Profile', href: '/employer/profile', icon: User },
  ];

  const closeMobile = () => setMobileOpen(false);

  const handleLogout = async () => {
    try {
      if (onLogout) {
        await onLogout();
      } else {
        // Default logout behavior using Clerk
        await signOut();
        navigate('/');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setProfileDropdownOpen(false);
    }
  };

  const handleProfileClick = (e) => {
    e.stopPropagation();
    setProfileDropdownOpen((prev) => !prev);
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownOpen && !event.target.closest('[data-profile-dropdown]')) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [profileDropdownOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur shadow-sm supports-backdrop-filter:bg-white/70">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link
          to="/employer/dashboard"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          onClick={closeMobile}
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900">
            <LogoMark className="h-6 w-6" />
          </span>
          <span>IntelliHire</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600 lg:gap-8">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.label}
                to={link.href}
                className="flex items-center gap-1.5 rounded-full px-2 py-1 transition-colors hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                <Icon className="h-4 w-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          
          <NotificationBell />

          {/* User Profile Dropdown */}
          <div className="relative" data-profile-dropdown>
            <button
              type="button"
              onClick={handleProfileClick}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="font-medium text-slate-900">{userName}</span>
                  <span className="text-xs text-slate-500">{companyName}</span>
                </div>
                {displayImage ? (
                  <img src={displayImage} alt={userName} className="h-8 w-8 rounded-full object-cover border border-slate-200" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium text-xs border border-slate-200">
                    {userName.charAt(0)}
                  </div>
                )}
              </div>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform ${
                  profileDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            <AnimatePresence>
              {profileDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-slate-200 bg-white shadow-lg"
                >
                  <div className="py-1">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">{userName}</p>
                      <p className="text-xs text-slate-500">{companyName}</p>
                    </div>
                    <Link
                      to="/employer/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <User className="h-4 w-4" />
                      <span>Profile Settings</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          <NotificationBell />
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-700 transition-colors hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? (
              <CloseIcon className="h-5 w-5" />
            ) : (
              <MenuIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur"
          >
            <motion.nav
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={staggerChildren}
              className="max-w-6xl mx-auto flex flex-col gap-2 px-4 py-4 text-sm text-slate-700 sm:gap-3 sm:px-6 lg:px-8"
            >
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <motion.div key={link.label} variants={fadeUp}>
                    <Link
                      to={link.href}
                      className="flex items-center gap-2 rounded-xl border border-transparent px-4 py-2 transition-colors hover:border-slate-200 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      onClick={closeMobile}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{link.label}</span>
                    </Link>
                  </motion.div>
                );
              })}
              
              {/* Mobile User Info */}
              <motion.div
                variants={fadeUp}
                className="mt-2 border-t border-slate-200 pt-4"
              >
                <div className="px-4 py-2">
                  <p className="text-sm font-medium text-slate-900">{userName}</p>
                  <p className="text-xs text-slate-500">{companyName}</p>
                </div>
                <Link
                  to="/employer/profile"
                  onClick={closeMobile}
                  className="flex items-center gap-2 rounded-xl border border-transparent px-4 py-2 transition-colors hover:border-slate-200 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  <User className="h-4 w-4" />
                  <span>Profile Settings</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    closeMobile();
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-2 rounded-xl border border-transparent px-4 py-2 text-red-600 transition-colors hover:border-red-200 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </motion.div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default EmployerHeader;
