import { Router } from 'express';
import auth from './auth.js';
import dashboard from './dashboard.js';
import courses from './courses.js';
import academics from './academics.js';
import notices from './notices.js';
import leaves from './leaves.js';
import attendance from './attendance.js';
import results from './results.js';
import fees from './fees.js';
import inbox from './inbox.js';
import admin, { systemRouter } from './admin.js';

const api = Router();
api.use('/auth', auth);
api.use('/dashboard', dashboard);
api.use('/courses', courses);
api.use('/notices', notices);
api.use('/leaves', leaves);
api.use('/fees', fees);
api.use('/admin', admin);
api.use('/system', systemRouter);
// routers that define their own full sub-paths (/courses/:id/..., /quizzes/..., /results ...)
api.use('/', academics);
api.use('/', attendance);
api.use('/', results);
api.use('/', inbox);

export default api;
