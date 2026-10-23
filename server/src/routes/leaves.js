import { Router } from 'express';
import { Leave, User } from '../models/index.js';
import { ah, HttpError } from '../utils/http.js';
import { protect, allow } from '../middleware/auth.js';
import { viewedStudent } from '../utils/access.js';
import { isDateStr, diffDays } from '../utils/dates.js';
import { notify, guardiansOf, logActivity } from '../services/notify.js';

const router = Router();
router.use(protect);

const classMatch = (t) => ({ role: 'student', className: t.classTeacherOf?.className, group: t.classTeacherOf?.group, section: t.classTeacherOf?.section });
const classTeachersOf = (s) => User.find({ role: 'teacher', status: 'active', 'classTeacherOf.className': s.className, 'classTeacherOf.group': s.group, 'classTeacherOf.section': s.section });

router.get('/', ah(async (req, res) => {
  const u = req.user;
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (u.role === 'student' || u.role === 'guardian') filter.student = (await viewedStudent(req))._id;
  else if (u.role === 'teacher') {
    if (!u.classTeacherOf?.section) return res.json({ items: [], classTeacher: false });
    filter.student = { $in: (await User.find(classMatch(u)).select('_id')).map((s) => s._id) };
  }
  const items = await Leave.find(filter).populate('student', 'name userId className group section roll').populate('decidedBy', 'name').sort('-createdAt').limit(200).lean();
  res.json({ items, classTeacher: u.role === 'teacher' ? !!u.classTeacherOf?.section : undefined });
}));

router.post('/', allow('student'), ah(async (req, res) => {
  const { startDate, endDate, reason } = req.body || {};
  if (!isDateStr(startDate) || !isDateStr(endDate)) throw new HttpError(400, 'Pick a start date and an end date');
  if (endDate < startDate) throw new HttpError(400, 'The end date cannot be before the start date');
  if (!reason || reason.trim().length < 5) throw new HttpError(400, 'Tell your teacher why you need leave (at least a few words)');
  const overlap = await Leave.exists({ student: req.user._id, status: { $ne: 'rejected' }, startDate: { $lte: endDate }, endDate: { $gte: startDate } });
  if (overlap) throw new HttpError(409, 'You already have a leave request covering some of these dates');
  const days = diffDays(startDate, endDate) + 1;
  const item = await Leave.create({ student: req.user._id, startDate, endDate, days, reason: reason.trim() });
  const [teachers, guardians, admins] = await Promise.all([classTeachersOf(req.user), guardiansOf(req.user._id), User.find({ role: 'admin', status: 'active' })]);
  const range = days === 1 ? startDate : `${startDate} to ${endDate}`;
  await notify([...teachers, ...admins], { title: `${req.user.name} requested ${days} day${days > 1 ? 's' : ''} of leave`, message: reason.trim(), type: 'leave', link: '/app/leaves' });
  await notify(guardians, { title: `${req.user.name} applied for leave`, message: `${range}: ${reason.trim()}`, type: 'leave', link: '/app/leaves', email: true, lines: [`Your child ${req.user.name} has applied for ${days} day${days > 1 ? 's' : ''} of leave (${range}).`, `Reason: ${reason.trim()}`, 'You will be emailed again when the class teacher decides.'] });
  res.status(201).json({ item });
}));

router.delete('/:id', allow('student'), ah(async (req, res) => {
  const leave = await Leave.findOne({ _id: req.params.id, student: req.user._id });
  if (!leave) throw new HttpError(404, 'Leave request not found');
  if (leave.status !== 'pending') throw new HttpError(409, 'Only pending requests can be withdrawn');
  await leave.deleteOne();
  res.json({ ok: true });
}));

// FR-4: the class teacher (or admin) accepts or declines; student and guardians are emailed
router.put('/:id/decision', allow('teacher', 'admin'), ah(async (req, res) => {
  const { status, note } = req.body || {};
  if (!['approved', 'rejected'].includes(status)) throw new HttpError(400, 'Choose approve or reject');
  const leave = await Leave.findById(req.params.id).populate('student');
  if (!leave) throw new HttpError(404, 'Leave request not found');
  if (leave.status !== 'pending') throw new HttpError(409, 'This request has already been decided');
  if (req.user.role === 'teacher') {
    const c = req.user.classTeacherOf || {};
    const s = leave.student;
    if (!(c.className === s.className && c.group === s.group && c.section === s.section)) throw new HttpError(403, 'Only the class teacher can decide this request');
  }
  Object.assign(leave, { status, note, decidedBy: req.user._id, decidedAt: new Date() });
  await leave.save();
  const s = leave.student;
  const verb = status === 'approved' ? 'approved' : 'declined';
  const range = leave.days === 1 ? leave.startDate : `${leave.startDate} to ${leave.endDate}`;
  const tail = note ? [`Note from ${req.user.name}: ${note}`] : [];
  await notify(s, { title: `Your leave request was ${verb}`, message: `${range}${note ? ` - ${note}` : ''}`, type: 'leave', link: '/app/leaves', email: true, lines: [`${req.user.name} has ${verb} your leave request for ${leave.days} day${leave.days > 1 ? 's' : ''} (${range}).`, ...tail] });
  await notify(await guardiansOf(s._id), { title: `${s.name}'s leave request was ${verb}`, message: range, type: 'leave', link: '/app/leaves', email: true, lines: [`Your child ${s.name} requested ${leave.days} day${leave.days > 1 ? 's' : ''} of leave (${range}).`, `Class teacher ${req.user.name} has ${verb} the request.`, ...tail] });
  logActivity(req.user, `Leave ${verb}`, `${s.name}, ${range}`);
  res.json({ item: leave });
}));

export default router;
