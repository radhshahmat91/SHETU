import mongoose from 'mongoose';
const { Schema } = mongoose;
const ref = (name, extra = {}) => ({ type: Schema.Types.ObjectId, ref: name, ...extra });

const fileSchema = new Schema({ filename: String, originalName: String, mimetype: String, size: Number }, { _id: false });

const courseSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    className: { type: String, enum: ['1st Year', '2nd Year'], required: true },
    group: { type: String, enum: ['Science', 'Commerce', 'Humanities', 'All'], default: 'All' },
    section: { type: String, required: true },
    teacher: ref('User', { required: true }),
    room: String,
    color: { type: String, default: '#006a4e' },
    schedule: [{ day: { type: String, enum: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'] }, start: String, end: String, _id: false }],
  },
  { timestamps: true }
);

const materialSchema = new Schema(
  {
    course: ref('Course', { required: true, index: true }),
    title: { type: String, required: true, trim: true },
    description: String,
    kind: { type: String, enum: ['slide', 'document', 'link', 'video', 'note'], default: 'document' },
    url: String,
    file: fileSchema,
    uploadedBy: ref('User'),
  },
  { timestamps: true }
);

const assignmentSchema = new Schema(
  {
    course: ref('Course', { required: true, index: true }),
    title: { type: String, required: true, trim: true },
    description: String,
    dueDate: { type: Date, required: true },
    maxMarks: { type: Number, default: 10 },
    attachment: fileSchema,
    createdBy: ref('User'),
  },
  { timestamps: true }
);

const submissionSchema = new Schema(
  {
    assignment: ref('Assignment', { required: true, index: true }),
    student: ref('User', { required: true }),
    text: String,
    link: String,
    file: fileSchema,
    status: { type: String, enum: ['submitted', 'late', 'graded'], default: 'submitted' },
    late: Boolean,
    marks: Number,
    feedback: String,
    gradedAt: Date,
  },
  { timestamps: true }
);
submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

const quizSchema = new Schema(
  {
    course: ref('Course', { required: true, index: true }),
    title: { type: String, required: true, trim: true },
    description: String,
    durationMin: { type: Number, default: 10 },
    closesAt: Date,
    questions: [{ text: String, options: [String], correctIndex: Number, marks: { type: Number, default: 1 }, _id: false }],
    createdBy: ref('User'),
  },
  { timestamps: true }
);

const attemptSchema = new Schema(
  {
    quiz: ref('Quiz', { required: true, index: true }),
    student: ref('User', { required: true }),
    answers: [Number],
    score: Number,
    total: Number,
  },
  { timestamps: true }
);
attemptSchema.index({ quiz: 1, student: 1 }, { unique: true });

export const Course = mongoose.model('Course', courseSchema);
export const Material = mongoose.model('Material', materialSchema);
export const Assignment = mongoose.model('Assignment', assignmentSchema);
export const Submission = mongoose.model('Submission', submissionSchema);
export const Quiz = mongoose.model('Quiz', quizSchema);
export const QuizAttempt = mongoose.model('QuizAttempt', attemptSchema);
