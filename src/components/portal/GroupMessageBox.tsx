import React, { useState } from 'react';
import { isAdminEquivalent, isAdminOrManager, nowTimestamp } from '../../data/defaultDb';
import type { MessageGroupName, ProyashDB, User } from '../../types';

interface GroupMessageBoxProps {
  db: ProyashDB;
  currentUser: User;
  onUpdateDb: (updater: (prev: ProyashDB) => ProyashDB, saveLabel?: string) => void;
  onToast: (msg: string) => void;
}

interface UnifiedMessage {
  id: string;
  group: MessageGroupName;
  sender: string;
  senderLevel: string;
  message: string;
  time: string;
  resolved: boolean;
  source: 'group' | 'guard';
}

export const GroupMessageBox: React.FC<GroupMessageBoxProps> = ({
  db,
  currentUser,
  onUpdateDb,
  onToast,
}) => {
  const [groupFilter, setGroupFilter] = useState<'All' | MessageGroupName>('All');
  const [composeGroup, setComposeGroup] = useState<MessageGroupName>(
    isAdminEquivalent(currentUser) ? 'Admin Group' : 'Manager Group'
  );
  const [composeBody, setComposeBody] = useState('');

  if (!isAdminOrManager(currentUser)) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-600">
        Restricted to Admin &amp; Manager groups.
      </div>
    );
  }

  const amAdmin = isAdminEquivalent(currentUser);

  const unified: UnifiedMessage[] = [
    ...db.groupMessages.map((m) => ({
      ...m,
      source: 'group' as const,
    })),
    ...db.guardMessages.map((m) => ({
      id: m.id,
      group: 'Guard & Room Alerts' as MessageGroupName,
      sender: m.sender,
      senderLevel: 'Member (Guard)',
      message: m.message,
      time: m.time,
      resolved: m.resolved,
      source: 'guard' as const,
    })),
  ].sort((a, b) => (b.time || '').localeCompare(a.time || ''));

  const filterTabs: ('All' | MessageGroupName)[] = [
    'All',
    'Admin Group',
    'Manager Group',
    'Guard & Room Alerts',
    'General Staff',
  ];

  const filtered =
    groupFilter === 'All' ? unified : unified.filter((m) => m.group === groupFilter);

  const buckets: { title: string; items: UnifiedMessage[]; accentClass: string }[] = [
    {
      title: 'Admin Group Messages',
      items: filtered.filter((m) => m.group === 'Admin Group'),
      accentClass: 'bg-amber-50/60 border-amber-200',
    },
    {
      title: 'Manager Group Messages',
      items: filtered.filter((m) => m.group === 'Manager Group'),
      accentClass: 'bg-slate-50 border-slate-200',
    },
    {
      title: 'Guard & Room Alerts',
      items: filtered.filter((m) => m.group === 'Guard & Room Alerts'),
      accentClass: 'bg-rose-50/50 border-rose-200',
    },
    {
      title: 'General Staff Messages',
      items: filtered.filter((m) => m.group === 'General Staff'),
      accentClass: 'bg-white border-slate-200',
    },
  ];

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeBody.trim()) return;
    onUpdateDb(
      (prev) => ({
        ...prev,
        groupMessages: [
          {
            id: `GM-${Date.now()}`,
            group: composeGroup,
            sender: currentUser.name,
            senderLevel: currentUser.level,
            message: composeBody.trim(),
            time: nowTimestamp(),
            resolved: false,
          },
          ...prev.groupMessages,
        ],
        activityLogs: [
          {
            time: nowTimestamp(),
            actor: `${currentUser.name} (${currentUser.level})`,
            module: 'Group Messages',
            action: 'GROUP_MESSAGE_SAVED',
            detail: `Posted message to ${composeGroup}`,
          },
          ...prev.activityLogs,
        ],
      }),
      'Message Saved Permanently'
    );
    setComposeBody('');
    onToast(`Message saved to ${composeGroup}!`);
  };

  const toggleResolved = (source: 'group' | 'guard', id: string) => {
    onUpdateDb((prev) => {
      if (source === 'guard') {
        return {
          ...prev,
          guardMessages: prev.guardMessages.map((m) =>
            m.id === id ? { ...m, resolved: !m.resolved } : m
          ),
        };
      }
      return {
        ...prev,
        groupMessages: prev.groupMessages.map((m) =>
          m.id === id ? { ...m, resolved: !m.resolved } : m
        ),
      };
    }, 'Saved Permanently');
  };

  const handleDelete = (source: 'group' | 'guard', id: string) => {
    if (!amAdmin) {
      onToast('Only Admin can delete messages.');
      return;
    }
    onUpdateDb(
      (prev) => ({
        ...prev,
        guardMessages:
          source === 'guard'
            ? prev.guardMessages.filter((m) => m.id !== id)
            : prev.guardMessages,
        groupMessages:
          source === 'group'
            ? prev.groupMessages.filter((m) => m.id !== id)
            : prev.groupMessages,
        activityLogs: [
          {
            time: nowTimestamp(),
            actor: `${currentUser.name} (${currentUser.level})`,
            module: 'Group Messages',
            action: 'GROUP_MESSAGE_DELETED',
            detail: `Deleted message ${id}`,
          },
          ...prev.activityLogs,
        ],
      }),
      'Saved Permanently'
    );
    onToast('Message deleted by Admin.');
  };

  return (
    <div className="space-y-5">
      {/* Compose Box */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-1">Send Message to Admin / Manager Group</h3>
        <p className="text-xs text-slate-600 mb-4">
          Messages are organized by group (Admin Group, Manager Group, Guard &amp; Room Alerts) and
          saved permanently.
        </p>
        <form onSubmit={handlePost} className="grid md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-[#0f294a] mb-1">
              Message Group *
            </label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              value={composeGroup}
              onChange={(e) => setComposeGroup(e.target.value as MessageGroupName)}
            >
              {amAdmin && <option value="Admin Group">Admin Group</option>}
              <option value="Manager Group">Manager Group</option>
              <option value="General Staff">General Staff</option>
            </select>
          </div>
          <div className="md:col-span-6">
            <label className="block text-xs font-semibold text-[#0f294a] mb-1">
              Message Text *
            </label>
            <input
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              placeholder="Write message for Admin / Manager group..."
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              required
            />
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              className="w-full px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 whitespace-nowrap cursor-pointer"
            >
              Save &amp; Send Message
            </button>
          </div>
        </form>
      </div>

      {/* Group Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-slate-200/70 rounded-lg w-fit">
        {filterTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setGroupFilter(tab)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
              groupFilter === tab
                ? 'bg-white text-[#0f294a] shadow-sm'
                : 'text-slate-600 hover:text-[#0f294a]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Grouped Buckets */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
          No messages in this group.
        </div>
      ) : (
        buckets.map((bucket) =>
          bucket.items.length ? (
            <div key={bucket.title} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                <h3 className="text-base font-bold">{bucket.title}</h3>
                <span className="text-xs font-semibold text-slate-500 tabular-nums">
                  {bucket.items.length} message(s)
                </span>
              </div>
              <div className="space-y-3">
                {bucket.items.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-lg border p-4 flex flex-wrap justify-between items-start gap-3 ${bucket.accentClass}`}
                  >
                    <div className="max-w-3xl">
                      <div className="text-xs text-slate-600 mb-1 tabular-nums">
                        <strong className="text-[#0f294a]">{m.sender}</strong> · {m.senderLevel} ·{' '}
                        {m.time} ·{' '}
                        <span
                          className={
                            m.resolved
                              ? 'text-emerald-700 font-semibold'
                              : 'text-amber-700 font-semibold'
                          }
                        >
                          {m.resolved ? 'Resolved' : 'Open'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-800">{m.message}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => toggleResolved(m.source, m.id)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-[#0f294a] hover:bg-slate-50 whitespace-nowrap cursor-pointer"
                      >
                        {m.resolved ? 'Reopen' : 'Mark Read / Resolved'}
                      </button>
                      {amAdmin && (
                        <button
                          onClick={() => handleDelete(m.source, m.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-700 text-white text-xs font-semibold hover:bg-red-800 whitespace-nowrap cursor-pointer"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null
        )
      )}
    </div>
  );
};
