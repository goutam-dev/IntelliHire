import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
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

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "For Employers", href: "#employers" },
    { label: "For Candidates", href: "#candidates" },
    { label: "Get Started", href: "#final-cta" },
  ];

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur shadow-sm supports-backdrop-filter:bg-white/70">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a
          href="#top"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          onClick={closeMobile}
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900">
            <LogoMark className="h-6 w-6" />
          </span>
          <span>IntelliHire</span>
        </a>
        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600 lg:gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="rounded-full px-2 py-1 transition-colors hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <a
            href="#final-cta"
            className="hidden sm:inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            Login
          </a>
          <a
            href="#final-cta"
            className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            Get Started
          </a>
        </div>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-700 transition-colors hover:border-slate-300 md:hidden focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? (
            <CloseIcon className="h-5 w-5" />
          ) : (
            <MenuIcon className="h-5 w-5" />
          )}
        </button>
      </div>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur"
          >
            <motion.nav
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={staggerChildren}
              className="max-w-6xl mx-auto flex flex-col gap-2 px-4 py-4 text-sm text-slate-700 sm:gap-3 sm:px-6 lg:px-8"
            >
              {navLinks.map((link) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  variants={fadeUp}
                  className="rounded-xl border border-transparent px-4 py-2 transition-colors hover:border-slate-200 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  onClick={closeMobile}
                >
                  {link.label}
                </motion.a>
              ))}
              <motion.a
                href="#final-cta"
                variants={fadeUp}
                className="mt-2 inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                onClick={closeMobile}
              >
                Login
              </motion.a>
              <motion.a
                href="#final-cta"
                variants={fadeUp}
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                onClick={closeMobile}
              >
                Get Started
              </motion.a>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

const Hero = () => (
  <section
    id="top"
    className="relative overflow-hidden bg-linear-to-b from-slate-100 via-white to-white"
  >
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-slate-200/45 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-64 w-64 translate-x-1/3 translate-y-1/3 rounded-full bg-blue-100/50 blur-3xl" />
    </div>
    <motion.div
      className="relative mx-auto flex max-w-6xl flex-col-reverse gap-10 px-4 pt-20 pb-16 sm:px-6 sm:pt-24 sm:pb-20 lg:flex-row lg:items-start lg:gap-12 lg:px-8 lg:pb-24"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.4 }}
      variants={staggerChildren}
    >
      <motion.div className="w-full space-y-6 lg:w-1/2 sm:space-y-8" variants={fadeUp}>
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            AI-Powered Hiring. Fair, Fast, and Secure.
          </h1>
          <p className="text-base text-slate-600 leading-relaxed sm:text-lg">
            IntelliHire transforms recruitment through integrity-first
            verification, adaptive AI interviews, and unbiased candidate
            evaluation.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed sm:text-base">
            Modern employer and candidate portals streamline the entire hiring
            workflow—from job posting to final selection—while maintaining
            fairness and security at every step.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <motion.a
            href="#final-cta"
            className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:w-auto"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Sign Up as Employer
          </motion.a>
          <motion.a
            href="#final-cta"
            className="inline-flex w-full items-center justify-center rounded-full border border-slate-900 px-6 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:w-auto"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Sign Up as Candidate
          </motion.a>
        </div>
        <div className="space-y-1 text-sm text-slate-500 sm:text-base">
          <p>
            Screen resumes with transparent scoring, conduct secure remote
            interviews with built-in authenticity checks, and make data-informed
            hiring decisions faster.
          </p>
        </div>
      </motion.div>
      <motion.div className="w-full lg:w-1/2" variants={fadeUp}>
        <AbstractVisual />
      </motion.div>
    </motion.div>
  </section>
);

const AbstractVisual = () => {
  const topCandidates = [
    { rank: "1", signal: "Calibrated strengths", score: "92" },
    { rank: "2", signal: "Bias review cleared", score: "89" },
    { rank: "3", signal: "Integrity checks passed", score: "87" },
  ];

  const candidateStats = [
    { label: "Applications", value: "8" },
    { label: "Interviews", value: "3" },
    { label: "Offers", value: "1" },
  ];

  const integritySteps = [
    { label: "Job Posted", detail: "Requirements locked" },
    { label: "Screening", detail: "AI scoring complete" },
    { label: "Interview", detail: "Identity secured" },
    { label: "Shortlist", detail: "Evidence packaged" },
  ];

  return (
    <div className="relative rounded-3xl border border-slate-200 bg-linear-to-br from-slate-900 via-slate-800 to-blue-900 p-4 shadow-xl shadow-slate-200/60 sm:p-6">
      <div className="absolute inset-x-8 -top-8 h-16 rounded-full bg-linear-to-r from-emerald-300/30 via-blue-200/30 to-slate-100/40 blur-3xl" />
      <div className="relative grid gap-4 sm:gap-5">
        <div className="rounded-2xl border border-white/15 bg-white/10 p-5 text-white sm:p-6">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-white/60">
            <span>Employer Dashboard</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-3 py-1 text-[10px] font-semibold text-emerald-200">
              Live signals
            </span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 text-sm text-white/80">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/60">
                Active Jobs
              </p>
              <p className="mt-1 text-xl font-semibold text-white">12</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-white/60">
                Interviews Scheduled
              </p>
              <p className="mt-1 text-xl font-semibold text-white">156</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-white/60">
                Total Applications
              </p>
              <p className="mt-1 text-xl font-semibold text-white">847</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-white/60">
                Integrity Alerts
              </p>
              <p className="mt-1 text-xl font-semibold text-amber-200">3</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {topCandidates.map((candidate) => (
              <div
                key={candidate.rank}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-400/30 text-xs font-semibold text-white">
                    #{candidate.rank}
                  </span>
                  <div className="space-y-1 text-xs text-white/70">
                    <p className="font-medium text-white">
                      Candidate {candidate.rank}
                    </p>
                    <p>{candidate.signal}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-emerald-200">
                  {candidate.score}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/15 bg-white/5 p-5 text-white sm:p-6">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-white/60">
            <span>Candidate Snapshot</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold text-white/80">
              Profile strength 92%
            </span>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs text-white/70 sm:gap-3">
            {candidateStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <p className="text-lg font-semibold text-white">{stat.value}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-white/60">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-2 text-left text-xs text-white/70">
            {[
              "Identity verification • pass",
              "Interview integrity • clean session",
              "Feedback summary • ready for sharing",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/80 sm:p-5">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-white/60">
            <span>Integrity Workflow</span>
            <span className="text-[10px] text-white/50">
              Real-time telemetry
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/70 sm:grid-cols-4 sm:gap-3">
            {integritySteps.map((step) => (
              <div
                key={step.label}
                className="rounded-xl border border-white/10 bg-white/10 p-3"
              >
                <p className="text-[11px] font-semibold text-white">
                  {step.label}
                </p>
                <p className="mt-1 text-[10px] text-white/60">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

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

const PainPoints = () => {
  const pains = [
    {
      title: "Biased Manual Screening",
      description:
        "Human reviewers introduce unconscious bias and inconsistent criteria, leaving qualified candidates overlooked.",
    },
    {
      title: "Keyword-Only Resume Filters",
      description:
        "Traditional ATS rules miss transferable skills and potential, narrowing the funnel before talent is assessed fairly.",
    },
    {
      title: "Unreliable Remote Interviews",
      description:
        "Without strong identity verification, remote interviewing opens doors to impersonation, coaching, and eroded trust.",
    },
    {
      title: "Time-Intensive Manual Review",
      description:
        "Recruiters spend hours reconciling notes and spreadsheets instead of collaborating on decisive, evidence-backed shortlists.",
    },
  ];

  return (
    <section className="bg-white" aria-labelledby="pain-points">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="max-w-3xl space-y-3">
          <h2
            id="pain-points"
            className="text-3xl font-semibold text-slate-900 sm:text-4xl"
          >
            The hiring process is broken
          </h2>
          <p className="text-base text-slate-600 sm:text-lg">
            Traditional recruitment methods create inefficiencies, bias, and
            missed opportunities for both employers and candidates.
          </p>
          <p className="text-sm text-slate-500 sm:text-base">
            Findings from 40+ organization audits guided IntelliHire’s
            integrity-first roadmap.
          </p>
        </div>
        <motion.div
          className="mt-12 grid gap-6 sm:gap-8 md:grid-cols-2"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={staggerChildren}
        >
          {pains.map((pain) => (
            <motion.article
              key={pain.title}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm sm:p-6"
              variants={fadeUp}
            >
              <h3 className="text-lg font-semibold text-slate-900">
                {pain.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {pain.description}
              </p>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

const FeatureCard = ({ title, description, details, bullets }) => (
  <motion.div
    className="relative flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-md shadow-slate-200/40 transition-shadow hover:shadow-lg sm:p-6"
    variants={fadeUp}
  >
    <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
    <p className="mt-3 text-sm text-slate-600 leading-relaxed">{description}</p>
    {details && (
      <p className="mt-3 text-sm text-slate-500 leading-relaxed">{details}</p>
    )}
    {bullets && (
      <ul className="mt-4 space-y-2 text-sm text-slate-600">
        {bullets.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    )}
  </motion.div>
);

const Features = () => {
  const features = [
    {
      title: "AI Resume Scoring",
      description:
        "Evaluate candidates based on skill alignment, experience relevance, and role fit with transparent scoring factors.",
      details:
        "The scoring model considers project complexity, progression, and demonstrated competencies—not just keywords—so reviewers stay informed about true fit.",
    },
    {
      title: "Adaptive Interview Engine",
      description:
        "Multimodal prompts adjust in real time to dig deeper when answers lack clarity or confidence.",
      details:
        "Interview pacing shifts automatically while sentiment and communication cues are captured alongside transcripts for balanced evaluation.",
    },
    {
      title: "Integrity & Authenticity Checks",
      description:
        "Continuous verification keeps every remote interaction authenticated and tamper-resistant.",
      details:
        "Facial matching, voice consistency, and screen monitoring run in the background with encrypted evidence clips and consent logs.",
    },
    {
      title: "Automated Shortlisting & Ranking",
      description:
        "Generate explainable shortlists that highlight calibrated strengths, risk markers, and confidence ranges.",
      details:
        "Side-by-side comparisons surface why candidates rose to the top, backing recommendations with measurable signals.",
    },
    {
      title: "Employer Dashboard",
      description:
        "Manage jobs, integrity alerts, interviews, and compliance evidence from a unified workspace.",
      details:
        "Collaborate with hiring managers using shared rubrics, track active pipelines, and review Integrity Log events without leaving the dashboard.",
    },
    {
      title: "Candidate Dashboard",
      description:
        "Give applicants a transparent hub to upload materials, complete interviews, and monitor progress.",
      details:
        "Candidates receive structured feedback summaries, performance breakdowns, and prep resources tuned to each role.",
    },
    {
      title: "Secure Data Handling",
      description:
        "Protect sensitive information with layered encryption, access controls, and retention governance.",
      details:
        "Data is encrypted in transit and at rest, logs are hashed, and retention policies stay configurable per role and regulation.",
    },
    {
      title: "Fair Evaluation Standards",
      description:
        "Apply consistent, bias-aware criteria across every stage of assessment.",
      details:
        "Standardized rubrics, blind review options, and audit trails make fairness measurable and repeatable for every hiring team.",
    },
  ];

  return (
    <section
      id="features"
      className="bg-slate-50 scroll-mt-24"
      aria-labelledby="features-title"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="max-w-3xl space-y-3">
          <h2
            id="features-title"
            className="text-3xl font-semibold text-slate-900 sm:text-4xl"
          >
            Complete hiring infrastructure
          </h2>
          <p className="text-base text-slate-600">
            Every workflow blends adaptive assessment with verifiable evidence,
            so teams move from screening to selection with confidence.
          </p>
          <p className="text-sm text-slate-500">
            Fairness, security, and transparency are embedded from resume intake
            through shortlist delivery.
          </p>
        </div>
        <motion.div
          className="mt-16 grid gap-6 sm:gap-8 md:grid-cols-2 xl:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerChildren}
        >
          {features.map((feature) => (
            <FeatureCard
              key={feature.title}
              title={feature.title}
              description={feature.description}
              details={feature.details}
              bullets={feature.bullets}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

const HowItWorks = () => {
  const steps = [
    {
      title: "Post a Job",
      description:
        "Employers create listings with competency targets, verification requirements, and interview parameters directly in the dashboard.",
      employerResult:
        "Jobs launch with calibrated expectations and evidence standards, ready for immediate distribution.",
      candidateResult:
        "Candidates see upfront criteria, interview formats, and verification steps before applying.",
    },
    {
      title: "Apply & Get Screened",
      description:
        "Candidates upload resumes, complete profiles, and move through adaptive prompts while AI benchmarks experience against role requirements.",
      employerResult:
        "Employers receive scored submissions, context, and risk markers with evidence snippets for quick review.",
      candidateResult:
        "Top candidates receive interview invitations with preparation guidance built from objective assessment metrics.",
    },
    {
      title: "Verified Interviews & Selection",
      description:
        "Identity-locked interviews capture audio, video, and screen activity while adaptive questions probe deeper when needed.",
      employerResult:
        "Employers review ranked candidates with integrity flags, evidence clips, and bias checks ready to share.",
      candidateResult:
        "Candidates gain transparent status updates, structured feedback, and verifiable proof of performance.",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="bg-white scroll-mt-24"
      aria-labelledby="workflow"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="max-w-2xl space-y-3">
          <h2
            id="workflow"
            className="text-3xl font-semibold text-slate-900 sm:text-4xl"
          >
            How IntelliHire guides every hire
          </h2>
          <p className="text-base text-slate-600">
            A streamlined route from job post to verified shortlist keeps
            expectations transparent for employers and candidates alike.
          </p>
          <p className="text-sm text-slate-500">
            Each stage makes outcomes explicit so both sides understand what
            success looks like before, during, and after interviews.
          </p>
        </div>
        <motion.div
          className="mt-14 grid gap-8 sm:gap-10 md:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={staggerChildren}
        >
          {steps.map((step, index) => (
            <motion.article
              key={step.title}
              className="flex h-full flex-col rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm sm:p-6"
              variants={fadeUp}
            >
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span className="font-mono text-xs tracking-wide">
                  Step {index + 1}
                </span>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white shadow border border-slate-200 text-sm font-semibold text-slate-700">
                  {index + 1}
                </span>
              </div>
              <h3 className="mt-4 text-xl font-semibold text-slate-900">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {step.description}
              </p>
              <div className="mt-6 space-y-2 text-xs text-slate-500">
                <p className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                    E
                  </span>
                  <span>{step.employerResult}</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold">
                    C
                  </span>
                  <span>{step.candidateResult}</span>
                </p>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

const EmployersSection = () => {
  const insights = [
    {
      title: "Faster Hiring Decisions",
      description:
        "Reduce time-to-hire by leaning on automated screening, intelligent ranking, and ready-to-share shortlists.",
    },
    {
      title: "Verified Candidate Identity",
      description:
        "Multi-factor identity checks and behavior monitoring keep every interview authentic, even when conducted remotely.",
    },
    {
      title: "Data-Informed Selection",
      description:
        "Objective scoring, competency analytics, and evidence clips make it easy to defend each recommendation.",
    },
    {
      title: "Reduced Bias",
      description:
        "Standardized rubrics and blind review options minimize unconscious bias while preserving team alignment.",
    },
  ];

  return (
    <section
      id="employers"
      className="bg-slate-50 scroll-mt-24"
      aria-labelledby="for-employers"
    >
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-5 lg:gap-16 lg:px-8">
        <motion.div
          className="lg:col-span-2"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
        >
          <h2
            id="for-employers"
            className="text-3xl font-semibold text-slate-900"
          >
            Built for evidence-driven hiring teams
          </h2>
          <p className="mt-4 text-base text-slate-600">
            IntelliHire equips HR leaders with a shared source of truth that
            connects every recommendation to documented behavior, competencies,
            and integrity signals.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Move faster without sacrificing rigor—dashboards consolidate alerts,
            analytics, and collaboration in one place.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <motion.a
              href="#final-cta"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Create Employer Account
            </motion.a>
            <a
              href="#features"
              className="inline-flex items-center justify-center rounded-full border border-slate-900 px-6 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              Explore Features
            </a>
          </div>
        </motion.div>
        <motion.div
          className="grid gap-6 lg:col-span-3 sm:gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={staggerChildren}
        >
          {insights.map((insight) => (
            <motion.div
              key={insight.title}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              variants={fadeUp}
            >
              <h3 className="text-lg font-semibold text-slate-900">
                {insight.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {insight.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

const CandidatesSection = () => {
  const highlights = [
    {
      title: "Fair Evaluation Process",
      description:
        "Skills and experience are assessed objectively without demographic bias or keyword-only filtering.",
    },
    {
      title: "Transparent Feedback",
      description:
        "Understand how every decision was made with clear scoring breakdowns and actionable feedback on interview performance.",
    },
    {
      title: "Streamlined Applications",
      description:
        "Apply to multiple positions efficiently with one profile, automated updates, and guided preparation steps.",
    },
    {
      title: "Privacy Protection",
      description:
        "Control what information is shared and with whom—data stays encrypted in transit and at rest.",
    },
  ];

  return (
    <section
      id="candidates"
      className="bg-white scroll-mt-24"
      aria-labelledby="for-candidates"
    >
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-5 lg:gap-16 lg:px-8">
        <motion.div
          className="order-2 grid gap-6 lg:order-1 lg:col-span-3 sm:gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={staggerChildren}
        >
          {highlights.map((highlight) => (
            <motion.div
              key={highlight.title}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm sm:p-6"
              variants={fadeUp}
            >
              <h3 className="text-lg font-semibold text-slate-900">
                {highlight.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {highlight.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
        <motion.div
          className="lg:col-span-2 order-1 lg:order-2"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeUp}
        >
          <h2
            id="for-candidates"
            className="text-3xl font-semibold text-slate-900 sm:text-4xl"
          >
            Candidates stay informed at every stage
          </h2>
          <p className="mt-4 text-base text-slate-600">
            Stand out for your true potential with transparent scoring,
            structured feedback, and ownership of every artifact you share.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            IntelliHire explains what is measured, why it matters, and guides
            preparation before each interview step.
          </p>
          <div className="mt-6">
            <motion.a
              href="#final-cta"
              className="inline-flex w-full items-center justify-center rounded-full border border-slate-900 px-6 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:w-auto"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Create Candidate Profile
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const TrustSection = () => {
  const benefits = [
    "Fair, consistent candidate evaluation using standardized criteria",
    "Secure, authenticated remote interviews with integrity monitoring",
    "Faster, data-informed hiring decisions backed by transparent scoring",
    "Better candidate experience with clear feedback and reduced bias",
    "Designed for scalable remote recruitment across teams and locations",
  ];

  return (
    <section
      className="bg-slate-900 text-white scroll-mt-24"
      aria-labelledby="trust"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-start">
          <motion.div
            className="space-y-6 sm:space-y-8 lg:w-1/2"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
          >
            <h2 id="trust" className="text-3xl font-semibold sm:text-4xl">
              Why IntelliHire earns trust
            </h2>

            <div className="flex flex-wrap gap-3 text-xs">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/30 px-3 py-1 font-medium text-slate-100">
                <ShieldIcon className="h-4 w-4" />
                Secure sessions
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/30 px-3 py-1 font-medium text-slate-100">
                <CheckIcon className="h-4 w-4" />
                Bias review signals
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/30 px-3 py-1 font-medium text-slate-100">
                <DocumentIcon className="h-4 w-4" />
                Evidence logs
              </span>
            </div>
          </motion.div>
              <motion.ul
                className="lg:w-1/2 grid gap-4 sm:gap-5 lg:gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerChildren}
          >
            {benefits.map((benefit) => (
              <motion.li
                key={benefit}
                className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-4 text-sm text-slate-100 sm:px-5"
                variants={fadeUp}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white">
                  <CheckIcon className="h-4 w-4" />
                </span>
                <span>{benefit}</span>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </div>
    </section>
  );
};

const FinalCTA = () => (
  <section className="bg-slate-50 scroll-mt-24" aria-labelledby="final-cta">
    <motion.div
      className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-24"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={fadeUp}
    >
      <h2
        id="final-cta"
        className="text-3xl font-semibold text-slate-900 sm:text-4xl"
      >
        Transform your hiring with integrity
      </h2>
      <p className="mt-4 text-base text-slate-600 sm:text-lg">
        Join forward-thinking teams using AI to build fair, secure, and
        data-informed recruitment journeys.
      </p>
      <p className="mt-3 text-sm text-slate-500 sm:text-base">
        Bring structure, verification, and clarity to every evaluation while
        keeping candidates informed and respected.
      </p>
      <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
        <motion.a
          href="#final-cta"
          className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:w-auto"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Get Started as Employer
        </motion.a>
        <motion.a
          href="#final-cta"
          className="inline-flex w-full items-center justify-center rounded-full border border-slate-900 px-6 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:w-auto"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Create Candidate Account
        </motion.a>
      </div>
      <p className="mt-6 text-sm text-slate-500 sm:text-base">
        Have questions or want to collaborate on research? Reach us at{" "}
        <a
          href="mailto:contact@intellihire.example"
          className="text-slate-900 underline transition-colors hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-slate-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
        >
          contact@intellihire.example
        </a>
        .
      </p>
    </motion.div>
  </section>
);

const Footer = () => {
  const footerLinks = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "For Employers", href: "#employers" },
    { label: "For Candidates", href: "#candidates" },
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

const ShieldIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M12 3L4 6V11C4 16.25 7.8 20.01 12 21C16.2 20.01 20 16.25 20 11V6L12 3Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.5 12.5L11 14L14.5 10.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CheckIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M20 6L9 17L4 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DocumentIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M7 3H14L19 8V21H7V3Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 3V8H19"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 13H16"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 17H16"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LandingPage = () => {
  return (
    <div className="bg-white text-slate-900 antialiased">
      <Header />
      <main>
        <Hero />
        <PainPoints />
        <Features />
        <HowItWorks />
        <EmployersSection />
        <CandidatesSection />
        <TrustSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
