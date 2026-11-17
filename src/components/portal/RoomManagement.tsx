import React, { useState } from 'react';
import { ALL_CLASSES, nowTimestamp } from '../../data/defaultDb';
import type { ProyashDB, User } from '../../types';

interface RoomManagementProps {
  db: ProyashDB;
  currentUser: User;
  onUpdateDb: (updater: (prev: ProyashDB) => ProyashDB, saveLabel?: string) => void;
  onToast: (msg: string) => void;
}

export const RoomManagement: React.FC<RoomManagementProps> = ({
  db,
  currentUser,
  onUpdateDb,
  onToast,
}) => {
  const [classFilter, setClassFilter] = useState<string>('Class VIII');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetRoomId, setTargetRoomId] = useState<string>(db.rooms[0]?.id || '');
  const [seatPrefix, setSeatPrefix] = useState('S-');
  const [seatStart, setSeatStart] = useState(1);

  // Guard appointment state
  const activeStaff = db.users.filter((u) => u.status === 'Active' && u.level !== 'Super Admin');
  const [guardUserId, setGuardUserId] = useState(activeStaff[0]?.id || '');
  const [guardRoomId, setGuardRoomId] = useState(db.rooms[0]?.id || '');
  const [guardPeriod, setGuardPeriod] = useState('18 Jan 2027, 10:30 AM – 2:00 PM');

  // New Room state
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomLoc, setNewRoomLoc] = useState('');
  const [newRoomCap, setNewRoomCap] = useState(30);

  const approvedStudents = db.students.filter((s) => s.status === 'Approved');
  const filteredStudents =
    classFilter === 'All Classes'
      ? approvedStudents
      : approvedStudents.filter((s) => s.className === classFilter);

  const toggleStudentCheck = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectBulkMode = (mode: 'all' | 'unassigned' | 'none') => {
    if (mode === 'none') {
      setSelectedIds([]);
      return;
    }
    if (mode === 'all') {
      setSelectedIds(filteredStudents.map((s) => s.id));
      return;
    }
    const unassignedIds = filteredStudents
      .filter((s) => !db.roomAssignments.some((a) => a.studentId === s.id))
      .map((s) => s.id);
    setSelectedIds(unassignedIds);
  };

  const handleBulkAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIds.length) {
      onToast('Please select at least one student to assign.');
      return;
    }
    const rm = db.rooms.find((r) => r.id === targetRoomId);
    let currentSeat = Math.max(1, Number(seatStart) || 1);

    onUpdateDb(
      (prev) => {
        const remaining = prev.roomAssignments.filter(
          (a) => !selectedIds.includes(a.studentId)
        );
        const newAllocs = selectedIds
          .map((sid) => {
            const stu = prev.students.find((s) => s.id === sid);
            if (!stu) return null;
            const seatLabel = `${seatPrefix.trim()}${String(currentSeat++).padStart(2, '0')}`;
            return {
              id: `RA-${Date.now()}-${sid}`,
              examId: 'EXM-2027-01',
              studentId: sid,
              rollNumber: stu.rollNumber || '',
              roomId: targetRoomId,
              seatNumber: seatLabel,
              status: 'Confirmed',
            };
          })
          .filter((x): x is NonNullable<typeof x> => x !== null);

        return {
          ...prev,
          roomAssignments: [...remaining, ...newAllocs],
          activityLogs: [
            {
              time: nowTimestamp(),
              actor: `${currentUser.name} (${currentUser.level})`,
              module: 'Room MNG',
              action: 'BULK_ROOM_ASSIGNED',
              detail: `Assigned ${newAllocs.length} student(s) (${classFilter}) to ${
                rm?.number || targetRoomId
              }`,
            },
            ...prev.activityLogs,
          ],
        };
      },
      'Room Distribution Saved'
    );

    const assignedCount = selectedIds.length;
    setSelectedIds([]);
    onToast(`Assigned ${assignedCount} student(s) to ${rm?.number || targetRoomId}!`);
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNumber.trim()) return;
    const id = `RM-${Date.now()}`;
    onUpdateDb(
      (prev) => ({
        ...prev,
        rooms: [
          ...prev.rooms,
          {
            id,
            number: newRoomNumber.trim(),
            location: newRoomLoc.trim() || 'Main Campus',
            capacity: Math.max(1, Number(newRoomCap) || 30),
            status: 'Active',
          },
        ],
      }),
      'Saved Permanently'
    );
    setNewRoomNumber('');
    setNewRoomLoc('');
    onToast('Room added permanently!');
  };

  const handleAppointGuard = (e: React.FormEvent) => {
    e.preventDefault();
    const usr = db.users.find((u) => u.id === guardUserId);
    if (!usr) return;
    onUpdateDb(
      (prev) => ({
        ...prev,
        guardAssignments: [
          ...prev.guardAssignments,
          {
            id: `GRD-${Date.now()}`,
            guardUserId,
            guardName: usr.name,
            roomId: guardRoomId,
            examId: 'EXM-2027-01',
            dutyPeriod: guardPeriod.trim(),
            status: 'Assigned',
          },
        ],
        activityLogs: [
          {
            time: nowTimestamp(),
            actor: `${currentUser.name} (${currentUser.level})`,
            module: 'Room MNG',
            action: 'GUARD_APPOINTED',
            detail: `Appointed ${usr.name} to room ${guardRoomId}`,
          },
          ...prev.activityLogs,
        ],
      }),
      'Saved Permanently'
    );
    onToast('Guard appointed!');
  };

  return (
    <div className="space-y-6">
      {/* Multi-Select & Subjected Class Distribution */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold">
              Distribute Students by Subjected Class (Multi-Select)
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Filter by student class, select multiple students at once, pick a room, and assign
              sequential seats together.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[#0f294a]">Subjected Class:</label>
            <select
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setSelectedIds([]);
              }}
            >
              <option value="All Classes">
                All Classes ({approvedStudents.length})
              </option>
              {ALL_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c} ({approvedStudents.filter((s) => s.className === c).length})
                </option>
              ))}
            </select>
          </div>
        </div>

        <form onSubmit={handleBulkAssign} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => selectBulkMode('all')}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-[#0f294a] hover:bg-slate-50 cursor-pointer"
              >
                Select All Shown
              </button>
              <button
                type="button"
                onClick={() => selectBulkMode('unassigned')}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-[#0f294a] hover:bg-slate-50 cursor-pointer"
              >
                Select Unassigned Only
              </button>
              <button
                type="button"
                onClick={() => selectBulkMode('none')}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Clear Selection
              </button>
            </div>
            <div className="text-xs font-semibold text-[#0f294a] tabular-nums">
              Selected: {selectedIds.length} student(s)
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-80 overflow-y-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-[#0f294a] sticky top-0">
                <tr>
                  <th className="py-2.5 px-3 text-left w-12">Pick</th>
                  <th className="py-2.5 px-3 text-left">Roll</th>
                  <th className="py-2.5 px-3 text-left">Student Name</th>
                  <th className="py-2.5 px-3 text-left">Subjected Class</th>
                  <th className="py-2.5 px-3 text-left">School</th>
                  <th className="py-2.5 px-3 text-left">Current Room &amp; Seat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length ? (
                  filteredStudents.map((s) => {
                    const ra = db.roomAssignments.find((a) => a.studentId === s.id);
                    const rm = ra ? db.rooms.find((r) => r.id === ra.roomId) : null;
                    const checked = selectedIds.includes(s.id);
                    return (
                      <tr
                        key={s.id}
                        className={checked ? 'bg-amber-50/60' : 'hover:bg-slate-50'}
                      >
                        <td className="py-2.5 px-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleStudentCheck(s.id)}
                            className="w-4 h-4 accent-[#0f294a] cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3 font-mono-tabular font-semibold">
                          {s.rollNumber || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#0f294a]">{s.name}</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-[#eef3fa] text-[#0f294a] border border-[#cbd5e1] text-xs font-bold whitespace-nowrap">
                            {s.className}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{s.school}</td>
                        <td className="py-2.5 px-3 text-xs">
                          {rm && ra ? (
                            <span className="text-emerald-700 font-semibold">
                              {rm.number} ({ra.seatNumber})
                            </span>
                          ) : (
                            <span className="text-amber-700 font-medium">Unassigned</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500 text-xs">
                      No approved students found in {classFilter}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                Target Room *
              </label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                value={targetRoomId}
                onChange={(e) => setTargetRoomId(e.target.value)}
              >
                {db.rooms.map((r) => {
                  const occ = db.roomAssignments.filter((a) => a.roomId === r.id).length;
                  return (
                    <option key={r.id} value={r.id}>
                      {r.number} ({occ}/{r.capacity} occupied)
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                Seat Prefix (e.g. A-, VIII-)
              </label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                value={seatPrefix}
                onChange={(e) => setSeatPrefix(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                Starting Seat No.
              </label>
              <input
                type="number"
                min={1}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white tabular-nums"
                value={seatStart}
                onChange={(e) => setSeatStart(Number(e.target.value))}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 whitespace-nowrap cursor-pointer"
            >
              Assign Selected Students
            </button>
          </div>
        </form>
      </div>

      {/* Class-Wise Summary & Guard Appointments */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-base font-bold mb-3">Class-Wise Room Distribution Summary</h3>
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-[#0f294a]">
                <tr>
                  <th className="py-2 px-3 text-left">Room</th>
                  <th className="py-2 px-3 text-left">Occupied / Cap</th>
                  <th className="py-2 px-3 text-left">Classes Distributed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {db.rooms.map((r) => {
                  const allocs = db.roomAssignments.filter((a) => a.roomId === r.id);
                  const counts: Record<string, number> = {};
                  allocs.forEach((a) => {
                    const st = db.students.find((s) => s.id === a.studentId);
                    const cls = st ? st.className : 'Unknown';
                    counts[cls] = (counts[cls] || 0) + 1;
                  });
                  const summary = Object.entries(counts)
                    .map(([cls, n]) => `${cls}: ${n}`)
                    .join(' · ');
                  return (
                    <tr key={r.id}>
                      <td className="py-2.5 px-3 font-semibold text-[#0f294a]">{r.number}</td>
                      <td className="py-2.5 px-3 tabular-nums">
                        {allocs.length} / {r.capacity}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-600">
                        {summary || 'Empty'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add New Room */}
          <form onSubmit={handleCreateRoom} className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
            <input
              className="flex-1 min-w-[120px] px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              placeholder="New Room (e.g. Room 202)"
              value={newRoomNumber}
              onChange={(e) => setNewRoomNumber(e.target.value)}
              required
            />
            <input
              className="flex-1 min-w-[120px] px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              placeholder="Floor / Building"
              value={newRoomLoc}
              onChange={(e) => setNewRoomLoc(e.target.value)}
            />
            <input
              type="number"
              min={1}
              className="w-20 px-3 py-1.5 rounded-lg border border-slate-300 text-xs tabular-nums"
              value={newRoomCap}
              onChange={(e) => setNewRoomCap(Number(e.target.value))}
            />
            <button className="px-3 py-1.5 rounded-lg bg-[#0f294a] text-white text-xs font-semibold whitespace-nowrap cursor-pointer">
              + Add Room
            </button>
          </form>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-base font-bold mb-3">Appoint Member to Guard Room</h3>
          <form onSubmit={handleAppointGuard} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                Staff Member
              </label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                value={guardUserId}
                onChange={(e) => setGuardUserId(e.target.value)}
              >
                {activeStaff.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.roles.join(', ')})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                Examination Room
              </label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                value={guardRoomId}
                onChange={(e) => setGuardRoomId(e.target.value)}
              >
                {db.rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.number}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                Duty Schedule
              </label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                value={guardPeriod}
                onChange={(e) => setGuardPeriod(e.target.value)}
                required
              />
            </div>
            <button className="px-4 py-2 rounded-lg bg-[#d4a017] text-[#091b33] text-xs font-semibold cursor-pointer">
              Appoint Guard
            </button>
          </form>
        </div>
      </div>

      {/* Guard Duty & Roster Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs text-[#0f294a]">
            <tr>
              <th className="py-3 px-4 text-left">Room</th>
              <th className="py-3 px-4 text-left">Appointed Guard</th>
              <th className="py-3 px-4 text-left">Schedule</th>
              <th className="py-3 px-4 text-left">Assigned Students (Class &amp; Roll)</th>
            </tr>
          </thead>
              <tbody className="divide-y divide-slate-100">
            {db.guardAssignments.map((g) => {
              const rm = db.rooms.find((r) => r.id === g.roomId);
              const assignedItems = db.roomAssignments
                .filter((a) => a.roomId === g.roomId)
                .map((a) => {
                  const st = db.students.find((s) => s.id === a.studentId);
                  return {
                    id: a.studentId,
                    rollNumber: a.rollNumber,
                    seatNumber: a.seatNumber,
                    className: st?.className || 'N/A',
                    name: st?.name || a.studentId,
                  };
                });
              return (
                <tr key={g.id}>
                  <td className="py-3 px-4 font-bold text-[#0f294a]">
                    {rm?.number || g.roomId}
                  </td>
                  <td className="py-3 px-4 font-semibold">{g.guardName}</td>
                  <td className="py-3 px-4 text-xs text-slate-600">{g.dutyPeriod}</td>
                  <td className="py-3 px-4 text-xs text-slate-700">
                    {assignedItems.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {assignedItems.map((item) => (
                          <span
                            key={item.id}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-[11px]"
                          >
                            <span className="px-1.5 py-0.5 rounded bg-[#eef3fa] text-[#0f294a] border border-[#cbd5e1] font-bold">
                              {item.className}
                            </span>
                            <span className="font-mono-tabular font-semibold text-[#0f294a]">
                              Roll {item.rollNumber}
                            </span>
                            <span className="text-slate-500">({item.seatNumber})</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      'None assigned yet'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
