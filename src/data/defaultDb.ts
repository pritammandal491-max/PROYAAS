import type { PortalPageId, ProyashDB, User } from '../types';

export const STORAGE_KEY = 'proyash_blueprint_v2_0_db';

export const ALL_MEMBER_ROLES = [
  'Guard',
  'Gatekeeper',
  'Room Manager',
  'Student Manager',
  'Examination Manager',
  'Notice Manager',
  'Gallery Manager',
  'Event Manager',
  'Report Viewer',
];

export const ALL_CLASSES = [
  'Class II',
  'Class III',
  'Class IV',
  'Class V',
  'Class VI',
  'Class VII',
  'Class VIII',
  'Class IX',
  'Class X',
];

export const ROLE_ACCESS_MATRIX = [
  {
    level: 'Super Admin',
    modules: 'All Modules (Full Control)',
    actions:
      'Appoint Admin/Sub Admin/Manager/Member, Reset Demo Data, Grant Delete-All-Students, Edit Homepage & Brand, Change Any Staff/Member Password, Delete Any Record/User',
  },
  {
    level: 'Admin / Sub Admin',
    modules: 'All Operational, Content & User Modules',
    actions:
      'Approve/Manage Users (except Super Admin), Change Any Member/Manager Password, Edit & Save Homepage/Picture Box, Delete Students, Notices, Group Messages & Activities',
  },
  {
    level: 'Manager',
    modules: 'Dashboard, Group Messages, Students, Rooms, Exams, Library, Notices, Events, Gallery, About/Contact',
    actions:
      'Edit & Save Permanently (About Us, Contact, Notices, Students, Results), Assign Member Roles, Distribute Rooms (NO Password Changes, NO User/Record Deletion, NO Admin-Locked Homepage Edit)',
  },
  {
    level: 'Member',
    modules: 'Strictly Assigned Task Modules Only',
    actions:
      'Guard (Room Present Check & Alerts), Gatekeeper (Entry Tick & Room Lookup), Room/Student/Exam/Notice/Gallery/Event Manager (task-specific actions only; NO Password Changes)',
  },
];

export const DEFAULT_DB: ProyashDB = {
  siteContent: {
    brandTitle: 'PROYASH (প্রয়াস)',
    brandSubtitle: 'Education · Merit · Community',
    brandShort: 'প্র',
    homeBadge: 'Tehatta, Nadia, West Bengal',
    homeHead: 'Empowering Rural Merit & Community Welfare Through Education',
    homeBody:
      'Welcome to Proyash (প্রয়াস) — nurturing young scholars, conducting transparent talent examinations, providing open study resources in our Library, and safeguarding student records.',
    homeSavedAt: 'Default',
    homeSavedBy: 'Super Admin',
    logoUrl: '',
    regPictureUrl: '/src/assets/images/proyash_exam_banner_1794906013090.jpg',
    regPictureCaption: 'Official Talent Search Registration Banner (Set by Admin)',
    aboutHead: 'Rooted in Tehatta, Focused on Academic Excellence',
    aboutSubhead:
      'Organisation history, educational mission, and student data stewardship in Nadia, West Bengal.',
    aboutBody:
      'Founded by dedicated educators and community volunteers in Tehatta, Nadia, West Bengal, Proyash (প্রয়াস) conducts annual merit scholarship examinations, book distribution drives, and student felicitation programmes across Classes V to X.',
    aboutSavedAt: 'Default',
    aboutSavedBy: 'Super Admin',
    contactSavedAt: 'Default',
    contactSavedBy: 'Super Admin',
    activities: [
      {
        id: 'ACT-1',
        tag: 'Academic',
        title: 'Talent Search Examinations',
        desc: 'District-level merit evaluation with unique roll numbers, hall allocation, and verified gate entry.',
      },
      {
        id: 'ACT-2',
        tag: 'Welfare',
        title: 'Book & Study Kit Distribution',
        desc: 'Annual distribution of textbooks, reference guides, and school supplies to deserving learners.',
      },
      {
        id: 'ACT-3',
        tag: 'Recognition',
        title: 'Prize Distribution & Scholarships',
        desc: 'Honouring high-achieving students in public ceremonies to inspire peers and families.',
      },
      {
        id: 'ACT-4',
        tag: 'Development',
        title: 'Merit Development Workshops',
        desc: 'Subject guidance sessions in Mathematics, Science, English, and Bengali.',
      },
      {
        id: 'ACT-5',
        tag: 'Community',
        title: 'Social Welfare Drives',
        desc: 'Winter relief, health awareness, and community support programmes across Tehatta.',
      },
      {
        id: 'ACT-6',
        tag: 'Culture',
        title: 'Cultural Programmes',
        desc: 'Debate, quiz, recitation, and cultural events fostering all-round personality growth.',
      },
    ],
    contact: {
      orgName: 'Proyash (প্রয়াস)',
      address: 'Tehatta, Dist. Nadia, West Bengal, India — 741160',
      email: 'contact@proyash-tehatta.org',
      phone: '+91 98000-00000',
      hours: 'Monday – Saturday, 10:00 AM – 5:00 PM',
      mapNote: 'Near Tehatta High School Campus, Nadia (23.72° N, 88.53° E)',
    },
  },
  users: [
    {
      id: 'USR-001',
      name: 'Pritam (Super Admin)',
      email: 'pritam@gmail',
      password: '6294665449',
      mobile: '6294665449',
      level: 'Super Admin',
      roles: ['All Modules'],
      allowDeleteAllStudents: true,
      status: 'Active',
      assignedEventId: 'EVT-01',
    },
    {
      id: 'USR-002',
      name: 'Subrata Biswas',
      email: 'manager@proyash.org',
      password: 'manager123',
      mobile: '9800001111',
      level: 'Manager',
      roles: ['Department Manager'],
      allowDeleteAllStudents: false,
      status: 'Active',
      assignedEventId: 'EVT-01',
    },
    {
      id: 'USR-003',
      name: 'Riya Sarkar',
      email: 'gatekeeper@proyash.org',
      password: 'gate123',
      mobile: '9800002222',
      level: 'Member',
      roles: ['Gatekeeper'],
      allowDeleteAllStudents: false,
      status: 'Active',
      assignedEventId: 'EVT-01',
    },
    {
      id: 'USR-004',
      name: 'Soumen Bhattacharya',
      email: 'room@proyash.org',
      password: 'room123',
      mobile: '9800003333',
      level: 'Member',
      roles: ['Room Manager'],
      allowDeleteAllStudents: false,
      status: 'Active',
      assignedEventId: 'EVT-01',
    },
    {
      id: 'USR-005',
      name: 'Anindita Sen',
      email: 'studentmgr@proyash.org',
      password: 'stu123',
      mobile: '9800004444',
      level: 'Member',
      roles: ['Student Manager'],
      allowDeleteAllStudents: false,
      status: 'Active',
      assignedEventId: 'EVT-01',
    },
    {
      id: 'USR-006',
      name: 'Debashis Mondal',
      email: 'exam@proyash.org',
      password: 'exam123',
      mobile: '9800005555',
      level: 'Member',
      roles: ['Examination Manager'],
      allowDeleteAllStudents: false,
      status: 'Active',
      assignedEventId: 'EVT-01',
    },
    {
      id: 'USR-007',
      name: 'Mousumi Roy',
      email: 'notice@proyash.org',
      password: 'notice123',
      mobile: '9800006666',
      level: 'Member',
      roles: ['Notice Manager'],
      allowDeleteAllStudents: false,
      status: 'Active',
      assignedEventId: 'EVT-01',
    },
    {
      id: 'USR-008',
      name: 'Tanmoy Paul',
      email: 'gallery@proyash.org',
      password: 'gallery123',
      mobile: '9800007777',
      level: 'Member',
      roles: ['Gallery Manager'],
      allowDeleteAllStudents: false,
      status: 'Active',
      assignedEventId: 'EVT-01',
    },
    {
      id: 'USR-009',
      name: 'Koushik Saha',
      email: 'guard@proyash.org',
      password: 'guard123',
      mobile: '9800008888',
      level: 'Member',
      roles: ['Guard'],
      allowDeleteAllStudents: false,
      status: 'Active',
      assignedEventId: 'EVT-01',
    },
  ],
  deletedAccounts: [],
  students: [
    {
      id: 'STU-1001',
      name: 'Aritra Mondal',
      guardian: 'Tapas Mondal',
      gender: 'Male',
      dob: '2012-04-14',
      mobile: '9800112233',
      village: 'Tehatta',
      className: 'Class VIII',
      school: 'Tehatta High School',
      regId: 'PRY-2027-001',
      regDate: '2026-10-12',
      rollNumber: '101',
      status: 'Approved',
      photoData: '',
    },
    {
      id: 'STU-1002',
      name: 'Sohini Das',
      guardian: 'Pradip Das',
      gender: 'Female',
      dob: '2011-08-22',
      mobile: '9800445566',
      village: 'Betai',
      className: 'Class IX',
      school: 'Betai High School',
      regId: 'PRY-2027-002',
      regDate: '2026-10-14',
      rollNumber: '102',
      status: 'Approved',
      photoData: '',
    },
    {
      id: 'STU-1003',
      name: 'Ritam Ghosh',
      guardian: 'Subhash Ghosh',
      gender: 'Male',
      dob: '2013-01-19',
      mobile: '9733221100',
      village: 'Chanderghat',
      className: 'Class VII',
      school: 'Chanderghat High School',
      regId: 'PRY-2027-003',
      regDate: '2026-10-16',
      rollNumber: '103',
      status: 'Approved',
      photoData: '',
    },
    {
      id: 'STU-1004',
      name: 'Ananya Halder',
      guardian: 'Nirmal Halder',
      gender: 'Female',
      dob: '2012-11-03',
      mobile: '9832110099',
      village: 'Palashipara',
      className: 'Class VIII',
      school: 'Palashipara M.G.S. Vidyapith',
      regId: 'PRY-2027-004',
      regDate: '2026-10-20',
      rollNumber: '104',
      status: 'Approved',
      photoData: '',
    },
    {
      id: 'STU-1005',
      name: 'Subham Biswas',
      guardian: 'Ranjit Biswas',
      gender: 'Male',
      dob: '2012-06-11',
      mobile: '9832221100',
      village: 'Tehatta',
      className: 'Class VIII',
      school: 'Tehatta High School',
      regId: 'PRY-2027-005',
      regDate: '2026-10-22',
      rollNumber: '105',
      status: 'Approved',
      photoData: '',
    },
    {
      id: 'STU-1006',
      name: 'Debika Chatterjee',
      guardian: 'Arun Chatterjee',
      gender: 'Female',
      dob: '2011-03-07',
      mobile: '9832334455',
      village: 'Tehatta',
      className: 'Class IX',
      school: 'Tehatta Girls High School',
      regId: 'PRY-2027-006',
      regDate: '2026-10-23',
      rollNumber: '106',
      status: 'Approved',
      photoData: '',
    },
    {
      id: 'STU-1007',
      name: 'Souvik Pramanik',
      guardian: 'Bimal Pramanik',
      gender: 'Male',
      dob: '2010-09-18',
      mobile: '9832445566',
      village: 'Betai',
      className: 'Class X',
      school: 'Betai High School',
      regId: 'PRY-2027-007',
      regDate: '2026-10-24',
      rollNumber: '107',
      status: 'Approved',
      photoData: '',
    },
  ],
  examinations: [
    {
      id: 'EXM-2027-01',
      name: 'Proyash Annual Talent Search Examination 2027',
      date: '2027-01-18',
      time: '11:00 AM – 1:30 PM',
      venue: 'Tehatta High School Campus',
      instructions:
        'Carry printed admit slip and school ID card. Report 45 minutes prior to start.',
      status: 'Active',
    },
    {
      id: 'EXM-2026-01',
      name: 'Proyash Merit Scholarship Exam 2026',
      date: '2026-01-25',
      time: '11:00 AM – 1:30 PM',
      venue: 'Tehatta High School Campus',
      instructions: 'Archive record',
      status: 'Published',
    },
  ],
  library: [
    {
      id: 'LIB-01',
      title: 'Proyash Talent Search 2027 — Official Syllabus (Classes V–X)',
      category: 'Syllabus',
      className: 'All Classes',
      type: 'Drive Link',
      urlOrData: 'https://drive.google.com/',
      fileName: 'Google Drive Document',
      uploadedBy: 'Debashis Mondal',
      date: '2026-11-10',
      published: true,
    },
    {
      id: 'LIB-02',
      title: '2026 Question Paper & Model Answer Key (Class VIII)',
      category: 'Previous Papers',
      className: 'Class VIII',
      type: 'Drive Link',
      urlOrData: 'https://drive.google.com/',
      fileName: 'Google Drive PDF',
      uploadedBy: 'Debashis Mondal',
      date: '2026-11-08',
      published: true,
    },
  ],
  events: [
    {
      id: 'EVT-01',
      title: 'Annual Talent Search Examination & Gate Entry',
      date: '2027-01-18',
      venue: 'Tehatta High School',
      description: 'Central examination entry verification and room direction.',
      connectEntry: true,
      status: 'Upcoming',
    },
    {
      id: 'EVT-02',
      title: 'Winter Book & Study Kit Distribution Drive',
      date: '2026-12-14',
      venue: 'Proyash Community Hall, Tehatta',
      description: 'Supporting 250+ meritorious students from rural schools across Nadia.',
      connectEntry: false,
      status: 'Upcoming',
    },
    {
      id: 'EVT-03',
      title: 'Annual Prize Distribution & Felicitation',
      date: '2026-03-08',
      venue: 'Tehatta Nazrul Mancha',
      description: 'Celebrating top rank holders of the 2026 scholarship examination.',
      connectEntry: false,
      status: 'Completed',
    },
  ],
  eventEntries: [
    {
      eventId: 'EVT-01',
      studentId: 'STU-1001',
      rollNumber: '101',
      status: 'Verified',
      entryTime: '2026-11-16 09:42:10',
      verifiedBy: 'Riya Sarkar',
      verifiedById: 'USR-003',
    },
  ],
  rooms: [
    {
      id: 'RM-101',
      number: 'Room 101',
      location: 'Main Building, Ground Floor',
      capacity: 30,
      status: 'Active',
    },
    {
      id: 'RM-102',
      number: 'Room 102',
      location: 'Main Building, Ground Floor',
      capacity: 25,
      status: 'Active',
    },
    {
      id: 'RM-201',
      number: 'Room 201',
      location: 'Science Block, 1st Floor',
      capacity: 35,
      status: 'Active',
    },
  ],
  roomAssignments: [
    {
      id: 'RA-01',
      examId: 'EXM-2027-01',
      studentId: 'STU-1001',
      rollNumber: '101',
      roomId: 'RM-101',
      seatNumber: 'A-01',
      status: 'Confirmed',
    },
    {
      id: 'RA-02',
      examId: 'EXM-2027-01',
      studentId: 'STU-1002',
      rollNumber: '102',
      roomId: 'RM-101',
      seatNumber: 'A-02',
      status: 'Confirmed',
    },
    {
      id: 'RA-03',
      examId: 'EXM-2027-01',
      studentId: 'STU-1003',
      rollNumber: '103',
      roomId: 'RM-102',
      seatNumber: 'B-01',
      status: 'Confirmed',
    },
  ],
  guardAssignments: [
    {
      id: 'GRD-01',
      guardUserId: 'USR-009',
      guardName: 'Koushik Saha',
      roomId: 'RM-101',
      examId: 'EXM-2027-01',
      dutyPeriod: '18 Jan 2027, 10:30 AM – 2:00 PM',
      status: 'Confirmed',
    },
    {
      id: 'GRD-02',
      guardUserId: 'USR-004',
      guardName: 'Soumen Bhattacharya',
      roomId: 'RM-102',
      examId: 'EXM-2027-01',
      dutyPeriod: '18 Jan 2027, 10:30 AM – 2:00 PM',
      status: 'Assigned',
    },
  ],
  roomAttendance: [
    {
      roomId: 'RM-101',
      studentId: 'STU-1001',
      present: true,
      tickedBy: 'Koushik Saha',
      time: '2026-11-16 10:35:00',
    },
  ],
  guardMessages: [
    {
      id: 'MSG-01',
      roomId: 'RM-101',
      sender: 'Koushik Saha (Guard)',
      message: 'Roll 102 (Sohini Das) has not yet been ticked present in Room 101.',
      time: '2026-11-16 10:40:00',
      resolved: false,
    },
  ],
  groupMessages: [
    {
      id: 'GM-01',
      group: 'Admin Group',
      sender: 'Pritam (Super Admin)',
      senderLevel: 'Super Admin',
      message:
        'Please ensure all Class VIII & Class IX students are distributed across Rooms 101 and 102 before exam day.',
      time: '2026-11-16 09:00:00',
      resolved: false,
    },
    {
      id: 'GM-02',
      group: 'Manager Group',
      sender: 'Subrata Biswas',
      senderLevel: 'Manager',
      message:
        'Student sheet verification for Class VIII is complete. Waiting for final notice confirmation.',
      time: '2026-11-16 10:15:00',
      resolved: false,
    },
  ],
  results: [
    {
      id: 'RES-001',
      examId: 'EXM-2026-01',
      studentId: 'STU-1001',
      regId: 'PRY-2027-001',
      rollNumber: '101',
      studentName: 'Aritra Mondal',
      className: 'Class VIII',
      marks: 92,
      maxMarks: 100,
      rank: '1st (Merit Gold)',
      published: true,
    },
    {
      id: 'RES-002',
      examId: 'EXM-2026-01',
      studentId: 'STU-1002',
      regId: 'PRY-2027-002',
      rollNumber: '102',
      studentName: 'Sohini Das',
      className: 'Class IX',
      marks: 88,
      maxMarks: 100,
      rank: '2nd (Merit Silver)',
      published: true,
    },
    {
      id: 'RES-003',
      examId: 'EXM-2026-01',
      studentId: 'STU-1003',
      regId: 'PRY-2027-003',
      rollNumber: '103',
      studentName: 'Ritam Ghosh',
      className: 'Class VII',
      marks: 81,
      maxMarks: 100,
      rank: 'Distinction',
      published: true,
    },
  ],
  notices: [
    {
      id: 'NTC-01',
      title: 'Online Registration Open for Proyash Talent Search Exam 2027',
      date: '2026-11-10',
      category: 'Examination',
      important: true,
      published: true,
      body: 'Applications are invited from students of Class V to Class X across Nadia district. Use the Examination page to submit online registration.',
    },
    {
      id: 'NTC-02',
      title: 'Admit Card & Room Allocation Guidelines',
      date: '2026-11-05',
      category: 'Guidelines',
      important: true,
      published: true,
      body: 'Students must bring their generated Registration ID (PRY-2027-XXX) at the gate for Gatekeeper verification and room direction.',
    },
  ],
  gallery: [
    {
      id: 'GAL-01',
      title: 'Annual Prize Distribution Ceremony 2026',
      category: 'Prize Distribution',
      year: '2026',
      caption: 'Meritorious students honoured at Tehatta Nazrul Mancha.',
      imageUrl: '/src/assets/images/proyash_prize_ceremony_1794905995882.jpg',
      published: true,
    },
    {
      id: 'GAL-02',
      title: 'Rural School Book Distribution Drive',
      category: 'Book Distribution',
      year: '2026',
      caption: 'Distributing textbooks and notebooks to 250+ students.',
      imageUrl: '/src/assets/images/proyash_book_drive_1794905992689.jpg',
      published: true,
    },
    {
      id: 'GAL-03',
      title: 'Talent Search Examination Hall',
      category: 'Examination',
      year: '2026',
      caption: 'Organised seating and invigilation across examination rooms.',
      imageUrl: '/src/assets/images/proyash_exam_hall_1794905993290.jpg',
      published: true,
    },
    {
      id: 'GAL-04',
      title: 'Campus Morning Assembly & Registration',
      category: 'Campus',
      year: '2026',
      caption: 'Students arriving at the examination centre campus in Nadia.',
      imageUrl: '/src/assets/images/proyash_exam_banner_1794906013090.jpg',
      published: true,
    },
  ],
  activityLogs: [
    {
      time: '2026-11-16 10:40:00',
      actor: 'Koushik Saha (Member)',
      module: 'Guard',
      action: 'GUARD_ALERT_SENT',
      detail: 'Sent alert to Student Management for Room 101 missing student',
    },
    {
      time: '2026-11-16 09:42:10',
      actor: 'Riya Sarkar (Member)',
      module: 'Gatekeeper',
      action: 'ENTRY_VERIFIED',
      detail: 'Ticked exam centre entry for Aritra Mondal (Roll 101)',
    },
    {
      time: '2026-11-15 17:15:00',
      actor: 'Soumen Bhattacharya (Member)',
      module: 'Room MNG',
      action: 'ROOM_ALLOCATED',
      detail: 'Assigned Roll 101 to Room 101 (Seat A-01)',
    },
    {
      time: '2026-11-10 11:00:00',
      actor: 'Pritam (Super Admin)',
      module: 'System',
      action: 'SYSTEM_INIT',
      detail: 'Configured Super Admin authority for pritam@gmail',
    },
  ],
};

export function loadDB(): ProyashDB {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_DB);
    const parsed = JSON.parse(raw);
    const def = structuredClone(DEFAULT_DB);
    return {
      ...def,
      ...parsed,
      siteContent: { ...def.siteContent, ...(parsed.siteContent || {}) },
      groupMessages: Array.isArray(parsed.groupMessages) ? parsed.groupMessages : def.groupMessages,
    };
  } catch {
    return structuredClone(DEFAULT_DB);
  }
}

export function persistDB(db: ProyashDB): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    return true;
  } catch {
    return false;
  }
}

export function nowTimestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

export function isSuperAdmin(user: User | null): boolean {
  return Boolean(user && user.level === 'Super Admin');
}

export function isAdminEquivalent(user: User | null): boolean {
  return Boolean(
    user && (user.level === 'Super Admin' || user.level === 'Admin' || user.level === 'Sub Admin')
  );
}

export function isAdminOrManager(user: User | null): boolean {
  return Boolean(
    user &&
      (user.level === 'Super Admin' ||
        user.level === 'Admin' ||
        user.level === 'Sub Admin' ||
        user.level === 'Manager')
  );
}

export function canManageStudentsAndExcel(user: User | null): boolean {
  return Boolean(user && (isAdminOrManager(user) || user.roles.includes('Student Manager')));
}

export function canDeleteAllStudents(user: User | null): boolean {
  return Boolean(user && (isSuperAdmin(user) || user.allowDeleteAllStudents));
}

export function canViewStudentPhotos(user: User | null): boolean {
  return Boolean(user && (isAdminEquivalent(user) || user.roles.includes('Examination Manager')));
}

export function canManageLibrary(user: User | null): boolean {
  return Boolean(user && (isAdminOrManager(user) || user.roles.includes('Examination Manager')));
}

export function canEditGatekeeperWork(user: User | null): boolean {
  return isAdminOrManager(user);
}

export function canChangeUserPassword(actor: User | null, target: User): boolean {
  if (!actor || !isAdminEquivalent(actor)) return false;
  if (target.level === 'Super Admin') {
    return isSuperAdmin(actor) && actor.id === target.id;
  }
  if (target.level === 'Admin' || target.level === 'Sub Admin') {
    return isSuperAdmin(actor) || actor.id === target.id;
  }
  return true;
}

export function getModulePermissions(user: User | null): PortalPageId[] {
  if (!user) return [];
  if (isAdminEquivalent(user)) {
    return [
      'dashboard',
      'group-messages',
      'team-work',
      'students',
      'registration',
      'student-photos',
      'guard-attendance',
      'gatekeeper-monitor',
      'event-mng',
      'room-mng',
      'examination',
      'library',
      'notices',
      'events',
      'gallery',
      'site-editor',
      'users',
      'reports',
      'logs',
    ];
  }
  if (user.level === 'Manager') {
    return [
      'dashboard',
      'group-messages',
      'team-work',
      'students',
      'registration',
      'guard-attendance',
      'gatekeeper-monitor',
      'event-mng',
      'room-mng',
      'examination',
      'library',
      'notices',
      'events',
      'gallery',
      'site-editor',
      'users',
      'reports',
      'logs',
    ];
  }
  const perms = new Set<PortalPageId>(['dashboard', 'gatekeeper-monitor']);
  if (user.roles.includes('Student Manager')) {
    perms.add('students');
    perms.add('registration');
    perms.add('guard-attendance');
  }
  if (user.roles.includes('Examination Manager')) {
    perms.add('examination');
    perms.add('student-photos');
    perms.add('library');
  }
  if (user.roles.includes('Room Manager')) {
    perms.add('room-mng');
    perms.add('guard-attendance');
  }
  if (user.roles.includes('Guard')) {
    perms.add('guard-attendance');
  }
  if (user.roles.includes('Gatekeeper')) {
    perms.add('event-mng');
    perms.add('room-lookup');
  }
  if (user.roles.includes('Notice Manager')) {
    perms.add('notices');
  }
  if (user.roles.includes('Gallery Manager')) {
    perms.add('gallery');
  }
  if (user.roles.includes('Event Manager')) {
    perms.add('events');
  }
  if (user.roles.includes('Report Viewer')) {
    perms.add('reports');
  }
  return Array.from(perms);
}

export function isAccountBlocked(db: ProyashDB, email: string, mobile = '') {
  const e = email.trim().toLowerCase();
  const m = mobile.trim();
  return db.deletedAccounts.find(
    (d) => d.email.toLowerCase() === e || (m && d.mobile && d.mobile === m)
  );
}
