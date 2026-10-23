import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { ah, HttpError, pick } from '../utils/http.js';
import { protect } from '../middleware/auth.js';
import { notify } from '../services/notify.js';
import { env } from '../config/env.js';

const router = Router();
const sign = (u) => jwt.sign({ id: u._id, role: u.role }, env.jwtSecret, { expiresIn: env.jwtExpires });
const withChildren = (u) => u.populate('children', 'name userId className group section roll');

// FR-1: users create an account; the college office approves it before first sign-in
router.post('/register', ah(async (req, res) => {
  const b = req.body || {};
  if (!['student', 'teacher', 'guardian'].includes(b.role)) throw new HttpError(400, 'Choose whether you are a student, teacher or guardian');
  if (!b.name?.trim() || !b.email?.trim() || !b.password) throw new HttpError(400, 'Name, email and password are required');
  if (String(b.password).length < 6) throw new HttpError(400, 'Use a password with at least 6 characters');
  const data = { ...pick(b, ['name', 'email', 'password', 'role', 'phone']), status: 'pending' };
  if (b.role === 'student') {
    if (!b.userId || !b.className || !b.group || !b.section) throw new HttpError(400, 'Student ID, class, group and section are required');
    Object.assign(data, pick(b, ['userId', 'className', 'group', 'section', 'roll']));
  } else if (b.role === 'teacher') {
    Object.assign(data, pick(b, ['userId', 'subject', 'designation']));
  } else {
    if (!b.childStudentId) throw new HttpError(400, "Enter your child's student ID so the college can link your account");
    Object.assign(data, pick(b, ['relation', 'childStudentId']));
  }
  const user = await User.create(data);
  const admins = await User.find({ role: 'admin', status: 'active' });
  await notify(admins, { title: 'New registration request', message: `${user.name} registered as a ${user.role}.`, type: 'system', link: '/app/users' });
  res.status(201).json({ message: 'Registration received. You can sign in as soon as the college office approves your account.' });
}));

router.post('/login', ah(async (req, res) => {
  const { identifier, password } = req.body || {};
  if (!identifier || !password) throw new HttpError(400, 'Enter your ID or email and your password');
  const id = String(identifier).trim();
  const user = await User.findOne({ $or: [{ email: id.toLowerCase() }, { userId: id }] }).select('+password');
  if (!user || !(await user.matchPassword(password))) throw new HttpError(401, 'That ID/email and password do not match');
  if (user.status === 'pending') throw new HttpError(403, 'Your registration is still waiting for approval from the college office');
  if (user.status !== 'active') throw new HttpError(403, `Your account is ${user.status}. Contact the college office for help.`);
  await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });
  await withChildren(user);
  res.json({ token: sign(user), user });
}));

router.get('/me', protect, ah(async (req, res) => {
  await withChildren(req.user);
  res.json({ user: req.user });
}));

router.put('/profile', protect, ah(async (req, res) => {
  const { name, phone } = req.body || {};
  if (name !== undefined && !String(name).trim()) throw new HttpError(400, 'Name cannot be empty');
  if (name !== undefined) req.user.name = String(name).trim();
  if (phone !== undefined) req.user.phone = phone;
  await req.user.save();
  await withChildren(req.user);
  res.json({ user: req.user });
}));

router.put('/password', protect, ah(async (req, res) => {
  const { current, next } = req.body || {};
  if (!next || String(next).length < 6) throw new HttpError(400, 'Use a new password with at least 6 characters');
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(current || ''))) throw new HttpError(400, 'Your current password is not correct');
  user.password = next;
  await user.save();
  res.json({ message: 'Password changed' });
}));

export default router;
