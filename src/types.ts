export type UserLevel = 'Super Admin' | 'Admin' | 'Sub Admin' | 'Manager' | 'Member';
export type UserStatus = 'Active' | 'Pending' | 'Suspended';

export type PublicPageId =
  | 'home'
  | 'about'
  | 'activities'
  | 'examination'
  | 'library'
  | 'notices'
  | 'events'
  | 'gallery'
  | 'contact'
  | 'login';

export type PortalPageId =
  | 'dashboard'
  | 'group-messages'
  | 'team-work'
  | 'students'
  | 'registration'
  | 'student-photos'
  | 'guard-attendance'
  | 'gatekeeper-monitor'
  | 'event-mng'
  | 'room-mng'
  | 'room-lookup'
  | 'examination'
  | 'library'
  | 'notices'
  | 'events'
  | 'gallery'
  | 'site-editor'
  | 'users'
  | 'reports'
  | 'logs';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  mobile: string;
  level: UserLevel;
  roles: string[];
  allowDeleteAllStudents: boolean;
  status: UserStatus;
  assignedEventId: string;
}

export interface DeletedAccount {
  name: string;
  email: string;
  mobile: string;
  deletedBy: string;
  deletedAt: string;
}

export interface Student {
  id: string;
  name: string;
  guardian: string;
  gender: string;
  dob: string;
  mobile: string;
  village: string;
  className: string;
  school: string;
  regId: string;
  regDate: string;
  rollNumber: string;
  status: 'Approved' | 'Pending';
  photoData: string;
}

export interface Examination {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  instructions: string;
  status: 'Active' | 'Published';
}

export interface LibraryItem {
  id: string;
  title: string;
  category: string;
  className: string;
  type: 'Drive Link' | 'File Upload';
  urlOrData: string;
  fileName: string;
  uploadedBy: string;
  date: string;
  published: boolean;
}

export interface OrgEvent {
  id: string;
  title: string;
  date: string;
  venue: string;
  description: string;
  connectEntry: boolean;
  status: 'Upcoming' | 'Completed';
}

export interface EventEntry {
  eventId: string;
  studentId: string;
  rollNumber: string;
  status: 'Verified' | 'Pending';
  entryTime: string;
  verifiedBy: string;
  verifiedById: string;
}

export interface Room {
  id: string;
  number: string;
  location: string;
  capacity: number;
  status: string;
}

export interface RoomAssignment {
  id: string;
  examId: string;
  studentId: string;
  rollNumber: string;
  roomId: string;
  seatNumber: string;
  status: string;
}

export interface GuardAssignment {
  id: string;
  guardUserId: string;
  guardName: string;
  roomId: string;
  examId: string;
  dutyPeriod: string;
  status: string;
}

export interface RoomAttendance {
  roomId: string;
  studentId: string;
  present: boolean;
  tickedBy: string;
  time: string;
}

export interface GuardMessage {
  id: string;
  roomId: string;
  sender: string;
  message: string;
  time: string;
  resolved: boolean;
}

export type MessageGroupName = 'Admin Group' | 'Manager Group' | 'Guard & Room Alerts' | 'General Staff';

export interface GroupMessage {
  id: string;
  group: MessageGroupName;
  sender: string;
  senderLevel: string;
  message: string;
  time: string;
  resolved: boolean;
}

export interface ExamResult {
  id: string;
  examId: string;
  studentId: string;
  regId: string;
  rollNumber: string;
  studentName: string;
  className: string;
  marks: number;
  maxMarks: number;
  rank: string;
  published: boolean;
}

export interface Notice {
  id: string;
  title: string;
  date: string;
  category: string;
  important: boolean;
  published: boolean;
  body: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: string;
  year: string;
  caption: string;
  imageUrl: string;
  published: boolean;
}

export interface ActivityItem {
  id: string;
  tag: string;
  title: string;
  desc: string;
}

export interface ContactInfo {
  orgName: string;
  address: string;
  email: string;
  phone: string;
  hours: string;
  mapNote: string;
}

export interface SiteContent {
  brandTitle: string;
  brandSubtitle: string;
  brandShort: string;
  homeBadge: string;
  homeHead: string;
  homeBody: string;
  homeSavedAt: string;
  homeSavedBy: string;
  logoUrl: string;
  regPictureUrl: string;
  regPictureCaption: string;
  aboutHead: string;
  aboutSubhead: string;
  aboutBody: string;
  aboutSavedAt: string;
  aboutSavedBy: string;
  contactSavedAt: string;
  contactSavedBy: string;
  activities: ActivityItem[];
  contact: ContactInfo;
}

export interface ActivityLog {
  time: string;
  actor: string;
  module: string;
  action: string;
  detail: string;
}

export interface ProyashDB {
  siteContent: SiteContent;
  users: User[];
  deletedAccounts: DeletedAccount[];
  students: Student[];
  examinations: Examination[];
  library: LibraryItem[];
  events: OrgEvent[];
  eventEntries: EventEntry[];
  rooms: Room[];
  roomAssignments: RoomAssignment[];
  guardAssignments: GuardAssignment[];
  roomAttendance: RoomAttendance[];
  guardMessages: GuardMessage[];
  groupMessages: GroupMessage[];
  results: ExamResult[];
  notices: Notice[];
  gallery: GalleryItem[];
  activityLogs: ActivityLog[];
}
