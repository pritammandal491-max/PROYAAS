import React from 'react';
import {
  canEditGatekeeperWork,
  getModulePermissions,
  isAdminOrManager,
  isSuperAdmin,
} from '../data/defaultDb';
import type { PortalPageId, ProyashDB, User } from '../types';
import {
  EventsPanel,
  GalleryPanel,
  LogsPanel,
  NoticePanel,
  ReportsPanel,
  SiteEditorPanel,
  TeamWorkMonitorPanel,
  UsersRolesPanel,
} from './portal/ContentAndAdminPanels';
import { GroupMessageBox } from './portal/GroupMessageBox';
import {
  ExaminationResultsPanel,
  GatekeeperEntryPanel,
  GatekeeperMonitorPanel,
  GatekeeperRoomLookupPanel,
  GuardAttendancePanel,
  LibraryManagementPanel,
} from './portal/OperationsPanels';
import { RoomManagement } from './portal/RoomManagement';
import {
  RegistrationApprovalPanel,
  StudentDataPanel,
  StudentPhotosVault,
} from './portal/StudentDataPanel';

interface PortalLayoutProps {
  db: ProyashDB;
  currentUser: User;
  portalPage: PortalPageId;
  canGoBack: boolean;
  saveBadgeLabel: string;
  onNavigatePortal: (page: PortalPageId) => void;
  onGoBack: () => void;
  onExitToPublic: () => void;
  onLogout: () => void;
  onResetDemoData: () => void;
  onUpdateDb: (updater: (prev: ProyashDB) => ProyashDB, saveLabel?: string) => void;
  onToast: (msg: string) => void;
}

const SIDEBAR_GROUPS: { title: string; items: { id: PortalPageId; label: string }[] }[] = [
  {
    title: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'group-messages', label: 'Group Message Box (Admin & Manager)' },
      { id: 'team-work', label: "Everyone's Work Monitor" },
      { id: 'students', label: 'Student Data & Excel Sheet' },
      { id: 'registration', label: 'Registration Approval & Picture' },
      { id: 'student-photos', label: 'Student Photos Vault' },
      { id: 'guard-attendance', label: 'Room Guard & Present Check' },
      { id: 'gatekeeper-monitor', label: 'Gatekeeper Work (View/Edit)' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { id: 'event-mng', label: 'Gatekeeper Entry Tick' },
      { id: 'room-mng', label: 'Room & Class Distribution' },
      { id: 'room-lookup', label: 'Gatekeeper Room Lookup' },
      { id: 'examination', label: 'Examination & Results Panel' },
      { id: 'library', label: 'Library Uploads (Drive/File)' },
    ],
  },
  {
    title: 'Content',
    items: [
      { id: 'notices', label: 'Notice Panel' },
      { id: 'events', label: 'Event Management' },
      { id: 'gallery', label: 'Gallery Edits & Photos' },
      { id: 'site-editor', label: 'Edit Home / Brand / About / Contact' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { id: 'users', label: 'Users, Roles & Admin Access' },
      { id: 'reports', label: 'Reports & Excel Export' },
      { id: 'logs', label: 'Activity Audit Logs' },
    ],
  },
];

export const PortalLayout: React.FC<PortalLayoutProps> = ({
  db,
  currentUser,
  portalPage,
  canGoBack,
  saveBadgeLabel,
  onNavigatePortal,
  onGoBack,
  onExitToPublic,
  onLogout,
  onResetDemoData,
  onUpdateDb,
  onToast,
}) => {
  const perms = getModulePermissions(currentUser);
  const sc = db.siteContent;
  const pendingUsers = db.users.filter((u) => u.status === 'Pending').length;
  const unreadAlerts = db.guardMessages.filter((m) => !m.resolved).length;
  const unreadGroupMsgs = db.groupMessages.filter((m) => !m.resolved).length;

  const titles: Record<PortalPageId, string> = {
    dashboard: 'Management Dashboard',
    'group-messages': 'Group Message Box — Admin & Manager Communications',
    'team-work': "Admin & Manager Oversight — Everyone's Work",
    students: 'Student Data — Excel Sheet, Permanent Save & Admin Delete',
    registration: 'Registration Approval & Admin Picture Box',
    'student-photos': 'Private Student Photos Vault',
    'guard-attendance': 'Room Guard Present Check & Alerts',
    'gatekeeper-monitor': canEditGatekeeperWork(currentUser)
      ? 'Gatekeeper Work (Admin & Manager Edit Mode)'
      : 'Gatekeeper Work (View-Only for Members)',
    'event-mng': 'Gatekeeper — Exam Centre Entry Tick',
    'room-mng': 'Room Management — Distribute by Subjected Class (II–X) & Guards',
    'room-lookup': 'Gatekeeper Room Lookup (Read-Only)',
    examination: 'Examination & Results Management Panel',
    library: 'Library Management (Drive / File)',
    notices: 'Notice Panel (Save Permanently · Delete: Admin Only)',
    events: 'Event Management',
    gallery: 'Gallery Manager — Edit & Upload Photos',
    'site-editor': 'Edit Homepage, Brand, About Us & Contact (Permanent Save)',
    users: 'Users, Roles & Security Access Matrix',
    reports: 'Reports & Excel Extraction',
    logs: 'System Activity Audit Logs',
  };

  const openGroupMessages = db.groupMessages.filter((m) => !m.resolved).slice(0, 4);
  const verifiedCount = db.eventEntries.filter(
    (e) => e.eventId === 'EVT-01' && e.status === 'Verified'
  ).length;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f4f7fb]">
      {/* Sidebar */}
      <aside className="w-full lg:w-72 bg-[#091b33] text-slate-300 flex flex-col shrink-0 border-r border-white/10">
        <div className="p-5 border-b border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0f294a] border-2 border-[#d4a017] text-[#d4a017] font-bold flex items-center justify-center overflow-hidden shrink-0">
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
          <div className="min-w-0">
            <div className="text-white font-bold text-sm truncate">{sc.brandTitle} Portal</div>
            <div className="text-[11px] text-[#d4a017] truncate">
              {currentUser.level} · {currentUser.roles[0]}
            </div>
          </div>
        </div>

        <nav className="p-3 flex-1 overflow-y-auto space-y-1">
          {SIDEBAR_GROUPS.map((group) => {
            const visible = group.items.filter((i) => perms.includes(i.id));
            if (!visible.length) return null;
            return (
              <div key={group.title} className="pt-2">
                <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500 px-3 pb-1">
                  {group.title}
                </div>
                {visible.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onNavigatePortal(item.id)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                      portalPage === item.id
                        ? 'bg-[#d4a017] text-[#091b33] font-bold'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    {item.id === 'users' && pendingUsers > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold tabular-nums">
                        {pendingUsers}
                      </span>
                    )}
                    {item.id === 'guard-attendance' && unreadAlerts > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500 text-[#091b33] text-[10px] font-bold tabular-nums">
                        {unreadAlerts}
                      </span>
                    )}
                    {item.id === 'group-messages' && unreadGroupMsgs > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-[#0f294a] text-[#d4a017] text-[10px] font-bold tabular-nums">
                        {unreadGroupMsgs}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-2">
          <button
            onClick={onExitToPublic}
            className="w-full py-2 px-3 rounded-lg bg-white/10 border border-white/15 text-white text-xs font-semibold hover:bg-white/15 cursor-pointer"
          >
            View Public Website
          </button>
          <button
            onClick={onLogout}
            className="w-full py-2 px-3 rounded-lg bg-red-700 text-white text-xs font-semibold hover:bg-red-800 cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onGoBack}
              disabled={!canGoBack}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#0f294a] border border-slate-200 hover:bg-[#0f294a] hover:text-white disabled:opacity-40 disabled:pointer-events-none cursor-pointer whitespace-nowrap shrink-0"
            >
              ← Back
            </button>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold truncate">{titles[portalPage]}</h2>
              <div className="text-xs text-slate-500 truncate">
                Signed in as {currentUser.name} ({currentUser.email})
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg tabular-nums">
              {saveBadgeLabel}
            </span>
            {isSuperAdmin(currentUser) && (
              <button
                onClick={onResetDemoData}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-[#0f294a] hover:bg-slate-50 cursor-pointer"
              >
                Reset Demo Data
              </button>
            )}
          </div>
        </header>

        <main className="p-6 flex-1">
          {portalPage === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs font-semibold text-slate-500">Stored Student Records</div>
                  <div className="text-2xl font-bold text-[#0f294a] mt-1">{db.students.length}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs font-semibold text-slate-500">Published Results</div>
                  <div className="text-2xl font-bold text-[#0f294a] mt-1">{db.results.length}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs font-semibold text-slate-500">Entered Exam Centre</div>
                  <div className="text-2xl font-bold text-[#0f294a] mt-1">{verifiedCount}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs font-semibold text-slate-500">Open Group Messages</div>
                  <div className="text-2xl font-bold text-[#0f294a] mt-1">
                    {db.groupMessages.filter((m) => !m.resolved).length}
                  </div>
                </div>
              </div>

              {isAdminOrManager(currentUser) && (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                    <div>
                      <h3 className="text-base font-bold">
                        Group Message Box (Admin &amp; Manager)
                      </h3>
                      <p className="text-xs text-slate-600">
                        Messages grouped by Admin Group, Manager Group &amp; Guard Alerts.
                      </p>
                    </div>
                    <button
                      onClick={() => onNavigatePortal('group-messages')}
                      className="px-3.5 py-2 rounded-lg bg-[#0f294a] text-white text-xs font-semibold cursor-pointer"
                    >
                      Open Full Message Box →
                    </button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    {openGroupMessages.length ? (
                      openGroupMessages.map((m) => (
                        <div
                          key={m.id}
                          className="p-4 rounded-xl border border-slate-200 bg-slate-50"
                        >
                          <div className="flex justify-between text-xs text-slate-500 mb-1 tabular-nums">
                            <span className="font-bold text-[#0f294a]">{m.group}</span>
                            <span>{m.time}</span>
                          </div>
                          <div className="text-xs font-semibold text-slate-700">{m.sender}</div>
                          <p className="text-sm text-slate-800 mt-1">{m.message}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">No open group messages.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h3 className="text-base font-bold mb-2">Your Role &amp; Authority</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Signed in as <strong>{currentUser.name}</strong> ({currentUser.level} ·{' '}
                    {currentUser.roles.join(', ')}).
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {perms.includes('room-mng') && (
                      <button
                        onClick={() => onNavigatePortal('room-mng')}
                        className="px-3.5 py-2 rounded-lg bg-[#0f294a] text-white text-xs font-semibold cursor-pointer"
                      >
                        Room &amp; Class Distribution
                      </button>
                    )}
                    {perms.includes('students') && (
                      <button
                        onClick={() => onNavigatePortal('students')}
                        className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-[#0f294a] cursor-pointer"
                      >
                        Student Data &amp; Excel
                      </button>
                    )}
                    {perms.includes('site-editor') && (
                      <button
                        onClick={() => onNavigatePortal('site-editor')}
                        className="px-3.5 py-2 rounded-lg bg-[#d4a017] text-[#091b33] text-xs font-semibold cursor-pointer"
                      >
                        Edit Home / About / Contact
                      </button>
                    )}
                    {perms.includes('event-mng') && (
                      <button
                        onClick={() => onNavigatePortal('event-mng')}
                        className="px-3.5 py-2 rounded-lg bg-[#0f294a] text-white text-xs font-semibold cursor-pointer"
                      >
                        Gatekeeper Entry Tick
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h3 className="text-base font-bold mb-3">Recent System Activity</h3>
                  <div className="space-y-2.5 text-xs">
                    {db.activityLogs.slice(0, 5).map((l, idx) => (
                      <div key={idx} className="pb-2 border-b border-slate-100 last:border-b-0">
                        <div className="font-semibold text-[#0f294a]">
                          {l.action}{' '}
                          <span className="font-mono-tabular text-slate-400 font-normal">
                            {l.time}
                          </span>
                        </div>
                        <div className="text-slate-600">
                          {l.actor} — {l.detail}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {portalPage === 'group-messages' && (
            <GroupMessageBox
              db={db}
              currentUser={currentUser}
              onUpdateDb={onUpdateDb}
              onToast={onToast}
            />
          )}
          {portalPage === 'team-work' && <TeamWorkMonitorPanel db={db} />}
          {portalPage === 'students' && (
            <StudentDataPanel
              db={db}
              currentUser={currentUser}
              onUpdateDb={onUpdateDb}
              onToast={onToast}
              onNavigatePortal={onNavigatePortal}
            />
          )}
          {portalPage === 'registration' && (
            <RegistrationApprovalPanel
              db={db}
              currentUser={currentUser}
              onUpdateDb={onUpdateDb}
              onToast={onToast}
              onNavigatePortal={onNavigatePortal}
            />
          )}
          {portalPage === 'student-photos' && (
            <StudentPhotosVault
              db={db}
              currentUser={currentUser}
              onUpdateDb={onUpdateDb}
              onToast={onToast}
            />
          )}
          {portalPage === 'guard-attendance' && (
            <GuardAttendancePanel
              db={db}
              currentUser={currentUser}
              onUpdateDb={onUpdateDb}
              onToast={onToast}
            />
          )}
          {portalPage === 'gatekeeper-monitor' && (
            <GatekeeperMonitorPanel
              db={db}
              currentUser={currentUser}
              onUpdateDb={onUpdateDb}
              onToast={onToast}
            />
          )}
          {portalPage === 'event-mng' && (
            <GatekeeperEntryPanel
              db={db}
              currentUser={currentUser}
              onUpdateDb={onUpdateDb}
              onToast={onToast}
            />
          )}
          {portalPage === 'room-mng' && (
            <RoomManagement
              db={db}
              currentUser={currentUser}
              onUpdateDb={onUpdateDb}
              onToast={onToast}
            />
          )}
          {portalPage === 'room-lookup' && <GatekeeperRoomLookupPanel db={db} />}
          {portalPage === 'examination' && (
            <ExaminationResultsPanel
              db={db}
              currentUser={currentUser}
              onUpdateDb={onUpdateDb}
              onToast={onToast}
            />
          )}
          {portalPage === 'library' && (
            <LibraryManagementPanel
              db={db}
              currentUser={currentUser}
              onUpdateDb={onUpdateDb}
              onToast={onToast}
            />
          )}
          {portalPage === 'notices' && (
            <NoticePanel
              db={db}
              currentUser={currentUser}
              onUpdateDb={onUpdateDb}
              onToast={onToast}
            />
          )}
          {portalPage === 'events' && (
            <EventsPanel
              db={db}
              currentUser={currentUser}
              onUpdateDb={onUpdateDb}
              onToast={onToast}
            />
          )}
          {portalPage === 'gallery' && (
            <GalleryPanel
              db={db}
              currentUser={currentUser}
              onUpdateDb={onUpdateDb}
              onToast={onToast}
            />
          )}
          {portalPage === 'site-editor' && (
            <SiteEditorPanel
              db={db}
              currentUser={currentUser}
              onUpdateDb={onUpdateDb}
              onToast={onToast}
            />
          )}
          {portalPage === 'users' && (
            <UsersRolesPanel
              db={db}
              currentUser={currentUser}
              onUpdateDb={onUpdateDb}
              onToast={onToast}
            />
          )}
          {portalPage === 'reports' && <ReportsPanel db={db} onToast={onToast} />}
          {portalPage === 'logs' && <LogsPanel db={db} />}
        </main>
      </div>
    </div>
  );
};
