import sgMail from '@sendgrid/mail';
import { env } from '../config/env.js';
import { EmailLog } from '../models/index.js';

if (env.sendgridKey) sgMail.setApiKey(env.sendgridKey);

const base = () => env.clientUrl.split(',')[0].trim().replace(/\/$/, '');
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function template({ heading, lines, link }) {
  const body = lines.map((l) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#23443b">${esc(l)}</p>`).join('');
  const cta = link
    ? `<a href="${base()}${link}" style="display:inline-block;margin-top:8px;background:#006a4e;color:#fff;text-decoration:none;padding:11px 20px;border-radius:10px;font-weight:600;font-size:14px">Open in Setu</a>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#eef3ef;padding:28px 12px;font-family:'Segoe UI',Arial,sans-serif">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #dbe5df">
    <tr><td style="background:#0b2a22;padding:18px 24px;color:#fff;font-size:18px;font-weight:700">Setu <span style="color:#f2a900">&bull;</span> <span style="font-weight:400;font-size:13px;opacity:.8">${esc(env.collegeName)}</span></td></tr>
    <tr><td style="padding:26px 24px"><h2 style="margin:0 0 14px;font-size:20px;color:#0b2a22">${esc(heading)}</h2>${body}${cta}</td></tr>
    <tr><td style="padding:14px 24px;background:#f6f9f7;color:#7a8f86;font-size:12px">You received this because you have an account on the ${esc(env.collegeName)} portal.</td></tr>
  </table></body></html>`;
}

// Sends through SendGrid when SENDGRID_API_KEY is set; otherwise logs so the flow can be demoed offline.
export async function sendEmail({ to, subject, heading, lines = [], link }) {
  if (!to) return;
  const html = template({ heading: heading || subject, lines, link });
  const log = { to, subject };
  try {
    if (env.sendgridKey) {
      await sgMail.send({ to, from: env.mailFrom, subject, html });
      await EmailLog.create({ ...log, status: 'sent', provider: 'sendgrid' });
    } else {
      console.log(`[email:dev] to=${to} | ${subject}`);
      await EmailLog.create({ ...log, status: 'logged', provider: 'console' });
    }
  } catch (err) {
    console.error('Email failed:', err.message);
    await EmailLog.create({ ...log, status: 'failed', provider: 'sendgrid', error: err.message }).catch(() => {});
  }
}
