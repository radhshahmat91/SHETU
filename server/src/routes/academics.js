import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { Course, Material, Assignment, Submission, Quiz, QuizAttempt, User } from '../models/index.js';
import { ah, HttpError, esc } from '../utils/http.js';
import { protect, allow } from '../middleware/auth.js';
import { upload, toFileDoc, UPLOAD_DIR } from '../utils/upload.js';
import { courseFilterFor, loadCourse, viewedStudent, studentsOfCourse } from '../utils/access.js';
import { notify, guardiansOf } from '../services/notify.js';
import { brief } from '../services/insights.js';

const router = Router();
router.use(protect);

// ---------- files (authenticated download) ----------
router.get('/files/:filename', ah(async (req, res) => {
  const full = path.join(UPLOAD_DIR, path.basename(req.params.filename));
  if (!fs.existsSync(full)) throw new HttpError(404, 'That file is no longer available');
  res.sendFile(full);
}));

const ownsOrAdmin = (user, course) => {
  if (user.role === 'admin') return true;
  return user.role === 'teacher' && String(course.teacher) === String(user._id);
};
const notifyCourse = async (course, payload, { guardians = false } = {}) => {
  const students = await studentsOfCourse(course);
  const targets = [...students];
  if (guardians && students.length) targets.push(...(await guardiansOf(students.map((s) => s._id))));
  await notify(targets, payload);
};

// ---------- materials ----------
router.get('/materials/search', ah(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const courses = await Course.find(await courseFilterFor(req.user, req.query.child)).lean();
  const filter = { course: { $in: courses.map((c) => c._id) } };
  if (q) filter.$or = [{ title: new RegExp(esc(q), 'i') }, { description: new RegExp(esc(q), 'i') }];
  const found = await Material.find(filter).sort('-createdAt').limit(80).populate('uploadedBy', 'name').lean();
  const byId = Object.fromEntries(courses.map((c) => [String(c._id), brief(c)]));
  res.json({ items: found.map((m) => ({ ...m, course: byId[String(m.course)] })) });
}));

router.get('/courses/:id/materials', ah(async (req, res) => {
  const course = await loadCourse(req);
  const items = await Material.find({ course: course._id }).sort('-createdAt').populate('uploadedBy', 'name').lean();
  res.json({ items });
}));

router.post('/courses/:id/materials', allow('teacher', 'admin'), upload.single('file'), ah(async (req, res) => {
  const course = await loadCourse(req);
  const { title, description, kind, url } = req.body;
  if (!title?.trim()) throw new HttpError(400, 'Give the material a title');
  if (!req.file && !url) throw new HttpError(400, 'Attach a file or paste a link');
  const item = await Material.create({ course: course._id, title: title.trim(), description, url: url || undefined, kind: kind || (url ? 'link' : 'document'), file: toFileDoc(req.file), uploadedBy: req.user._id });
  await notifyCourse(course, { title: `New material in ${course.title}`, message: item.title, type: 'material', link: `/app/courses/${course._id}` });
  res.status(201).json({ item });
}));

router.delete('/materials/:id', allow('teacher', 'admin'), ah(async (req, res) => {
  const m = await Material.findById(req.params.id);
  if (!m) throw new HttpError(404, 'Material not found');
  const course = await Course.findById(m.course);
  if (!ownsOrAdmin(req.user, course)) throw new HttpError(403, 'Only the course teacher can remove this');
  await m.deleteOne();
  res.json({ ok: true });
}));

// ---------- assignments ----------
const assignmentRows = async (assignments, student) => {
  const subs = student ? await Submission.find({ assignment: { $in: assignments.map((a) => a._id) }, student: student._id }).lean() : [];
  const map = Object.fromEntries(subs.map((s) => [String(s.assignment), s]));
  return assignments.map((a) => ({ ...a, submission: map[String(a._id)] || null }));
};

router.get('/assignments', allow('student', 'guardian'), ah(async (req, res) => {
  const student = await viewedStudent(req);
  const courses = await Course.find(await courseFilterFor(req.user, student._id)).lean();
  const list = await Assignment.find({ course: { $in: courses.map((c) => c._id) } }).sort('dueDate').lean();
  const byId = Object.fromEntries(courses.map((c) => [String(c._id), brief(c)]));
  const rows = await assignmentRows(list, student);
  res.json({ items: rows.map((a) => ({ ...a, course: byId[String(a.course)] })) });
}));

router.get('/courses/:id/assignments', ah(async (req, res) => {
  const course = await loadCourse(req);
  const list = await Assignment.find({ course: course._id }).sort('dueDate').lean();
  if (['student', 'guardian'].includes(req.user.role)) return res.json({ items: await assignmentRows(list, await viewedStudent(req)) });
  const counts = await Submission.aggregate([{ $match: { assignment: { $in: list.map((a) => a._id) } } }, { $group: { _id: '$assignment', n: { $sum: 1 }, graded: { $sum: { $cond: [{ $eq: ['$status', 'graded'] }, 1, 0] } } } }]);
  const map = Object.fromEntries(counts.map((c) => [String(c._id), c]));
  res.json({ items: list.map((a) => ({ ...a, submissionCount: map[String(a._id)]?.n || 0, gradedCount: map[String(a._id)]?.graded || 0 })) });
}));

router.post('/courses/:id/assignments', allow('teacher', 'admin'), upload.single('file'), ah(async (req, res) => {
  const course = await loadCourse(req);
  const { title, description, dueDate, maxMarks } = req.body;
  if (!title?.trim() || !dueDate) throw new HttpError(400, 'A title and a due date are required');
  const item = await Assignment.create({ course: course._id, title: title.trim(), description, dueDate: new Date(dueDate), maxMarks: Number(maxMarks) || 10, attachment: toFileDoc(req.file), createdBy: req.user._id });
  await notifyCourse(course, { title: `New assignment in ${course.title}`, message: `${item.title} is due ${item.dueDate.toDateString()}`, type: 'assignment', link: '/app/assignments' });
  res.status(201).json({ item });
}));

router.delete('/assignments/:id', allow('teacher', 'admin'), ah(async (req, res) => {
  const a = await Assignment.findById(req.params.id);
  if (!a) throw new HttpError(404, 'Assignment not found');
  if (!ownsOrAdmin(req.user, await Course.findById(a.course))) throw new HttpError(403, 'Only the course teacher can remove this');
  await Submission.deleteMany({ assignment: a._id });
  await a.deleteOne();
  res.json({ ok: true });
}));

router.post('/assignments/:id/submit', allow('student'), upload.single('file'), ah(async (req, res) => {
  const a = await Assignment.findById(req.params.id);
  if (!a) throw new HttpError(404, 'Assignment not found');
  const course = await Course.findById(a.course);
  if (!(await Course.exists({ $and: [{ _id: course._id }, await courseFilterFor(req.user)] }))) throw new HttpError(403, 'This assignment is not for your class');
  const { text, link } = req.body;
  if (!req.file && !text?.trim() && !link?.trim()) throw new HttpError(400, 'Add a file, a link or a written answer');
  const existing = await Submission.findOne({ assignment: a._id, student: req.user._id });
  if (existing?.status === 'graded') throw new HttpError(409, 'This submission has already been graded');
  const late = new Date() > a.dueDate;
  const data = { text, link, late, status: late ? 'late' : 'submitted', ...(req.file ? { file: toFileDoc(req.file) } : {}) };
  const item = existing ? Object.assign(existing, data) : new Submission({ assignment: a._id, student: req.user._id, ...data });
  await item.save();
  await notify(await User.findById(course.teacher), { title: `${req.user.name} submitted "${a.title}"`, message: late ? 'Submitted after the due date' : 'Submitted on time', type: 'assignment', link: `/app/courses/${course._id}` });
  res.status(201).json({ item });
}));

router.get('/assignments/:id/submissions', allow('teacher', 'admin'), ah(async (req, res) => {
  const a = await Assignment.findById(req.params.id).lean();
  if (!a) throw new HttpError(404, 'Assignment not found');
  const course = await Course.findById(a.course);
  if (!ownsOrAdmin(req.user, course)) throw new HttpError(403, 'Only the course teacher can see these');
  const [students, subs] = await Promise.all([studentsOfCourse(course), Submission.find({ assignment: a._id }).lean()]);
  const map = Object.fromEntries(subs.map((s) => [String(s.student), s]));
  res.json({ assignment: a, items: students.map((s) => ({ student: { _id: s._id, name: s.name, roll: s.roll, userId: s.userId }, submission: map[String(s._id)] || null })) });
}));

router.put('/submissions/:id/grade', allow('teacher', 'admin'), ah(async (req, res) => {
  const sub = await Submission.findById(req.params.id);
  if (!sub) throw new HttpError(404, 'Submission not found');
  const a = await Assignment.findById(sub.assignment);
  if (!ownsOrAdmin(req.user, await Course.findById(a.course))) throw new HttpError(403, 'Only the course teacher can grade this');
  const marks = Number(req.body.marks);
  if (Number.isNaN(marks) || marks < 0 || marks > a.maxMarks) throw new HttpError(400, `Marks must be between 0 and ${a.maxMarks}`);
  Object.assign(sub, { marks, feedback: req.body.feedback, status: 'graded', gradedAt: new Date() });
  await sub.save();
  await notify(await User.findById(sub.student), { title: `"${a.title}" was graded`, message: `You scored ${marks}/${a.maxMarks}`, type: 'grade', link: '/app/assignments' });
  res.json({ item: sub });
}));

// ---------- quizzes ----------
const quizRows = async (quizzes, student) => {
  const attempts = student ? await QuizAttempt.find({ quiz: { $in: quizzes.map((q) => q._id) }, student: student._id }).lean() : [];
  const map = Object.fromEntries(attempts.map((a) => [String(a.quiz), a]));
  return quizzes.map(({ questions, ...q }) => ({ ...q, questionCount: questions.length, totalMarks: questions.reduce((s, x) => s + (x.marks || 1), 0), attempt: map[String(q._id)] ? { score: map[String(q._id)].score, total: map[String(q._id)].total } : null }));
};

router.get('/quizzes', allow('student', 'guardian'), ah(async (req, res) => {
  const student = await viewedStudent(req);
  const courses = await Course.find(await courseFilterFor(req.user, student._id)).lean();
  const list = await Quiz.find({ course: { $in: courses.map((c) => c._id) } }).sort('-createdAt').lean();
  const byId = Object.fromEntries(courses.map((c) => [String(c._id), brief(c)]));
  res.json({ items: (await quizRows(list, student)).map((q) => ({ ...q, course: byId[String(q.course)] })) });
}));

router.get('/courses/:id/quizzes', ah(async (req, res) => {
  const course = await loadCourse(req);
  const list = await Quiz.find({ course: course._id }).sort('-createdAt').lean();
  const student = ['student', 'guardian'].includes(req.user.role) ? await viewedStudent(req) : null;
  const items = await quizRows(list, student);
  if (!student) {
    const counts = await QuizAttempt.aggregate([{ $match: { quiz: { $in: list.map((q) => q._id) } } }, { $group: { _id: '$quiz', n: { $sum: 1 } } }]);
    const map = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
    return res.json({ items: items.map((q) => ({ ...q, attemptCount: map[String(q._id)] || 0 })) });
  }
  res.json({ items });
}));

router.post('/courses/:id/quizzes', allow('teacher', 'admin'), ah(async (req, res) => {
  const course = await loadCourse(req);
  const { title, description, durationMin, closesAt, questions } = req.body;
  if (!title?.trim()) throw new HttpError(400, 'Give the quiz a title');
  if (!Array.isArray(questions) || !questions.length) throw new HttpError(400, 'Add at least one question');
  const qs = questions.map((q, i) => {
    const options = (q.options || []).map((o) => String(o).trim()).filter(Boolean);
    if (!q.text?.trim() || options.length < 2) throw new HttpError(400, `Question ${i + 1} needs text and at least two options`);
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= options.length) throw new HttpError(400, `Pick the correct answer for question ${i + 1}`);
    return { text: q.text.trim(), options, correctIndex: q.correctIndex, marks: Number(q.marks) || 1 };
  });
  const item = await Quiz.create({ course: course._id, title: title.trim(), description, durationMin: Number(durationMin) || 10, closesAt: closesAt ? new Date(closesAt) : undefined, questions: qs, createdBy: req.user._id });
  await notifyCourse(course, { title: `New quiz in ${course.title}`, message: item.title, type: 'quiz', link: `/app/quizzes/${item._id}` });
  res.status(201).json({ item });
}));

router.get('/quizzes/:id', ah(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id).lean();
  if (!quiz) throw new HttpError(404, 'Quiz not found');
  const course = await Course.findById(quiz.course);
  if (!(await Course.exists({ $and: [{ _id: course._id }, await courseFilterFor(req.user, req.query.child)] }))) throw new HttpError(403, 'This quiz is not for you');
  const base = { ...quiz, course: brief(course) };
  if (!['student', 'guardian'].includes(req.user.role)) return res.json({ quiz: base });
  const student = await viewedStudent(req);
  const attempt = await QuizAttempt.findOne({ quiz: quiz._id, student: student._id }).lean();
  const closed = quiz.closesAt && new Date() > quiz.closesAt;
  const reveal = !!attempt;
  base.questions = quiz.questions.map((q) => ({ text: q.text, options: q.options, marks: q.marks, ...(reveal ? { correctIndex: q.correctIndex } : {}) }));
  res.json({ quiz: base, attempt, canTake: req.user.role === 'student' && !attempt && !closed, closed: !!closed });
}));

router.post('/quizzes/:id/attempt', allow('student'), ah(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) throw new HttpError(404, 'Quiz not found');
  if (!(await Course.exists({ $and: [{ _id: quiz.course }, await courseFilterFor(req.user)] }))) throw new HttpError(403, 'This quiz is not for your class');
  if (quiz.closesAt && new Date() > quiz.closesAt) throw new HttpError(409, 'This quiz is closed');
  if (await QuizAttempt.exists({ quiz: quiz._id, student: req.user._id })) throw new HttpError(409, 'You have already taken this quiz');
  const answers = quiz.questions.map((_, i) => (Number.isInteger(req.body.answers?.[i]) ? req.body.answers[i] : -1));
  const score = quiz.questions.reduce((s, q, i) => s + (answers[i] === q.correctIndex ? q.marks : 0), 0);
  const total = quiz.questions.reduce((s, q) => s + q.marks, 0);
  const attempt = await QuizAttempt.create({ quiz: quiz._id, student: req.user._id, answers, score, total });
  res.status(201).json({ attempt, correct: quiz.questions.map((q) => q.correctIndex) });
}));

router.get('/quizzes/:id/attempts', allow('teacher', 'admin'), ah(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id).lean();
  if (!quiz) throw new HttpError(404, 'Quiz not found');
  const course = await Course.findById(quiz.course);
  if (!ownsOrAdmin(req.user, course)) throw new HttpError(403, 'Only the course teacher can see these');
  const [students, attempts] = await Promise.all([studentsOfCourse(course), QuizAttempt.find({ quiz: quiz._id }).lean()]);
  const map = Object.fromEntries(attempts.map((a) => [String(a.student), a]));
  res.json({ quiz: { _id: quiz._id, title: quiz.title }, items: students.map((s) => ({ student: { _id: s._id, name: s.name, roll: s.roll }, attempt: map[String(s._id)] || null })) });
}));

router.delete('/quizzes/:id', allow('teacher', 'admin'), ah(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) throw new HttpError(404, 'Quiz not found');
  if (!ownsOrAdmin(req.user, await Course.findById(quiz.course))) throw new HttpError(403, 'Only the course teacher can remove this');
  await QuizAttempt.deleteMany({ quiz: quiz._id });
  await quiz.deleteOne();
  res.json({ ok: true });
}));

export default router;
