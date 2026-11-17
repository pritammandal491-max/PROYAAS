import { useEffect, useState } from 'react';
import { GeminiChatbot } from './components/GeminiChatbot';
import { PortalLayout } from './components/PortalLayout';
import { PublicWebsite } from './components/PublicWebsite';
import {
  DEFAULT_DB,
  getModulePermissions,
  isSuperAdmin,
  loadDB,
  nowTimestamp,
  persistDB,
} from './data/defaultDb';
import type { PortalPageId, ProyashDB, PublicPageId, User } from './types';

interface ToastItem {
  id: number;
  message: string;
}

export default function App() {
  const [db, setDb] = useState<ProyashDB>(() => loadDB());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState<'public' | 'portal'>('public');

  const [publicPage, setPublicPage] = useState<PublicPageId>('home');
  const [publicHistory, setPublicHistory] = useState<PublicPageId[]>([]);

  const [portalPage, setPortalPage] = useState<PortalPageId>('dashboard');
  const [portalHistory, setPortalHistory] = useState<PortalPageId[]>([]);

  const [saveBadgeLabel, setSaveBadgeLabel] = useState('Saved Permanently');
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    document.title = `${db.siteContent.brandTitle} — Official Website & Management System`;
  }, [db.siteContent.brandTitle]);

  const showToast = (message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const handleUpdateDb = (
    updater: (prev: ProyashDB) => ProyashDB,
    saveLabel = 'Saved Permanently'
  ) => {
    setDb((prev) => {
      const next = updater(prev);
      const ok = persistDB(next);
      if (!ok) {
        showToast('Browser storage limit reached! Try smaller images or clear old photos.');
      } else {
        const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setSaveBadgeLabel(`${saveLabel} (${t})`);
      }
      return next;
    });
  };

  const handleNavigatePublic = (target: PublicPageId) => {
    if (target !== publicPage) {
      setPublicHistory((prev) => [...prev, publicPage]);
    }
    setPublicPage(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoBackPublic = () => {
    if (!publicHistory.length) return;
    const prevPage = publicHistory[publicHistory.length - 1];
    setPublicHistory((prev) => prev.slice(0, -1));
    setPublicPage(prevPage);
  };

  const handleNavigatePortal = (target: PortalPageId) => {
    if (!currentUser) return;
    const perms = getModulePermissions(currentUser);
    if (!perms.includes(target)) {
      showToast('Permission denied for this module.');
      return;
    }
    if (target !== portalPage) {
      setPortalHistory((prev) => [...prev, portalPage]);
    }
    setPortalPage(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoBackPortal = () => {
    if (!portalHistory.length || !currentUser) return;
    const prevPage = portalHistory[portalHistory.length - 1];
    setPortalHistory((prev) => prev.slice(0, -1));
    if (getModulePermissions(currentUser).includes(prevPage)) {
      setPortalPage(prevPage);
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setPortalPage('dashboard');
    setPortalHistory([]);
    setViewMode('portal');
    handleUpdateDb((prev) => ({
      ...prev,
      activityLogs: [
        {
          time: nowTimestamp(),
          actor: `${user.name} (${user.level})`,
          module: 'Auth',
          action: 'USER_LOGIN',
          detail: `Signed in as ${user.level}`,
        },
        ...prev.activityLogs,
      ],
    }));
    showToast(`Welcome, ${user.name}!`);
  };

  const handleLogout = () => {
    if (currentUser) {
      const actorStr = `${currentUser.name} (${currentUser.level})`;
      handleUpdateDb((prev) => ({
        ...prev,
        activityLogs: [
          {
            time: nowTimestamp(),
            actor: actorStr,
            module: 'Auth',
            action: 'USER_LOGOUT',
            detail: 'Signed out',
          },
          ...prev.activityLogs,
        ],
      }));
    }
    setCurrentUser(null);
    setViewMode('public');
    setPublicPage('home');
    showToast('Signed out.');
  };

  const handleResetDemoData = () => {
    if (!isSuperAdmin(currentUser)) {
      showToast('Only Super Admin can reset the database.');
      return;
    }
    const fresh = structuredClone(DEFAULT_DB);
    persistDB(fresh);
    setDb(fresh);
    setSaveBadgeLabel('Reset to Defaults');
    showToast('Database reset to default state.');
  };

  return (
    <>
      {viewMode === 'portal' && currentUser ? (
        <PortalLayout
          db={db}
          currentUser={db.users.find((u) => u.id === currentUser.id) || currentUser}
          portalPage={portalPage}
          canGoBack={portalHistory.length > 0}
          saveBadgeLabel={saveBadgeLabel}
          onNavigatePortal={handleNavigatePortal}
          onGoBack={handleGoBackPortal}
          onExitToPublic={() => setViewMode('public')}
          onLogout={handleLogout}
          onResetDemoData={handleResetDemoData}
          onUpdateDb={handleUpdateDb}
          onToast={showToast}
        />
      ) : (
        <PublicWebsite
          db={db}
          page={publicPage}
          canGoBack={publicHistory.length > 0}
          onNavigate={handleNavigatePublic}
          onGoBack={handleGoBackPublic}
          onUpdateDb={handleUpdateDb}
          onLoginSuccess={handleLoginSuccess}
          onToast={showToast}
        />
      )}

      <GeminiChatbot
        db={db}
        viewMode={viewMode}
        portalPage={portalPage}
        currentUser={
          currentUser ? db.users.find((u) => u.id === currentUser.id) || currentUser : null
        }
      />

      {/* Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 grid gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-[#091b33] text-white px-4 py-3 rounded-xl shadow-lg border border-white/15 text-xs font-medium"
          >
            {t.message}
          </div>
        ))}
      </div>
    </>
  );
}
