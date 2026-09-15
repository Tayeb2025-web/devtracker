import { Router } from 'express';
import * as ctrl from '../controllers/index.js';
import {
  sessionValidation, technologyValidation, projectValidation, categoryValidation, categoryMoveValidation, goalValidation, noteValidation, idParam,
  dateParam, calendarValidation, userSettingsValidation,
  registerValidation, loginValidation,
  socialDirectoryValidation, messageListValidation, directConversationValidation, chatMessageValidation,
} from '../middlewares/validation.js';
import { requireAuth } from '../middlewares/auth.js';
import { avatarUpload } from '../middlewares/upload.js';

const router = Router();

router.post('/auth/register', registerValidation, ctrl.register);
router.post('/auth/login', loginValidation, ctrl.login);
router.post('/auth/logout', requireAuth, ctrl.logout);

router.use(requireAuth);

// Dashboard
router.get('/dashboard', ctrl.getDashboard);

// Sessions
router.get('/sessions', ctrl.getSessions);
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
router.get('/stats', ctrl.getStats);
router.get('/calendar', calendarValidation, ctrl.getCalendar);

// Achievements & Challenges
router.get('/achievements', ctrl.getAchievements);
router.get('/challenges', ctrl.getChallenges);
router.post('/challenges', ctrl.createChallenge);
router.delete('/challenges/:id', ctrl.deleteChallenge);

// Notes
router.get('/notes', ctrl.getNotes);
router.get('/notes/:date', dateParam, ctrl.getNote);
router.put('/notes/:date', dateParam, noteValidation, ctrl.saveNote);

// User
router.get('/user', ctrl.getProfile);
router.put('/user/settings', userSettingsValidation, ctrl.updateSettings);
router.post('/user/avatar', avatarUpload.single('avatar'), ctrl.uploadAvatar);
router.delete('/user/avatar', ctrl.removeAvatar);

// Community & Presence
router.post('/social/presence/heartbeat', ctrl.heartbeatPresence);
router.get('/social/live-activities', ctrl.getLiveActivities);
router.get('/social/discover', socialDirectoryValidation, ctrl.getSocialDirectory);
router.get('/social/profiles/:id', idParam, ctrl.getPublicProfile);
router.post('/social/profiles/:id/follow', idParam, ctrl.followUser);
router.delete('/social/profiles/:id/follow', idParam, ctrl.unfollowUser);
router.get('/social/league', ctrl.getLeague);
router.get('/social/league/messages', messageListValidation, ctrl.getLeagueMessages);
router.post('/social/league/messages', chatMessageValidation, ctrl.sendLeagueMessage);
router.get('/social/conversations', ctrl.getConversations);
router.post('/social/conversations', directConversationValidation, ctrl.createConversation);
router.get('/social/conversations/:id/messages', idParam, messageListValidation, ctrl.getDirectMessages);
router.post('/social/conversations/:id/messages', idParam, chatMessageValidation, ctrl.sendDirectMessage);

// Export & Import
router.get('/export', ctrl.exportData);
router.post('/import', ctrl.importData);

export default router;
