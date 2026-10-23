import { Router } from 'express';
import { Attendance, Course, Leave, User } from '../models/index.js';
import { ah, HttpError } from '../utils/http.js';
import { protect, allow } from '../middleware/auth.js';
import { loadCourse, studentsOfCourse, viewedStudent, studentCourseFilter } from '../utils/access.js';
import { isDateStr, todayStr, dayOf } from '../utils/dates.js';
import { attendanceFor } from '../services/insights.js';
import { notify, guardiansOf } from '../services/notify.js';

const router = Router();
router.use(protect);

router.get('/courses/:id/attendance', allow('teacher', 'admin'), ah(async (req, res) => {
  const course = await loadCourse(req);
  const date = isDateStr(req.query.date) ? req.query.date : todayStr();
  const students = await studentsOfCourse(course);
  const ids = students.map((s) => s._id);
  const [saved, leaves] = await Promise.all([
    Attendance.find({ course: course._id, date, student: { $in: ids } }).lean(),
    Leave.find({ status: 'approved', startDate: { $lte: date }, endDate: { $gte: date }, student: { $in: ids } }).lean(),
  ]);
  const savedMap = Object.fromEntries(saved.map((a) => [String(a.student), a.status]));
  const leaveSet = new Set(leaves.map((l) => String(l.student)));
  const items = students.map((s) => ({ student: { _id: s._id, name: s.name, roll: s.roll, userId: s.userId }, status: savedMap[String(s._id)] || (leaveSet.has(String(s._id)) ? 'leave' : 'present'), saved: !!savedMap[String(s._id)], onLeave: leaveSet.has(String(s._id)) }));
  res.json({ date, items, weekday: dayOf(date) });
}));

router.post('/courses/:id/attendance', allow('teacher', 'admin'), ah(async (req, res) => {
  const course = await loadCourse(req);
  const { date, records } = req.body || {};
  if (!isDateStr(date)) throw new HttpError(400, 'Choose a valid date');
  if (date > todayStr()) throw new HttpError(400, 'You cannot take attendance for a future date');
  if (!Array.isArray(records) || !records.length) throw new HttpError(400, 'No attendance records were sent');
  const valid = new Set((await studentsOfCourse(course)).map((s) => String(s._id)));
  const rows = records.filter((r) => valid.has(String(r.student)) && ['present', 'absent', 'late', 'leave'].includes(r.status));
  const before = await Attendance.find({ course: course._id, date }).lean();
  const prev = Object.fromEntries(before.map((a) => [String(a.student), a.status]));
  await Attendance.bulkWrite(rows.map((r) => ({ updateOne: { filter: { course: course._id, student: r.student, date }, update: { $set: { status: r.status, markedBy: req.user._id } }, upsert: true } })));
  const newlyAbsent = rows.filter((r) => r.status === 'absent' && prev[String(r.student)] !== 'absent').map((r) => r.student);
  if (newlyAbsent.length) {
    const [students, guardians] = await Promise.all([User.find({ _id: { $in: newlyAbsent } }), guardiansOf(newlyAbsent)]);
    await notify(students, { title: `Marked absent in ${course.title}`, message: `${date}`, type: 'attendance', link: '/app/attendance' });
    for (const g of guardians) {
      const kids = students.filter((s) => (g.children || []).map(String).includes(String(s._id)));
      await notify(g, { title: `${kids.map((k) => k.name).join(', ')} was absent in ${course.title}`, message: date, type: 'attendance', link: '/app/attendance' });
    }
  }
  res.json({ ok: true, saved: rows.length });
}));

// the register: summary + the most recent class days per subject
router.get('/attendance/summary', allow('student', 'guardian', 'admin', 'teacher'), ah(async (req, res) => {
  const student = await viewedStudent(req);
  const courses = await Course.find(studentCourseFilter(student)).lean();
  const { summary, byCourse, records } = await attendanceFor(student, courses);
  const dates = [...new Set(records.map((r) => r.date))].sort().slice(-14);
  const rows = courses.map((c) => ({ course: { _id: c._id, code: c.code, title: c.title, color: c.color }, marks: Object.fromEntries(records.filter((r) => String(r.course) === String(c._id) && dates.includes(r.date)).map((r) => [r.date, r.status])) }));
  res.json({ summary, byCourse, register: { dates, rows } });
}));

export default router;
