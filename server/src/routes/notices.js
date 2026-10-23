import { Router } from 'express';
import { Notice, Course, User } from '../models/index.js';
import { ah, HttpError, esc } from '../utils/http.js';
import { protect, allow } from '../middleware/auth.js';
import { courseFilterFor, loadCourse, studentsOfCourse } from '../utils/access.js';
import { notify, guardiansOf, logActivity } from '../services/notify.js';

const router = Router();
router.use(protect);
const CATEGORIES = ['General', 'Academic', 'Exam', 'Event', 'Fees', 'Holiday'];
const PRIORITIES = ['normal', 'important', 'urgent'];

router.get('/', ah(async (req, res) => {
  const u = req.user;
  const { source, q } = req.query;
  const filter = {};
  if (u.role !== 'admin') {
    const courses = await Course.find(await courseFilterFor(u)).select('_id').lean();
    filter.$or = [{ source: 'admin', audience: u.role }, { source: 'teacher', course: { $in: courses.map((c) => c._id) } }];
  }
  if (['admin', 'teacher'].includes(source)) filter.source = source;
  if (q) filter.title = new RegExp(esc(q), 'i');
  const items = await Notice.find(filter).populate('postedBy', 'name role designation').populate('course', 'title code color').sort('-pinned -createdAt').limit(150).lean();
  res.json({ items });
}));

// FR-3: a new notice reaches the concerned people in-app and by email
router.post('/', allow('admin', 'teacher'), ah(async (req, res) => {
  const { title, body, category, priority, pinned, course: courseId, audience, emailAlert } = req.body;
  if (!title?.trim() || !body?.trim()) throw new HttpError(400, 'A notice needs a title and a message');
  const doc = { title: title.trim(), body: body.trim(), postedBy: req.user._id, category: CATEGORIES.includes(category) ? category : 'General', priority: PRIORITIES.includes(priority) ? priority : 'normal', pinned: !!pinned };
  let recipients = [];
  if (req.user.role === 'admin') {
    const roles = (audience || []).filter((r) => ['student', 'teacher', 'guardian'].includes(r));
    if (!roles.length) throw new HttpError(400, 'Choose who should receive this notice');
    Object.assign(doc, { source: 'admin', audience: roles });
    recipients = await User.find({ role: { $in: roles }, status: 'active' });
  } else {
    const course = await loadCourse({ params: { id: courseId }, query: {}, user: req.user });
    Object.assign(doc, { source: 'teacher', course: course._id });
    const students = await studentsOfCourse(course);
    recipients = [...students, ...(students.length ? await guardiansOf(students.map((s) => s._id)) : [])];
  }
  const item = await Notice.create(doc);
  const mail = emailAlert !== undefined ? !!emailAlert : doc.priority !== 'normal';
  await notify(recipients, { title: `${doc.priority === 'normal' ? 'Notice' : doc.priority === 'urgent' ? 'Urgent notice' : 'Important notice'}: ${doc.title}`, message: doc.body.slice(0, 160), type: 'notice', link: '/app/notices', email: mail, lines: [doc.title, doc.body, `Posted by ${req.user.name}`] });
  logActivity(req.user, 'Published a notice', doc.title);
  res.status(201).json({ item, recipients: recipients.length });
}));

const mine = async (req) => {
  const n = await Notice.findById(req.params.id);
  if (!n) throw new HttpError(404, 'Notice not found');
  if (req.user.role !== 'admin' && String(n.postedBy) !== String(req.user._id)) throw new HttpError(403, 'You can only change your own notices');
  return n;
};

router.put('/:id', allow('admin', 'teacher'), ah(async (req, res) => {
  const n = await mine(req);
  const { title, body, category, priority, pinned } = req.body;
  if (title) n.title = title;
  if (body) n.body = body;
  if (CATEGORIES.includes(category)) n.category = category;
  if (PRIORITIES.includes(priority)) n.priority = priority;
  if (pinned !== undefined) n.pinned = !!pinned;
  await n.save();
  res.json({ item: n });
}));

router.delete('/:id', allow('admin', 'teacher'), ah(async (req, res) => {
  await (await mine(req)).deleteOne();
  res.json({ ok: true });
}));

export default router;
