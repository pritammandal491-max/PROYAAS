import React, { useState } from 'react';
import {
  canEditGatekeeperWork,
  isAdminEquivalent,
  nowTimestamp,
} from '../../data/defaultDb';
import type { ExamResult, ProyashDB, User } from '../../types';
import { exportSheetXLSX, parseXlsxRows } from '../../utils/xlsx';

interface OpsProps {
  db: ProyashDB;
  currentUser: User;
  onUpdateDb: (updater: (prev: ProyashDB) => ProyashDB, saveLabel?: string) => void;
  onToast: (msg: string) => void;
}

export const GuardAttendancePanel: React.FC<OpsProps> = ({
  db,
  currentUser,
  onUpdateDb,
  onToast,
}) => {
  const [selectedRoomId, setSelectedRoomId] = useState(db.rooms[0]?.id || '');
  const [alertMsg, setAlertMsg] = useState('');

  const myGuardRooms = db.guardAssignments.filter((g) => g.guardUserId === currentUser.id);
  const visibleRooms =
    currentUser.level === 'Member' && currentUser.roles.includes('Guard') && myGuardRooms.length
      ? db.rooms.filter((r) => myGuardRooms.some((g) => g.roomId === r.id))
      : db.rooms;

  const activeRoomId = visibleRooms.some((r) => r.id === selectedRoomId)
    ? selectedRoomId
    : visibleRooms[0]?.id || '';

  const roomStudents = db.roomAssignments.filter((a) => a.roomId === activeRoomId);

  const togglePresent = (studentId: string) => {
    onUpdateDb((prev) => {
      const existing = prev.roomAttendance.find(
        (a) => a.roomId === activeRoomId && a.studentId === studentId
      );
      const nextAtt = existing
        ? prev.roomAttendance.map((a) =>
            a.roomId === activeRoomId && a.studentId === studentId
              ? { ...a, present: !a.present, tickedBy: currentUser.name, time: nowTimestamp() }
              : a
          )
        : [
            ...prev.roomAttendance,
            {
              roomId: activeRoomId,
              studentId,
              present: true,
              tickedBy: currentUser.name,
              time: nowTimestamp(),
            },
          ];
      return {
        ...prev,
        roomAttendance: nextAtt,
        activityLogs: [
          {
            time: nowTimestamp(),
            actor: `${currentUser.name} (${currentUser.level})`,
            module: 'Guard',
            action: 'ROOM_ATTENDANCE_TICKED',
            detail: `Updated attendance for student ${studentId} in ${activeRoomId}`,
          },
          ...prev.activityLogs,
        ],
      };
    }, 'Saved Permanently');
    onToast('Room attendance updated!');
  };

  const handleSendAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertMsg.trim()) return;
    onUpdateDb(
      (prev) => ({
        ...prev,
        guardMessages: [
          {
            id: `MSG-${Date.now()}`,
            roomId: activeRoomId,
            sender: `${currentUser.name} (${currentUser.roles[0] || currentUser.level})`,
            message: alertMsg.trim(),
            time: nowTimestamp(),
            resolved: false,
          },
          ...prev.guardMessages,
        ],
        activityLogs: [
          {
            time: nowTimestamp(),
            actor: `${currentUser.name} (${currentUser.level})`,
            module: 'Guard',
            action: 'GUARD_ALERT_SENT',
            detail: `Sent alert for ${activeRoomId}: ${alertMsg.trim()}`,
          },
          ...prev.activityLogs,
        ],
      }),
      'Alert Saved Permanently'
    );
    setAlertMsg('');
    onToast('Alert sent to Guard & Room Alerts (Group Message Box)!');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold">Room Guard — Student Present Check</h3>
            <p className="text-xs text-slate-600">
              Tick students present in the examination room and alert Student Management / Admins
              about missing candidates.
            </p>
          </div>
          <select
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
            value={activeRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
          >
            {visibleRooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.number} ({r.location})
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-[#0f294a]">
              <tr>
                <th className="py-3 px-4 text-left">Roll</th>
                <th className="py-3 px-4 text-left">Seat</th>
                <th className="py-3 px-4 text-left">Student Name</th>
                <th className="py-3 px-4 text-left">Class</th>
                <th className="py-3 px-4 text-left">Present Tick</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roomStudents.length ? (
                roomStudents.map((ra) => {
                  const s = db.students.find((x) => x.id === ra.studentId);
                  const att = db.roomAttendance.find(
                    (a) => a.roomId === activeRoomId && a.studentId === ra.studentId && a.present
                  );
                  return (
                    <tr key={ra.id}>
                      <td className="py-3 px-4 font-mono-tabular font-bold">{ra.rollNumber}</td>
                      <td className="py-3 px-4 font-mono-tabular">{ra.seatNumber}</td>
                      <td className="py-3 px-4 font-semibold text-[#0f294a]">
                        {s?.name || ra.studentId}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-[#eef3fa] text-[#0f294a] border border-[#cbd5e1] text-xs font-bold whitespace-nowrap">
                          {s?.className || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <label
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                            att
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(att)}
                            onChange={() => togglePresent(ra.studentId)}
                            className="w-4 h-4 accent-emerald-700"
                          />
                          {att ? `Present (${att.tickedBy})` : 'Mark Present'}
                        </label>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs text-slate-500">
                    No students assigned to this room yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-base font-bold mb-2">
          Send Alert to Student Management &amp; Admin/Manager Message Box
        </h3>
        <form onSubmit={handleSendAlert} className="flex flex-wrap gap-3">
          <input
            className="flex-1 min-w-[240px] px-3 py-2 rounded-lg border border-slate-300 text-sm"
            placeholder="e.g., Roll 102 is absent or arrived late..."
            value={alertMsg}
            onChange={(e) => setAlertMsg(e.target.value)}
            required
          />
          <button className="px-4 py-2 rounded-lg bg-[#0f294a] text-white text-xs font-semibold cursor-pointer">
            Send Alert
          </button>
        </form>
      </div>
    </div>
  );
};

export const GatekeeperEntryPanel: React.FC<OpsProps> = ({
  db,
  currentUser,
  onUpdateDb,
  onToast,
}) => {
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('All Classes');
  const approved = db.students.filter((s) => s.status === 'Approved');
  const filtered = approved.filter((s) => {
    const matchesClass = classFilter === 'All Classes' || s.className === classFilter;
    if (!matchesClass) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.regId.toLowerCase().includes(q) ||
      s.className.toLowerCase().includes(q) ||
      (s.rollNumber || '').toLowerCase().includes(q)
    );
  });

  const toggleGateEntry = (studentId: string, rollNumber: string) => {
    onUpdateDb((prev) => {
      const exists = prev.eventEntries.some(
        (e) => e.eventId === 'EVT-01' && e.studentId === studentId
      );
      const nextEntries = exists
        ? prev.eventEntries.filter(
            (e) => !(e.eventId === 'EVT-01' && e.studentId === studentId)
          )
        : [
            ...prev.eventEntries,
            {
              eventId: 'EVT-01',
              studentId,
              rollNumber,
              status: 'Verified' as const,
              entryTime: nowTimestamp(),
              verifiedBy: currentUser.name,
              verifiedById: currentUser.id,
            },
          ];
      return {
        ...prev,
        eventEntries: nextEntries,
        activityLogs: [
          {
            time: nowTimestamp(),
            actor: `${currentUser.name} (${currentUser.level})`,
            module: 'Gatekeeper',
            action: exists ? 'ENTRY_UNTICKED' : 'ENTRY_VERIFIED',
            detail: `${exists ? 'Removed' : 'Ticked'} entry for Roll ${rollNumber}`,
          },
          ...prev.activityLogs,
        ],
      };
    }, 'Saved Permanently');
    onToast('Gate entry updated.');
  };

  const uniqueClasses = ['All Classes', ...Array.from(new Set(approved.map((s) => s.className)))];

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap justify-between items-center gap-3">
        <div>
          <h3 className="text-lg font-bold">Gatekeeper — Exam Centre Entry Tick</h3>
          <p className="text-xs text-slate-600">
            Search by Roll, Reg ID, Name, or Student Class and tick exam centre entry.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
          <input
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm flex-1 sm:w-64"
            placeholder="Search Roll, Reg ID, Name, or Class..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            {uniqueClasses.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs text-[#0f294a]">
            <tr>
              <th className="py-3 px-4 text-left">Roll</th>
              <th className="py-3 px-4 text-left">Reg ID</th>
              <th className="py-3 px-4 text-left">Student Name</th>
              <th className="py-3 px-4 text-left">Student Class</th>
              <th className="py-3 px-4 text-left">Room &amp; Seat</th>
              <th className="py-3 px-4 text-left">Entry Tick</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((s) => {
              const entry = db.eventEntries.find(
                (e) => e.eventId === 'EVT-01' && e.studentId === s.id
              );
              const ra = db.roomAssignments.find((a) => a.studentId === s.id);
              const rm = ra ? db.rooms.find((r) => r.id === ra.roomId) : null;
              return (
                <tr key={s.id}>
                  <td className="py-3 px-4 font-mono-tabular font-bold">{s.rollNumber || '—'}</td>
                  <td className="py-3 px-4 font-mono-tabular text-xs">{s.regId}</td>
                  <td className="py-3 px-4 font-semibold text-[#0f294a]">{s.name}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-[#eef3fa] text-[#0f294a] border border-[#cbd5e1] text-xs font-bold whitespace-nowrap">
                      {s.className}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs">
                    {rm && ra ? `${rm.number} (${ra.seatNumber})` : 'Unassigned'}
                  </td>
                  <td className="py-3 px-4">
                    <label
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                        entry
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(entry)}
                        onChange={() => toggleGateEntry(s.id, s.rollNumber)}
                        className="w-4 h-4 accent-emerald-700"
                      />
                      {entry ? `Entered (${entry.entryTime.slice(11)})` : 'Tick Entry'}
                    </label>
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

export const GatekeeperMonitorPanel: React.FC<OpsProps> = ({
  db,
  currentUser,
  onUpdateDb,
  onToast,
}) => {
  const editable = canEditGatekeeperWork(currentUser);

  const toggleOverride = (studentId: string, rollNumber: string) => {
    if (!editable) return;
    onUpdateDb((prev) => {
      const exists = prev.eventEntries.some(
        (e) => e.eventId === 'EVT-01' && e.studentId === studentId
      );
      const nextEntries = exists
        ? prev.eventEntries.filter(
            (e) => !(e.eventId === 'EVT-01' && e.studentId === studentId)
          )
        : [
            ...prev.eventEntries,
            {
              eventId: 'EVT-01',
              studentId,
              rollNumber,
              status: 'Verified' as const,
              entryTime: nowTimestamp(),
              verifiedBy: `${currentUser.name} (${currentUser.level})`,
              verifiedById: currentUser.id,
            },
          ];
      return { ...prev, eventEntries: nextEntries };
    }, 'Saved Permanently');
    onToast('Gatekeeper entry record updated.');
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex justify-between items-center flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold">
            Gatekeeper Work Monitor {editable ? '(Editable)' : '(View Only)'}
          </h3>
          <p className="text-xs text-slate-600">
            Live status of students verified at the examination gate.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs text-[#0f294a]">
            <tr>
              <th className="py-3 px-4 text-left">Roll</th>
              <th className="py-3 px-4 text-left">Student Name</th>
              <th className="py-3 px-4 text-left">Class (II–X)</th>
              <th className="py-3 px-4 text-left">Entry Status</th>
              <th className="py-3 px-4 text-left">Verified By</th>
              <th className="py-3 px-4 text-left">Time</th>
              {editable && <th className="py-3 px-4 text-left">Admin/Manager Override</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {db.students.map((s) => {
              const e = db.eventEntries.find((x) => x.studentId === s.id);
              return (
                <tr key={s.id}>
                  <td className="py-2.5 px-4 font-mono-tabular font-semibold">
                    {s.rollNumber || '—'}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-[#0f294a]">{s.name}</td>
                  <td className="py-2.5 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-[#eef3fa] text-[#0f294a] border border-[#cbd5e1] text-xs font-bold whitespace-nowrap">
                      {s.className}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-xs font-semibold">
                    {e ? (
                      <span className="text-emerald-700">Entered Exam Centre</span>
                    ) : (
                      <span className="text-amber-700">Pending</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-xs">{e ? e.verifiedBy : '—'}</td>
                  <td className="py-2.5 px-4 text-xs font-mono-tabular">
                    {e ? e.entryTime : '—'}
                  </td>
                  {editable && (
                    <td className="py-2.5 px-4">
                      <button
                        onClick={() => toggleOverride(s.id, s.rollNumber)}
                        className="px-3 py-1 rounded-md border border-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        {e ? 'Remove Tick' : 'Mark Entered'}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const GatekeeperRoomLookupPanel: React.FC<{ db: ProyashDB }> = ({ db }) => {
  const [q, setQ] = useState('');
  const filtered = db.students.filter((s) => {
    const sQ = q.trim().toLowerCase();
    if (!sQ) return true;
    return (
      s.name.toLowerCase().includes(sQ) ||
      s.regId.toLowerCase().includes(sQ) ||
      (s.rollNumber || '').toLowerCase().includes(sQ)
    );
  });

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap justify-between items-center gap-3">
        <div>
          <h3 className="text-lg font-bold">Gatekeeper Room Lookup (Read-Only)</h3>
          <p className="text-xs text-slate-600">
            Quickly direct students to their assigned examination room and seat.
          </p>
        </div>
        <input
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm max-w-xs w-full"
          placeholder="Search Roll, Reg ID, or Name..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs text-[#0f294a]">
            <tr>
              <th className="py-3 px-4 text-left">Roll</th>
              <th className="py-3 px-4 text-left">Name</th>
              <th className="py-3 px-4 text-left">Class</th>
              <th className="py-3 px-4 text-left">Assigned Room</th>
              <th className="py-3 px-4 text-left">Seat No.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((s) => {
              const ra = db.roomAssignments.find((a) => a.studentId === s.id);
              const rm = ra ? db.rooms.find((r) => r.id === ra.roomId) : null;
              return (
                <tr key={s.id}>
                  <td className="py-2.5 px-4 font-mono-tabular font-bold">{s.rollNumber || '—'}</td>
                  <td className="py-2.5 px-4 font-semibold text-[#0f294a]">{s.name}</td>
                  <td className="py-2.5 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-[#eef3fa] text-[#0f294a] border border-[#cbd5e1] text-xs font-bold whitespace-nowrap">
                      {s.className}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-emerald-700">
                    {rm ? rm.number : 'Unassigned'}
                  </td>
                  <td className="py-2.5 px-4 font-mono-tabular">{ra ? ra.seatNumber : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const ExaminationResultsPanel: React.FC<OpsProps> = ({
  db,
  currentUser,
  onUpdateDb,
  onToast,
}) => {
  const approved = db.students.filter((s) => s.status === 'Approved');
  const [exName, setExName] = useState('');
  const [exDate, setExDate] = useState('');
  const [exTime, setExTime] = useState('11:00 AM – 1:30 PM');
  const [exVenue, setExVenue] = useState('Tehatta High School Campus');

  const [mkStudentId, setMkStudentId] = useState(approved[0]?.id || '');
  const [mkScore, setMkScore] = useState(85);
  const [mkMax, setMkMax] = useState(100);
  const [mkRank, setMkRank] = useState('Merit Pass');
  const [editingResult, setEditingResult] = useState<ExamResult | null>(null);

  const amAdmin = isAdminEquivalent(currentUser);

  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateDb(
      (prev) => ({
        ...prev,
        examinations: [
          {
            id: `EXM-${Date.now()}`,
            name: exName.trim(),
            date: exDate,
            time: exTime.trim(),
            venue: exVenue.trim(),
            instructions: 'Carry Registration ID.',
            status: 'Active',
          },
          ...prev.examinations,
        ],
      }),
      'Saved Permanently'
    );
    setExName('');
    onToast('Examination created!');
  };

  const handleSaveMark = (e: React.FormEvent) => {
    e.preventDefault();
    const stu = db.students.find((s) => s.id === mkStudentId);
    if (!stu) return;
    onUpdateDb(
      (prev) => ({
        ...prev,
        results: [
          {
            id: `RES-${Date.now()}`,
            examId: 'EXM-2026-01',
            studentId: stu.id,
            regId: stu.regId,
            rollNumber: stu.rollNumber,
            studentName: stu.name,
            className: stu.className,
            marks: Number(mkScore),
            maxMarks: Number(mkMax),
            rank: mkRank.trim(),
            published: true,
          },
          ...prev.results.filter((r) => r.studentId !== stu.id),
        ],
      }),
      'Result Saved Permanently'
    );
    onToast('Result saved & published!');
  };

  const handleImportResults = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      let rows: string[][] = [];
      if (file.name.toLowerCase().endsWith('.csv')) {
        rows = (await file.text())
          .split(/\r?\n/)
          .filter(Boolean)
          .map((l) => l.split(',').map((c) => c.replace(/^"|"$/g, '').trim()));
      } else if (file.name.toLowerCase().endsWith('.xlsx')) {
        rows = await parseXlsxRows(await file.arrayBuffer());
      } else {
        onToast('Upload .xlsx or .csv.');
        return;
      }
      if (rows.length < 2) return;

      const hdr = rows[0].map((h) => String(h).toLowerCase().trim());
      const fc = (...ks: string[]) => hdr.findIndex((h) => ks.some((k) => h.includes(k)));
      const iReg = fc('reg');
      const iRoll = fc('roll');
      const iName = fc('student name', 'name');
      const iCls = fc('class');
      const iMarks = fc('marks', 'score');
      const iMax = fc('max');
      const iRank = fc('rank', 'grade');

      let count = 0;
      onUpdateDb((prev) => {
        const nextResults = [...prev.results];
        for (let r = 1; r < rows.length; r++) {
          const c = rows[r];
          const nm = (iName >= 0 ? c[iName] : c[2]) || '';
          const roll = (iRoll >= 0 ? c[iRoll] : c[1]) || '';
          const regId = (iReg >= 0 ? c[iReg] : c[0]) || '';
          if (!String(nm).trim() && !String(roll).trim()) continue;
          const rec: ExamResult = {
            id: `RES-${Date.now()}-${r}`,
            examId: 'EXM-2026-01',
            studentId:
              prev.students.find((s) => s.regId === regId || s.rollNumber === roll)?.id || '',
            regId: regId || `PRY-2027-${String(nextResults.length + 1).padStart(3, '0')}`,
            rollNumber: String(roll || 100 + nextResults.length + 1),
            studentName: String(nm || 'Student').trim(),
            className: String((iCls >= 0 ? c[iCls] : c[3]) || 'Class VIII').trim(),
            marks: Number((iMarks >= 0 ? c[iMarks] : c[4]) || 0),
            maxMarks: Number((iMax >= 0 ? c[iMax] : c[5]) || 100) || 100,
            rank: String((iRank >= 0 ? c[iRank] : c[6]) || 'Pass').trim(),
            published: true,
          };
          const idx = nextResults.findIndex(
            (x) => (regId && x.regId === regId) || (roll && x.rollNumber === roll)
          );
          if (idx >= 0) nextResults[idx] = { ...rec, id: nextResults[idx].id };
          else nextResults.unshift(rec);
          count++;
        }
        return { ...prev, results: nextResults };
      }, 'Results Saved Permanently');
      onToast(`Imported ${count} result(s)!`);
    } catch {
      onToast('Could not parse file.');
    } finally {
      e.target.value = '';
    }
  };

  const handleExportResults = () => {
    exportSheetXLSX(
      'PROYASH_RESULTS',
      'PROYASH_RESULTS.xlsx',
      ['Registration ID', 'Roll Number', 'Student Name', 'Class', 'Marks', 'Max Marks', 'Rank', 'Published'],
      db.results.map((r) => [
        r.regId,
        r.rollNumber,
        r.studentName,
        r.className,
        r.marks,
        r.maxMarks,
        r.rank,
        r.published ? 'Published' : 'Hidden',
      ])
    );
    onToast('Results Excel downloaded!');
  };

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-base font-bold mb-3">Create Examination</h3>
          <form onSubmit={handleCreateExam} className="space-y-3">
            <input
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              placeholder="Exam Name *"
              required
              value={exName}
              onChange={(e) => setExName(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                required
                value={exDate}
                onChange={(e) => setExDate(e.target.value)}
              />
              <input
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                required
                value={exTime}
                onChange={(e) => setExTime(e.target.value)}
              />
            </div>
            <input
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              required
              value={exVenue}
              onChange={(e) => setExVenue(e.target.value)}
            />
            <button className="px-4 py-2 rounded-lg bg-[#0f294a] text-white text-xs font-semibold cursor-pointer">
              Create Exam
            </button>
          </form>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-base font-bold mb-3">Add / Publish Single Student Result</h3>
          <form onSubmit={handleSaveMark} className="space-y-3">
            <select
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              value={mkStudentId}
              onChange={(e) => setMkStudentId(e.target.value)}
            >
              {approved.map((s) => (
                <option key={s.id} value={s.id}>
                  Roll {s.rollNumber} — {s.name} ({s.className})
                </option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                min={0}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm tabular-nums"
                value={mkScore}
                onChange={(e) => setMkScore(Number(e.target.value))}
                required
              />
              <input
                type="number"
                min={1}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm tabular-nums"
                value={mkMax}
                onChange={(e) => setMkMax(Number(e.target.value))}
                required
              />
              <input
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                value={mkRank}
                onChange={(e) => setMkRank(e.target.value)}
                required
              />
            </div>
            <button className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold cursor-pointer">
              Save &amp; Publish Result
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap justify-between items-center gap-3">
        <div>
          <h3 className="text-base font-bold">Student Results ({db.results.length} Records)</h3>
          <p className="text-xs text-slate-600">
            Import via Excel/CSV, edit results, or export sheets. Delete is Admin only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="px-3 py-2 rounded-lg bg-[#0f294a] text-white text-xs font-semibold cursor-pointer">
            + Add File (.xlsx / .csv)
            <input type="file" accept=".xlsx,.csv" className="hidden" onChange={handleImportResults} />
          </label>
          <button
            onClick={handleExportResults}
            className="px-3 py-2 rounded-lg bg-[#d4a017] text-[#091b33] text-xs font-semibold cursor-pointer"
          >
            Export Results (.xlsx)
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs text-[#0f294a]">
            <tr>
              <th className="py-3 px-4 text-left">Reg ID</th>
              <th className="py-3 px-4 text-left">Roll</th>
              <th className="py-3 px-4 text-left">Student Name</th>
              <th className="py-3 px-4 text-left">Class</th>
              <th className="py-3 px-4 text-left">Marks</th>
              <th className="py-3 px-4 text-left">Rank</th>
              <th className="py-3 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {db.results.map((r) => (
              <tr key={r.id}>
                <td className="py-2.5 px-4 font-mono-tabular text-xs">{r.regId}</td>
                <td className="py-2.5 px-4 font-mono-tabular font-bold">{r.rollNumber}</td>
                <td className="py-2.5 px-4 font-semibold text-[#0f294a]">{r.studentName}</td>
                <td className="py-2.5 px-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-[#eef3fa] text-[#0f294a] border border-[#cbd5e1] text-xs font-bold whitespace-nowrap">
                    {r.className}
                  </span>
                </td>
                <td className="py-2.5 px-4 font-mono-tabular">
                  {r.marks} / {r.maxMarks}
                </td>
                <td className="py-2.5 px-4 text-xs font-semibold text-emerald-700">{r.rank}</td>
                <td className="py-2.5 px-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingResult({ ...r })}
                      className="px-2.5 py-1 rounded-md bg-[#d4a017] text-[#091b33] text-xs font-semibold cursor-pointer"
                    >
                      Edit
                    </button>
                    {amAdmin && (
                      <button
                        onClick={() => {
                          onUpdateDb(
                            (prev) => ({
                              ...prev,
                              results: prev.results.filter((x) => x.id !== r.id),
                            }),
                            'Saved Permanently'
                          );
                          onToast('Result deleted by Admin.');
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

      {editingResult && (
        <div
          className="fixed inset-0 z-50 bg-[#091b33]/70 flex items-center justify-center p-4"
          onClick={() => setEditingResult(null)}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-200">
              <h3 className="text-lg font-bold">Edit Student Result</h3>
              <button
                onClick={() => setEditingResult(null)}
                className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onUpdateDb(
                  (prev) => ({
                    ...prev,
                    results: prev.results.map((x) =>
                      x.id === editingResult.id ? editingResult : x
                    ),
                  }),
                  'Result Saved Permanently'
                );
                setEditingResult(null);
                onToast('Result saved!');
              }}
              className="space-y-3"
            >
              <input
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                value={editingResult.studentName}
                onChange={(e) =>
                  setEditingResult({ ...editingResult, studentName: e.target.value })
                }
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  className="px-3 py-2 rounded-lg border border-slate-300 text-sm tabular-nums"
                  value={editingResult.marks}
                  onChange={(e) =>
                    setEditingResult({ ...editingResult, marks: Number(e.target.value) })
                  }
                  required
                />
                <input
                  className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  value={editingResult.rank}
                  onChange={(e) => setEditingResult({ ...editingResult, rank: e.target.value })}
                  required
                />
              </div>
              <button className="w-full py-2.5 rounded-lg bg-emerald-700 text-white text-sm font-semibold cursor-pointer">
                Save Result Changes Permanently
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const LibraryManagementPanel: React.FC<OpsProps> = ({
  db,
  currentUser,
  onUpdateDb,
  onToast,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Syllabus');
  const [className, setClassName] = useState('All Classes');
  const [driveLink, setDriveLink] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const amAdmin = isAdminEquivalent(currentUser);

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    const saveItem = (type: 'Drive Link' | 'File Upload', urlOrData: string, fileName: string) => {
      onUpdateDb(
        (prev) => ({
          ...prev,
          library: [
            {
              id: `LIB-${Date.now()}`,
              title: title.trim(),
              category,
              className,
              type,
              urlOrData,
              fileName,
              uploadedBy: currentUser.name,
              date: new Date().toISOString().slice(0, 10),
              published: true,
            },
            ...prev.library,
          ],
        }),
        'Library Saved Permanently'
      );
      setTitle('');
      setDriveLink('');
      setFile(null);
      onToast('Library resource saved permanently!');
    };

    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        onToast('Max file size is 2 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => saveItem('File Upload', String(reader.result || ''), file.name);
      reader.readAsDataURL(file);
    } else if (driveLink.trim()) {
      saveItem('Drive Link', driveLink.trim(), 'Google Drive Link');
    } else {
      onToast('Provide a file upload or a Google Drive link.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-3">Upload Study Material to Public Library</h3>
        <form onSubmit={handleUpload} className="space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <input
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              placeholder="Resource Title *"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <select
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>Syllabus</option>
              <option>Previous Papers</option>
              <option>Study Notes</option>
              <option>Guidelines</option>
            </select>
            <input
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              placeholder="Class (e.g. All Classes / Class VIII)"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <input
              type="url"
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
              placeholder="Google Drive URL (optional if uploading file)"
              value={driveLink}
              onChange={(e) => setDriveLink(e.target.value)}
            />
            <input
              type="file"
              className="px-3 py-2 rounded-lg border border-slate-300 text-xs"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <button className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold cursor-pointer">
            Save &amp; Publish to Library
          </button>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs text-[#0f294a]">
            <tr>
              <th className="py-3 px-4 text-left">Title</th>
              <th className="py-3 px-4 text-left">Category</th>
              <th className="py-3 px-4 text-left">Class</th>
              <th className="py-3 px-4 text-left">Source</th>
              <th className="py-3 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {db.library.map((l) => (
              <tr key={l.id}>
                <td className="py-3 px-4 font-semibold text-[#0f294a]">{l.title}</td>
                <td className="py-3 px-4 text-xs">{l.category}</td>
                <td className="py-3 px-4 text-xs">{l.className}</td>
                <td className="py-3 px-4 text-xs">{l.type}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        onUpdateDb(
                          (prev) => ({
                            ...prev,
                            library: prev.library.map((x) =>
                              x.id === l.id ? { ...x, published: !x.published } : x
                            ),
                          }),
                          'Saved Permanently'
                        )
                      }
                      className="px-2.5 py-1 rounded-md border border-slate-300 text-xs font-semibold cursor-pointer"
                    >
                      {l.published ? 'Hide' : 'Publish'}
                    </button>
                    {amAdmin && (
                      <button
                        onClick={() => {
                          onUpdateDb(
                            (prev) => ({
                              ...prev,
                              library: prev.library.filter((x) => x.id !== l.id),
                            }),
                            'Saved Permanently'
                          );
                          onToast('Library item deleted by Admin.');
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
