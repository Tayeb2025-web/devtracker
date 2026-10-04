import { Router } from 'express';
import * as ctrl from '../controllers/index.js';
import * as adminCtrl from '../controllers/adminController.js';
import {
  sessionValidation, sessionListValidation, technologyValidation, projectValidation, categoryValidation, categoryMoveValidation, goalValidation, challengeValidation, noteValidation, idParam,
  dateParam, calendarValidation, statsValidation, userSettingsValidation,
  registerValidation, loginValidation, passwordChangeValidation, presenceValidation,
  socialDirectoryValidation, messageListValidation, directConversationValidation, chatMessageValidation,
} from '../middlewares/validation.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import { avatarUpload } from '../middlewares/upload.js';
import { createRateLimiter } from '../middlewares/rateLimit.js';

const router = Router();
const authRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many sign-in attempts. Try again in a few minutes.' });
const registrationRateLimit = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5, message: 'Too many accounts were created from this network. Try again later.' });
const messageRateLimit = createRateLimiter({ windowMs: 60 * 1000, max: 30, message: 'Please slow down before sending more messages.', byUser: true });
const avatarRateLimit = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 10, message: 'Too many avatar uploads. Try again later.', byUser: true });

router.post('/auth/register', registrationRateLimit, registerValidation, ctrl.register);
router.post('/auth/login', authRateLimit, loginValidation, ctrl.login);
router.post('/auth/logout', requireAuth, ctrl.logout);

router.use(requireAuth);
router.post('/auth/password', passwordChangeValidation, ctrl.changePassword);

// Dashboard
router.get('/dashboard', ctrl.getDashboard);

// Sessions
router.get('/sessions', sessionListValidation, ctrl.getSessions);
router.post('/sessions', sessionValidation, ctrl.createSession);
router.delete('/sessions/:id', idParam, ctrl.deleteSession);

// Technologies
router.get('/technologies', ctrl.getTechnologies);
router.post('/technologies', technologyValidation, ctrl.createTechnology);
router.put('/technologies/:id', idParam, technologyValidation, ctrl.updateTechnology);
router.delete('/technologies/:id', idParam, ctrl.deleteTechnology);

// Projects
router.get('/projects', ctrl.getProjects);
router.post('/projects', projectValidation, ctrl.createProject);
router.put('/projects/:id', idParam, projectValidation, ctrl.updateProject);
router.delete('/projects/:id', idParam, ctrl.deleteProject);

// Technology folders
router.get('/technology-categories', ctrl.getCategories);
router.post('/technology-categories', categoryValidation, ctrl.createCategory);
router.put('/technology-categories/:id', idParam, categoryValidation, ctrl.updateCategory);
router.post('/technology-categories/:id/move', idParam, categoryMoveValidation, ctrl.moveCategory);
router.delete('/technology-categories/:id', idParam, ctrl.deleteCategory);

// Goals
router.get('/goals', ctrl.getGoal);
router.put('/goals', goalValidation, ctrl.updateGoal);

// Statistics
router.get('/stats', statsValidation, ctrl.getStats);
router.get('/calendar', calendarValidation, ctrl.getCalendar);

// Achievements & Challenges
router.get('/achievements', ctrl.getAchievements);
router.get('/challenges', ctrl.getChallenges);
router.post('/challenges', challengeValidation, ctrl.createChallenge);
router.delete('/challenges/:id', ctrl.deleteChallenge);

// Notes
router.get('/notes', ctrl.getNotes);
router.get('/notes/:date', dateParam, ctrl.getNote);
router.put('/notes/:date', dateParam, noteValidation, ctrl.saveNote);

// User
router.get('/user', ctrl.getProfile);
router.put('/user/settings', userSettingsValidation, ctrl.updateSettings);
router.post('/user/avatar', avatarRateLimit, avatarUpload.single('avatar'), ctrl.uploadAvatar);
router.delete('/user/avatar', ctrl.removeAvatar);

// Community & Presence
router.post('/social/presence/heartbeat', presenceValidation, ctrl.heartbeatPresence);
router.get('/social/live-activities', ctrl.getLiveActivities);
router.get('/social/discover', socialDirectoryValidation, ctrl.getSocialDirectory);
router.get('/social/profiles/:id', idParam, ctrl.getPublicProfile);
router.post('/social/profiles/:id/follow', idParam, ctrl.followUser);
router.delete('/social/profiles/:id/follow', idParam, ctrl.unfollowUser);
router.get('/social/league', ctrl.getLeague);
router.get('/social/league/messages', messageListValidation, ctrl.getLeagueMessages);
router.post('/social/league/messages', messageRateLimit, chatMessageValidation, ctrl.sendLeagueMessage);
router.get('/social/conversations', ctrl.getConversations);
router.post('/social/conversations', directConversationValidation, ctrl.createConversation);
router.get('/social/conversations/:id/messages', idParam, messageListValidation, ctrl.getDirectMessages);
router.post('/social/conversations/:id/messages', messageRateLimit, idParam, chatMessageValidation, ctrl.sendDirectMessage);

// Export & Import
router.get('/export', ctrl.exportData);
router.post('/import', ctrl.importData);

// Admin Portal Endpoints
router.get('/admin/stats/overview', requireAdmin, adminCtrl.getAdminOverview);
router.get('/admin/users', requireAdmin, adminCtrl.getAdminUsers);
router.get('/admin/users/:id', requireAdmin, idParam, adminCtrl.getAdminUserDetail);
router.patch('/admin/users/:id/role', requireAdmin, idParam, adminCtrl.updateUserRole);
router.delete('/admin/users/:id', requireAdmin, idParam, adminCtrl.deleteUser);
router.get('/admin/scan-database', requireAdmin, adminCtrl.scanDatabase);

export default router;
