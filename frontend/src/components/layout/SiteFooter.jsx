import React from 'react';

const SiteFooter = () => {
  const footerLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'For Employers', href: '#employers' },
    { label: 'For Candidates', href: '#candidates' },
  ];

  return (
    <footer className="bg-slate-900 text-slate-200">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="text-lg font-semibold">IntelliHire</div>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-300 sm:gap-4">
            {footerLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-full px-2 py-1 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex flex-col gap-4 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="#final-cta"
              className="transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              Terms
            </a>
            <a
              href="#final-cta"
              className="transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              Privacy
            </a>
          </div>
        </div>
        <div className="text-xs text-slate-500">
          © {new Date().getFullYear()} IntelliHire. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;