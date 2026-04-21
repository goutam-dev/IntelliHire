import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, LogOut, User, Briefcase, LayoutDashboard, Menu, X } from 'lucide-react';
import { useClerk, useUser } from '@clerk/clerk-react';
import { useSelector } from 'react-redux';
import NotificationBell from '../common/NotificationBell';
import { useNotifications } from '../../hooks/useNotifications';

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const staggerChildren = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
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
    <rect x="3" y="5" width="26" height="22" rx="8" stroke="currentColor" strokeWidth="2" />
    <path d="M10 12H16C18.2091 12 20 13.7909 20 16C20 18.2091 18.2091 20 16 20H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 16H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const EmployerHeader = ({ userName = 'John Doe', companyName = 'Acme Inc.', userImage, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
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
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          to="/employer/dashboard"
          className="flex items-center gap-3 text-xl font-extrabold tracking-tight text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 rounded-xl"
          onClick={closeMobile}
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-md">
            <LogoMark className="h-6 w-6" />
          </span>
          <span>IntelliHire</span>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-600 lg:gap-8">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.href || location.pathname.startsWith(link.href + '/');
            return (
              <Link
                key={link.label}
                to={link.href}
                className={`flex items-center gap-1.5 px-2 py-1 font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 rounded-md ${
                  isActive
                    ? 'text-zinc-900'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-zinc-900' : 'text-zinc-400'}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <NotificationBell />

          {/* User Profile Dropdown */}
          <div className="relative" data-profile-dropdown>
            <button
              type="button"
              onClick={handleProfileClick}
              className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white pl-3 pr-4 py-1.5 transition-all hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 hover:shadow-sm"
            >
              {displayImage ? (
                <img src={displayImage} alt={userName} className="h-8 w-8 rounded-full object-cover border border-zinc-200 shadow-sm" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                  {userName.charAt(0)}
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-start leading-none">
                  <span className="font-extrabold text-sm text-zinc-900">{userName}</span>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-0.5">{companyName || 'Employer'}</span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-zinc-400 transition-transform ml-1 ${
                    profileDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            <AnimatePresence>
              {profileDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute right-0 mt-3 w-64 origin-top-right rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-zinc-200/50 overflow-hidden"
                >
                  <div className="p-2">
                    <div className="px-3 py-3 mb-2 rounded-xl bg-zinc-50 border border-zinc-100">
                      <p className="text-sm font-extrabold text-zinc-900 truncate">{userName}</p>
                      <p className="text-xs font-bold text-zinc-500 truncate mt-0.5">{companyName}</p>
                    </div>
                    <div className="space-y-1">
                      <Link
                        to="/employer/profile"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                      >
                        <User className="h-4 w-4" />
                        <span>Profile Settings</span>
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-3 md:hidden">
          <NotificationBell />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="md:hidden border-t border-zinc-200 bg-white overflow-hidden"
          >
            <motion.nav
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={staggerChildren}
              className="flex flex-col gap-1 px-4 py-6"
            >
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.href || location.pathname.startsWith(link.href + '/');
                return (
                  <motion.div key={link.label} variants={fadeUp}>
                    <Link
                      to={link.href}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                        isActive
                          ? 'bg-zinc-100 text-zinc-900'
                          : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                      }`}
                      onClick={closeMobile}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{link.label}</span>
                    </Link>
                  </motion.div>
                );
              })}
              
              <motion.div variants={fadeUp} className="mx-4 my-4 h-px bg-zinc-100" />
              
              {/* Mobile User Info */}
              <motion.div variants={fadeUp} className="flex flex-col gap-1">
                <div className="px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-100 mb-2">
                  <p className="text-sm font-extrabold text-zinc-900">{userName}</p>
                  <p className="text-xs font-bold text-zinc-500 mt-0.5">{companyName}</p>
                </div>
                <Link
                  to="/employer/profile"
                  onClick={closeMobile}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-zinc-600 transition-all hover:bg-zinc-50 hover:text-zinc-900"
                >
                  <User className="h-5 w-5" />
                  <span>Profile Settings</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    closeMobile();
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-red-600 transition-all hover:bg-red-50 hover:text-red-700"
                >
                  <LogOut className="h-5 w-5" />
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
