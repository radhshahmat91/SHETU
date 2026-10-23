import { Router } from 'express';
import { Course, Material, Assignment, Quiz, User } from '../models/index.js';
import { ah, HttpError, pick } from '../utils/http.js';
import { protect, allow } from '../middleware/auth.js';
import { courseFilterFor, loadCourse, studentsOfCourse } from '../utils/access.js';
import { scheduleItems } from '../services/insights.js';

const router = Router();
router.use(protect);
const FIELDS = ['code', 'title', 'className', 'group', 'section', 'teacher', 'room', 'color', 'schedule'];

router.get('/schedule', ah(async (req, res) => {
  const courses = await Course.find(await courseFilterFor(req.user, req.query.child)).populate('teacher', 'name').lean();
  res.json({ items: scheduleItems(courses) });
}));

router.get('/', ah(async (req, res) => {
  const courses = await Course.find(await courseFilterFor(req.user, req.query.child)).populate('teacher', 'name email phone designation').sort('className section code').lean();
  const items = await Promise.all(courses.map(async (c) => ({ ...c, studentCount: await User.countDocuments({ role: 'student', status: 'active', className: c.className, section: c.section, ...(c.group !== 'All' ? { group: c.group } : {}) }) })));
  res.json({ items });
}));

router.get('/:id', ah(async (req, res) => {
  const course = await loadCourse(req);
  await course.populate('teacher', 'name email phone designation');
  const [materials, assignments, quizzes, students] = await Promise.all([
    Material.countDocuments({ course: course._id }),
    Assignment.countDocuments({ course: course._id }),
    Quiz.countDocuments({ course: course._id }),
    studentsOfCourse(course).then((s) => s.length),
  ]);
  res.json({ course, counts: { materials, assignments, quizzes, students } });
}));

router.get('/:id/students', allow('teacher', 'admin'), ah(async (req, res) => {
  const course = await loadCourse(req);
  res.json({ items: await studentsOfCourse(course) });
}));

router.post('/', allow('admin'), ah(async (req, res) => {
  const teacher = await User.findOne({ _id: req.body.teacher, role: 'teacher' });
  if (!teacher) throw new HttpError(400, 'Choose a teacher for this course');
  res.status(201).json({ item: await Course.create(pick(req.body, FIELDS)) });
}));

router.put('/:id', allow('admin'), ah(async (req, res) => {
  const item = await Course.findByIdAndUpdate(req.params.id, pick(req.body, FIELDS), { new: true, runValidators: true });
  if (!item) throw new HttpError(404, 'Course not found');
  res.json({ item });
}));

router.delete('/:id', allow('admin'), ah(async (req, res) => {
  await Course.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

export default router;
