import mongoose from 'mongoose';
const { Schema } = mongoose;
const ref = (name, extra = {}) => ({ type: Schema.Types.ObjectId, ref: name, ...extra });

const attendanceSchema = new Schema(
  {
    course: ref('Course', { required: true }),
    student: ref('User', { required: true }),
    date: { type: String, required: true }, // YYYY-MM-DD
    status: { type: String, enum: ['present', 'absent', 'late', 'leave'], required: true },
    markedBy: ref('User'),
  },
  { timestamps: true }
);
attendanceSchema.index({ course: 1, student: 1, date: 1 }, { unique: true });
attendanceSchema.index({ student: 1 });

const resultSchema = new Schema(
  {
    course: ref('Course', { required: true }),
    student: ref('User', { required: true }),
    exam: { type: String, required: true, trim: true },
    marks: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 1 },
    feedback: String,
    createdBy: ref('User'),
  },
  { timestamps: true }
);
resultSchema.index({ course: 1, student: 1, exam: 1 }, { unique: true });

const evaluationSchema = new Schema(
  {
    course: ref('Course', { required: true }),
    teacher: ref('User', { required: true }),
    student: ref('User', { required: true }),
    ratings: { clarity: Number, engagement: Number, support: Number, punctuality: Number },
    comment: String,
  },
  { timestamps: true }
);
evaluationSchema.index({ course: 1, student: 1 }, { unique: true });

const leaveSchema = new Schema(
  {
    student: ref('User', { required: true }),
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    days: Number,
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    decidedBy: ref('User'),
    decidedAt: Date,
    note: String,
  },
  { timestamps: true }
);

const feeSchema = new Schema(
  {
    student: ref('User', { required: true, index: true }),
    title: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['due', 'paid'], default: 'due' },
    paidAt: Date,
    method: String,
    trxId: String,
    createdBy: ref('User'),
  },
  { timestamps: true }
);

export const Attendance = mongoose.model('Attendance', attendanceSchema);
export const Result = mongoose.model('Result', resultSchema);
export const Evaluation = mongoose.model('Evaluation', evaluationSchema);
export const Leave = mongoose.model('Leave', leaveSchema);
export const Fee = mongoose.model('Fee', feeSchema);
