import { LayoutDashboard, BookOpen, CalendarDays, ClipboardList, GraduationCap, Wallet, Megaphone, Star, MessageSquare, Users, Settings, CalendarX2, HelpCircle, UserCheck, Search } from 'lucide-react';

const dash = { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true };

export const NAV = {
  student: [
    { items: [dash] },
    { title: 'Learn', items: [
      { to: '/app/courses', label: 'My courses', icon: BookOpen },
      { to: '/app/routine', label: 'Class routine', icon: CalendarDays },
      { to: '/app/materials', label: 'Find materials', icon: Search },
      { to: '/app/assignments', label: 'Assignments', icon: ClipboardList },
      { to: '/app/quizzes', label: 'Quizzes', icon: HelpCircle },
    ] },
    { title: 'Progress', items: [
      { to: '/app/results', label: 'Results', icon: GraduationCap },
      { to: '/app/attendance', label: 'Attendance', icon: UserCheck },
      { to: '/app/fees', label: 'Fees', icon: Wallet },
    ] },
    { title: 'Campus', items: [
      { to: '/app/notices', label: 'Notice board', icon: Megaphone },
      { to: '/app/leaves', label: 'Leave', icon: CalendarX2 },
      { to: '/app/evaluate', label: 'Rate teachers', icon: Star },
    ] },
  ],
  guardian: [
    { items: [dash] },
    { title: 'My child', items: [
      { to: '/app/results', label: 'Results', icon: GraduationCap },
      { to: '/app/attendance', label: 'Attendance', icon: UserCheck },
      { to: '/app/courses', label: 'Courses', icon: BookOpen },
      { to: '/app/routine', label: 'Class routine', icon: CalendarDays },
      { to: '/app/assignments', label: 'Assignments', icon: ClipboardList },
      { to: '/app/fees', label: 'Fees', icon: Wallet },
      { to: '/app/leaves', label: 'Leave', icon: CalendarX2 },
    ] },
    { title: 'Talk to school', items: [
      { to: '/app/messages', label: 'Messages', icon: MessageSquare },
      { to: '/app/notices', label: 'Notice board', icon: Megaphone },
    ] },
  ],
  teacher: [
    { items: [dash] },
    { title: 'Teach', items: [
      { to: '/app/courses', label: 'My courses', icon: BookOpen },
      { to: '/app/routine', label: 'Class routine', icon: CalendarDays },
      { to: '/app/leaves', label: 'Leave requests', icon: CalendarX2 },
    ] },
    { title: 'Campus', items: [
      { to: '/app/notices', label: 'Notice board', icon: Megaphone },
      { to: '/app/messages', label: 'Messages', icon: MessageSquare },
      { to: '/app/evaluations', label: 'Student ratings', icon: Star },
    ] },
  ],
  admin: [
    { items: [dash] },
    { title: 'People', items: [
      { to: '/app/users', label: 'Users and approvals', icon: Users },
    ] },
    { title: 'Academics', items: [
      { to: '/app/courses', label: 'Courses', icon: BookOpen },
      { to: '/app/attendance-monitor', label: 'Attendance monitor', icon: UserCheck },
      { to: '/app/evaluations', label: 'Teacher ratings', icon: Star },
    ] },
    { title: 'Campus', items: [
      { to: '/app/notices', label: 'Notice board', icon: Megaphone },
      { to: '/app/leaves', label: 'Leave requests', icon: CalendarX2 },
      { to: '/app/fees', label: 'Fees', icon: Wallet },
    ] },
    { title: 'Platform', items: [{ to: '/app/system', label: 'System', icon: Settings }] },
  ],
};
