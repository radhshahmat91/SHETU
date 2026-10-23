import dotenv from 'dotenv';
dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5050,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/setu_college_portal',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpires: process.env.JWT_EXPIRES || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  collegeName: process.env.COLLEGE_NAME || 'Greenfield College',
  sendgridKey: process.env.SENDGRID_API_KEY || '',
  mailFrom: process.env.MAIL_FROM || 'Setu Portal <no-reply@setu.local>',
};
