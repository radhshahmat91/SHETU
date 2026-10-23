import { Router } from 'express';
import crypto from 'crypto';
import { Fee, User } from '../models/index.js';
import { ah, HttpError, esc } from '../utils/http.js';
import { protect, allow } from '../middleware/auth.js';
import { viewedStudent } from '../utils/access.js';
import { notify, guardiansOf, logActivity } from '../services/notify.js';

const router = Router();
router.use(protect);

const totals = (items) => ({ due: items.filter((f) => f.status === 'due').reduce((s, f) => s + f.amount, 0), paid: items.filter((f) => f.status === 'paid').reduce((s, f) => s + f.amount, 0) });

router.get('/', ah(async (req, res) => {
  if (req.user.role === 'teacher') throw new HttpError(403, 'Fees are visible to students, guardians and the college office');
  if (req.user.role === 'admin' && !req.query.child) {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.q) {
      const ids = await User.find({ role: 'student', $or: [{ name: new RegExp(esc(req.query.q), 'i') }, { userId: new RegExp(esc(req.query.q), 'i') }] }).select('_id');
      filter.student = { $in: ids.map((s) => s._id) };
    }
    const items = await Fee.find(filter).populate('student', 'name userId className section roll').sort('-createdAt').limit(300).lean();
    const all = await Fee.find().select('amount status').lean();
    return res.json({ items, totals: totals(all) });
  }
  const student = await viewedStudent(req);
  const items = await Fee.find({ student: student._id }).sort('dueDate').lean();
  res.json({ items, totals: totals(items) });
}));

router.post('/', allow('admin'), ah(async (req, res) => {
  const { title, amount, dueDate, className, group, section } = req.body || {};
  if (!title?.trim() || !Number(amount) || !dueDate) throw new HttpError(400, 'A fee needs a title, an amount and a due date');
  const filter = { role: 'student', status: 'active', ...(className ? { className } : {}), ...(group ? { group } : {}), ...(section ? { section } : {}) };
  const students = await User.find(filter);
  if (!students.length) throw new HttpError(400, 'No students match that class, group and section');
  await Fee.insertMany(students.map((s) => ({ student: s._id, title: title.trim(), amount: Number(amount), dueDate: new Date(dueDate), createdBy: req.user._id })));
  const when = new Date(dueDate).toDateString();
  await notify(students, { title: `New fee: ${title.trim()}`, message: `BDT ${Number(amount)} due ${when}`, type: 'fee', link: '/app/fees' });
  await notify(await guardiansOf(students.map((s) => s._id)), { title: `New fee: ${title.trim()}`, message: `BDT ${Number(amount)} due ${when}`, type: 'fee', link: '/app/fees', email: true, lines: [`A new fee has been added for your child: ${title.trim()}.`, `Amount: BDT ${Number(amount)}. Due date: ${when}.`] });
  logActivity(req.user, 'Created a fee', `${title.trim()} for ${students.length} students`);
  res.status(201).json({ count: students.length });
}));

// Demo checkout: records the payment locally. Replace with a real gateway (bKash, Nagad, SSLCommerz) in production.
router.put('/:id/pay', allow('guardian', 'admin'), ah(async (req, res) => {
  const fee = await Fee.findById(req.params.id);
  if (!fee) throw new HttpError(404, 'Fee not found');
  if (req.user.role === 'guardian' && !(req.user.children || []).map(String).includes(String(fee.student))) throw new HttpError(403, 'This fee does not belong to your child');
  if (fee.status === 'paid') throw new HttpError(409, 'This fee is already paid');
  Object.assign(fee, { status: 'paid', paidAt: new Date(), method: req.body.method || 'Cash', trxId: `TRX${crypto.randomBytes(4).toString('hex').toUpperCase()}` });
  await fee.save();
  const student = await User.findById(fee.student);
  await notify([student, ...(await guardiansOf(student._id))], { title: `Payment received: ${fee.title}`, message: `BDT ${fee.amount} via ${fee.method} (${fee.trxId})`, type: 'fee', link: '/app/fees' });
  res.json({ item: fee });
}));

router.delete('/:id', allow('admin'), ah(async (req, res) => {
  await Fee.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

export default router;
