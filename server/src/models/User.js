import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    userId: { type: String, unique: true, sparse: true, trim: true }, // student ID / teacher ID issued by the college
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['student', 'teacher', 'guardian', 'admin'], required: true },
    status: { type: String, enum: ['pending', 'active', 'rejected', 'suspended'], default: 'pending' },
    phone: String,
    // student
    className: { type: String, enum: ['1st Year', '2nd Year'] },
    group: { type: String, enum: ['Science', 'Commerce', 'Humanities'] },
    section: String,
    roll: Number,
    // teacher
    designation: String,
    subject: String,
    classTeacherOf: { className: String, group: String, section: String },
    // guardian
    relation: String,
    children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    childStudentId: String, // requested at registration, linked by the admin
    lastLoginAt: Date,
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 10);
});
userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
