import { useAuth } from '../context/AuthContext';
import StudentDash from './dash/StudentDash';
import TeacherDash from './dash/TeacherDash';
import AdminDash from './dash/AdminDash';

export default function Dashboard() {
  const { user } = useAuth();
  if (user.role === 'teacher') return <TeacherDash />;
  if (user.role === 'admin') return <AdminDash />;
  return <StudentDash />;
}
