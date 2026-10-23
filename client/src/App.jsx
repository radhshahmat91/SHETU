import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Routine from './pages/Routine';
import Materials from './pages/Materials';
import Assignments from './pages/Assignments';
import Quizzes from './pages/Quizzes';
import QuizPlayer from './pages/QuizPlayer';
import Notices from './pages/Notices';
import Leaves from './pages/Leaves';
import Results from './pages/Results';
import Attendance from './pages/Attendance';
import Fees from './pages/Fees';
import Evaluate from './pages/Evaluate';
import Evaluations from './pages/Evaluations';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import Users from './pages/admin/Users';
import AttendanceMonitor from './pages/admin/AttendanceMonitor';
import System from './pages/admin/System';

const Loader = () => <div className="grid min-h-screen place-items-center bg-canvas"><span className="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-600 border-t-transparent" /></div>;

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Loader />;
  return user ? children : <Navigate to="/login" replace state={{ from: loc.pathname }} />;
}
function Guest({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  return user ? <Navigate to="/app" replace /> : children;
}
function Role({ roles, children }) {
  const { user } = useAuth();
  return roles.includes(user.role) ? children : <Navigate to="/app" replace />;
}

export default function App() {
  const R = (roles, el) => <Role roles={roles}>{el}</Role>;
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Guest><Login /></Guest>} />
      <Route path="/register" element={<Guest><Register /></Guest>} />
      <Route path="/app" element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="courses" element={<Courses />} />
        <Route path="courses/:id" element={<CourseDetail />} />
        <Route path="routine" element={R(['student', 'guardian', 'teacher'], <Routine />)} />
        <Route path="materials" element={R(['student', 'guardian', 'teacher'], <Materials />)} />
        <Route path="assignments" element={R(['student', 'guardian'], <Assignments />)} />
        <Route path="quizzes" element={R(['student', 'guardian'], <Quizzes />)} />
        <Route path="quizzes/:id" element={R(['student', 'guardian', 'teacher'], <QuizPlayer />)} />
        <Route path="notices" element={<Notices />} />
        <Route path="leaves" element={<Leaves />} />
        <Route path="results" element={R(['student', 'guardian'], <Results />)} />
        <Route path="attendance" element={R(['student', 'guardian'], <Attendance />)} />
        <Route path="fees" element={R(['student', 'guardian', 'admin'], <Fees />)} />
        <Route path="evaluate" element={R(['student'], <Evaluate />)} />
        <Route path="evaluations" element={R(['teacher', 'admin'], <Evaluations />)} />
        <Route path="messages" element={R(['guardian', 'teacher'], <Messages />)} />
        <Route path="profile" element={<Profile />} />
        <Route path="users" element={R(['admin'], <Users />)} />
        <Route path="attendance-monitor" element={R(['admin'], <AttendanceMonitor />)} />
        <Route path="system" element={R(['admin'], <System />)} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
