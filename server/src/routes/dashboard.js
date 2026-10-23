import { Router } from 'express';
import { User, Course, Notice, Assignment, Submission, Quiz, QuizAttempt, Fee, Leave, Attendance, Evaluation, ActivityLog } from '../models/index.js';
import { ah } from '../utils/http.js';
import { protect } from '../middleware/auth.js';
import { viewedStudent, studentCourseFilter } from '../utils/access.js';
import { attendanceFor, resultsFor, scheduleItems, brief } from '../services/insights.js';
import { weekday, todayStr, addDays } from '../utils/dates.js';

const router = Router();
router.use(protect);

async function studentDashboard(req) {
  const student = await viewedStudent(req);
  const courses = await Course.find(studentCourseFilter(student)).populate('teacher', 'name email phone').lean();
  const ids = courses.map((c) => c._id);
  const audience = req.user.role === 'guardian' ? 'guardian' : 'student';
  const now = new Date();
  const [att, results, notices, assignments, quizzes, fees, pendingLeaves, classTeacher] = await Promise.all([
    attendanceFor(student, courses),
    resultsFor(student, courses),
    Notice.find({ $or: [{ source: 'admin', audience }, { source: 'teacher', course: { $in: ids } }] }).populate('postedBy', 'name').populate('course', 'code title').sort('-createdAt').limit(12).lean(),
    Assignment.find({ course: { $in: ids } }).sort('dueDate').lean(),
    Quiz.find({ course: { $in: ids } }).select('title course closesAt').lean(),
    Fee.find({ student: student._id, status: 'due' }).lean(),
    Leave.countDocuments({ student: student._id, status: 'pending' }),
    User.findOne({ role: 'teacher', 'classTeacherOf.className': student.className, 'classTeacherOf.group': student.group, 'classTeacherOf.section': student.section }).select('name email phone designation subject').lean(),
  ]);
  const [subs, attempts] = await Promise.all([
    Submission.find({ student: student._id, assignment: { $in: assignments.map((a) => a._id) } }).select('assignment').lean(),
    QuizAttempt.find({ student: student._id, quiz: { $in: quizzes.map((q) => q._id) } }).select('quiz').lean(),
  ]);
  const done = new Set(subs.map((s) => String(s.assignment)));
  const tried = new Set(attempts.map((a) => String(a.quiz)));
  const byId = Object.fromEntries(courses.map((c) => [String(c._id), brief(c)]));
  const upcoming = [
    ...assignments.filter((a) => !done.has(String(a._id)) && a.dueDate >= now).map((a) => ({ type: 'assignment', id: a._id, title: a.title, course: byId[String(a.course)], due: a.dueDate })),
    ...quizzes.filter((q) => !tried.has(String(q._id)) && (!q.closesAt || q.closesAt >= now)).map((q) => ({ type: 'quiz', id: q._id, title: q.title, course: byId[String(q.course)], due: q.closesAt })),
  ].sort((a, b) => new Date(a.due || '2100-01-01') - new Date(b.due || '2100-01-01')).slice(0, 6);
  const feedback = results.courses
    .flatMap((r) => r.exams.filter((e) => e.feedback).map((e) => ({ course: r.course, exam: e.exam, text: e.feedback, percent: e.percent, date: e.date })))
    .sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
  const children = req.user.role === 'guardian' ? await User.find({ _id: { $in: req.user.children } }).select('name userId className group section roll').lean() : undefined;
  return {
    role: req.user.role,
    student: { _id: student._id, name: student.name, userId: student.userId, className: student.className, group: student.group, section: student.section, roll: student.roll },
    children,
    classTeacher,
    stats: { attendance: att.summary.percent, gpa: results.gpa, pendingAssignments: upcoming.filter((u) => u.type === 'assignment').length, feesDue: fees.reduce((s, f) => s + f.amount, 0), feesCount: fees.length, pendingLeaves },
    attendance: att.summary,
    performance: results.courses.filter((r) => r.percent !== null).map((r) => ({ code: r.course.code.split('-')[0], title: r.course.title, percent: r.percent, letter: r.letter })),
    today: scheduleItems(courses).filter((s) => s.day === weekday()),
    upcoming,
    notices: notices.slice(0, 5),
    importantNotice: notices.find((n) => n.priority !== 'normal') || null,
    feedback,
  };
}

async function teacherDashboard(u) {
  const courses = await Course.find({ teacher: u._id }).lean();
  const ids = courses.map((c) => c._id);
  const classes = [...new Map(courses.map((c) => [`${c.className}|${c.section}|${c.group}`, c])).values()];
  const counts = await Promise.all(classes.map((c) => User.countDocuments({ role: 'student', status: 'active', className: c.className, section: c.section, ...(c.group !== 'All' ? { group: c.group } : {}) })));
  const assignmentIds = (await Assignment.find({ course: { $in: ids } }).select('_id').lean()).map((a) => a._id);
  const waiting = { assignment: { $in: assignmentIds }, status: { $in: ['submitted', 'late'] } };
  const [toGrade, recent, evals, notices] = await Promise.all([
    Submission.countDocuments(waiting),
    Submission.find(waiting).sort('-updatedAt').limit(5).populate('student', 'name').populate('assignment', 'title course').lean(),
    Evaluation.find({ teacher: u._id }).select('ratings').lean(),
    Notice.find({ $or: [{ source: 'admin', audience: 'teacher' }, { postedBy: u._id }] }).populate('postedBy', 'name').sort('-createdAt').limit(4).lean(),
  ]);
  const isClassTeacher = !!u.classTeacherOf?.section;
  let pendingLeaves = [];
  if (isClassTeacher) {
    const kids = await User.find({ role: 'student', className: u.classTeacherOf.className, group: u.classTeacherOf.group, section: u.classTeacherOf.section }).select('_id');
    pendingLeaves = await Leave.find({ status: 'pending', student: { $in: kids.map((k) => k._id) } }).populate('student', 'name roll').sort('-createdAt').limit(5).lean();
  }
  const ratingVals = evals.flatMap((e) => Object.values(e.ratings || {}));
  return {
    role: 'teacher',
    isClassTeacher,
    classTeacherOf: u.classTeacherOf,
    stats: { courses: courses.length, students: counts.reduce((a, b) => a + b, 0), toGrade, pendingLeaves: pendingLeaves.length, rating: ratingVals.length ? Math.round((ratingVals.reduce((a, b) => a + b, 0) / ratingVals.length) * 10) / 10 : null, ratingCount: evals.length },
    today: scheduleItems(courses.map((c) => ({ ...c, teacher: { _id: u._id, name: u.name } }))).filter((s) => s.day === weekday()),
    courses: courses.map(brief),
    pendingLeaves,
    recent: recent.map((s) => ({ _id: s._id, student: s.student?.name, assignment: s.assignment?.title, course: s.assignment?.course, late: s.late, at: s.updatedAt })),
    notices,
  };
}

async function adminDashboard() {
  const since = addDays(todayStr(), -14);
  const [students, teachers, guardians, pendingUsers, pendingCount, courses, pendingLeaves, feeAgg, trend, leaveAgg, activity, notices] = await Promise.all([
    User.countDocuments({ role: 'student', status: 'active' }),
    User.countDocuments({ role: 'teacher', status: 'active' }),
    User.countDocuments({ role: 'guardian', status: 'active' }),
    User.find({ status: 'pending' }).sort('-createdAt').limit(5).select('name role email userId className section createdAt childStudentId').lean(),
    User.countDocuments({ status: 'pending' }),
    Course.countDocuments(),
    Leave.countDocuments({ status: 'pending' }),
    Fee.aggregate([{ $group: { _id: '$status', amount: { $sum: '$amount' } } }]),
    Attendance.aggregate([
      { $match: { date: { $gte: since }, status: { $ne: 'leave' } } },
      { $group: { _id: '$date', total: { $sum: 1 }, ok: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } } } },
      { $sort: { _id: 1 } },
    ]),
    Leave.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    ActivityLog.find().sort('-createdAt').limit(8).populate('user', 'name role').lean(),
    Notice.find({ source: 'admin' }).sort('-createdAt').limit(4).lean(),
  ]);
  const fee = Object.fromEntries(feeAgg.map((f) => [f._id, f.amount]));
  const leaveMap = Object.fromEntries(leaveAgg.map((l) => [l._id, l.n]));
  return {
    role: 'admin',
    stats: { students, teachers, guardians, pendingRegistrations: pendingCount, courses, pendingLeaves, feesDue: fee.due || 0, feesPaid: fee.paid || 0 },
    charts: {
      attendanceTrend: trend.map((t) => ({ date: t._id, percent: Math.round((t.ok / t.total) * 100) })),
      usersByRole: [{ name: 'Students', value: students }, { name: 'Teachers', value: teachers }, { name: 'Guardians', value: guardians }],
      leaves: [{ name: 'Pending', value: leaveMap.pending || 0 }, { name: 'Approved', value: leaveMap.approved || 0 }, { name: 'Declined', value: leaveMap.rejected || 0 }],
      fees: [{ name: 'Collected', value: fee.paid || 0 }, { name: 'Outstanding', value: fee.due || 0 }],
    },
    pendingUsers,
    activity,
    notices,
  };
}

router.get('/', ah(async (req, res) => {
  const { role } = req.user;
  if (role === 'student' || role === 'guardian') return res.json(await studentDashboard(req));
  if (role === 'teacher') return res.json(await teacherDashboard(req.user));
  res.json(await adminDashboard());
}));

export default router;
