import { Router } from 'express';
import { Notification, Message, User, Course } from '../models/index.js';
import { ah, HttpError } from '../utils/http.js';
import { protect, allow } from '../middleware/auth.js';
import { courseFilterFor } from '../utils/access.js';
import { notify } from '../services/notify.js';

const router = Router();
router.use(protect);

// ---------- notifications ----------
router.get('/notifications', ah(async (req, res) => {
  const [items, unread] = await Promise.all([
    Notification.find({ user: req.user._id }).sort('-createdAt').limit(Number(req.query.limit) || 30).lean(),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.json({ items, unread });
}));
router.put('/notifications/read-all', ah(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ ok: true });
}));
router.put('/notifications/:id/read', ah(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true });
  res.json({ ok: true });
}));

// ---------- guardian <-> teacher messages ----------
async function contactsOf(user) {
  if (user.role === 'guardian') {
    const courses = await Course.find(await courseFilterFor(user)).select('teacher').lean();
    return User.find({ _id: { $in: [...new Set(courses.map((c) => String(c.teacher)))] }, status: 'active' }).select('name subject designation role');
  }
  const courses = await Course.find({ teacher: user._id }).lean();
  if (!courses.length) return [];
  const students = await User.find({ role: 'student', $or: courses.map((c) => ({ className: c.className, section: c.section, ...(c.group !== 'All' ? { group: c.group } : {}) })) }).select('_id');
  return User.find({ role: 'guardian', status: 'active', children: { $in: students.map((s) => s._id) } }).populate('children', 'name').select('name relation role children');
}

router.get('/messages/contacts', allow('guardian', 'teacher'), ah(async (req, res) => {
  res.json({ items: await contactsOf(req.user) });
}));

router.get('/messages/conversations', allow('guardian', 'teacher'), ah(async (req, res) => {
  const me = req.user._id;
  const msgs = await Message.find({ $or: [{ from: me }, { to: me }] }).sort('-createdAt').limit(300).lean();
  const map = new Map();
  for (const m of msgs) {
    const other = String(m.from) === String(me) ? String(m.to) : String(m.from);
    if (!map.has(other)) map.set(other, { other, last: { body: m.body, createdAt: m.createdAt, mine: String(m.from) === String(me) }, unread: 0 });
    if (String(m.to) === String(me) && !m.readAt) map.get(other).unread += 1;
  }
  const users = await User.find({ _id: { $in: [...map.keys()] } }).select('name role subject relation').lean();
  const uMap = Object.fromEntries(users.map((u) => [String(u._id), u]));
  res.json({ items: [...map.values()].map((c) => ({ user: uMap[c.other], last: c.last, unread: c.unread })).filter((c) => c.user) });
}));

router.get('/messages/with/:userId', allow('guardian', 'teacher'), ah(async (req, res) => {
  const me = req.user._id;
  const other = await User.findById(req.params.userId).select('name role subject relation');
  if (!other) throw new HttpError(404, 'User not found');
  await Message.updateMany({ from: other._id, to: me, readAt: null }, { readAt: new Date() });
  const items = await Message.find({ $or: [{ from: me, to: other._id }, { from: other._id, to: me }] }).sort('createdAt').limit(200).lean();
  res.json({ user: other, items });
}));

router.post('/messages', allow('guardian', 'teacher'), ah(async (req, res) => {
  const { to, body } = req.body || {};
  if (!body?.trim()) throw new HttpError(400, 'Write a message first');
  const allowed = (await contactsOf(req.user)).some((c) => String(c._id) === String(to));
  if (!allowed) throw new HttpError(403, 'You can only message teachers of your child, or guardians of your students');
  const item = await Message.create({ from: req.user._id, to, body: body.trim() });
  await notify(to, { title: `New message from ${req.user.name}`, message: body.trim().slice(0, 120), type: 'message', link: '/app/messages' });
  res.status(201).json({ item });
}));

export default router;
