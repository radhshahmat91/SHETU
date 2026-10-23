# Setu: college student portal

Setu ("bridge" in Bangla) is a full-stack MERN web app built from the final-year design project
*An Efficient Student Portal Development for College Level Students of Bangladesh*.
It connects **students, teachers, guardians and the college office** in one place, and closes the
gaps the report found: no guardian access, no notification system, weak security.

**Stack:** React 18 + Vite + Tailwind CSS + Framer Motion + Recharts, Node.js + Express, MongoDB (Mongoose),
JWT sessions, bcrypt, SendGrid for email (the provider the report used), Multer for uploads.

## Quick start

```bash
# 1. MongoDB: either run one locally...
docker compose up -d
#    ...or create a free MongoDB Atlas cluster and put its URI in server/.env

# 2. Install everything (root, server, client)
npm run install:all

# 3. Load demo data (this wipes the database it points at)
npm run seed

# 4. Start the API (http://localhost:5050) and the web app (http://localhost:5173)
npm run dev
```

Open http://localhost:5173. Production: `npm run build && npm start` serves the built app and the API from one port.

### Demo accounts (created by `npm run seed`)

| Role | Sign in with | Password |
|---|---|---|
| Student (Ayaan Rahman) | `GFC-25-001` or `student@greenfield.edu.bd` | `Student@123` |
| Teacher (Farhana Karim, class teacher of 1st Year Science A) | `teacher@greenfield.edu.bd` | `Teacher@123` |
| Guardian (Rahela Rahman, Ayaan's mother) | `guardian@greenfield.edu.bd` | `Guardian@123` |
| Admin | `admin@greenfield.edu.bd` | `Admin@123` |

The seed also creates 14 students, 7 teachers, 14 courses with a weekly routine, four weeks of attendance,
results with feedback, assignments, quizzes, notices, fees, leave requests, messages, and two pending registrations
so you can try the approval flow.

## Configuration

`server/.env` (copied from `.env.example`):

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | **Change this** before deploying |
| `CLIENT_URL` | Allowed browser origin(s), comma separated |
| `SENDGRID_API_KEY`, `MAIL_FROM` | Real email delivery. Leave the key empty and every email is written to **Admin > System > Email log** instead |
| `COLLEGE_NAME` | Shown in emails (set `VITE_COLLEGE_NAME` in `client/.env` for the UI) |

## How the report maps to the build

| Report | Implementation |
|---|---|
| FR-1 User authentication | Self-registration, admin approval, JWT + bcrypt, role-based routes (`server/src/routes/auth.js`, `admin.js`) |
| FR-2 Network access | Responsive mobile-first UI, installable manifest, offline banner |
| FR-3 Notice triggers email/notification | `routes/notices.js` + `services/notify.js` + `services/mailer.js`: in-app bell, pop-up toast and email |
| FR-4 Leave application | Student applies, guardian emailed, class teacher (or admin) approves/declines, student and guardian emailed, approved days excused in attendance |
| FR-5 Guardian access | Guardian role linked to children by the admin; dashboard, results, attendance, fees, leave, messages |
| NF-1 Wrong data reported to admin | "Report a problem" in the account menu notifies admins; Admin > System shows health and activity |
| NF-2 / NF-3 Availability and recovery | `/api/health`, system page, `scripts/backup.sh` (mongodump), stateless API ready for a second instance |
| NF-4 Usability on phones | Tailwind responsive layout, slide-in navigation |
| NF-5 Requests survive a server outage | `client/src/lib/api.js` queues writes made while offline and replays them on reconnect |
| Selected feature list (benchmark) | Sign in, courses, upload materials, assignment submission, search materials, notices, leave, guardian access, grading, notifications, teacher evaluation, online quiz, attendance monitoring: all built |
| Future work: chat, e-library | Guardian-to-teacher messaging is included (asynchronous). E-library is left as the next step |

## What each role can do

- **Student:** dashboard (today's classes, performance chart, class teacher card), routine timetable, course materials and search, assignments with file/link/text submission, auto-marked quizzes, results with teacher feedback, attendance register, fees, leave applications, rate teachers.
- **Teacher:** upload materials, create assignments and grade submissions, build quizzes, take attendance (approved leave is pre-filled), publish marks with feedback, post notices, decide leave requests (class teachers), see anonymous student ratings, message guardians.
- **Guardian:** everything about their child in one place: results and feedback, attendance, assignments, fees (demo checkout), leave status, messages to teachers, notices. Several children are supported.
- **Admin:** approve registrations and link guardians, manage users and courses, publish notices to chosen audiences, monitor attendance and alert guardians, create fees, review teacher ratings, system health, email log and activity.

## Project layout

```
server/src
  config/        env + MongoDB connection
  models/        User, Course, Material, Assignment, Submission, Quiz, Attendance, Result, Leave, Fee, Notice, ...
  routes/        one file per area (controllers live next to their routes)
  services/      mailer (SendGrid), notify (in-app + email), insights (attendance/GPA maths)
  middleware/    JWT auth + role guard, error handler
  utils/         access rules, uploads, dates, HSC grading scale
  seed.js        demo data
client/src
  pages/         Landing, Login, Register, dashboards, course pages, admin pages
  components/    ui.jsx (shared primitives), layout, landing hero
  lib/           api (axios + offline queue), formatters, navigation
  context/       auth, theme (light/dark), active child for guardians
```

## Design language

Deep "Padma" green and marigold, drawn from the subject itself: a bridge for the logo and hero, a jamdani-style
lattice for surfaces, office rubber stamps for statuses (Approved, Paid, Late), a class register for attendance, a
report card for results and a wall timetable for the routine. Headings use Bricolage Grotesque; body text uses
Hind Siliguri so Bangla renders properly. Motion is used where it explains something (the bridge drawing itself, stamps
landing, rings and bars filling, tabs sliding) and respects `prefers-reduced-motion`. Light and dark themes share one set of colour tokens.

## Notes and next steps

- Built and statically checked (syntax, imports, every client API call matched to a server route). Run it locally and open an issue in your notes for anything that behaves differently on your machine.
- Uploaded files are stored on local disk (`server/uploads`) and served only to signed-in users. Use S3 or similar when deploying to several servers.
- The fee checkout is a **demo**; plug in bKash, Nagad or SSLCommerz for real payments.
- There are no automated tests yet. Good first additions: API tests for leave decisions and attendance maths.
