import { Course, User } from '../models/index.js';
import { HttpError } from './http.js';

export const studentCourseFilter = (s) => ({ className: s.className, section: s.section, group: { $in: [s.group, 'All'] } });

// Mongo filter describing the courses a user may see (guardians: their children's)
export async function courseFilterFor(user, childId) {
  if (user.role === 'admin') return {};
  if (user.role === 'teacher') return { teacher: user._id };
  if (user.role === 'student') return studentCourseFilter(user);
  const own = (user.children || []).map(String);
  const ids = childId && own.includes(String(childId)) ? [childId] : own;
  const kids = await User.find({ _id: { $in: ids } });
  return kids.length ? { $or: kids.map(studentCourseFilter) } : { _id: { $in: [] } };
}

export async function loadCourse(req) {
  const course = await Course.findById(req.params.id);
  if (!course) throw new HttpError(404, 'Course not found');
  const ok = await Course.exists({ $and: [{ _id: course._id }, await courseFilterFor(req.user, req.query.child)] });
  if (!ok) throw new HttpError(403, 'You do not have access to this course');
  return course;
}

// the student whose records are being viewed (self, linked child, or ?child= for staff)
export async function viewedStudent(req) {
  const u = req.user;
  const childId = req.query.child || req.body?.child;
  if (u.role === 'student') return u;
  if (u.role === 'guardian') {
    const own = (u.children || []).map(String);
    const id = childId && own.includes(String(childId)) ? childId : own[0];
    if (!id) throw new HttpError(404, 'No student is linked to this account yet. Ask the college office to link your child.');
    return User.findById(id);
  }
  if (!childId) throw new HttpError(400, 'Choose a student first');
  const s = await User.findOne({ _id: childId, role: 'student' });
  if (!s) throw new HttpError(404, 'Student not found');
  return s;
}

export const studentsOfCourse = (c) =>
  User.find({ role: 'student', status: 'active', className: c.className, section: c.section, ...(c.group !== 'All' ? { group: c.group } : {}) }).sort('roll');
