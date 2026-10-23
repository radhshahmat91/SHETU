import { Router } from 'express';
import os from 'os';
import mongoose from 'mongoose';
import { User, Course, Attendance, EmailLog, ActivityLog } from '../models/index.js';
import { ah, HttpError, esc, pick } from '../utils/http.js';
import { protect, allow } from '../middleware/auth.js';
import { notify, guardiansOf, logActivity } from '../services/notify.js';
import { attendanceFor, resultsFor } from '../services/insights.js';
import { studentCourseFilter } from '../utils/access.js';

const router = Router();
router.use(protect, allow('admin'));

const USER_FIELDS = ['name', 'email', 'role', 'userId', 'phone', 'className', 'group', 'section', 'roll', 'designation', 'subject', 'classTeacherOf', 'relation'];

const idsFromStudentIds = async (list = []) => (await User.find({ role: 'student', userId: { $in: list } }).select('_id')).map((s) => s._id);

router.get('/users', ah(async (req, res) => {
  const { role, status, q } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (q) filter.$or = ['name', 'email', 'userId'].map((f) => ({ [f]: new RegExp(esc(q), 'i') }));
  const items = await User.find(filter).populate('children', 'name userId').sort('-createdAt').limit(300);
  res.json({ items });
}));

router.post('/users', ah(async (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.email || !b.password || !b.role) throw new HttpError(400, 'Name, email, password and role are required');
  const data = { ...pick(b, USER_FIELDS), password: b.password, status: 'active' };
  if (b.role === 'guardian' && b.childStudentIds?.length) data.children = await idsFromStudentIds(b.childStudentIds);
  const item = await User.create(data);
  logActivity(req.user, 'Created an account', `${item.name} (${item.role})`);
  res.status(201).json({ item });
}));

router.put('/users/:id', ah(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'User not found');
  Object.assign(user, pick(req.body, USER_FIELDS.filter((f) => f !== 'role')));
  if (req.body.password) user.password = req.body.password;
  if (user.role === 'guardian' && Array.isArray(req.body.childStudentIds)) user.children = await idsFromStudentIds(req.body.childStudentIds);
  await user.save();
  await user.populate('children', 'name userId');
  res.json({ item: user });
}));

// FR-1 / FR-5: approve registrations, link guardians to children, suspend accounts
router.put('/users/:id/status', ah(async (req, res) => {
  const { status } = req.body || {};
  if (!['active', 'rejected', 'suspended'].includes(status)) throw new HttpError(400, 'Invalid status');
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, 'User not found');
  if (String(user._id) === String(req.user._id)) throw new HttpError(400, 'You cannot change your own account status');
  const wasPending = user.status === 'pending';
  user.status = status;
  let linked = null;
  if (status === 'active' && user.role === 'guardian' && user.childStudentId && !user.children.length) {
    const kid = await User.findOne({ role: 'student', userId: user.childStudentId });
    if (kid) { user.children = [kid._id]; linked = kid.name; }
  }
  await user.save();
  if (wasPending && status === 'active') await notify(user, { title: 'Your Setu account is approved', message: 'You can now sign in.', type: 'system', link: '/app', email: true, lines: ['The college office has approved your account. You can sign in now.', ...(linked ? [`Your account is linked to ${linked}.`] : [])] });
  logActivity(req.user, `Account ${status}`, `${user.name} (${user.role})`);
  res.json({ item: user, linked });
}));

router.delete('/users/:id', ah(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw new HttpError(400, 'You cannot delete your own account');
  await User.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

// Process 9.0 / 10.0: monitor attendance and notify guardians
router.get('/attendance-overview', ah(async (_req, res) => {
  const agg = await Attendance.aggregate([
    { $match: { status: { $ne: 'leave' } } },
    { $group: { _id: '$student', total: { $sum: 1 }, ok: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } } } },
  ]);
  const map = Object.fromEntries(agg.map((a) => [String(a._id), a]));
  const students = await User.find({ role: 'student', status: 'active' }).select('name userId className group section roll').lean();
  const items = students.map((s) => { const a = map[String(s._id)]; return { student: s, total: a?.total || 0, percent: a?.total ? Math.round((a.ok / a.total) * 100) : null }; })
    .sort((x, y) => (x.percent ?? 101) - (y.percent ?? 101));
  const groups = {};
  items.forEach((i) => { if (i.percent === null) return; const k = `${i.student.className} ${i.student.section}`; (groups[k] ||= []).push(i.percent); });
  const classes = Object.entries(groups).map(([label, v]) => ({ label, percent: Math.round(v.reduce((a, b) => a + b, 0) / v.length), students: v.length }));
  res.json({ items, classes });
}));

router.post('/notify-guardian', ah(async (req, res) => {
  const { student: id, kind } = req.body || {};
  const student = await User.findOne({ _id: id, role: 'student' });
  if (!student) throw new HttpError(404, 'Student not found');
  const guardians = await guardiansOf(student._id);
  if (!guardians.length) throw new HttpError(409, `${student.name} has no linked guardian yet`);
  const courses = await Course.find(studentCourseFilter(student)).lean();
  let title; let lines;
  if (kind === 'result') {
    const r = await resultsFor(student, courses);
    title = `${student.name}: result summary`;
    lines = [`${student.name}'s current GPA is ${r.gpa ?? 'not available yet'}.`, ...r.courses.filter((c) => c.percent !== null).map((c) => `${c.course.title}: ${c.percent}% (${c.letter})`)];
  } else {
    const a = await attendanceFor(student, courses);
    title = `${student.name}: attendance update`;
    lines = [`${student.name}'s overall attendance is ${a.summary.percent ?? 'not recorded'}%.`, ...a.byCourse.filter((c) => c.total).map((c) => `${c.course.title}: ${c.percent}% (${c.present + c.late} of ${c.total} classes)`)];
  }
  await notify(guardians, { title, message: lines[0], type: kind === 'result' ? 'grade' : 'attendance', link: '/app', email: true, lines });
  logActivity(req.user, 'Notified guardians', `${student.name} (${kind})`);
  res.json({ ok: true, sent: guardians.length });
}));

// NF-1 / NF-2: a small monitoring view for the system admin
router.get('/system', ah(async (_req, res) => {
  const [emails, activity, users, courses] = await Promise.all([
    EmailLog.find().sort('-createdAt').limit(40).lean(),
    ActivityLog.find().sort('-createdAt').limit(40).populate('user', 'name role').lean(),
    User.countDocuments(),
    Course.countDocuments(),
  ]);
  const mem = process.memoryUsage();
  res.json({
    health: { database: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState], uptimeMin: Math.round(process.uptime() / 60), memoryMb: Math.round(mem.rss / 1048576), node: process.version, host: os.hostname(), emailProvider: process.env.SENDGRID_API_KEY ? 'SendGrid' : 'Console (no API key)', users, courses },
    emails,
    activity,
  });
}));

// any signed-in user can flag wrong data or a bug; admins are notified (NF-1)
export const systemRouter = Router();
systemRouter.post('/report', protect, ah(async (req, res) => {
  const text = String(req.body?.message || '').trim();
  if (text.length < 5) throw new HttpError(400, 'Describe the problem in a few words');
  const admins = await User.find({ role: 'admin', status: 'active' });
  await notify(admins, { title: `Problem reported by ${req.user.name}`, message: text.slice(0, 200), type: 'system', link: '/app/system' });
  logActivity(req.user, 'Reported a problem', text.slice(0, 120));
  res.status(201).json({ ok: true });
}));

export default router;
