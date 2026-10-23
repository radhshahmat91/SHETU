// Demo data for Greenfield College. Run: npm run seed  (wipes the database first)
import dns from "node:dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { UPLOAD_DIR } from './utils/upload.js';
import { todayStr, addDays, dayOf } from './utils/dates.js';
import * as M from './models/index.js';

const { User, Course, Material, Assignment, Submission, Quiz, QuizAttempt, Attendance, Result, Evaluation, Leave, Fee, Notice, Notification, Message, EmailLog, ActivityLog } = M;

// small deterministic PRNG so every seed run produces the same demo story
const rand = (() => { let a = 20261021; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
const between = (a, b) => a + rand() * (b - a);
const pickOne = (arr) => arr[Math.floor(rand() * arr.length)];
const daysAgo = (n) => new Date(Date.now() - n * 864e5);
const inDays = (n, hour = 23) => { const d = new Date(Date.now() + n * 864e5); d.setHours(hour, 0, 0, 0); return d; };
const today = todayStr();

const SUBJECTS = [
  { abbr: 'PHY', title: 'Physics', color: '#006a4e', wiki: 'Physics', group: 'Science' },
  { abbr: 'MAT', title: 'Higher Mathematics', color: '#d99100', wiki: 'Mathematics', group: 'Science' },
  { abbr: 'ENG', title: 'English', color: '#3b6fb6', wiki: 'English_language', group: 'All' },
  { abbr: 'CHE', title: 'Chemistry', color: '#c2410c', wiki: 'Chemistry', group: 'Science' },
  { abbr: 'BIO', title: 'Biology', color: '#2f9e44', wiki: 'Biology', group: 'Science' },
  { abbr: 'BAN', title: 'Bangla', color: '#a23b72', wiki: 'Bengali_language', group: 'All' },
  { abbr: 'ICT', title: 'ICT', color: '#0e7490', wiki: 'Information_and_communications_technology', group: 'All' },
];
const TEACHERS = [
  { name: 'Farhana Karim', email: 'teacher@greenfield.edu.bd', userId: 'T-1001', subject: 'Physics', designation: 'Senior Lecturer', classTeacherOf: { className: '1st Year', group: 'Science', section: 'A' } },
  { name: 'Imran Hossain', email: 'imran.hossain@greenfield.edu.bd', userId: 'T-1002', subject: 'Higher Mathematics', designation: 'Assistant Professor', classTeacherOf: { className: '1st Year', group: 'Science', section: 'B' } },
  { name: 'Shirin Sultana', email: 'shirin.sultana@greenfield.edu.bd', userId: 'T-1003', subject: 'English', designation: 'Lecturer' },
  { name: 'Mahbub Alam', email: 'mahbub.alam@greenfield.edu.bd', userId: 'T-1004', subject: 'Chemistry', designation: 'Senior Lecturer' },
  { name: 'Tasnim Ara', email: 'tasnim.ara@greenfield.edu.bd', userId: 'T-1005', subject: 'Biology', designation: 'Lecturer' },
  { name: 'Kamal Uddin', email: 'kamal.uddin@greenfield.edu.bd', userId: 'T-1006', subject: 'Bangla', designation: 'Assistant Professor' },
  { name: 'Rezaul Karim', email: 'rezaul.karim@greenfield.edu.bd', userId: 'T-1007', subject: 'ICT', designation: 'Lecturer' },
];
// [name, section, ability, absence probability]
const STUDENTS = [
  ['Ayaan Rahman', 'A', 0.82, 0.07], ['Nusrat Jahan', 'A', 0.9, 0.04], ['Tahmid Hasan', 'A', 0.6, 0.34], ['Samiha Akter', 'A', 0.74, 0.08],
  ['Rafiul Islam', 'A', 0.67, 0.1], ['Mehjabin Chowdhury', 'A', 0.86, 0.05], ['Arif Hossain', 'A', 0.55, 0.14], ['Tanvir Ahmed', 'A', 0.71, 0.09],
  ['Sadia Afrin', 'B', 0.88, 0.05], ['Fahim Reza', 'B', 0.69, 0.1], ['Nabila Sultana', 'B', 0.78, 0.06], ['Shakib Mahmud', 'B', 0.63, 0.12],
  ['Anika Tabassum', 'B', 0.84, 0.04], ['Zahid Hasan', 'B', 0.58, 0.18],
];
const GUARDIANS = [
  ['Rahela Rahman', 'Mother'], ['Mizanur Islam', 'Father'], ['Rubina Hasan', 'Mother'], ['Abdul Karim Akter', 'Father'], ['Shahidul Islam', 'Father'], ['Parveen Chowdhury', 'Mother'], ['Mostafa Hossain', 'Father'],
  ['Salma Ahmed', 'Mother'], ['Nasrin Afrin', 'Mother'], ['Jahangir Reza', 'Father'], ['Rokeya Sultana', 'Mother'], ['Habibur Mahmud', 'Father'], ['Shirin Tabassum', 'Mother'], ['Anwar Hasan', 'Father'],
];
const PERIODS = [['09:00', '09:45'], ['09:50', '10:35'], ['10:40', '11:25'], ['11:45', '12:30'], ['12:35', '13:20']];
const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
const slotsFor = (i, offset) => [0, 1, 2].map((k) => { const s = (i * 3 + k + offset) % 25; return { day: WEEK[Math.floor(s / 5)], start: PERIODS[s % 5][0], end: PERIODS[s % 5][1] }; });

const QUIZ_BANK = {
  PHY: ['Motion and force: quick check', [
    ['Which quantity has both magnitude and direction?', ['Speed', 'Distance', 'Velocity', 'Mass'], 2],
    ['The SI unit of force is the', ['Joule', 'Newton', 'Watt', 'Pascal'], 1],
    ['A body moving at constant velocity has', ['Zero acceleration', 'Increasing speed', 'Constant acceleration', 'Changing direction'], 0],
    ['Which law is written as F = ma?', ["Newton's first law", "Newton's second law", "Newton's third law", 'Law of gravitation'], 1],
  ]],
  MAT: ['Calculus warm-up', [
    ['The derivative of x squared is', ['x', '2x', 'x squared', '2'], 1],
    ['The value of sin 90 degrees is', ['0', '1/2', '1', 'root 3 over 2'], 2],
    ['The roots of x^2 - 5x + 6 = 0 are', ['2 and 3', '1 and 6', '-2 and -3', '5 and 1'], 0],
    ['log base 10 of 1000 equals', ['1', '2', '3', '10'], 2],
  ]],
  ICT: ['Computer basics quiz', [
    ['Which of these is an input device?', ['Monitor', 'Keyboard', 'Printer', 'Speaker'], 1],
    ['Binary 1010 equals decimal', ['8', '9', '10', '12'], 2],
    ['HTML stands for', ['HyperText Markup Language', 'High Text Machine Language', 'Hyperlink Text Mode Language', 'Home Tool Markup Language'], 0],
    ['Which logic gate outputs 1 only when both inputs are 1?', ['OR', 'AND', 'NOT', 'XOR'], 1],
  ]],
};
const FEEDBACK = [
  [85, 'Excellent work. Keep this level of consistency.'],
  [70, 'Good understanding. Revise the numerical problems once more.'],
  [55, 'Fair attempt. Practise past questions and show full working.'],
  [0, 'This needs attention. Please meet me during consulting hour.'],
];

const writeNote = (title, lines) => {
  const filename = crypto.randomBytes(14).toString('hex') + '.txt';
  const body = lines.join('\n');
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), body);
  return { filename, originalName: `${title}.txt`, mimetype: 'text/plain', size: Buffer.byteLength(body) };
};

async function main() {
  await connectDB();
  console.log('Clearing old data...');
  await Promise.all(Object.values(M).filter((m) => m.deleteMany).map((m) => m.deleteMany({})));
  fs.readdirSync(UPLOAD_DIR).filter((f) => f !== '.gitkeep').forEach((f) => fs.rmSync(path.join(UPLOAD_DIR, f), { force: true }));

  const admin = await User.create({ name: 'Portal Administrator', email: 'admin@greenfield.edu.bd', userId: 'ADMIN-01', phone: '01700-000000', role: 'admin', status: 'active', password: 'Admin@123' });
  const teachers = [];
  for (const [i, t] of TEACHERS.entries()) teachers.push(await User.create({ ...t, phone: `01711-1001${String(i + 1).padStart(2, '0')}`, role: 'teacher', status: 'active', password: 'Teacher@123' }));

  const students = [];
  const guardians = [];
  for (const [i, [name, section, ability, absent]] of STUDENTS.entries()) {
    const demo = i === 0;
    const s = await User.create({ name, email: demo ? 'student@greenfield.edu.bd' : `${name.toLowerCase().replace(/\s+/g, '.')}@students.greenfield.edu.bd`, userId: `GFC-25-${String(i + 1).padStart(3, '0')}`, phone: `01811-2000${String(i + 1).padStart(2, '0')}`, role: 'student', status: 'active', password: 'Student@123', className: '1st Year', group: 'Science', section, roll: i < 8 ? i + 1 : i - 7 });
    s.ability = ability; s.absentRate = absent;
    students.push(s);
    const [gName, relation] = GUARDIANS[i];
    guardians.push(await User.create({ name: gName, relation, email: demo ? 'guardian@greenfield.edu.bd' : `guardian${String(i + 1).padStart(2, '0')}@greenfield.edu.bd`, phone: `01911-3000${String(i + 1).padStart(2, '0')}`, role: 'guardian', status: 'active', password: 'Guardian@123', children: [s._id] }));
  }
  // two pending registrations for the admin approval demo
  await User.create({ name: 'Mahin Chowdhury', email: 'mahin.chowdhury@students.greenfield.edu.bd', userId: 'GFC-25-015', role: 'student', status: 'pending', password: 'Student@123', className: '1st Year', group: 'Science', section: 'B', roll: 7, phone: '01811-200015' });
  await User.create({ name: 'Selina Chowdhury', email: 'selina.chowdhury@greenfield.edu.bd', role: 'guardian', relation: 'Mother', status: 'pending', password: 'Guardian@123', childStudentId: 'GFC-25-015', phone: '01911-300015' });

  // ---- courses (7 subjects x 2 sections) ----
  const courses = [];
  for (const [si, section] of ['A', 'B'].entries()) {
    for (const [i, sub] of SUBJECTS.entries()) {
      courses.push(await Course.create({ code: `${sub.abbr}-1${section}`, title: sub.title, className: '1st Year', group: sub.group, section, teacher: teachers[i]._id, room: `Room 30${si + 1}`, color: sub.color, schedule: slotsFor(i, si * 8) }));
    }
  }
  courses.forEach((c) => { c.sub = SUBJECTS.find((s) => c.code.startsWith(s.abbr)); c.roster = students.filter((s) => s.section === c.section); });

  // ---- materials, assignments, submissions, quizzes ----
  for (const c of courses) {
    const t = teachers[SUBJECTS.indexOf(c.sub)];
    await Material.create({ course: c._id, title: `${c.title}: Chapter 1 lecture notes`, description: 'Key definitions, worked examples and practice questions.', kind: 'note', file: writeNote(`${c.title} - Chapter 1 notes`, [`${c.title} (${c.code})`, 'Chapter 1: Foundations', '', '1. Read the definitions on pages 1-6 of the textbook.', '2. Work through the solved examples before the next class.', '3. Bring your questions to consulting hour.']), uploadedBy: t._id, createdAt: daysAgo(14) });
    await Material.create({ course: c._id, title: `${c.title}: further reading`, description: 'A good overview to read before the next lecture.', kind: 'link', url: `https://en.wikipedia.org/wiki/${c.sub.wiki}`, uploadedBy: t._id, createdAt: daysAgo(6) });
    const a1 = await Assignment.create({ course: c._id, title: 'Practice set 1', description: 'Solve all questions in your notebook and upload a clear photo or PDF.', dueDate: inDays(-5), maxMarks: 10, createdBy: t._id, createdAt: daysAgo(12) });
    const a2 = await Assignment.create({ course: c._id, title: 'Chapter 2 worksheet', description: 'Short answers and one problem from the end-of-chapter exercise.', dueDate: inDays(Math.floor(between(2, 9))), maxMarks: 15, createdBy: t._id, createdAt: daysAgo(2) });
    for (const s of c.roster) {
      if (rand() < 0.92) {
        const marks = Math.round(a1.maxMarks * Math.min(1, Math.max(0.3, s.ability + between(-0.12, 0.1))));
        await Submission.create({ assignment: a1._id, student: s._id, text: 'Solved all questions. Working is in the attached notebook photo.', status: 'graded', late: false, marks, feedback: marks >= 8 ? 'Neat and accurate.' : 'Check the units in questions 3 and 4.', gradedAt: daysAgo(3) });
      }
      if (s.userId !== 'GFC-25-001' && rand() < 0.25) await Submission.create({ assignment: a2._id, student: s._id, text: 'Done. Please review.', status: 'submitted', late: false });
    }
    const bank = QUIZ_BANK[c.sub.abbr];
    if (bank) {
      const quiz = await Quiz.create({ course: c._id, title: bank[0], description: 'Four multiple-choice questions. One attempt only.', durationMin: 5, closesAt: inDays(10), createdBy: t._id, questions: bank[1].map(([text, options, correctIndex]) => ({ text, options, correctIndex, marks: 1 })) });
      for (const s of c.roster.filter((x) => x.userId !== 'GFC-25-001' && rand() < 0.5)) {
        const answers = quiz.questions.map((q) => (rand() < s.ability ? q.correctIndex : (q.correctIndex + 1) % 4));
        await QuizAttempt.create({ quiz: quiz._id, student: s._id, answers, score: answers.filter((a, i) => a === quiz.questions[i].correctIndex).length, total: 4 });
      }
    }
  }

  // ---- leave applications (Ayaan: one approved, one pending) ----
  const [ayaan, nusrat, , , , , , , , fahim] = students;
  const leaveStart = addDays(today, -12); const leaveEnd = addDays(today, -11);
  await Leave.create({ student: ayaan._id, startDate: leaveStart, endDate: leaveEnd, days: 2, reason: 'Sessional fever. The doctor advised two days of rest.', status: 'approved', decidedBy: teachers[0]._id, decidedAt: daysAgo(12), note: 'Get well soon. Please collect the notes from the portal.', createdAt: daysAgo(13) });
  await Leave.create({ student: ayaan._id, startDate: addDays(today, 3), endDate: addDays(today, 4), days: 2, reason: 'Attending a family wedding in Chattogram.' });
  await Leave.create({ student: nusrat._id, startDate: addDays(today, -4), endDate: addDays(today, -4), days: 1, reason: 'Want to attend a cousin\'s birthday party.', status: 'rejected', decidedBy: teachers[0]._id, decidedAt: daysAgo(5), note: 'Half-yearly preparation is underway. Please avoid avoidable absence.', createdAt: daysAgo(6) });
  await Leave.create({ student: fahim._id, startDate: addDays(today, 5), endDate: addDays(today, 5), days: 1, reason: 'Passport office appointment with my father.' });

  // ---- attendance (last four weeks, every class day) ----
  const att = [];
  for (let back = 28; back >= 1; back--) {
    const date = addDays(today, -back);
    const day = dayOf(date);
    for (const c of courses) {
      if (!c.schedule.some((s) => s.day === day)) continue;
      const t = teachers[SUBJECTS.indexOf(c.sub)];
      for (const s of c.roster) {
        let status = rand() < s.absentRate ? 'absent' : rand() < 0.04 ? 'late' : 'present';
        if (s._id.equals(ayaan._id) && date >= leaveStart && date <= leaveEnd) status = 'leave';
        att.push({ course: c._id, student: s._id, date, status, markedBy: t._id });
      }
    }
  }
  await Attendance.insertMany(att);

  // ---- results with teacher feedback ----
  const exams = [['Class Test 1', 20], ['Class Test 2', 20], ['Mid Term', 50]];
  const results = [];
  for (const c of courses) {
    const t = teachers[SUBJECTS.indexOf(c.sub)];
    for (const s of c.roster) {
      for (const [exam, total] of exams) {
        const marks = Math.round(total * Math.min(1, Math.max(0.2, s.ability + between(-0.14, 0.1))));
        const pct = (marks / total) * 100;
        const feedback = exam === 'Mid Term' || rand() < 0.3 ? FEEDBACK.find(([min]) => pct >= min)[1] : '';
        results.push({ course: c._id, student: s._id, exam, marks, total, feedback, createdBy: t._id });
      }
    }
  }
  await Result.insertMany(results);

  // ---- teacher evaluations (anonymous) ----
  const comments = ['Explains difficult topics patiently.', 'More worked examples would help.', 'Always available after class.', 'Lessons start on time and stay focused.'];
  const evals = [];
  for (const c of courses) {
    for (const s of c.roster.slice(0, 5)) evals.push({ course: c._id, teacher: c.teacher, student: s._id, ratings: { clarity: Math.round(between(3, 5)), engagement: Math.round(between(3, 5)), support: Math.round(between(3, 5)), punctuality: Math.round(between(4, 5)) }, comment: rand() < 0.6 ? pickOne(comments) : '' });
  }
  await Evaluation.insertMany(evals);

  // ---- fees (BDT) ----
  const fees = [];
  for (const s of students) {
    const paid = (title, amount, ago) => ({ student: s._id, title, amount, dueDate: inDays(-ago), status: 'paid', paidAt: daysAgo(ago + 2), method: pickOne(['bKash', 'Nagad', 'Card']), trxId: `TRX${crypto.randomBytes(4).toString('hex').toUpperCase()}`, createdBy: admin._id });
    fees.push(paid('Monthly tuition (September)', 1500, 20));
    if (rand() < 0.4) fees.push(paid('Monthly tuition (October)', 1500, 1));
    else fees.push({ student: s._id, title: 'Monthly tuition (October)', amount: 1500, dueDate: inDays(8), createdBy: admin._id });
    fees.push({ student: s._id, title: 'Half-yearly exam fee', amount: 800, dueDate: inDays(22), createdBy: admin._id });
  }
  await Fee.insertMany(fees);

  // ---- notices ----
  const allRoles = ['student', 'teacher', 'guardian'];
  const N = (o) => Notice.create({ source: 'admin', postedBy: admin._id, ...o });
  await N({ title: 'Weather advisory: classes start at 11:00 am tomorrow', body: 'Because of the forecast heavy rain, tomorrow\'s classes will begin at 11:00 am. Morning periods are merged. Please travel safely.', audience: allRoles, priority: 'urgent', category: 'General', pinned: true, createdAt: daysAgo(0) });
  await N({ title: 'Half-yearly examination routine published', body: 'The half-yearly examination routine for 1st Year is now available at the college office. Exams begin in three weeks. Students must carry their admit card on every exam day.', audience: allRoles, priority: 'important', category: 'Exam', pinned: true, createdAt: daysAgo(1) });
  await N({ title: 'October tuition fee: pay before the due date', body: 'Monthly tuition for October can be paid from the Fees page by guardians. Late payments may carry a small fine.', audience: ['student', 'guardian'], category: 'Fees', createdAt: daysAgo(2) });
  await N({ title: 'Parent-teacher meeting this Thursday', body: 'Guardians are invited to meet class teachers this Thursday from 3:00 pm to 5:00 pm. Bring your child\'s progress report.', audience: ['guardian', 'teacher'], category: 'Event', createdAt: daysAgo(3) });
  await N({ title: 'Annual sports week: registration is open', body: 'Register with your class teacher for athletics, cricket, football and indoor games. Registration closes next Wednesday.', audience: ['student'], category: 'Event', createdAt: daysAgo(4) });
  await N({ title: 'Staff meeting on Wednesday', body: 'All teachers are requested to attend the academic council meeting in the conference room at 1:30 pm.', audience: ['teacher'], category: 'General', createdAt: daysAgo(5) });
  await N({ title: 'College closed for the public holiday', body: 'The college will remain closed on the upcoming public holiday. Classes resume on the next working day.', audience: allRoles, category: 'Holiday', createdAt: daysAgo(8) });
  const physA = courses.find((c) => c.code === 'PHY-1A');
  const bioA = courses.find((c) => c.code === 'BIO-1A');
  await Notice.create({ source: 'teacher', postedBy: teachers[0]._id, course: physA._id, title: 'Bring a scientific calculator tomorrow', body: 'We will hold a short class test on motion and force. Calculators are required; phones are not allowed.', priority: 'important', category: 'Exam', createdAt: daysAgo(1) });
  await Notice.create({ source: 'teacher', postedBy: teachers[4]._id, course: bioA._id, title: 'Please bring your biology kit for lab work', body: 'Lab work starts next class. Bring your lab coat and dissection kit.', category: 'Academic', createdAt: daysAgo(2) });

  // ---- guardian <-> teacher conversation ----
  const rahela = guardians[0];
  const msgs = [
    [rahela, teachers[0], 'Assalamu alaikum ma\'am. Ayaan missed two classes because of fever. Could you tell me how he can catch up?', 12, true],
    [teachers[0], rahela, 'Walaikum assalam. I have put the chapter notes under Physics materials. He is welcome to meet me in consulting hour on Wednesday.', 12, true],
    [rahela, teachers[0], 'Thank you, ma\'am. We will make sure he comes.', 11, false],
  ];
  for (const [from, to, body, ago, read] of msgs) await Message.create({ from: from._id, to: to._id, body, readAt: read ? daysAgo(ago) : undefined, createdAt: daysAgo(ago) });

  // ---- a few notifications and activity for the demo accounts ----
  const note = (user, title, message, type, link, ago = 0) => Notification.create({ user: user._id, title, message, type, link, read: false, createdAt: daysAgo(ago) });
  await note(ayaan, 'New assignment in Physics', 'Chapter 2 worksheet is due soon', 'assignment', '/app/assignments', 0);
  await note(ayaan, 'Important notice: Half-yearly examination routine published', 'The routine is available at the college office.', 'notice', '/app/notices', 1);
  await note(ayaan, 'Result published: Physics', 'Mid Term: graded with feedback', 'grade', '/app/results', 2);
  await note(rahela, 'Ayaan applied for leave', 'Attending a family wedding in Chattogram.', 'leave', '/app/leaves', 0);
  await note(rahela, 'New fee: Half-yearly exam fee', 'BDT 800 is due soon', 'fee', '/app/fees', 1);
  await note(teachers[0], 'Ayaan Rahman requested 2 days of leave', 'Attending a family wedding in Chattogram.', 'leave', '/app/leaves', 0);
  await note(teachers[0], 'New message from Rahela Rahman', 'Thank you, ma\'am. We will make sure he comes.', 'message', '/app/messages', 1);
  await note(admin, 'New registration request', 'Mahin Chowdhury registered as a student.', 'system', '/app/users', 0);
  await note(admin, 'New registration request', 'Selina Chowdhury registered as a guardian.', 'system', '/app/users', 0);
  await ActivityLog.insertMany([
    { user: admin._id, action: 'Published a notice', detail: 'Half-yearly examination routine published', createdAt: daysAgo(1) },
    { user: teachers[0]._id, action: 'Leave approved', detail: 'Ayaan Rahman', createdAt: daysAgo(12) },
    { user: teachers[0]._id, action: 'Published results', detail: 'PHY-1A Mid Term', createdAt: daysAgo(6) },
    { user: admin._id, action: 'Created a fee', detail: 'Half-yearly exam fee for 14 students', createdAt: daysAgo(3) },
  ]);

  console.log(`\nSeeded: ${students.length} students, ${guardians.length} guardians, ${teachers.length} teachers, ${courses.length} courses, ${att.length} attendance records.\n`);
  console.log('Demo sign-ins (ID or email / password)');
  console.log('  Admin    admin@greenfield.edu.bd     / Admin@123');
  console.log('  Teacher  teacher@greenfield.edu.bd   / Teacher@123   (class teacher of 1st Year Science A)');
  console.log('  Student  GFC-25-001 or student@greenfield.edu.bd / Student@123');
  console.log('  Guardian guardian@greenfield.edu.bd  / Guardian@123  (parent of Ayaan Rahman)\n');
}

main().then(() => mongoose.disconnect()).catch((err) => { console.error(err); mongoose.disconnect(); process.exit(1); });
