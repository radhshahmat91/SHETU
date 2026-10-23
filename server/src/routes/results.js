import { Router } from 'express';
import { Result, Evaluation, Course, User } from '../models/index.js';
import { ah, HttpError } from '../utils/http.js';
import { protect, allow } from '../middleware/auth.js';
import { loadCourse, studentsOfCourse, viewedStudent, studentCourseFilter } from '../utils/access.js';
import { resultsFor } from '../services/insights.js';
import { notify, guardiansOf, logActivity } from '../services/notify.js';

const router = Router();
router.use(protect);

router.get('/results', allow('student', 'guardian', 'admin', 'teacher'), ah(async (req, res) => {
  const student = await viewedStudent(req);
  const courses = await Course.find(studentCourseFilter(student)).lean();
  res.json(await resultsFor(student, courses));
}));

router.get('/courses/:id/results', allow('teacher', 'admin'), ah(async (req, res) => {
  const course = await loadCourse(req);
  const [students, items] = await Promise.all([studentsOfCourse(course), Result.find({ course: course._id }).lean()]);
  const exams = [...new Set(items.map((r) => r.exam))];
  res.json({ students: students.map((s) => ({ _id: s._id, name: s.name, roll: s.roll, userId: s.userId })), exams, items });
}));

// teacher publishes marks + feedback for one exam; students and guardians are told right away
router.post('/courses/:id/results', allow('teacher', 'admin'), ah(async (req, res) => {
  const course = await loadCourse(req);
  const { exam, total, entries } = req.body || {};
  if (!exam?.trim()) throw new HttpError(400, 'Name the exam (for example "Mid Term")');
  const max = Number(total);
  if (!max || max < 1) throw new HttpError(400, 'Enter the total marks for this exam');
  const valid = new Map((await studentsOfCourse(course)).map((s) => [String(s._id), s]));
  const rows = (entries || []).filter((e) => valid.has(String(e.student)) && e.marks !== '' && e.marks !== null && e.marks !== undefined);
  for (const e of rows) if (Number.isNaN(Number(e.marks)) || Number(e.marks) < 0 || Number(e.marks) > max) throw new HttpError(400, `Marks for ${valid.get(String(e.student)).name} must be between 0 and ${max}`);
  if (!rows.length) throw new HttpError(400, 'Enter marks for at least one student');
  await Result.bulkWrite(rows.map((e) => ({ updateOne: { filter: { course: course._id, student: e.student, exam: exam.trim() }, update: { $set: { marks: Number(e.marks), total: max, feedback: e.feedback || '', createdBy: req.user._id } }, upsert: true } })));
  for (const e of rows) {
    const s = valid.get(String(e.student));
    const line = `${exam.trim()}: ${Number(e.marks)}/${max}`;
    await notify(s, { title: `Result published: ${course.title}`, message: `${line}${e.feedback ? ` - ${e.feedback}` : ''}`, type: 'grade', link: '/app/results' });
    await notify(await guardiansOf(s._id), { title: `${s.name}'s ${course.title} result`, message: line, type: 'grade', link: '/app/results', email: true, lines: [`${s.name} scored ${Number(e.marks)} out of ${max} in ${exam.trim()} (${course.title}).`, ...(e.feedback ? [`Teacher feedback: ${e.feedback}`] : [])] });
  }
  logActivity(req.user, 'Published results', `${course.code} ${exam.trim()}`);
  res.json({ ok: true, count: rows.length });
}));

// ---------- teacher evaluation (students rate teachers; teachers see anonymous averages) ----------
router.get('/evaluations/pending', allow('student'), ah(async (req, res) => {
  const courses = await Course.find(studentCourseFilter(req.user)).populate('teacher', 'name subject designation').lean();
  const done = new Set((await Evaluation.find({ student: req.user._id }).select('course').lean()).map((e) => String(e.course)));
  res.json({ items: courses.map((c) => ({ course: { _id: c._id, code: c.code, title: c.title, color: c.color }, teacher: c.teacher, done: done.has(String(c._id)) })) });
}));

router.post('/evaluations', allow('student'), ah(async (req, res) => {
  const { course: courseId, ratings = {}, comment } = req.body || {};
  const course = await Course.findOne({ $and: [{ _id: courseId }, studentCourseFilter(req.user)] });
  if (!course) throw new HttpError(404, 'You can only rate teachers of your own courses');
  const keys = ['clarity', 'engagement', 'support', 'punctuality'];
  for (const k of keys) if (!(ratings[k] >= 1 && ratings[k] <= 5)) throw new HttpError(400, 'Rate every area from 1 to 5 stars');
  if (await Evaluation.exists({ course: course._id, student: req.user._id })) throw new HttpError(409, 'You have already rated this course');
  const item = await Evaluation.create({ course: course._id, teacher: course.teacher, student: req.user._id, ratings: Object.fromEntries(keys.map((k) => [k, Number(ratings[k])])), comment: comment?.trim() });
  res.status(201).json({ item: { _id: item._id } });
}));

router.get('/evaluations/summary', allow('teacher', 'admin'), ah(async (req, res) => {
  const filter = req.user.role === 'teacher' ? { teacher: req.user._id } : {};
  const evals = await Evaluation.find(filter).populate('course', 'code title color').populate('teacher', 'name subject').lean();
  const groups = new Map();
  for (const e of evals) {
    const key = String(e.course?._id);
    if (!groups.has(key)) groups.set(key, { course: e.course, teacher: e.teacher, n: 0, sum: { clarity: 0, engagement: 0, support: 0, punctuality: 0 }, comments: [] });
    const g = groups.get(key);
    g.n += 1;
    for (const k of Object.keys(g.sum)) g.sum[k] += e.ratings?.[k] || 0;
    if (e.comment) g.comments.push(e.comment); // anonymous: no student id leaves the server
  }
  const items = [...groups.values()].map((g) => {
    const averages = Object.fromEntries(Object.entries(g.sum).map(([k, v]) => [k, Math.round((v / g.n) * 10) / 10]));
    const overall = Math.round((Object.values(averages).reduce((a, b) => a + b, 0) / 4) * 10) / 10;
    return { course: g.course, teacher: g.teacher, count: g.n, averages, overall, comments: g.comments.slice(0, 8) };
  });
  res.json({ items });
}));

export default router;
