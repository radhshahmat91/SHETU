import { Attendance, Result } from '../models/index.js';
import { gradeFromPercent } from '../utils/grades.js';

export const brief = (c) => ({ _id: c._id, code: c.code, title: c.title, color: c.color, room: c.room });

export function summarize(records) {
  const c = { present: 0, absent: 0, late: 0, leave: 0 };
  records.forEach((r) => { c[r.status] += 1; });
  const counted = c.present + c.absent + c.late; // approved leave is excused, so it is not counted
  return { ...c, total: counted, percent: counted ? Math.round(((c.present + c.late) / counted) * 100) : null };
}

export async function attendanceFor(student, courses) {
  const records = await Attendance.find({ student: student._id }).lean();
  const byCourse = courses.map((course) => ({ course: brief(course), ...summarize(records.filter((r) => String(r.course) === String(course._id))) }));
  return { summary: summarize(records), byCourse, records };
}

export async function resultsFor(student, courses) {
  const rs = await Result.find({ student: student._id }).sort('createdAt').lean();
  const rows = courses.map((course) => {
    const exams = rs
      .filter((r) => String(r.course) === String(course._id))
      .map((r) => ({ _id: r._id, exam: r.exam, marks: r.marks, total: r.total, percent: Math.round((r.marks / r.total) * 100), feedback: r.feedback, date: r.createdAt }));
    const got = exams.reduce((s, e) => s + e.marks, 0);
    const max = exams.reduce((s, e) => s + e.total, 0);
    const percent = max ? Math.round((got / max) * 100) : null;
    return { course: brief(course), exams, percent, ...(percent === null ? { letter: '-', point: null } : gradeFromPercent(percent)) };
  });
  const graded = rows.filter((r) => r.point !== null);
  const gpa = graded.length ? Math.round((graded.reduce((s, r) => s + r.point, 0) / graded.length) * 100) / 100 : null;
  return { gpa, courses: rows };
}

const DAY_ORDER = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
export function scheduleItems(courses) {
  const items = [];
  courses.forEach((c) =>
    (c.schedule || []).forEach((s) =>
      items.push({ day: s.day, start: s.start, end: s.end, course: { ...brief(c), teacher: c.teacher?.name ? { _id: c.teacher._id, name: c.teacher.name } : undefined } })
    )
  );
  return items.sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day) || a.start.localeCompare(b.start));
}
