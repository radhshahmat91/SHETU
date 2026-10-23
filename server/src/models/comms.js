import mongoose from 'mongoose';
const { Schema } = mongoose;
const ref = (name, extra = {}) => ({ type: Schema.Types.ObjectId, ref: name, ...extra });

const noticeSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    source: { type: String, enum: ['admin', 'teacher'], required: true },
    audience: [{ type: String, enum: ['student', 'teacher', 'guardian'] }], // admin notices
    course: ref('Course'), // teacher notices
    category: { type: String, enum: ['General', 'Academic', 'Exam', 'Event', 'Fees', 'Holiday'], default: 'General' },
    priority: { type: String, enum: ['normal', 'important', 'urgent'], default: 'normal' },
    pinned: { type: Boolean, default: false },
    postedBy: ref('User', { required: true }),
  },
  { timestamps: true }
);

const notificationSchema = new Schema(
  {
    user: ref('User', { required: true }),
    title: { type: String, required: true },
    message: String,
    type: { type: String, default: 'system' },
    link: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);
notificationSchema.index({ user: 1, createdAt: -1 });

const messageSchema = new Schema(
  {
    from: ref('User', { required: true }),
    to: ref('User', { required: true }),
    body: { type: String, required: true, trim: true },
    readAt: Date,
  },
  { timestamps: true }
);
messageSchema.index({ from: 1, to: 1, createdAt: -1 });

const emailLogSchema = new Schema(
  {
    to: String,
    subject: String,
    status: { type: String, enum: ['sent', 'logged', 'failed'] },
    provider: String,
    error: String,
  },
  { timestamps: true }
);

const activitySchema = new Schema({ user: ref('User'), action: String, detail: String }, { timestamps: true });

export const Notice = mongoose.model('Notice', noticeSchema);
export const Notification = mongoose.model('Notification', notificationSchema);
export const Message = mongoose.model('Message', messageSchema);
export const EmailLog = mongoose.model('EmailLog', emailLogSchema);
export const ActivityLog = mongoose.model('ActivityLog', activitySchema);
