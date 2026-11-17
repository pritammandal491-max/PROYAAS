import React, { useState } from 'react';
import {
  ALL_CLASSES,
  ALL_MEMBER_ROLES,
  isAccountBlocked,
  nowTimestamp,
} from '../data/defaultDb';
import type { GalleryItem, Notice, ProyashDB, PublicPageId, User } from '../types';

interface PublicWebsiteProps {
  db: ProyashDB;
  page: PublicPageId;
  canGoBack: boolean;
  onNavigate: (page: PublicPageId) => void;
  onGoBack: () => void;
  onUpdateDb: (updater: (prev: ProyashDB) => ProyashDB, saveLabel?: string) => void;
  onLoginSuccess: (user: User) => void;
  onToast: (msg: string) => void;
}

export const PublicWebsite: React.FC<PublicWebsiteProps> = ({
  db,
  page,
  canGoBack,
  onNavigate,
  onGoBack,
  onUpdateDb,
  onLoginSuccess,
  onToast,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState('All');
  const [galleryFilter, setGalleryFilter] = useState('All');
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  const [regConfirm, setRegConfirm] = useState<{ studentId: string; regId: string } | null>(null);
  const [resultQuery, setResultQuery] = useState('');
  const [searchedResult, setSearchedResult] = useState<string | null>(null);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryItem | null>(null);
  const [signupMessage, setSignupMessage] = useState<string | null>(null);

  // Registration form fields
  const [regForm, setRegForm] = useState({
    name: '',
    guardian: '',
    gender: 'Male',
    dob: '',
    mobile: '',
    village: '',
    className: ALL_CLASSES[3],
    school: '',
  });
  const [regPhotoFile, setRegPhotoFile] = useState<File | null>(null);

  // Login / Signup fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    mobile: '',
    role: ALL_MEMBER_ROLES[0],
    pass: '',
    pass2: '',
  });

  const sc = db.siteContent;
  const activeExam = db.examinations.find((e) => e.status === 'Active') || db.examinations[0];

  const handleNav = (target: PublicPageId) => {
    setMobileMenuOpen(false);
    onNavigate(target);
  };

  const handlePublicRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    const { name, guardian, gender, dob, mobile, village, className, school } = regForm;
    const duplicate = db.students.find(
      (s) =>
        s.name.trim().toLowerCase() === name.trim().toLowerCase() &&
        s.dob === dob &&
        s.mobile.trim() === mobile.trim()
    );
    if (duplicate) {
      onToast(`Duplicate prevented: Already registered as ${duplicate.regId}`);
      return;
    }

    const finalize = (photoData: string) => {
      const nextNum = db.students.length + 1;
      const regId = `PRY-2027-${String(nextNum).padStart(3, '0')}`;
      const studentId = `STU-${1000 + nextNum}`;
      onUpdateDb((prev) => ({
        ...prev,
        students: [
          ...prev.students,
          {
            id: studentId,
            name: name.trim(),
            guardian: guardian.trim(),
            gender,
            dob,
            mobile: mobile.trim(),
            village: village.trim(),
            className,
            school: school.trim(),
            regId,
            regDate: new Date().toISOString().slice(0, 10),
            rollNumber: '',
            status: 'Pending',
            photoData,
          },
        ],
        activityLogs: [
          {
            time: nowTimestamp(),
            actor: 'Public Visitor',
            module: 'Registration',
            action: 'PUBLIC_REGISTRATION',
            detail: `Registered ${studentId} (${regId}) for ${name.trim()}`,
          },
          ...prev.activityLogs,
        ],
      }), 'Registration Saved Permanently');
      setRegConfirm({ studentId, regId });
      setRegForm({
        name: '',
        guardian: '',
        gender: 'Male',
        dob: '',
        mobile: '',
        village: '',
        className: ALL_CLASSES[3],
        school: '',
      });
      setRegPhotoFile(null);
      onToast(`Student registered (${regId})!`);
    };

    if (regPhotoFile) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(regPhotoFile.type)) {
        onToast('Photo must be JPG, PNG, or WebP.');
        return;
      }
      if (regPhotoFile.size > 1.5 * 1024 * 1024) {
        onToast('Photo max size is 1.5 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => finalize(String(reader.result || ''));
      reader.readAsDataURL(regPhotoFile);
    } else {
      finalize('');
    }
  };

  const handleSearchResult = () => {
    const q = resultQuery.trim().toLowerCase();
    if (!q) {
      setSearchedResult('not_found');
      return;
    }
    const match = db.results.find(
      (r) =>
        r.published &&
        (r.regId.toLowerCase() === q || r.rollNumber.toLowerCase() === q)
    );
    setSearchedResult(match ? match.id : 'not_found');
  };

  const handleCredentialLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const email = loginEmail.trim().toLowerCase();
    if (isAccountBlocked(db, email)) {
      onToast('Access Denied: This account was deleted by Admin.');
      return;
    }
    const user = db.users.find((u) => u.email.toLowerCase() === email);
    if (!user || user.password !== loginPassword) {
      onToast('Invalid email or password.');
      return;
    }
    if (user.status === 'Pending') {
      onToast('Account pending approval by Admin or Manager.');
      return;
    }
    if (user.status === 'Suspended') {
      onToast('Account is suspended.');
      return;
    }
    onLoginSuccess(user);
  };

  const handleMemberSignup = (e: React.FormEvent) => {
    e.preventDefault();
    const { name, email, mobile, role, pass, pass2 } = signupForm;
    const normEmail = email.trim().toLowerCase();
    if (pass !== pass2) {
      onToast('Passwords do not match.');
      return;
    }
    if (isAccountBlocked(db, normEmail, mobile)) {
      onToast('Blocked: Deleted email or mobile cannot sign up again.');
      return;
    }
    if (db.users.some((u) => u.email.toLowerCase() === normEmail)) {
      onToast('Email already exists.');
      return;
    }
    onUpdateDb((prev) => ({
      ...prev,
      users: [
        ...prev.users,
        {
          id: `USR-${Date.now()}`,
          name: name.trim(),
          email: normEmail,
          password: pass,
          mobile: mobile.trim(),
          level: 'Member',
          roles: [role],
          allowDeleteAllStudents: false,
          status: 'Pending',
          assignedEventId: 'EVT-01',
        },
      ],
      activityLogs: [
        {
          time: nowTimestamp(),
          actor: 'Public Visitor',
          module: 'Users',
          action: 'MEMBER_SIGNUP',
          detail: `New member signup: ${name.trim()} (${normEmail})`,
        },
        ...prev.activityLogs,
      ],
    }), 'Saved Permanently');
    setSignupMessage(normEmail);
    setSignupForm({
      name: '',
      email: '',
      mobile: '',
      role: ALL_MEMBER_ROLES[0],
      pass: '',
      pass2: '',
    });
    onToast('Member signup submitted!');
  };

  const navItems: { id: PublicPageId; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About Us' },
    { id: 'activities', label: 'Activities' },
    { id: 'examination', label: 'Examination' },
    { id: 'library', label: 'Library' },
    { id: 'notices', label: 'Notices' },
    { id: 'events', label: 'Events' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'contact', label: 'Contact' },
  ];

  const matchedResultObj =
    searchedResult && searchedResult !== 'not_found'
      ? db.results.find((r) => r.id === searchedResult)
      : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f7fb] text-slate-800">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-[1280px] mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onGoBack}
              disabled={!canGoBack}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#0f294a] border border-slate-200 hover:bg-[#0f294a] hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Back to previous page"
            >
              ← Back
            </button>
            <button
              onClick={() => handleNav('home')}
              className="flex items-center gap-2.5 text-left cursor-pointer whitespace-nowrap shrink-0"
            >
              <div className="w-9 h-9 rounded-xl bg-[#0f294a] border-2 border-[#d4a017] text-[#d4a017] font-bold flex items-center justify-center overflow-hidden shrink-0">
                {sc.logoUrl ? (
                  <img
                    src={sc.logoUrl}
                    alt={sc.brandTitle}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  sc.brandShort || 'প্র'
                )}
              </div>
              <span className="text-base font-bold text-[#0f294a] tracking-tight">
                {sc.brandTitle}
              </span>
            </button>
          </div>

          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  page === item.id
                    ? 'text-[#0f294a] bg-slate-100 font-semibold'
                    : 'text-slate-600 hover:text-[#0f294a] hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleNav('login')}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0f294a] text-white hover:bg-[#1a3f6e] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Login / Sign Up
            </button>
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="lg:hidden px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-[#0f294a]"
            >
              Menu
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-5 py-3 flex flex-wrap gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  page === item.id ? 'bg-[#0f294a] text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Main Views */}
      <main className="flex-1">
        {page === 'home' && (
          <>
            {/* Hero */}
            <section className="bg-gradient-to-br from-[#091b33] via-[#0f294a] to-[#1a3f6e] text-white py-16">
              <div className="max-w-[1280px] mx-auto px-5 grid lg:grid-cols-12 gap-10 items-center">
                <div className="lg:col-span-7">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-2xl border-2 border-[#d4a017] bg-[#091b33]/70 flex items-center justify-center text-2xl font-extrabold text-[#d4a017] overflow-hidden shrink-0">
                      {sc.logoUrl ? (
                        <img
                          src={sc.logoUrl}
                          alt={sc.brandTitle}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        sc.brandShort || 'প্র'
                      )}
                    </div>
                    <div className="text-xs font-medium text-amber-200 tracking-wide">
                      {sc.homeBadge} · {sc.brandSubtitle}
                    </div>
                  </div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-4">
                    {sc.homeHead}
                  </h1>
                  <p className="text-slate-200 text-base leading-relaxed max-w-2xl mb-7">
                    {sc.homeBody}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => handleNav('examination')}
                      className="px-5 py-2.5 rounded-lg bg-[#d4a017] text-[#091b33] font-semibold text-sm hover:bg-[#e5b32a] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Register for Examination
                    </button>
                    <button
                      onClick={() => handleNav('library')}
                      className="px-5 py-2.5 rounded-lg border border-white/30 bg-white/10 text-white font-semibold text-sm hover:bg-white/20 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Open Study Library
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-5 bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-6">
                  <div className="flex items-center justify-between text-sm font-semibold text-white mb-4">
                    <span>Live Academic Snapshot</span>
                    <span className="text-xs text-amber-300">Session 2026–27</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 tabular-nums">
                    <div className="bg-[#091b33]/60 rounded-xl p-4 border border-white/10">
                      <div className="text-2xl font-bold text-white">{db.students.length}</div>
                      <div className="text-xs text-slate-300 mt-0.5">Student Records</div>
                    </div>
                    <div className="bg-[#091b33]/60 rounded-xl p-4 border border-white/10">
                      <div className="text-2xl font-bold text-white">
                        {db.library.filter((l) => l.published).length}
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5">Library Resources</div>
                    </div>
                    <div className="bg-[#091b33]/60 rounded-xl p-4 border border-white/10">
                      <div className="text-2xl font-bold text-white">
                        {db.gallery.filter((g) => g.published).length}
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5">Gallery Photos</div>
                    </div>
                    <div className="bg-[#091b33]/60 rounded-xl p-4 border border-white/10">
                      <div className="text-2xl font-bold text-white">
                        {db.results.filter((r) => r.published).length}
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5">Published Results</div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/15 text-xs text-slate-200">
                    Next Exam: <strong className="text-white">{activeExam?.name || 'TBA'}</strong> (
                    {activeExam?.date || 'TBA'})
                  </div>
                </div>
              </div>
            </section>

            {/* 3 Core Highlights */}
            <section className="py-12 max-w-[1280px] mx-auto px-5 grid md:grid-cols-3 gap-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="text-xs font-semibold text-[#b8890e] mb-1">
                  About {sc.brandTitle}
                </div>
                <h3 className="text-lg font-bold mb-2">{sc.aboutHead}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {sc.aboutBody.slice(0, 155)}...
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="text-xs font-semibold text-[#0f294a] mb-1">Study Library</div>
                <h3 className="text-lg font-bold mb-2">Syllabus &amp; Model Papers</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Access official examination syllabi, previous question papers, and Drive study
                  resources published by our Examination team.
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="text-xs font-semibold text-[#b8890e] mb-1">Student Privacy</div>
                <h3 className="text-lg font-bold mb-2">Protected Registration Photos</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Student registration photos are strictly private and accessible only to Admin and
                  Examination Management.
                </p>
              </div>
            </section>

            {/* Events & Notices */}
            <section className="py-12 bg-white border-y border-slate-200">
              <div className="max-w-[1280px] mx-auto px-5 grid lg:grid-cols-2 gap-8">
                <div>
                  <div className="flex items-end justify-between mb-5">
                    <div>
                      <div className="text-xs font-semibold text-[#b8890e]">Calendar</div>
                      <h2 className="text-2xl font-bold">Upcoming Events</h2>
                    </div>
                    <button
                      onClick={() => handleNav('events')}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#0f294a] hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      All Events
                    </button>
                  </div>
                  <div className="grid gap-4">
                    {db.events
                      .filter((e) => e.status === 'Upcoming')
                      .slice(0, 2)
                      .map((ev) => (
                        <div key={ev.id} className="border border-slate-200 rounded-xl p-5 bg-[#f8fafc]">
                          <div className="text-xs text-slate-500 mb-1 tabular-nums">
                            {ev.date} · {ev.status} · {ev.venue}
                          </div>
                          <h4 className="font-bold text-base mb-1">{ev.title}</h4>
                          <p className="text-sm text-slate-600">{ev.description}</p>
                        </div>
                      ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-end justify-between mb-5">
                    <div>
                      <div className="text-xs font-semibold text-[#b8890e]">Announcements</div>
                      <h2 className="text-2xl font-bold">Latest Notices</h2>
                    </div>
                    <button
                      onClick={() => handleNav('notices')}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#0f294a] hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      All Notices
                    </button>
                  </div>
                  <div className="grid gap-4">
                    {db.notices
                      .filter((n) => n.published)
                      .slice(0, 3)
                      .map((n) => (
                        <button
                          key={n.id}
                          onClick={() => setSelectedNotice(n)}
                          className="text-left border border-slate-200 rounded-xl p-5 bg-[#f8fafc] hover:border-[#0f294a] transition-colors cursor-pointer"
                        >
                          <div className="text-xs text-slate-500 mb-1 tabular-nums">
                            {n.category} · {n.date}
                          </div>
                          <h4 className="font-bold text-base mb-1">{n.title}</h4>
                          <p className="text-sm text-slate-600">{n.body.slice(0, 105)}...</p>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Gallery Preview */}
            <section className="py-12 max-w-[1280px] mx-auto px-5">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <div className="text-xs font-semibold text-[#b8890e]">Photographs</div>
                  <h2 className="text-2xl font-bold">Recent Gallery Moments</h2>
                </div>
                <button
                  onClick={() => handleNav('gallery')}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#0f294a] hover:bg-slate-100 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Open All Photos →
                </button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {db.gallery
                  .filter((g) => g.published)
                  .slice(0, 4)
                  .map((g) => (
                    <div
                      key={g.id}
                      onClick={() => setSelectedPhoto(g)}
                      className="bg-white border border-slate-200 rounded-xl p-3.5 cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <div className="h-44 rounded-lg overflow-hidden bg-slate-900 mb-3">
                        <img
                          src={g.imageUrl}
                          alt={g.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="text-xs text-slate-500 mb-1">
                        {g.category} · {g.year}
                      </div>
                      <div className="font-bold text-sm text-[#0f294a]">{g.title}</div>
                      <p className="text-xs text-slate-600 mt-1">{g.caption}</p>
                    </div>
                  ))}
              </div>
            </section>
          </>
        )}

        {page === 'about' && (
          <>
            <div className="bg-gradient-to-r from-[#091b33] to-[#1a3f6e] text-white py-10 border-b-4 border-[#d4a017]">
              <div className="max-w-[1280px] mx-auto px-5">
                <h1 className="text-3xl font-bold text-white mb-1">{sc.aboutHead}</h1>
                <p className="text-slate-200 text-sm max-w-3xl">{sc.aboutSubhead}</p>
              </div>
            </div>
            <section className="py-12 max-w-[1280px] mx-auto px-5 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <div className="text-xs font-semibold text-[#b8890e] mb-1">Who We Are</div>
                  <h2 className="text-2xl font-bold mb-3">About {sc.brandTitle}</h2>
                  <p className="text-sm text-slate-600 leading-relaxed">{sc.aboutBody}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <div className="text-xs font-semibold text-[#b8890e] mb-1">
                    Governance &amp; Operations
                  </div>
                  <h2 className="text-2xl font-bold mb-3">4-Tier Authority &amp; Exam Security</h2>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
                    <li>
                      <strong>Super Admin:</strong> Highest authority; appoints Sub Admins &amp;
                      Managers, controls Delete-All-Students permission, and blocks deleted accounts.
                    </li>
                    <li>
                      <strong>Sub Admin &amp; Manager:</strong> Sub Admin mirrors Admin work without
                      surpassing Super Admin; Managers assign Member roles.
                    </li>
                    <li>
                      <strong>Gatekeeper &amp; Guards:</strong> Gatekeepers verify centre entry;
                      Guards tick room attendance and alert Student Management.
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          </>
        )}

        {page === 'activities' && (
          <>
            <div className="bg-gradient-to-r from-[#091b33] to-[#1a3f6e] text-white py-10 border-b-4 border-[#d4a017]">
              <div className="max-w-[1280px] mx-auto px-5">
                <h1 className="text-3xl font-bold text-white mb-1">Our Activities</h1>
                <p className="text-slate-200 text-sm">
                  Educational programmes, merit development, social welfare, and community initiatives.
                </p>
              </div>
            </div>
            <section className="py-12 max-w-[1280px] mx-auto px-5 grid md:grid-cols-3 gap-6">
              {sc.activities.map((item) => (
                <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-6">
                  <div className="text-xs font-semibold text-[#b8890e] mb-1">{item.tag}</div>
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </section>
          </>
        )}

        {page === 'examination' && (
          <>
            <div className="bg-gradient-to-r from-[#091b33] to-[#1a3f6e] text-white py-10 border-b-4 border-[#d4a017]">
              <div className="max-w-[1280px] mx-auto px-5">
                <h1 className="text-3xl font-bold text-white mb-1">
                  Examinations &amp; Student Registration
                </h1>
                <p className="text-slate-200 text-sm">
                  Online student application with private photo upload, plus public result lookup.
                </p>
              </div>
            </div>

            <section className="py-12 max-w-[1280px] mx-auto px-5 grid lg:grid-cols-12 gap-8 items-start">
              {/* Student Registration Panel with Admin Picture Box */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
                {sc.regPictureUrl && (
                  <div className="mb-5 rounded-xl overflow-hidden border-2 border-[#d4a017] bg-[#091b33]">
                    <img
                      src={sc.regPictureUrl}
                      alt={sc.regPictureCaption || 'Official Registration Banner'}
                      referrerPolicy="no-referrer"
                      className="w-full h-52 object-cover"
                    />
                    <div className="px-4 py-2.5 bg-[#091b33] text-white text-xs flex items-center justify-between gap-2">
                      <span>{sc.regPictureCaption || 'Official Registration Picture Box'}</span>
                      <span className="text-[#d4a017] font-semibold">Set by Admin</span>
                    </div>
                  </div>
                )}

                <div className="text-xs font-semibold text-[#b8890e] mb-1">Online Application</div>
                <h2 className="text-2xl font-bold mb-1">Student Registration Form</h2>
                <p className="text-sm text-slate-600 mb-5">
                  Applying for: <strong>{activeExam?.name || 'Upcoming Exam'}</strong>
                </p>

                <form onSubmit={handlePublicRegistration} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                        Student Full Name *
                      </label>
                      <input
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        required
                        value={regForm.name}
                        onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                        Guardian Name *
                      </label>
                      <input
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        required
                        value={regForm.guardian}
                        onChange={(e) => setRegForm({ ...regForm, guardian: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                        Gender *
                      </label>
                      <select
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                        value={regForm.gender}
                        onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                      >
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                        Date of Birth *
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        required
                        value={regForm.dob}
                        onChange={(e) => setRegForm({ ...regForm, dob: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                        Mobile Number *
                      </label>
                      <input
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        required
                        pattern="[0-9]{10}"
                        placeholder="10-digit number"
                        value={regForm.mobile}
                        onChange={(e) => setRegForm({ ...regForm, mobile: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                        Village *
                      </label>
                      <input
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        required
                        value={regForm.village}
                        onChange={(e) => setRegForm({ ...regForm, village: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                        Class *
                      </label>
                      <select
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                        value={regForm.className}
                        onChange={(e) => setRegForm({ ...regForm, className: e.target.value })}
                      >
                        {ALL_CLASSES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                        School Name *
                      </label>
                      <input
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        required
                        value={regForm.school}
                        onChange={(e) => setRegForm({ ...regForm, school: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                      Upload Student Passport Photo (JPG/PNG/WebP &le; 1.5 MB)
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      onChange={(e) => setRegPhotoFile(e.target.files?.[0] || null)}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Privacy protected: Visible only to Admin &amp; Examination Management.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg bg-[#0f294a] text-white font-semibold text-sm hover:bg-[#1a3f6e] transition-colors cursor-pointer"
                  >
                    Submit Registration
                  </button>
                </form>

                {regConfirm && (
                  <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm">
                    <strong>Stored Successfully!</strong> Student ID:{' '}
                    <span className="font-mono-tabular font-semibold">{regConfirm.studentId}</span>{' '}
                    · Registration ID:{' '}
                    <span className="font-mono-tabular font-semibold">{regConfirm.regId}</span> ·
                    Status: <em>Pending Approval</em>.
                  </div>
                )}
              </div>

              {/* Result Lookup */}
              <div className="lg:col-span-5 space-y-5">
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <div className="text-xs font-semibold text-[#0f294a] mb-1">Results Archive</div>
                  <h3 className="text-xl font-bold mb-1">Search Examination Result</h3>
                  <p className="text-xs text-slate-600 mb-3">
                    Try <code className="font-mono-tabular">PRY-2027-001</code> or Roll{' '}
                    <code className="font-mono-tabular">101</code>,{' '}
                    <code className="font-mono-tabular">102</code>,{' '}
                    <code className="font-mono-tabular">103</code>.
                  </p>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      placeholder="Registration ID or Roll Number"
                      value={resultQuery}
                      onChange={(e) => setResultQuery(e.target.value)}
                    />
                    <button
                      onClick={handleSearchResult}
                      className="px-4 py-2 rounded-lg bg-[#d4a017] text-[#091b33] font-semibold text-sm hover:bg-[#e5b32a] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Search
                    </button>
                  </div>

                  {searchedResult === 'not_found' && (
                    <div className="mt-3 p-3 rounded-lg bg-amber-50 text-amber-800 text-xs">
                      No published result found for that ID or Roll Number.
                    </div>
                  )}

                  {matchedResultObj && (
                    <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex justify-between items-center">
                        <strong className="text-[#0f294a]">{matchedResultObj.studentName}</strong>
                        <span className="text-xs font-semibold text-emerald-700">
                          {matchedResultObj.rank}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1.5 tabular-nums">
                        Reg: <strong>{matchedResultObj.regId}</strong> · Roll:{' '}
                        <strong>{matchedResultObj.rollNumber}</strong> · Score:{' '}
                        <strong>
                          {matchedResultObj.marks}/{matchedResultObj.maxMarks}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-2">Study Materials &amp; Guidelines</h3>
                  <p className="text-sm text-slate-600 mb-3">
                    Visit the Study Library for official syllabi and previous question papers.
                  </p>
                  <button
                    onClick={() => handleNav('library')}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-[#0f294a] hover:bg-slate-50 cursor-pointer"
                  >
                    Go to Library →
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {page === 'library' && (
          <>
            <div className="bg-gradient-to-r from-[#091b33] to-[#1a3f6e] text-white py-10 border-b-4 border-[#d4a017]">
              <div className="max-w-[1280px] mx-auto px-5">
                <h1 className="text-3xl font-bold text-white mb-1">Study Library</h1>
                <p className="text-slate-200 text-sm">
                  Syllabi, previous examination papers, and Drive study files uploaded by
                  Examination Management &amp; Managers.
                </p>
              </div>
            </div>
            <section className="py-12 max-w-[1280px] mx-auto px-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="flex flex-wrap gap-1.5 p-1 bg-slate-200/70 rounded-lg">
                  {['All', ...new Set(db.library.filter((l) => l.published).map((l) => l.category))].map(
                    (cat) => (
                      <button
                        key={cat}
                        onClick={() => setLibraryFilter(cat)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                          libraryFilter === cat
                            ? 'bg-white text-[#0f294a] shadow-sm'
                            : 'text-slate-600 hover:text-[#0f294a]'
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  )}
                </div>
                <button
                  onClick={() => handleNav('login')}
                  className="px-3.5 py-2 rounded-lg bg-[#d4a017] text-[#091b33] text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Exam Manager / Manager? Upload Files
                </button>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {db.library
                  .filter((l) => l.published && (libraryFilter === 'All' || l.category === libraryFilter))
                  .map((l) => (
                    <div key={l.id} className="bg-white border border-slate-200 rounded-xl p-5">
                      <div className="text-xs text-slate-500 mb-1.5">
                        {l.category} · {l.className}
                      </div>
                      <h3 className="text-base font-bold mb-2">{l.title}</h3>
                      <p className="text-xs text-slate-600 mb-4">
                        Source: <strong>{l.type}</strong> ({l.fileName}) · {l.date} by {l.uploadedBy}
                      </p>
                      {l.type === 'Drive Link' ? (
                        <a
                          href={l.urlOrData}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex px-3.5 py-2 rounded-lg bg-[#0f294a] text-white text-xs font-semibold"
                        >
                          Open Drive Link ↗
                        </a>
                      ) : (
                        <a
                          href={l.urlOrData}
                          download={l.fileName}
                          className="inline-flex px-3.5 py-2 rounded-lg bg-[#d4a017] text-[#091b33] text-xs font-semibold"
                        >
                          Download File
                        </a>
                      )}
                    </div>
                  ))}
              </div>
            </section>
          </>
        )}

        {page === 'notices' && (
          <>
            <div className="bg-gradient-to-r from-[#091b33] to-[#1a3f6e] text-white py-10 border-b-4 border-[#d4a017]">
              <div className="max-w-[1280px] mx-auto px-5">
                <h1 className="text-3xl font-bold text-white mb-1">Official Notices</h1>
                <p className="text-slate-200 text-sm">
                  Latest announcements and examination updates.
                </p>
              </div>
            </div>
            <section className="py-12 max-w-[1280px] mx-auto px-5 space-y-4">
              {db.notices
                .filter((n) => n.published)
                .map((n) => (
                  <div
                    key={n.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap justify-between items-center gap-4"
                  >
                    <div className="max-w-3xl">
                      <div className="text-xs text-slate-500 mb-1 tabular-nums">
                        {n.category} · {n.date} {n.important ? '· Important' : ''}
                      </div>
                      <h3 className="text-lg font-bold mb-1">{n.title}</h3>
                      <p className="text-sm text-slate-600">{n.body}</p>
                    </div>
                    <button
                      onClick={() => setSelectedNotice(n)}
                      className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-[#0f294a] hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      View Notice
                    </button>
                  </div>
                ))}
            </section>
          </>
        )}

        {page === 'events' && (
          <>
            <div className="bg-gradient-to-r from-[#091b33] to-[#1a3f6e] text-white py-10 border-b-4 border-[#d4a017]">
              <div className="max-w-[1280px] mx-auto px-5">
                <h1 className="text-3xl font-bold text-white mb-1">Programmes &amp; Events</h1>
                <p className="text-slate-200 text-sm">
                  Upcoming and completed organisational events.
                </p>
              </div>
            </div>
            <section className="py-12 max-w-[1280px] mx-auto px-5 grid md:grid-cols-3 gap-6">
              {db.events.map((ev) => (
                <div key={ev.id} className="bg-white border border-slate-200 rounded-xl p-6">
                  <div className="text-xs text-slate-500 mb-2 tabular-nums">
                    {ev.date} · {ev.status}
                  </div>
                  <h3 className="text-lg font-bold mb-2">{ev.title}</h3>
                  <p className="text-sm text-slate-600 mb-3">{ev.description}</p>
                  <div className="text-xs font-semibold text-[#0f294a]">Venue: {ev.venue}</div>
                </div>
              ))}
            </section>
          </>
        )}

        {page === 'gallery' && (
          <>
            <div className="bg-gradient-to-r from-[#091b33] to-[#1a3f6e] text-white py-10 border-b-4 border-[#d4a017]">
              <div className="max-w-[1280px] mx-auto px-5">
                <h1 className="text-3xl font-bold text-white mb-1">Photos &amp; Gallery</h1>
                <p className="text-slate-200 text-sm">
                  Browse event photographs by album or year. Click any photo to zoom.
                </p>
              </div>
            </div>
            <section className="py-12 max-w-[1280px] mx-auto px-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="flex flex-wrap gap-1.5 p-1 bg-slate-200/70 rounded-lg">
                  {['All', ...new Set(db.gallery.filter((g) => g.published).map((g) => g.category))].map(
                    (cat) => (
                      <button
                        key={cat}
                        onClick={() => setGalleryFilter(cat)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                          galleryFilter === cat
                            ? 'bg-white text-[#0f294a] shadow-sm'
                            : 'text-slate-600 hover:text-[#0f294a]'
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  )}
                </div>
                <button
                  onClick={() => handleNav('login')}
                  className="px-3.5 py-2 rounded-lg bg-[#d4a017] text-[#091b33] text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Gallery Manager? Login to Edit
                </button>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {db.gallery
                  .filter((g) => g.published && (galleryFilter === 'All' || g.category === galleryFilter))
                  .map((g) => (
                    <div
                      key={g.id}
                      onClick={() => setSelectedPhoto(g)}
                      className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <div className="h-48 rounded-lg overflow-hidden bg-slate-900 mb-3">
                        <img
                          src={g.imageUrl}
                          alt={g.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="text-xs text-slate-500 mb-1">
                        {g.category} · {g.year}
                      </div>
                      <h4 className="font-bold text-base mb-1">{g.title}</h4>
                      <p className="text-sm text-slate-600">{g.caption}</p>
                    </div>
                  ))}
              </div>
            </section>
          </>
        )}

        {page === 'contact' && (
          <>
            <div className="bg-gradient-to-r from-[#091b33] to-[#1a3f6e] text-white py-10 border-b-4 border-[#d4a017]">
              <div className="max-w-[1280px] mx-auto px-5">
                <h1 className="text-3xl font-bold text-white mb-1">Contact Us</h1>
                <p className="text-slate-200 text-sm">
                  Official contact details for {sc.contact.orgName}.
                </p>
              </div>
            </div>
            <section className="py-12 max-w-[1280px] mx-auto px-5 grid md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4">Send an Enquiry</h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    (e.target as HTMLFormElement).reset();
                    onToast('Enquiry sent!');
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                      Your Name *
                    </label>
                    <input className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                      Mobile / Email *
                    </label>
                    <input className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                      Message *
                    </label>
                    <textarea rows={4} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" required />
                  </div>
                  <button className="px-5 py-2.5 rounded-lg bg-[#0f294a] text-white text-sm font-semibold cursor-pointer">
                    Send Message
                  </button>
                </form>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-3">Organisation Office</h3>
                <p className="text-sm text-slate-600 mb-3">
                  <strong>{sc.contact.orgName}</strong>
                  <br />
                  {sc.contact.address}
                </p>
                <p className="text-sm text-slate-600 space-y-1">
                  <span className="block">
                    <strong>Email:</strong> {sc.contact.email}
                  </span>
                  <span className="block">
                    <strong>Phone:</strong> {sc.contact.phone}
                  </span>
                  <span className="block">
                    <strong>Hours:</strong> {sc.contact.hours}
                  </span>
                </p>
                <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#0f294a]">
                  <strong>Location Note:</strong> {sc.contact.mapNote}
                </div>
              </div>
            </section>
          </>
        )}

        {page === 'login' && (
          <>
            <div className="bg-gradient-to-r from-[#091b33] to-[#1a3f6e] text-white py-10 border-b-4 border-[#d4a017]">
              <div className="max-w-[1280px] mx-auto px-5">
                <h1 className="text-3xl font-bold text-white mb-1">
                  Member Login &amp; New Member Sign Up
                </h1>
                <p className="text-slate-200 text-sm">
                  Only Super Admin appoints Sub Admins &amp; Managers. Deleted accounts are
                  permanently blocked from signing in or signing up.
                </p>
              </div>
            </div>

            <section className="py-12 max-w-xl mx-auto px-5">
              <div className="bg-white border border-slate-200 rounded-xl p-7">
                <div className="flex border-b border-slate-200 mb-5">
                  <button
                    onClick={() => setAuthTab('login')}
                    className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                      authTab === 'login'
                        ? 'border-[#d4a017] text-[#0f294a]'
                        : 'border-transparent text-slate-500'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setAuthTab('signup')}
                    className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                      authTab === 'signup'
                        ? 'border-[#d4a017] text-[#0f294a]'
                        : 'border-transparent text-slate-500'
                    }`}
                  >
                    New Member Sign Up
                  </button>
                </div>

                {authTab === 'login' ? (
                  <>
                    <form onSubmit={handleCredentialLogin} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                          Email Address *
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                          required
                          placeholder="e.g., pritam@gmail"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                          Password *
                        </label>
                        <input
                          type="password"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                          required
                          placeholder="Enter password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-lg bg-[#0f294a] text-white font-semibold text-sm hover:bg-[#1a3f6e] cursor-pointer"
                      >
                        Sign In to Management Portal
                      </button>
                    </form>
                    <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                      <strong className="text-[#0f294a] block mb-1">Role Accounts for Testing:</strong>
                      <div>
                        <strong>Super Admin:</strong> <code>pritam@gmail</code> /{' '}
                        <code>6294665449</code>
                      </div>
                      <div>
                        <strong>Manager:</strong> <code>manager@proyash.org</code> /{' '}
                        <code>manager123</code>
                      </div>
                      <div>
                        <strong>Guard / Gatekeeper:</strong> <code>guard@proyash.org</code> (
                        <code>guard123</code>) · <code>gatekeeper@proyash.org</code> (
                        <code>gate123</code>)
                      </div>
                      <div>
                        <strong>Student / Room / Exam / Notice / Gallery:</strong>{' '}
                        <code>studentmgr@proyash.org</code> (<code>stu123</code>) ·{' '}
                        <code>room@proyash.org</code> (<code>room123</code>) ·{' '}
                        <code>exam@proyash.org</code> (<code>exam123</code>) ·{' '}
                        <code>notice@proyash.org</code> (<code>notice123</code>) ·{' '}
                        <code>gallery@proyash.org</code> (<code>gallery123</code>)
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <form onSubmit={handleMemberSignup} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                          Full Name *
                        </label>
                        <input
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                          required
                          value={signupForm.name}
                          onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                            Email *
                          </label>
                          <input
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                            required
                            value={signupForm.email}
                            onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                            Mobile *
                          </label>
                          <input
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                            required
                            pattern="[0-9]{10}"
                            value={signupForm.mobile}
                            onChange={(e) =>
                              setSignupForm({ ...signupForm, mobile: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                          Requested Member Role *
                        </label>
                        <select
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                          value={signupForm.role}
                          onChange={(e) => setSignupForm({ ...signupForm, role: e.target.value })}
                        >
                          {ALL_MEMBER_ROLES.map((r) => (
                            <option key={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                            Password *
                          </label>
                          <input
                            type="password"
                            minLength={6}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                            required
                            value={signupForm.pass}
                            onChange={(e) => setSignupForm({ ...signupForm, pass: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                            Confirm Password *
                          </label>
                          <input
                            type="password"
                            minLength={6}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                            required
                            value={signupForm.pass2}
                            onChange={(e) => setSignupForm({ ...signupForm, pass2: e.target.value })}
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-lg bg-[#d4a017] text-[#091b33] font-semibold text-sm hover:bg-[#e5b32a] cursor-pointer"
                      >
                        Submit Member Sign Up
                      </button>
                    </form>
                    {signupMessage && (
                      <div className="mt-4 p-3 rounded-lg bg-emerald-50 text-emerald-900 text-xs">
                        <strong>Sign Up Submitted!</strong> Account for{' '}
                        <strong>{signupMessage}</strong> is <em>Pending Approval</em>.
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#091b33] text-slate-300 py-12 mt-12">
        <div className="max-w-[1280px] mx-auto px-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <h4 className="text-white font-bold text-base mb-3">{sc.brandTitle}</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dedicated to educational excellence, student merit development, secure student record
              management, and community welfare in Tehatta, Nadia.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm mb-3">Public Pages</h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button onClick={() => handleNav('home')} className="hover:text-[#d4a017] cursor-pointer">
                  Home
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('about')} className="hover:text-[#d4a017] cursor-pointer">
                  About Us
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('activities')} className="hover:text-[#d4a017] cursor-pointer">
                  Our Activities
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('library')} className="hover:text-[#d4a017] cursor-pointer">
                  Study Library
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('examination')} className="hover:text-[#d4a017] cursor-pointer">
                  Examinations &amp; Results
                </button>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm mb-3">Updates &amp; Portal</h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button onClick={() => handleNav('notices')} className="hover:text-[#d4a017] cursor-pointer">
                  Official Notices
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('events')} className="hover:text-[#d4a017] cursor-pointer">
                  Programmes &amp; Events
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('gallery')} className="hover:text-[#d4a017] cursor-pointer">
                  Photos &amp; Gallery
                </button>
              </li>
              <li>
                <button onClick={() => handleNav('login')} className="hover:text-[#d4a017] cursor-pointer">
                  Member Login &amp; Sign Up
                </button>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold text-sm mb-3">Contact</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {sc.contact.address}
              <br />
              {sc.contact.email}
              <br />
              {sc.contact.phone}
              <br />
              <span className="text-[#d4a017]">{sc.contact.hours}</span>
            </p>
          </div>
        </div>
        <div className="max-w-[1280px] mx-auto px-5 mt-8 pt-5 border-t border-white/10 flex flex-wrap justify-between gap-2 text-xs text-slate-400">
          <span>&copy; 2026 {sc.brandTitle}, Tehatta. Official Website &amp; Management System.</span>
          <span>Super Admin Controlled Governance · Student Privacy Protected</span>
        </div>
      </footer>

      {/* Notice Modal */}
      {selectedNotice && (
        <div
          className="fixed inset-0 z-50 bg-[#091b33]/70 flex items-center justify-center p-4"
          onClick={() => setSelectedNotice(null)}
        >
          <div
            className="bg-white rounded-xl max-w-xl w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-200">
              <div className="text-xs text-slate-500 tabular-nums">
                {selectedNotice.category} · {selectedNotice.date}
              </div>
              <button
                onClick={() => setSelectedNotice(null)}
                className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
            <h2 className="text-xl font-bold mb-3">{selectedNotice.title}</h2>
            <p className="text-sm text-slate-700 leading-relaxed">{selectedNotice.body}</p>
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-[#091b33]/75 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="bg-white rounded-xl max-w-3xl w-full p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-200">
              <div className="text-xs font-semibold text-slate-600">
                {selectedPhoto.category} · {selectedPhoto.year}
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
            <img
              src={selectedPhoto.imageUrl}
              alt={selectedPhoto.title}
              referrerPolicy="no-referrer"
              className="w-full max-h-[440px] object-contain rounded-lg bg-[#091b33]"
            />
            <h3 className="text-lg font-bold mt-4">{selectedPhoto.title}</h3>
            <p className="text-sm text-slate-600 mt-1">{selectedPhoto.caption}</p>
          </div>
        </div>
      )}
    </div>
  );
};
