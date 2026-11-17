import React, { useState } from 'react';
import {
  ALL_MEMBER_ROLES,
  ROLE_ACCESS_MATRIX,
  canChangeUserPassword,
  isAccountBlocked,
  isAdminEquivalent,
  isSuperAdmin,
  nowTimestamp,
} from '../../data/defaultDb';
import type { Notice, ProyashDB, User, UserLevel } from '../../types';
import { exportSheetXLSX } from '../../utils/xlsx';

interface PanelProps {
  db: ProyashDB;
  currentUser: User;
  onUpdateDb: (updater: (prev: ProyashDB) => ProyashDB, saveLabel?: string) => void;
  onToast: (msg: string) => void;
}

// ==================== NOTICE PANEL (SAVE BY NOTICE MNG/MANAGER/ADMIN • DELETE BY ADMIN ONLY) ====================
export const NoticePanel: React.FC<PanelProps> = ({ db, currentUser, onUpdateDb, onToast }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Examination');
  const [body, setBody] = useState('');
  const [editing, setEditing] = useState<Notice | null>(null);

  const amAdmin = isAdminEquivalent(currentUser);

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateDb(
      (prev) => ({
        ...prev,
        notices: [
          {
            id: `NTC-${Date.now()}`,
            title: title.trim(),
            category,
            body: body.trim(),
            date: new Date().toISOString().slice(0, 10),
            important: true,
            published: true,
          },
          ...prev.notices,
        ],
        activityLogs: [
          {
            time: nowTimestamp(),
            actor: `${currentUser.name} (${currentUser.level})`,
            module: 'Notices',
            action: 'NOTICE_SAVED',
            detail: `Published & saved notice permanently: ${title.trim()}`,
          },
          ...prev.activityLogs,
        ],
      }),
      'Notice Saved Permanently'
    );
    setTitle('');
    setBody('');
    onToast('Notice saved permanently to website!');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    onUpdateDb(
      (prev) => ({
        ...prev,
        notices: prev.notices.map((n) => (n.id === editing.id ? editing : n)),
        activityLogs: [
          {
            time: nowTimestamp(),
            actor: `${currentUser.name} (${currentUser.level})`,
            module: 'Notices',
            action: 'NOTICE_EDITED',
            detail: `Saved edited notice ${editing.id}`,
          },
          ...prev.activityLogs,
        ],
      }),
      'Notice Saved Permanently'
    );
    setEditing(null);
    onToast('Notice changes saved permanently!');
  };

  const handleDelete = (id: string) => {
    if (!amAdmin) {
      onToast('Only Admin can delete notices.');
      return;
    }
    onUpdateDb(
      (prev) => ({
        ...prev,
        notices: prev.notices.filter((n) => n.id !== id),
        activityLogs: [
          {
            time: nowTimestamp(),
            actor: `${currentUser.name} (${currentUser.level})`,
            module: 'Notices',
            action: 'NOTICE_DELETED',
            detail: `Deleted notice ${id}`,
          },
          ...prev.activityLogs,
        ],
      }),
      'Saved Permanently'
    );
    onToast('Notice deleted by Admin.');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
          <h3 className="text-lg font-bold">Publish &amp; Save Notice Permanently</h3>
          <span className="text-xs font-semibold text-slate-600">
            {amAdmin
              ? 'Admin: Save & Delete Enabled'
              : 'Management: Save Enabled · Delete: Admin Only'}
          </span>
        </div>
        <form onSubmit={handlePublish} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              placeholder="Notice Title *"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <select
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>Examination</option>
              <option>Registration</option>
              <option>Guidelines</option>
              <option>General</option>
            </select>
          </div>
          <textarea
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            placeholder="Notice Body *"
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 cursor-pointer">
            Save &amp; Publish Notice Permanently
          </button>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs text-[#0f294a]">
            <tr>
              <th className="py-3 px-4 text-left">Date</th>
              <th className="py-3 px-4 text-left">Category</th>
              <th className="py-3 px-4 text-left">Title</th>
              <th className="py-3 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {db.notices.map((n) => (
              <tr key={n.id}>
                <td className="py-3 px-4 font-mono-tabular text-xs">{n.date}</td>
                <td className="py-3 px-4 text-xs font-medium">{n.category}</td>
                <td className="py-3 px-4 font-semibold text-[#0f294a]">{n.title}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditing({ ...n })}
                      className="px-3 py-1 rounded-md bg-[#d4a017] text-[#091b33] text-xs font-semibold cursor-pointer"
                    >
                      Edit &amp; Save
                    </button>
                    {amAdmin ? (
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="px-3 py-1 rounded-md bg-red-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        Delete
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Delete: Admin Only</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 bg-[#091b33]/70 flex items-center justify-center p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-200">
              <h3 className="text-lg font-bold">Edit Notice</h3>
              <button
                onClick={() => setEditing(null)}
                className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#0f294a] mb-1">Title</label>
                <input
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0f294a] mb-1">Body</label>
                <textarea
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  value={editing.body}
                  onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                  required
                />
              </div>
              <button className="w-full py-2.5 rounded-lg bg-emerald-700 text-white text-sm font-semibold cursor-pointer">
                Save Notice Permanently
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== EVENTS PANEL ====================
export const EventsPanel: React.FC<PanelProps> = ({ db, currentUser, onUpdateDb, onToast }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');
  const amAdmin = isAdminEquivalent(currentUser);

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateDb(
      (prev) => ({
        ...prev,
        events: [
          {
            id: `EVT-${Date.now()}`,
            title: title.trim(),
            date,
            venue: venue.trim(),
            description: description.trim(),
            connectEntry: false,
            status: 'Upcoming',
          },
          ...prev.events,
        ],
      }),
      'Saved Permanently'
    );
    setTitle('');
    setVenue('');
    setDescription('');
    onToast('Event saved permanently!');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-3">Add Organisation Event</h3>
        <form onSubmit={handleAddEvent} className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <input
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              placeholder="Event Title *"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              type="date"
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <input
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              placeholder="Venue *"
              required
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
            />
          </div>
          <input
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            placeholder="Description *"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold cursor-pointer">
            Save Event Permanently
          </button>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs text-[#0f294a]">
            <tr>
              <th className="py-3 px-4 text-left">Date</th>
              <th className="py-3 px-4 text-left">Title</th>
              <th className="py-3 px-4 text-left">Venue</th>
              <th className="py-3 px-4 text-left">Status</th>
              <th className="py-3 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {db.events.map((ev) => (
              <tr key={ev.id}>
                <td className="py-3 px-4 font-mono-tabular text-xs">{ev.date}</td>
                <td className="py-3 px-4 font-semibold text-[#0f294a]">{ev.title}</td>
                <td className="py-3 px-4 text-xs">{ev.venue}</td>
                <td className="py-3 px-4 text-xs font-semibold">{ev.status}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        onUpdateDb(
                          (prev) => ({
                            ...prev,
                            events: prev.events.map((x) =>
                              x.id === ev.id
                                ? {
                                    ...x,
                                    status: x.status === 'Upcoming' ? 'Completed' : 'Upcoming',
                                  }
                                : x
                            ),
                          }),
                          'Saved Permanently'
                        )
                      }
                      className="px-2.5 py-1 rounded-md border border-slate-300 text-xs font-semibold cursor-pointer"
                    >
                      Toggle Status
                    </button>
                    {amAdmin && (
                      <button
                        onClick={() => {
                          onUpdateDb(
                            (prev) => ({
                              ...prev,
                              events: prev.events.filter((x) => x.id !== ev.id),
                            }),
                            'Saved Permanently'
                          );
                          onToast('Event deleted by Admin.');
                        }}
                        className="px-2.5 py-1 rounded-md bg-red-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ==================== GALLERY PANEL ====================
export const GalleryPanel: React.FC<PanelProps> = ({ db, currentUser, onUpdateDb, onToast }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Examination');
  const [year, setYear] = useState('2026');
  const [caption, setCaption] = useState('');
  const [imgUrl, setImgUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const amAdmin = isAdminEquivalent(currentUser);

  const handleAddPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    const save = (finalUrl: string) => {
      onUpdateDb(
        (prev) => ({
          ...prev,
          gallery: [
            {
              id: `GAL-${Date.now()}`,
              title: title.trim(),
              category,
              year: year.trim(),
              caption: caption.trim(),
              imageUrl: finalUrl,
              published: true,
            },
            ...prev.gallery,
          ],
        }),
        'Gallery Saved Permanently'
      );
      setTitle('');
      setCaption('');
      setImgUrl('');
      setFile(null);
      onToast('Photo added & saved permanently!');
    };

    if (file) {
      if (file.size > 1.5 * 1024 * 1024) {
        onToast('Max image size is 1.5 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => save(String(reader.result || ''));
      reader.readAsDataURL(file);
    } else if (imgUrl.trim()) {
      save(imgUrl.trim());
    } else {
      onToast('Upload an image or paste an image URL.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-3">Upload Photograph to Gallery</h3>
        <form onSubmit={handleAddPhoto} className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <input
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              placeholder="Photo Title *"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              placeholder="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <input
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              placeholder="Year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
          <input
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            placeholder="Caption *"
            required
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <input
              type="url"
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              placeholder="OR Image URL"
              value={imgUrl}
              onChange={(e) => setImgUrl(e.target.value)}
            />
          </div>
          <button className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold cursor-pointer">
            Save Photo Permanently
          </button>
        </form>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {db.gallery.map((g) => (
          <div key={g.id} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="h-44 rounded-lg overflow-hidden bg-slate-900 mb-3">
              <img
                src={g.imageUrl}
                alt={g.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-xs text-slate-500 mb-1">
              {g.category} · {g.year} · {g.published ? 'Published' : 'Hidden'}
            </div>
            <div className="font-bold text-sm text-[#0f294a] mb-1">{g.title}</div>
            <p className="text-xs text-slate-600 mb-3">{g.caption}</p>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  onUpdateDb(
                    (prev) => ({
                      ...prev,
                      gallery: prev.gallery.map((x) =>
                        x.id === g.id ? { ...x, published: !x.published } : x
                      ),
                    }),
                    'Saved Permanently'
                  )
                }
                className="px-2.5 py-1 rounded-md border border-slate-300 text-xs font-semibold cursor-pointer"
              >
                {g.published ? 'Hide' : 'Publish'}
              </button>
              {amAdmin && (
                <button
                  onClick={() => {
                    onUpdateDb(
                      (prev) => ({
                        ...prev,
                        gallery: prev.gallery.filter((x) => x.id !== g.id),
                      }),
                      'Saved Permanently'
                    );
                    onToast('Photo deleted by Admin.');
                  }}
                  className="px-2.5 py-1 rounded-md bg-red-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== SITE EDITOR (HOMEPAGE PERMANENT SAVE UNTIL ADMIN EDITS, ABOUT US, CONTACT, REG PICTURE BOX) ====================
export const SiteEditorPanel: React.FC<PanelProps> = ({ db, currentUser, onUpdateDb, onToast }) => {
  const sc = db.siteContent;
  const amAdmin = isAdminEquivalent(currentUser);

  const [brandTitle, setBrandTitle] = useState(sc.brandTitle);
  const [brandSubtitle, setBrandSubtitle] = useState(sc.brandSubtitle);
  const [brandShort, setBrandShort] = useState(sc.brandShort);

  const [homeBadge, setHomeBadge] = useState(sc.homeBadge);
  const [homeHead, setHomeHead] = useState(sc.homeHead);
  const [homeBody, setHomeBody] = useState(sc.homeBody);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState(
    sc.logoUrl && !sc.logoUrl.startsWith('data:') ? sc.logoUrl : ''
  );

  const [regPicFile, setRegPicFile] = useState<File | null>(null);
  const [regPicUrl, setRegPicUrl] = useState(
    sc.regPictureUrl && !sc.regPictureUrl.startsWith('data:') ? sc.regPictureUrl : ''
  );
  const [regPicCaption, setRegPicCaption] = useState(sc.regPictureCaption);

  const [aboutHead, setAboutHead] = useState(sc.aboutHead);
  const [aboutSubhead, setAboutSubhead] = useState(sc.aboutSubhead);
  const [aboutBody, setAboutBody] = useState(sc.aboutBody);

  const [contact, setContact] = useState({ ...sc.contact });

  const [actTag, setActTag] = useState('');
  const [actTitle, setActTitle] = useState('');
  const [actDesc, setActDesc] = useState('');

  const saveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amAdmin) return;
    onUpdateDb(
      (prev) => ({
        ...prev,
        siteContent: {
          ...prev.siteContent,
          brandTitle: brandTitle.trim(),
          brandSubtitle: brandSubtitle.trim(),
          brandShort: brandShort.trim() || 'প্র',
        },
        activityLogs: [
          {
            time: nowTimestamp(),
            actor: `${currentUser.name} (${currentUser.level})`,
            module: 'Site Editor',
            action: 'TOP_BRAND_SAVED',
            detail: `Updated brand spelling to ${brandTitle.trim()}`,
          },
          ...prev.activityLogs,
        ],
      }),
      'Brand Saved Permanently'
    );
    onToast('Top brand spelling saved permanently!');
  };

  const saveHomePermanently = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amAdmin) {
      onToast('Only Admin can edit & save the Homepage.');
      return;
    }
    const commit = (finalLogo?: string) => {
      onUpdateDb(
        (prev) => ({
          ...prev,
          siteContent: {
            ...prev.siteContent,
            homeBadge: homeBadge.trim(),
            homeHead: homeHead.trim(),
            homeBody: homeBody.trim(),
            homeSavedAt: nowTimestamp(),
            homeSavedBy: currentUser.name,
            logoUrl: finalLogo !== undefined ? finalLogo : prev.siteContent.logoUrl,
          },
          activityLogs: [
            {
              time: nowTimestamp(),
              actor: `${currentUser.name} (${currentUser.level})`,
              module: 'Site Editor',
              action: 'HOMEPAGE_SAVED_PERMANENTLY',
              detail: 'Saved Homepage edits permanently (locked until Admin edits)',
            },
            ...prev.activityLogs,
          ],
        }),
        'Homepage Saved Permanently'
      );
      setLogoFile(null);
      onToast('Homepage saved permanently until Admin edits again!');
    };

    if (logoFile) {
      if (logoFile.size > 1.5 * 1024 * 1024) {
        onToast('Max logo size is 1.5 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => commit(String(reader.result || ''));
      reader.readAsDataURL(logoFile);
    } else if (logoUrl.trim()) {
      commit(logoUrl.trim());
    } else {
      commit(undefined);
    }
  };

  const saveRegPictureBox = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amAdmin) {
      onToast('Only Admin can set the Registration Picture Box.');
      return;
    }
    const commit = (finalPic?: string) => {
      onUpdateDb(
        (prev) => ({
          ...prev,
          siteContent: {
            ...prev.siteContent,
            regPictureCaption: regPicCaption.trim(),
            regPictureUrl: finalPic !== undefined ? finalPic : prev.siteContent.regPictureUrl,
          },
          activityLogs: [
            {
              time: nowTimestamp(),
              actor: `${currentUser.name} (${currentUser.level})`,
              module: 'Registration',
              action: 'REG_PICTURE_SAVED',
              detail: 'Updated Student Registration Picture Box',
            },
            ...prev.activityLogs,
          ],
        }),
        'Picture Box Saved Permanently'
      );
      setRegPicFile(null);
      onToast('Registration Picture Box saved permanently!');
    };

    if (regPicFile) {
      if (regPicFile.size > 1.5 * 1024 * 1024) {
        onToast('Max image size is 1.5 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => commit(String(reader.result || ''));
      reader.readAsDataURL(regPicFile);
    } else if (regPicUrl.trim()) {
      commit(regPicUrl.trim());
    } else {
      commit(undefined);
    }
  };

  const saveAboutPermanently = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateDb(
      (prev) => ({
        ...prev,
        siteContent: {
          ...prev.siteContent,
          aboutHead: aboutHead.trim(),
          aboutSubhead: aboutSubhead.trim(),
          aboutBody: aboutBody.trim(),
          aboutSavedAt: nowTimestamp(),
          aboutSavedBy: currentUser.name,
        },
        activityLogs: [
          {
            time: nowTimestamp(),
            actor: `${currentUser.name} (${currentUser.level})`,
            module: 'Site Editor',
            action: 'ABOUT_US_SAVED_PERMANENTLY',
            detail: 'Saved About Us permanently',
          },
          ...prev.activityLogs,
        ],
      }),
      'About Us Saved Permanently'
    );
    onToast('About Us saved permanently!');
  };

  const saveContactPermanently = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateDb(
      (prev) => ({
        ...prev,
        siteContent: {
          ...prev.siteContent,
          contact: { ...contact },
          contactSavedAt: nowTimestamp(),
          contactSavedBy: currentUser.name,
        },
        activityLogs: [
          {
            time: nowTimestamp(),
            actor: `${currentUser.name} (${currentUser.level})`,
            module: 'Site Editor',
            action: 'CONTACT_SAVED_PERMANENTLY',
            detail: 'Saved Contact Us permanently',
          },
          ...prev.activityLogs,
        ],
      }),
      'Contact Saved Permanently'
    );
    onToast('Contact Us saved permanently!');
  };

  return (
    <div className="space-y-6">
      {/* Top Brand (Admin Only) */}
      {amAdmin && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-base font-bold mb-1">
            Edit Top Organisation Spelling / Brand Name (Admin Only)
          </h3>
          <p className="text-xs text-slate-600 mb-4">
            Updates the navigation wordmark, subtitle, and fallback monogram permanently.
          </p>
          <form onSubmit={saveBrand} className="grid sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                Brand Title *
              </label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                value={brandTitle}
                onChange={(e) => setBrandTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                Subtitle *
              </label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                value={brandSubtitle}
                onChange={(e) => setBrandSubtitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                Monogram
              </label>
              <input
                maxLength={3}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                value={brandShort}
                onChange={(e) => setBrandShort(e.target.value)}
                required
              />
            </div>
            <button className="py-2 px-4 rounded-lg bg-emerald-700 text-white text-xs font-semibold cursor-pointer">
              Save Brand Permanently
            </button>
          </form>
        </div>
      )}

      {/* HOMEPAGE EDITS — SAVED PERMANENTLY UNTIL ADMIN EDITS THIS */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
          <h3 className="text-lg font-bold">
            Edit Homepage (Saved Permanently Until Admin Edits)
          </h3>
          <span className="text-xs font-semibold text-emerald-700 tabular-nums">
            Saved Permanently: {sc.homeSavedAt} · by {sc.homeSavedBy}
          </span>
        </div>

        {amAdmin ? (
          <form onSubmit={saveHomePermanently} className="space-y-4">
            <div className="grid lg:grid-cols-2 gap-6 items-start">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                    Homepage Location Badge
                  </label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    value={homeBadge}
                    onChange={(e) => setHomeBadge(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                    Homepage Hero Title *
                  </label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    value={homeHead}
                    onChange={(e) => setHomeHead(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                    Homepage Body Text *
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    value={homeBody}
                    onChange={(e) => setHomeBody(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl border-2 border-[#d4a017] bg-[#0f294a] text-[#d4a017] flex items-center justify-center text-2xl font-bold overflow-hidden shrink-0">
                    {sc.logoUrl ? (
                      <img
                        src={sc.logoUrl}
                        alt="Logo preview"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      sc.brandShort || 'প্র'
                    )}
                  </div>
                  <div className="text-xs text-slate-600">
                    Round-Edge Logo Preview. Displayed on Homepage, Navbar &amp; Portal.
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                    Upload Logo (JPG/PNG/WebP &le; 1.5 MB)
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                    OR Logo Image URL
                  </label>
                  <input
                    type="url"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                    placeholder="https://..."
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                  />
                </div>
                {sc.logoUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateDb(
                        (prev) => ({
                          ...prev,
                          siteContent: { ...prev.siteContent, logoUrl: '' },
                        }),
                        'Saved Permanently'
                      )
                    }
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold cursor-pointer"
                  >
                    Reset to Default Monogram
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 cursor-pointer"
            >
              Save Homepage Permanently
            </button>
          </form>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600">
            <strong className="text-amber-800 block mb-1">Admin Lock Active</strong>
            The Homepage is saved permanently and can only be edited by an <strong>Admin</strong>.
            <div className="mt-2 text-xs">
              <strong>Current Title:</strong> {sc.homeHead}
            </div>
          </div>
        )}
      </div>

      {/* STUDENT REGISTRATION PICTURE BOX (ADMIN ONLY) */}
      {amAdmin && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-1">
            Student Registration Panel Picture Box (Set by Admin)
          </h3>
          <p className="text-xs text-slate-600 mb-4">
            This picture box appears in the Student Registration form &amp; portal approval panel.
          </p>
          <form onSubmit={saveRegPictureBox} className="grid lg:grid-cols-2 gap-6 items-start">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                  Upload Image (JPG/PNG/WebP &le; 1.5 MB)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  onChange={(e) => setRegPicFile(e.target.files?.[0] || null)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                  OR Image URL
                </label>
                <input
                  type="url"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  placeholder="https://..."
                  value={regPicUrl}
                  onChange={(e) => setRegPicUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                  Picture Caption *
                </label>
                <input
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  value={regPicCaption}
                  onChange={(e) => setRegPicCaption(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold cursor-pointer">
                  Save Picture Box Permanently
                </button>
                {sc.regPictureUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateDb(
                        (prev) => ({
                          ...prev,
                          siteContent: { ...prev.siteContent, regPictureUrl: '' },
                        }),
                        'Saved Permanently'
                      )
                    }
                    className="px-4 py-2 rounded-lg bg-red-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    Remove Picture
                  </button>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-[#0f294a] mb-1">
                Live Picture Box Preview
              </div>
              {sc.regPictureUrl ? (
                <div className="rounded-xl overflow-hidden border-2 border-[#d4a017] bg-[#091b33]">
                  <img
                    src={sc.regPictureUrl}
                    alt={sc.regPictureCaption}
                    referrerPolicy="no-referrer"
                    className="w-full h-48 object-cover"
                  />
                  <div className="px-4 py-2 bg-[#091b33] text-white text-xs flex justify-between">
                    <span>{sc.regPictureCaption}</span>
                    <span className="text-[#d4a017] font-semibold">Admin Set</span>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-xl bg-slate-100 text-center text-xs text-slate-500">
                  No picture set.
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ABOUT US & CONTACT US — PERMANENT SAVE BY RESPECTIVE MANAGEMENT */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-bold">Edit About Us</h3>
            <span className="text-xs text-emerald-700 font-semibold tabular-nums">
              Saved: {sc.aboutSavedAt}
            </span>
          </div>
          <form onSubmit={saveAboutPermanently} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#0f294a] mb-1">About Head</label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                value={aboutHead}
                onChange={(e) => setAboutHead(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0f294a] mb-1">Subhead</label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                value={aboutSubhead}
                onChange={(e) => setAboutSubhead(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0f294a] mb-1">Body</label>
              <textarea
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                value={aboutBody}
                onChange={(e) => setAboutBody(e.target.value)}
                required
              />
            </div>
            <button className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 cursor-pointer">
              Save About Us Permanently
            </button>
          </form>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-bold">Edit Contact Us</h3>
            <span className="text-xs text-emerald-700 font-semibold tabular-nums">
              Saved: {sc.contactSavedAt}
            </span>
          </div>
          <form onSubmit={saveContactPermanently} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                Organisation Name
              </label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                value={contact.orgName}
                onChange={(e) => setContact({ ...contact, orgName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0f294a] mb-1">Address</label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                value={contact.address}
                onChange={(e) => setContact({ ...contact, address: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-[#0f294a] mb-1">Email</label>
                <input
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0f294a] mb-1">Phone</label>
                <input
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  value={contact.phone}
                  onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                Office Hours
              </label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                value={contact.hours}
                onChange={(e) => setContact({ ...contact, hours: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                Location Note
              </label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                value={contact.mapNote}
                onChange={(e) => setContact({ ...contact, mapNote: e.target.value })}
              />
            </div>
            <button className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 cursor-pointer">
              Save Contact Permanently
            </button>
          </form>
        </div>
      </div>

      {/* OUR ACTIVITIES — SAVE BY MANAGEMENT, DELETE BY ADMIN ONLY */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-bold">Edit Our Activities</h3>
          <span className="text-xs font-semibold text-amber-700">Delete: Admin Only</span>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onUpdateDb(
              (prev) => ({
                ...prev,
                siteContent: {
                  ...prev.siteContent,
                  activities: [
                    ...prev.siteContent.activities,
                    {
                      id: `ACT-${Date.now()}`,
                      tag: actTag.trim(),
                      title: actTitle.trim(),
                      desc: actDesc.trim(),
                    },
                  ],
                },
              }),
              'Activity Saved Permanently'
            );
            setActTag('');
            setActTitle('');
            setActDesc('');
            onToast('Activity saved permanently!');
          }}
          className="flex flex-wrap gap-2 mb-5"
        >
          <input
            className="w-32 px-3 py-2 rounded-lg border border-slate-300 text-sm"
            placeholder="Tag"
            required
            value={actTag}
            onChange={(e) => setActTag(e.target.value)}
          />
          <input
            className="w-52 px-3 py-2 rounded-lg border border-slate-300 text-sm"
            placeholder="Title"
            required
            value={actTitle}
            onChange={(e) => setActTitle(e.target.value)}
          />
          <input
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-slate-300 text-sm"
            placeholder="Description"
            required
            value={actDesc}
            onChange={(e) => setActDesc(e.target.value)}
          />
          <button className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold cursor-pointer">
            + Save Activity
          </button>
        </form>

        <div className="grid md:grid-cols-3 gap-4">
          {sc.activities.map((a) => (
            <div key={a.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div className="text-xs font-semibold text-[#b8890e]">{a.tag}</div>
              <div className="font-bold text-sm text-[#0f294a] my-1">{a.title}</div>
              <p className="text-xs text-slate-600 mb-3">{a.desc}</p>
              {amAdmin ? (
                <button
                  onClick={() => {
                    onUpdateDb(
                      (prev) => ({
                        ...prev,
                        siteContent: {
                          ...prev.siteContent,
                          activities: prev.siteContent.activities.filter((x) => x.id !== a.id),
                        },
                      }),
                      'Saved Permanently'
                    );
                    onToast('Activity deleted by Admin.');
                  }}
                  className="px-2.5 py-1 rounded-md bg-red-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Delete
                </button>
              ) : (
                <span className="text-xs text-slate-400">Delete: Admin Only</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==================== USERS, ROLES & SUB ADMINS ====================
export const UsersRolesPanel: React.FC<PanelProps> = ({ db, currentUser, onUpdateDb, onToast }) => {
  const amSuper = isSuperAdmin(currentUser);
  const amSubAdmin = currentUser.level === 'Admin' || currentUser.level === 'Sub Admin';
  const amManager = currentUser.level === 'Manager';
  const amAdmin = isAdminEquivalent(currentUser);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [level, setLevel] = useState<UserLevel>('Member');
  const [role, setRole] = useState(ALL_MEMBER_ROLES[0]);
  const [roleModalUser, setRoleModalUser] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [passwordModalUser, setPasswordModalUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser) return;
    if (!canChangeUserPassword(currentUser, passwordModalUser)) {
      onToast('Permission denied: Only Admin can change member passwords.');
      return;
    }
    if (newPassword.trim().length < 6) {
      onToast('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      onToast('Passwords do not match.');
      return;
    }

    const target = passwordModalUser;
    onUpdateDb(
      (prev) => ({
        ...prev,
        users: prev.users.map((x) =>
          x.id === target.id ? { ...x, password: newPassword } : x
        ),
        activityLogs: [
          {
            time: nowTimestamp(),
            actor: `${currentUser.name} (${currentUser.level})`,
            module: 'Users',
            action: 'PASSWORD_CHANGED_BY_ADMIN',
            detail: `Password updated for ${target.name} (${target.email})`,
          },
          ...prev.activityLogs,
        ],
      }),
      'Password Saved Permanently'
    );
    setPasswordModalUser(null);
    setNewPassword('');
    setConfirmNewPassword('');
    setShowPasswordText(false);
    onToast(`Password updated permanently for ${target.name}.`);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (level !== 'Member' && !amSuper) {
      onToast('Only Super Admin can appoint Sub Admins or Managers.');
      return;
    }
    const normEmail = email.trim().toLowerCase();
    if (isAccountBlocked(db, normEmail, mobile)) {
      onToast('Blocked: Deleted email or mobile cannot be re-added.');
      return;
    }
    if (db.users.some((u) => u.email.toLowerCase() === normEmail)) {
      onToast('Email already exists.');
      return;
    }
    const roles =
      level === 'Admin'
        ? ['All Modules (Admin)']
        : level === 'Sub Admin'
        ? ['All Modules (Sub Admin)']
        : level === 'Manager'
        ? ['Department Manager']
        : [role];

    onUpdateDb(
      (prev) => ({
        ...prev,
        users: [
          ...prev.users,
          {
            id: `USR-${Date.now()}`,
            name: name.trim(),
            email: normEmail,
            mobile: mobile.trim(),
            password,
            level,
            roles,
            allowDeleteAllStudents: false,
            status: 'Active',
            assignedEventId: 'EVT-01',
          },
        ],
        activityLogs: [
          {
            time: nowTimestamp(),
            actor: `${currentUser.name} (${currentUser.level})`,
            module: 'Users',
            action: 'USER_CREATED',
            detail: `Created ${level} ${normEmail}`,
          },
          ...prev.activityLogs,
        ],
      }),
      'Saved Permanently'
    );
    setName('');
    setEmail('');
    setMobile('');
    setPassword('');
    onToast('Account created!');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-base font-bold mb-3">Role &amp; Module Access Matrix (Security Policy)</h3>
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-[#0f294a]">
              <tr>
                <th className="py-2.5 px-3 text-left">Authority Tier</th>
                <th className="py-2.5 px-3 text-left">Assigned Modules</th>
                <th className="py-2.5 px-3 text-left">Permitted &amp; Restricted Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ROLE_ACCESS_MATRIX.map((row) => (
                <tr key={row.level}>
                  <td className="py-2.5 px-3 font-bold text-[#0f294a] whitespace-nowrap">{row.level}</td>
                  <td className="py-2.5 px-3 text-slate-700">{row.modules}</td>
                  <td className="py-2.5 px-3 text-slate-600">{row.actions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-base font-bold mb-3">
          {amSuper
            ? 'Create Account, Appoint Admin / Sub Admin / Manager & Assign Roles (Super Admin)'
            : amSubAdmin
            ? 'Create Account & Assign Member Roles (Admin)'
            : 'Add Member & Choose Member Role (Manager)'}
        </h3>
        <form onSubmit={handleCreateUser} className="grid sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          <input
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            placeholder="Full Name *"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            placeholder="Email *"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            placeholder="Mobile"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
          />
          <input
            type="password"
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            placeholder="Password *"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <select
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
            value={level}
            onChange={(e) => setLevel(e.target.value as UserLevel)}
          >
            {amSuper && <option value="Admin">Admin</option>}
            {amSuper && <option value="Sub Admin">Sub Admin</option>}
            {amSuper && <option value="Manager">Manager</option>}
            <option value="Member">Member</option>
          </select>
          <div className="flex gap-2">
            <select
              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {ALL_MEMBER_ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <button className="px-3.5 py-2 rounded-lg bg-[#0f294a] text-white text-xs font-semibold whitespace-nowrap cursor-pointer">
              Create
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-[#0f294a]">
            Registered Accounts &amp; Role Directory ({db.users.length})
          </span>
          <span className="text-xs font-semibold text-amber-800">
            Password Changes &amp; Account Deletion: Admin Only
          </span>
        </div>
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs text-[#0f294a]">
            <tr>
              <th className="py-3 px-4 text-left">Name &amp; Mobile</th>
              <th className="py-3 px-4 text-left">Email</th>
              <th className="py-3 px-4 text-left">Authority</th>
              <th className="py-3 px-4 text-left">Roles</th>
              <th className="py-3 px-4 text-left">Status</th>
              <th className="py-3 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {db.users.map((u) => {
              const tSup = u.level === 'Super Admin';
              const tSub = u.level === 'Admin' || u.level === 'Sub Admin';
              const tMem = u.level === 'Member';
              const canRoles = !tSup && (amSuper || (amSubAdmin && !tSub) || (amManager && tMem));
              const canDel = !tSup && (amSuper || (amSubAdmin && !tSub)) && u.id !== currentUser.id;
              const canSusp = !tSup && (amSuper || (amSubAdmin && !tSub) || (amManager && tMem));
              const canPwd = canChangeUserPassword(currentUser, u);

              return (
                <tr key={u.id}>
                  <td className="py-3 px-4">
                    <strong className="text-[#0f294a]">{u.name}</strong>
                    <div className="text-xs text-slate-500 font-mono-tabular">
                      {u.mobile || '—'}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs">{u.email}</td>
                  <td className="py-3 px-4 text-xs font-semibold">
                    {u.level}
                    {u.allowDeleteAllStudents && !tSup && (
                      <div className="text-[11px] text-red-700">Delete-All-Students</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600">{u.roles.join(', ')}</td>
                  <td className="py-3 px-4 text-xs font-semibold">
                    <span
                      className={
                        u.status === 'Active'
                          ? 'text-emerald-700'
                          : u.status === 'Pending'
                          ? 'text-amber-700'
                          : 'text-red-700'
                      }
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1.5">
                      {u.status === 'Pending' && canSusp && (
                        <button
                          onClick={() =>
                            onUpdateDb(
                              (prev) => ({
                                ...prev,
                                users: prev.users.map((x) =>
                                  x.id === u.id ? { ...x, status: 'Active' } : x
                                ),
                              }),
                              'Saved Permanently'
                            )
                          }
                          className="px-2.5 py-1 rounded-md bg-[#0f294a] text-white text-xs font-semibold cursor-pointer"
                        >
                          Approve
                        </button>
                      )}
                      {canRoles && (
                        <button
                          onClick={() => {
                            setRoleModalUser(u);
                            setSelectedRoles([...u.roles]);
                          }}
                          className="px-2.5 py-1 rounded-md border border-slate-300 text-xs font-semibold cursor-pointer"
                        >
                          Choose Role
                        </button>
                      )}
                      {canPwd && (
                        <button
                          onClick={() => {
                            setPasswordModalUser(u);
                            setNewPassword('');
                            setConfirmNewPassword('');
                            setShowPasswordText(false);
                          }}
                          className="px-2.5 py-1 rounded-md border border-[#0f294a]/30 bg-[#eef3fa] text-[#0f294a] text-xs font-semibold hover:bg-[#0f294a] hover:text-white transition cursor-pointer"
                        >
                          Change Password
                        </button>
                      )}
                      {amSuper && !tSup && (
                        <>
                          <select
                            className="px-2 py-1 rounded-md border border-slate-300 text-xs bg-white"
                            value={u.level}
                            onChange={(e) => {
                              const nextLvl = e.target.value as UserLevel;
                              onUpdateDb(
                                (prev) => ({
                                  ...prev,
                                  users: prev.users.map((x) =>
                                    x.id === u.id
                                      ? {
                                          ...x,
                                          level: nextLvl,
                                          roles:
                                            nextLvl === 'Admin'
                                              ? ['All Modules (Admin)']
                                              : nextLvl === 'Sub Admin'
                                              ? ['All Modules (Sub Admin)']
                                              : nextLvl === 'Manager'
                                              ? ['Department Manager']
                                              : ALL_MEMBER_ROLES.includes(x.roles[0])
                                              ? x.roles
                                              : ['Guard'],
                                          status: x.status === 'Pending' ? 'Active' : x.status,
                                        }
                                      : x
                                  ),
                                }),
                                'Saved Permanently'
                              );
                              onToast(`${u.name} set to ${nextLvl}.`);
                            }}
                          >
                            <option value="Admin">Admin</option>
                            <option value="Sub Admin">Sub Admin</option>
                            <option value="Manager">Manager</option>
                            <option value="Member">Member</option>
                          </select>
                          <button
                            onClick={() =>
                              onUpdateDb(
                                (prev) => ({
                                  ...prev,
                                  users: prev.users.map((x) =>
                                    x.id === u.id
                                      ? { ...x, allowDeleteAllStudents: !x.allowDeleteAllStudents }
                                      : x
                                  ),
                                }),
                                'Saved Permanently'
                              )
                            }
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                              u.allowDeleteAllStudents
                                ? 'bg-red-700 text-white'
                                : 'bg-[#d4a017] text-[#091b33]'
                            }`}
                          >
                            {u.allowDeleteAllStudents ? 'Revoke Delete-All' : 'Grant Delete-All'}
                          </button>
                        </>
                      )}
                      {canSusp && u.status !== 'Pending' && (
                        <button
                          onClick={() =>
                            onUpdateDb(
                              (prev) => ({
                                ...prev,
                                users: prev.users.map((x) =>
                                  x.id === u.id
                                    ? {
                                        ...x,
                                        status: x.status === 'Active' ? 'Suspended' : 'Active',
                                      }
                                    : x
                                ),
                              }),
                              'Saved Permanently'
                            )
                          }
                          className="px-2.5 py-1 rounded-md border border-slate-300 text-xs font-semibold cursor-pointer"
                        >
                          {u.status === 'Active' ? 'Suspend' : 'Activate'}
                        </button>
                      )}
                      {canDel && (
                        <button
                          onClick={() => {
                            onUpdateDb(
                              (prev) => ({
                                ...prev,
                                deletedAccounts: [
                                  {
                                    name: u.name,
                                    email: u.email.toLowerCase(),
                                    mobile: u.mobile || '',
                                    deletedBy: currentUser.name,
                                    deletedAt: nowTimestamp(),
                                  },
                                  ...prev.deletedAccounts,
                                ],
                                users: prev.users.filter((x) => x.id !== u.id),
                              }),
                              'Saved Permanently'
                            );
                            onToast(`Deleted & blocked ${u.name}.`);
                          }}
                          className="px-2.5 py-1 rounded-md bg-red-700 text-white text-xs font-semibold cursor-pointer"
                        >
                          Delete
                        </button>
                      )}
                      {tSup && <span className="text-xs text-slate-400">Protected Super Admin</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {amAdmin && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-base font-bold mb-3">
            Deleted &amp; Blocked Accounts ({db.deletedAccounts.length})
          </h3>
          {db.deletedAccounts.length ? (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 text-left">Name</th>
                    <th className="py-2 px-3 text-left">Blocked Email</th>
                    <th className="py-2 px-3 text-left">Mobile</th>
                    <th className="py-2 px-3 text-left">Deleted By</th>
                    <th className="py-2 px-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {db.deletedAccounts.map((d, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3">{d.name}</td>
                      <td className="py-2 px-3 font-semibold">{d.email}</td>
                      <td className="py-2 px-3 font-mono-tabular">{d.mobile || '—'}</td>
                      <td className="py-2 px-3">{d.deletedBy}</td>
                      <td className="py-2 px-3 font-mono-tabular">{d.deletedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500">No deleted accounts yet.</p>
          )}
        </div>
      )}

      {roleModalUser && (
        <div
          className="fixed inset-0 z-50 bg-[#091b33]/70 flex items-center justify-center p-4"
          onClick={() => setRoleModalUser(null)}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-200">
              <h3 className="text-base font-bold">Choose Roles for {roleModalUser.name}</h3>
              <button
                onClick={() => setRoleModalUser(null)}
                className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="grid gap-2 mb-5">
              {ALL_MEMBER_ROLES.map((r) => {
                const checked = selectedRoles.includes(r);
                return (
                  <label
                    key={r}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm font-medium cursor-pointer ${
                      checked ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedRoles((prev) =>
                          prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
                        )
                      }
                      className="w-4 h-4 accent-emerald-700"
                    />
                    {r}
                  </label>
                );
              })}
            </div>
            <button
              onClick={() => {
                if (!selectedRoles.length) {
                  onToast('Select at least one role.');
                  return;
                }
                onUpdateDb(
                  (prev) => ({
                    ...prev,
                    users: prev.users.map((x) =>
                      x.id === roleModalUser.id ? { ...x, roles: selectedRoles } : x
                    ),
                  }),
                  'Saved Permanently'
                );
                setRoleModalUser(null);
                onToast('Roles updated.');
              }}
              className="w-full py-2.5 rounded-lg bg-[#0f294a] text-white text-sm font-semibold cursor-pointer"
            >
              Save Chosen Roles
            </button>
          </div>
        </div>
      )}

      {passwordModalUser && (
        <div
          className="fixed inset-0 z-50 bg-[#091b33]/70 flex items-center justify-center p-4"
          onClick={() => setPasswordModalUser(null)}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-[#0f294a]">
                  Change Password (Admin Only)
                </h3>
                <p className="text-xs text-slate-500">
                  {passwordModalUser.name} · {passwordModalUser.level} ({passwordModalUser.email})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalUser(null)}
                className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                  New Password (min. 6 characters) *
                </label>
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  placeholder="Enter new password"
                  minLength={6}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                  Confirm New Password *
                </label>
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  placeholder="Re-enter new password"
                  minLength={6}
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPasswordText}
                  onChange={(e) => setShowPasswordText(e.target.checked)}
                  className="w-4 h-4 accent-[#0f294a]"
                />
                Show password characters
              </label>
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-[#0f294a] text-white text-sm font-semibold hover:bg-[#091b33] cursor-pointer"
              >
                Save New Password Permanently
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== WORK MONITOR, REPORTS, LOGS ====================
export const TeamWorkMonitorPanel: React.FC<{ db: ProyashDB }> = ({ db }) => (
  <div className="space-y-5">
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {db.users.map((u) => {
        const count = db.activityLogs.filter((l) => l.actor.includes(u.name)).length;
        return (
          <div key={u.id} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <strong className="text-sm text-[#0f294a]">{u.name}</strong>
              <span className="text-xs font-semibold text-slate-600 tabular-nums">
                {count} logs
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {u.level} · {u.roles.join(', ')}
            </div>
          </div>
        );
      })}
    </div>
    <LogsPanel db={db} />
  </div>
);

export const ReportsPanel: React.FC<{ db: ProyashDB; onToast: (msg: string) => void }> = ({
  db,
  onToast,
}) => (
  <div className="space-y-5">
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="text-xs text-slate-500 font-semibold">Total Students</div>
        <div className="text-2xl font-bold text-[#0f294a] mt-1">{db.students.length}</div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="text-xs text-slate-500 font-semibold">Room Assigned</div>
        <div className="text-2xl font-bold text-[#0f294a] mt-1">{db.roomAssignments.length}</div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="text-xs text-slate-500 font-semibold">Gate Verified</div>
        <div className="text-2xl font-bold text-[#0f294a] mt-1">{db.eventEntries.length}</div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="text-xs text-slate-500 font-semibold">Published Results</div>
        <div className="text-2xl font-bold text-[#0f294a] mt-1">{db.results.length}</div>
      </div>
    </div>

    <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap justify-between items-center gap-3">
      <div>
        <h3 className="text-base font-bold">Export Full Student &amp; Room Report (.xlsx)</h3>
        <p className="text-xs text-slate-600">
          Downloads consolidated Excel workbook of all student records, rooms, gate ticks, and
          attendance.
        </p>
      </div>
      <button
        onClick={() => {
          exportSheetXLSX(
            'PROYASH_REPORT',
            'PROYASH_FULL_REPORT.xlsx',
            ['ID', 'Reg ID', 'Roll', 'Name', 'Class', 'School', 'Status'],
            db.students.map((s) => [
              s.id,
              s.regId,
              s.rollNumber,
              s.name,
              s.className,
              s.school,
              s.status,
            ])
          );
          onToast('Report Excel downloaded!');
        }}
        className="px-4 py-2 rounded-lg bg-[#d4a017] text-[#091b33] text-xs font-semibold cursor-pointer"
      >
        Download Full Report (.xlsx)
      </button>
    </div>
  </div>
);

export const LogsPanel: React.FC<{ db: ProyashDB }> = ({ db }) => (
  <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
    <table className="w-full text-sm border-collapse">
      <thead className="bg-slate-50 border-b border-slate-200 text-xs text-[#0f294a]">
        <tr>
          <th className="py-3 px-4 text-left">Time</th>
          <th className="py-3 px-4 text-left">Staff</th>
          <th className="py-3 px-4 text-left">Module</th>
          <th className="py-3 px-4 text-left">Action</th>
          <th className="py-3 px-4 text-left">Details</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {db.activityLogs.map((l, idx) => (
          <tr key={idx}>
            <td className="py-2.5 px-4 font-mono-tabular text-xs whitespace-nowrap">{l.time}</td>
            <td className="py-2.5 px-4 text-xs font-semibold">{l.actor}</td>
            <td className="py-2.5 px-4 text-xs">{l.module}</td>
            <td className="py-2.5 px-4 font-mono-tabular text-xs">{l.action}</td>
            <td className="py-2.5 px-4 text-xs text-slate-600">{l.detail}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
