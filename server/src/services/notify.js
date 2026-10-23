import { Notification, User, ActivityLog } from '../models/index.js';
import { sendEmail } from './mailer.js';

export const guardiansOf = (studentIds) =>
  User.find({ role: 'guardian', status: 'active', children: { $in: [].concat(studentIds) } });

// In-app notification (+ optional email) for one or many users. Never throws.
export async function notify(users, { title, message = '', type = 'system', link = '', email = false, lines }) {
  try {
    const list = (Array.isArray(users) ? users : [users]).filter(Boolean);
    if (!list.length) return;
    await Notification.insertMany(list.map((u) => ({ user: u._id || u, title, message, type, link })));
    if (email) {
      list.forEach((u) => {
        if (u.email) sendEmail({ to: u.email, subject: title, heading: `Hello ${u.name},`, lines: lines || [message], link });
      });
    }
  } catch (err) {
    console.error('notify failed:', err.message);
  }
}

export const logActivity = (user, action, detail = '') => ActivityLog.create({ user: user?._id || user, action, detail }).catch(() => {});
