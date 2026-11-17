import React, { useState } from 'react';
import {
  ALL_CLASSES,
  canDeleteAllStudents,
  canManageStudentsAndExcel,
  canViewStudentPhotos,
  isAdminEquivalent,
  nowTimestamp,
} from '../../data/defaultDb';
import type { ProyashDB, Student, User } from '../../types';
import { exportSheetXLSX, parseXlsxRows } from '../../utils/xlsx';

interface StudentPanelProps {
  db: ProyashDB;
  currentUser: User;
  onUpdateDb: (updater: (prev: ProyashDB) => ProyashDB, saveLabel?: string) => void;
  onToast: (msg: string) => void;
  onNavigatePortal?: (page: 'guard-attendance' | 'gatekeeper-monitor' | 'site-editor') => void;
}

export const StudentDataPanel: React.FC<StudentPanelProps> = ({
  db,
  currentUser,
  onUpdateDb,
  onToast,
  onNavigatePortal,
}) => {
  const [search, setSearch] = useState('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [addingOpen, setAddingOpen] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const [newStudent, setNewStudent] = useState({
    name: '',
    guardian: '',
    className: ALL_CLASSES[3],
    school: '',
    village: 'Tehatta',
    mobile: '',
  });

  if (!canManageStudentsAndExcel(currentUser)) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-600">
        Restricted to Student Management, Manager, and Admin.
      </div>
    );
  }

  const amAdmin = isAdminEquivalent(currentUser);
  const hasDelAll = canDeleteAllStudents(currentUser);

  const filtered = db.students.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.regId.toLowerCase().includes(q) ||
      s.className.toLowerCase().includes(q) ||
      (s.rollNumber || '').toLowerCase().includes(q)
    );
  });

  const handleSaveAllPermanently = () => {
    onUpdateDb(
      (prev) => ({
        ...prev,
        activityLogs: [
          {
            time: nowTimestamp(),
            actor: `${currentUser.name} (${currentUser.level})`,
            module: 'Student MNG',
            action: 'STUDENT_DATA_SAVED',
            detail: `Saved ${prev.students.length} student records permanently`,
          },
          ...prev.activityLogs,
        ],
      }),
      'Students Saved Permanently'
    );
    onToast(`All ${db.students.length} student records saved permanently to website!`);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        onToast('Upload .xlsx or .csv file.');
        return;
      }

      if (rows.length < 2) {
        onToast('No data rows found.');
        return;
      }

      const hdr = rows[0].map((h) => String(h).toLowerCase().trim());
      const fc = (...ks: string[]) => hdr.findIndex((h) => ks.some((k) => h.includes(k)));
      const iId = fc('student id');
      const iReg = fc('reg');
      const iRoll = fc('roll');
      const iName = fc('student name', 'name');
      const iGuard = fc('guardian');
      const iGen = fc('gender');
      const iDob = fc('birth', 'dob');
      const iMob = fc('mobile');
      const iVil = fc('village');
      const iCls = fc('class');
      const iSch = fc('school');
      const iStat = fc('status');

      let added = 0;
      onUpdateDb((prev) => {
        const nextStudents = [...prev.students];
        for (let r = 1; r < rows.length; r++) {
          const c = rows[r];
          const nm = (iName >= 0 ? c[iName] : c[3]) || '';
          if (!String(nm).trim()) continue;
          const n = nextStudents.length + 1;
          const regId = (iReg >= 0 ? c[iReg] : '') || `PRY-2027-${String(n).padStart(3, '0')}`;
          if (nextStudents.some((s) => s.regId === regId)) continue;
          nextStudents.push({
            id: (iId >= 0 ? c[iId] : '') || `STU-${1000 + n}`,
            regId,
            rollNumber: (iRoll >= 0 ? c[iRoll] : '') || String(100 + n),
            name: String(nm).trim(),
            guardian: (iGuard >= 0 ? c[iGuard] : '') || 'Parent',
            gender: (iGen >= 0 ? c[iGen] : '') || 'N/A',
            dob: (iDob >= 0 ? c[iDob] : '') || '2012-01-01',
            mobile: (iMob >= 0 ? c[iMob] : '') || '',
            village: (iVil >= 0 ? c[iVil] : '') || 'Tehatta',
            className: (iCls >= 0 ? c[iCls] : '') || 'Class VIII',
            school: (iSch >= 0 ? c[iSch] : '') || 'School',
            regDate: new Date().toISOString().slice(0, 10),
            status: iStat >= 0 && c[iStat] === 'Pending' ? 'Pending' : 'Approved',
            photoData: '',
          });
          added++;
        }
        return {
          ...prev,
          students: nextStudents,
          activityLogs: [
            {
              time: nowTimestamp(),
              actor: `${currentUser.name} (${currentUser.level})`,
              module: 'Student MNG',
              action: 'EXCEL_FILE_IMPORTED',
              detail: `Imported ${added} student(s) from ${file.name}`,
            },
            ...prev.activityLogs,
          ],
        };
      }, 'Students Saved Permanently');

      onToast(`Imported ${added} student(s) permanently!`);
    } catch {
      onToast('Could not parse Excel/CSV file.');
    } finally {
      e.target.value = '';
    }
  };

  const handleExportXLSX = () => {
    const headers = [
      'Student ID',
      'Registration ID',
      'Roll Number',
      'Student Name',
      'Guardian Name',
      'Gender',
      'Date of Birth',
      'Mobile',
      'Village',
      'Class',
      'School Name',
      'Registration Status',
      'Gate Entry Status',
      'Gate Entry Time',
      'Verified By Gatekeeper',
      'Assigned Room',
      'Seat Number',
      'Room Present',
    ];
    const rows = db.students.map((s) => {
      const e = db.eventEntries.find((x) => x.studentId === s.id);
      const ra = db.roomAssignments.find((x) => x.studentId === s.id);
      const rm = ra ? db.rooms.find((x) => x.id === ra.roomId) : null;
      const att = db.roomAttendance.find((x) => x.studentId === s.id && x.present);
      return [
        s.id,
        s.regId,
        s.rollNumber || '',
        s.name,
        s.guardian,
        s.gender || '',
        s.dob || '',
        s.mobile || '',
        s.village || '',
        s.className,
        s.school,
        s.status,
        e ? 'Entered Exam Centre' : 'Pending',
        e ? e.entryTime : '',
        e ? e.verifiedBy : '',
        rm ? rm.number : '',
        ra ? ra.seatNumber : '',
        att ? 'Present' : 'Not Ticked',
      ];
    });
    exportSheetXLSX('PROYASH_STUDENTS', 'PROYASH_STUDENTS_DATA.xlsx', headers, rows);
    onToast('Excel datasheet downloaded!');
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateDb((prev) => {
      const n = prev.students.length + 1;
      const stu: Student = {
        id: `STU-${1000 + n}`,
        regId: `PRY-2027-${String(n).padStart(3, '0')}`,
        rollNumber: String(100 + n),
        name: newStudent.name.trim(),
        guardian: newStudent.guardian.trim(),
        className: newStudent.className,
        school: newStudent.school.trim(),
        village: newStudent.village.trim(),
        mobile: newStudent.mobile.trim(),
        gender: 'N/A',
        dob: '2012-01-01',
        regDate: new Date().toISOString().slice(0, 10),
        status: 'Approved',
        photoData: '',
      };
      return {
        ...prev,
        students: [...prev.students, stu],
        activityLogs: [
          {
            time: nowTimestamp(),
            actor: `${currentUser.name} (${currentUser.level})`,
            module: 'Student MNG',
            action: 'STUDENT_ADDED',
            detail: `Added & saved ${stu.name}`,
          },
          ...prev.activityLogs,
        ],
      };
    }, 'Student Saved Permanently');
    setAddingOpen(false);
    setNewStudent({
      name: '',
      guardian: '',
      className: ALL_CLASSES[3],
      school: '',
      village: 'Tehatta',
      mobile: '',
    });
    onToast('Student saved permanently!');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    onUpdateDb(
      (prev) => ({
        ...prev,
        students: prev.students.map((s) => (s.id === editingStudent.id ? editingStudent : s)),
        activityLogs: [
          {
            time: nowTimestamp(),
            actor: `${currentUser.name} (${currentUser.level})`,
            module: 'Student MNG',
            action: 'STUDENT_EDITED',
            detail: `Updated & saved student ${editingStudent.id} (${editingStudent.name})`,
          },
          ...prev.activityLogs,
        ],
      }),
      'Student Saved Permanently'
    );
    setEditingStudent(null);
    onToast('Student changes saved permanently!');
  };

  const handleDeleteSingle = (id: string) => {
    if (!amAdmin) {
      onToast('Only Admin can delete student records.');
      return;
    }
    const target = db.students.find((s) => s.id === id);
    onUpdateDb(
      (prev) => ({
        ...prev,
        students: prev.students.filter((s) => s.id !== id),
        roomAssignments: prev.roomAssignments.filter((a) => a.studentId !== id),
        eventEntries: prev.eventEntries.filter((e) => e.studentId !== id),
        roomAttendance: prev.roomAttendance.filter((a) => a.studentId !== id),
        activityLogs: [
          {
            time: nowTimestamp(),
            actor: `${currentUser.name} (${currentUser.level})`,
            module: 'Student MNG',
            action: 'STUDENT_DELETED',
            detail: `Deleted student ${target ? target.name : id}`,
          },
          ...prev.activityLogs,
        ],
      }),
      'Saved Permanently'
    );
    onToast('Student deleted by Admin.');
  };

  const handleDeleteAll = () => {
    if (!amAdmin || !hasDelAll) {
      onToast('Only Admin with Delete-All permission can delete all students.');
      return;
    }
    const count = db.students.length;
    onUpdateDb(
      (prev) => ({
        ...prev,
        students: [],
        roomAssignments: [],
        eventEntries: [],
        roomAttendance: [],
        activityLogs: [
          {
            time: nowTimestamp(),
            actor: `${currentUser.name} (${currentUser.level})`,
            module: 'Student MNG',
            action: 'ALL_STUDENTS_DELETED',
            detail: `Deleted all ${count} student records`,
          },
          ...prev.activityLogs,
        ],
      }),
      'Saved Permanently'
    );
    setConfirmDeleteAll(false);
    onToast(`Deleted all ${count} students.`);
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h3 className="text-lg font-bold">Student Data Management &amp; Permanent Storage</h3>
          <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
            <strong>{db.students.length}</strong> students stored. Edit &amp; Save accessible by
            Student Management / Manager / Admin.{' '}
            <strong className="text-[#0f294a]">Delete is restricted to Admin only.</strong>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSaveAllPermanently}
            className="px-3.5 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 whitespace-nowrap cursor-pointer"
          >
            Save Student Data Permanently
          </button>
          <label className="px-3.5 py-2 rounded-lg bg-[#0f294a] text-white text-xs font-semibold hover:bg-[#1a3f6e] whitespace-nowrap cursor-pointer">
            + Add File (.xlsx / .csv)
            <input type="file" accept=".xlsx,.csv" className="hidden" onChange={handleImportFile} />
          </label>
          <button
            onClick={handleExportXLSX}
            className="px-3.5 py-2 rounded-lg bg-[#d4a017] text-[#091b33] text-xs font-semibold hover:bg-[#e5b32a] whitespace-nowrap cursor-pointer"
          >
            Extract Student Excel (.xlsx)
          </button>
          <button
            onClick={() => setAddingOpen(true)}
            className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-[#0f294a] hover:bg-slate-50 whitespace-nowrap cursor-pointer"
          >
            + Add Manual Student
          </button>
          {amAdmin && hasDelAll && (
            <button
              onClick={() => setConfirmDeleteAll(true)}
              disabled={db.students.length === 0}
              className="px-3.5 py-2 rounded-lg bg-red-700 text-white text-xs font-semibold disabled:opacity-40 whitespace-nowrap cursor-pointer"
            >
              Delete ALL Students
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap justify-between items-center gap-3">
        <input
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm w-full max-w-sm"
          placeholder="Search Name, Student ID, Class, or Reg ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {onNavigatePortal && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onNavigatePortal('guard-attendance')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#0f294a] hover:bg-slate-50 cursor-pointer"
            >
              Check Guard Room Ticks →
            </button>
            <button
              onClick={() => onNavigatePortal('gatekeeper-monitor')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#0f294a] hover:bg-slate-50 cursor-pointer"
            >
              View Gatekeeper Work →
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs text-[#0f294a]">
            <tr>
              <th className="py-3 px-3 text-left">Student ID</th>
              <th className="py-3 px-3 text-left">Reg ID</th>
              <th className="py-3 px-3 text-left">Roll</th>
              <th className="py-3 px-3 text-left">Name</th>
              <th className="py-3 px-3 text-left">Class</th>
              <th className="py-3 px-3 text-left">School</th>
              <th className="py-3 px-3 text-left">Status</th>
              <th className="py-3 px-3 text-left">Gatekeeper</th>
              <th className="py-3 px-3 text-left">Room Present</th>
              <th className="py-3 px-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((s) => {
              const entry = db.eventEntries.find((e) => e.studentId === s.id);
              const ra = db.roomAttendance.find((a) => a.studentId === s.id && a.present);
              return (
                <tr key={s.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-mono-tabular font-semibold">{s.id}</td>
                  <td className="py-2.5 px-3 font-mono-tabular text-xs">{s.regId}</td>
                  <td className="py-2.5 px-3 font-mono-tabular font-semibold">
                    {s.rollNumber || '—'}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-[#0f294a]">{s.name}</td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-[#eef3fa] text-[#0f294a] border border-[#cbd5e1] text-xs font-bold whitespace-nowrap">
                      {s.className}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-xs text-slate-600">{s.school}</td>
                  <td className="py-2.5 px-3 text-xs font-semibold">
                    <span className={s.status === 'Approved' ? 'text-emerald-700' : 'text-amber-700'}>
                      {s.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-xs">
                    {entry ? (
                      <span className="text-emerald-700 font-semibold">
                        Gate ({entry.verifiedBy})
                      </span>
                    ) : (
                      <span className="text-slate-500">Pending</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-xs">
                    {ra ? (
                      <span className="text-emerald-700 font-semibold">Present</span>
                    ) : (
                      <span className="text-rose-700">Not Ticked</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setEditingStudent({ ...s })}
                        className="px-2.5 py-1 rounded-md bg-[#d4a017] text-[#091b33] text-xs font-semibold whitespace-nowrap cursor-pointer"
                      >
                        Edit &amp; Save
                      </button>
                      {amAdmin && (
                        <button
                          onClick={() => handleDeleteSingle(s.id)}
                          className="px-2.5 py-1 rounded-md bg-red-700 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Student Modal */}
      {addingOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#091b33]/70 flex items-center justify-center p-4"
          onClick={() => setAddingOpen(false)}
        >
          <div
            className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-200">
              <h3 className="text-lg font-bold">Add Manual Student</h3>
              <button
                onClick={() => setAddingOpen(false)}
                className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleAddStudent} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  placeholder="Full Name *"
                  required
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                />
                <input
                  className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  placeholder="Guardian Name *"
                  required
                  value={newStudent.guardian}
                  onChange={(e) => setNewStudent({ ...newStudent, guardian: e.target.value })}
                />
                <select
                  className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                  value={newStudent.className}
                  onChange={(e) => setNewStudent({ ...newStudent, className: e.target.value })}
                >
                  {ALL_CLASSES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <input
                  className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  placeholder="School Name *"
                  required
                  value={newStudent.school}
                  onChange={(e) => setNewStudent({ ...newStudent, school: e.target.value })}
                />
                <input
                  className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  placeholder="Village"
                  value={newStudent.village}
                  onChange={(e) => setNewStudent({ ...newStudent, village: e.target.value })}
                />
                <input
                  className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  placeholder="Mobile"
                  value={newStudent.mobile}
                  onChange={(e) => setNewStudent({ ...newStudent, mobile: e.target.value })}
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-emerald-700 text-white text-sm font-semibold cursor-pointer"
              >
                Save Student Permanently
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div
          className="fixed inset-0 z-50 bg-[#091b33]/70 flex items-center justify-center p-4"
          onClick={() => setEditingStudent(null)}
        >
          <div
            className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 mb-4 border-b border-slate-200">
              <h3 className="text-lg font-bold">Edit Student ({editingStudent.id})</h3>
              <button
                onClick={() => setEditingStudent(null)}
                className="px-3 py-1 rounded-lg border border-slate-200 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                    Student Name *
                  </label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    required
                    value={editingStudent.name}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                    Guardian Name *
                  </label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    required
                    value={editingStudent.guardian}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, guardian: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0f294a] mb-1">Class *</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                    value={editingStudent.className}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, className: e.target.value })
                    }
                  >
                    {ALL_CLASSES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                    Roll Number
                  </label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    value={editingStudent.rollNumber}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, rollNumber: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                    School Name *
                  </label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    required
                    value={editingStudent.school}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, school: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0f294a] mb-1">Village</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    value={editingStudent.village}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, village: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0f294a] mb-1">Mobile</label>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    value={editingStudent.mobile}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, mobile: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0f294a] mb-1">Status</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                    value={editingStudent.status}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        status: e.target.value as 'Approved' | 'Pending',
                      })
                    }
                  >
                    <option value="Approved">Approved</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-emerald-700 text-white text-sm font-semibold cursor-pointer"
              >
                Save Student Changes Permanently
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {confirmDeleteAll && (
        <div
          className="fixed inset-0 z-50 bg-[#091b33]/70 flex items-center justify-center p-4"
          onClick={() => setConfirmDeleteAll(false)}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-red-700 mb-2">Confirm Delete ALL Students</h3>
            <p className="text-sm text-slate-600 mb-5">
              Delete all <strong>{db.students.length}</strong> student records permanently?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteAll(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                className="px-4 py-2 rounded-lg bg-red-700 text-white text-xs font-semibold cursor-pointer"
              >
                Yes, Delete ALL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const RegistrationApprovalPanel: React.FC<StudentPanelProps> = ({
  db,
  currentUser,
  onUpdateDb,
  onToast,
  onNavigatePortal,
}) => {
  const sc = db.siteContent;
  const amAdmin = isAdminEquivalent(currentUser);
  const [caption, setCaption] = useState(sc.regPictureCaption || '');
  const [picFile, setPicFile] = useState<File | null>(null);
  const [picUrl, setPicUrl] = useState(
    sc.regPictureUrl && !sc.regPictureUrl.startsWith('data:') ? sc.regPictureUrl : ''
  );

  const handleSavePicBox = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amAdmin) {
      onToast('Only Admin can set the Student Registration Picture Box.');
      return;
    }
    const commit = (nextUrl?: string) => {
      onUpdateDb(
        (prev) => ({
          ...prev,
          siteContent: {
            ...prev.siteContent,
            regPictureCaption: caption.trim(),
            regPictureUrl: nextUrl !== undefined ? nextUrl : prev.siteContent.regPictureUrl,
          },
          activityLogs: [
            {
              time: nowTimestamp(),
              actor: `${currentUser.name} (${currentUser.level})`,
              module: 'Registration',
              action: 'REG_PICTURE_SAVED',
              detail: 'Updated Student Registration Picture Box permanently',
            },
            ...prev.activityLogs,
          ],
        }),
        'Picture Box Saved Permanently'
      );
      setPicFile(null);
      onToast('Registration Picture Box saved permanently!');
    };

    if (picFile) {
      if (picFile.size > 1.5 * 1024 * 1024) {
        onToast('Max image size is 1.5 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => commit(String(reader.result || ''));
      reader.readAsDataURL(picFile);
    } else if (picUrl.trim()) {
      commit(picUrl.trim());
    } else {
      commit(undefined);
    }
  };

  const approveRegistration = (id: string) => {
    onUpdateDb((prev) => {
      const idx = prev.students.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const updated = prev.students.map((s, i) =>
        s.id === id
          ? {
              ...s,
              status: 'Approved' as const,
              rollNumber: s.rollNumber || String(100 + i + 1),
            }
          : s
      );
      return {
        ...prev,
        students: updated,
        activityLogs: [
          {
            time: nowTimestamp(),
            actor: `${currentUser.name} (${currentUser.level})`,
            module: 'Registration',
            action: 'REGISTRATION_APPROVED',
            detail: `Approved registration ${prev.students[idx].regId}`,
          },
          ...prev.activityLogs,
        ],
      };
    }, 'Saved Permanently');
    onToast('Registration approved & roll assigned.');
  };

  return (
    <div className="space-y-6">
      {/* Admin Picture Box */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold">
              Student Registration Picture Box (Set by Admin)
            </h3>
            <p className="text-xs text-slate-600">
              Displayed on the Student Registration Form &amp; Registration Panel.
            </p>
          </div>
          {amAdmin && onNavigatePortal && (
            <button
              onClick={() => onNavigatePortal('site-editor')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#0f294a] cursor-pointer"
            >
              Open Full Site Editor →
            </button>
          )}
        </div>

        <div className="grid lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6">
            {sc.regPictureUrl ? (
              <div className="rounded-xl overflow-hidden border-2 border-[#d4a017] bg-[#091b33]">
                <img
                  src={sc.regPictureUrl}
                  alt={sc.regPictureCaption}
                  referrerPolicy="no-referrer"
                  className="w-full h-52 object-cover"
                />
                <div className="px-4 py-2.5 bg-[#091b33] text-white text-xs flex justify-between items-center">
                  <span>{sc.regPictureCaption || 'Official Registration Notice'}</span>
                  <span className="text-[#d4a017] font-semibold">Set by Admin</span>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-slate-100 text-center text-xs text-slate-500">
                No picture box image set by Admin yet.
              </div>
            )}
          </div>

          {amAdmin && (
            <form onSubmit={handleSavePicBox} className="lg:col-span-6 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                  Upload Picture Box Image (JPG/PNG/WebP &le; 1.5 MB)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  onChange={(e) => setPicFile(e.target.files?.[0] || null)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                  OR Picture Box URL
                </label>
                <input
                  type="url"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  placeholder="https://..."
                  value={picUrl}
                  onChange={(e) => setPicUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#0f294a] mb-1">
                  Picture Box Caption *
                </label>
                <input
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 cursor-pointer"
                >
                  Save Picture Permanently
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
            </form>
          )}
        </div>
      </div>

      {/* Registration Approval Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs text-[#0f294a]">
            <tr>
              <th className="py-3 px-4 text-left">Reg ID</th>
              <th className="py-3 px-4 text-left">Name</th>
              <th className="py-3 px-4 text-left">Class</th>
              <th className="py-3 px-4 text-left">Status</th>
              <th className="py-3 px-4 text-left">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {db.students.map((s) => (
              <tr key={s.id}>
                <td className="py-3 px-4 font-mono-tabular font-semibold">{s.regId}</td>
                <td className="py-3 px-4 font-semibold text-[#0f294a]">{s.name}</td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-[#eef3fa] text-[#0f294a] border border-[#cbd5e1] text-xs font-bold whitespace-nowrap">
                    {s.className}
                  </span>
                </td>
                <td className="py-3 px-4 text-xs font-semibold">
                  <span className={s.status === 'Approved' ? 'text-emerald-700' : 'text-amber-700'}>
                    {s.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {s.status === 'Pending' ? (
                    <button
                      onClick={() => approveRegistration(s.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#0f294a] text-white text-xs font-semibold cursor-pointer"
                    >
                      Approve &amp; Roll
                    </button>
                  ) : (
                    <span className="font-mono-tabular text-xs font-semibold text-slate-600">
                      Roll #{s.rollNumber}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const StudentPhotosVault: React.FC<StudentPanelProps> = ({
  db,
  currentUser,
  onUpdateDb,
  onToast,
}) => {
  if (!canViewStudentPhotos(currentUser)) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-600">
        Restricted to Admin &amp; Examination Management.
      </div>
    );
  }
  const amAdmin = isAdminEquivalent(currentUser);
  const withPhotos = db.students.filter((s) => Boolean(s.photoData));

  const deletePhoto = (id: string) => {
    if (!amAdmin) return;
    onUpdateDb(
      (prev) => ({
        ...prev,
        students: prev.students.map((s) => (s.id === id ? { ...s, photoData: '' } : s)),
      }),
      'Saved Permanently'
    );
    onToast('Student photo deleted.');
  };

  const deleteAllPhotos = () => {
    if (!amAdmin) return;
    onUpdateDb(
      (prev) => ({
        ...prev,
        students: prev.students.map((s) => ({ ...s, photoData: '' })),
      }),
      'Saved Permanently'
    );
    onToast('All student registration photos cleared.');
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap justify-between items-center gap-3">
        <div>
          <h3 className="text-lg font-bold">Private Student Photos Vault</h3>
          <p className="text-xs text-slate-600 tabular-nums">
            Uploaded registration photos: <strong>{withPhotos.length}</strong> (Admin &amp; Exam
            Management only)
          </p>
        </div>
        {amAdmin && (
          <button
            onClick={deleteAllPhotos}
            disabled={withPhotos.length === 0}
            className="px-3.5 py-2 rounded-lg bg-red-700 text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
          >
            Delete ALL Student Photos
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {db.students.map((s) => (
          <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-4">
            {s.photoData ? (
              <div className="h-44 rounded-lg overflow-hidden bg-slate-900 mb-3">
                <img
                  src={s.photoData}
                  alt={s.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="h-44 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-500 mb-3">
                No Registration Photo
              </div>
            )}
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="font-bold text-sm text-[#0f294a]">{s.name}</div>
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#eef3fa] text-[#0f294a] border border-[#cbd5e1] text-[11px] font-bold whitespace-nowrap">
                {s.className}
              </span>
            </div>
            <div className="text-xs text-slate-500 font-mono-tabular mb-3">
              {s.id} · Reg: {s.regId}
            </div>
            {s.photoData && amAdmin && (
              <button
                onClick={() => deletePhoto(s.id)}
                className="px-3 py-1.5 rounded-lg bg-red-700 text-white text-xs font-semibold cursor-pointer"
              >
                Delete Photo
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
