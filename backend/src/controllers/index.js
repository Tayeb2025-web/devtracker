import { asyncHandler } from '../middlewares/errorHandler.js';
import {
  SessionService, DashboardService, StatsService, AchievementService,
  TechnologyService, GoalService, NoteService, ChallengeService,
  UserService, ExportService, CategoryService, ProjectService,
} from '../services/index.js';
import { AuthService } from '../services/AuthService.js';
import { ChatModel, LeagueModel, SocialModel } from '../models/SocialModel.js';
import { formatLocalDate, getLocalMonthStart, getLocalWeekRange, getLocalYear } from '../utils/date.js';

export const getDashboard = asyncHandler(async (req, res) => {
  const data = await DashboardService.getDashboard(req.user.id);
  res.json({ success: true, data });
});

export const createSession = asyncHandler(async (req, res) => {
  const result = await SessionService.createSession(req.body, req.user.id);
  res.status(201).json({ success: true, data: result });
});

export const getSessions = asyncHandler(async (req, res) => {
  const { date, startDate, endDate, technologyId, search, limit, filter } = req.query;
  const filters = { date, startDate, endDate, technologyId, search, limit };

  if (filter === 'today') {
    filters.date = formatLocalDate();
  } else if (filter === 'week') {
    const range = getLocalWeekRange();
    filters.startDate = range.startDate;
    filters.endDate = range.endDate;
  } else if (filter === 'month') {
    filters.startDate = getLocalMonthStart();
    filters.endDate = formatLocalDate();
  }

  const sessions = await SessionService.getSessions(filters, req.user.id);
  res.json({ success: true, data: sessions });
});

export const deleteSession = asyncHandler(async (req, res) => {
  await SessionService.deleteSession(req.params.id, req.user.id);
  res.json({ success: true, message: 'Session deleted' });
});

export const getTechnologies = asyncHandler(async (req, res) => {
  const data = await TechnologyService.getAll(req.user.id);
  res.json({ success: true, data });
});

export const createTechnology = asyncHandler(async (req, res) => {
  const data = await TechnologyService.create(req.body, req.user.id);
  res.status(201).json({ success: true, data });
});

export const updateTechnology = asyncHandler(async (req, res) => {
  const data = await TechnologyService.update(req.params.id, req.body, req.user.id);
  res.json({ success: true, data });
});

export const deleteTechnology = asyncHandler(async (req, res) => {
  await TechnologyService.delete(req.params.id, req.user.id);
  res.json({ success: true, message: 'Technology deleted' });
});

export const getProjects = asyncHandler(async (req, res) => {
  const data = await ProjectService.getAll(req.user.id);
  res.json({ success: true, data });
});

export const createProject = asyncHandler(async (req, res) => {
  const data = await ProjectService.create(req.body, req.user.id);
  res.status(201).json({ success: true, data });
});

export const updateProject = asyncHandler(async (req, res) => {
  const data = await ProjectService.update(req.params.id, req.body, req.user.id);
  res.json({ success: true, data });
});

export const deleteProject = asyncHandler(async (req, res) => {
  await ProjectService.delete(req.params.id, req.user.id);
  res.json({ success: true, message: 'Project deleted' });
});

export const getCategories = asyncHandler(async (req, res) => {
  const data = await CategoryService.getAll(req.user.id);
  res.json({ success: true, data });
});

export const createCategory = asyncHandler(async (req, res) => {
  const data = await CategoryService.create(req.body, req.user.id);
  res.status(201).json({ success: true, data });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const data = await CategoryService.update(req.params.id, req.body, req.user.id);
  res.json({ success: true, data });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  await CategoryService.delete(req.params.id, req.user.id);
  res.json({ success: true, message: 'Folder deleted' });
});

export const moveCategory = asyncHandler(async (req, res) => {
  const data = await CategoryService.move(req.params.id, req.body.direction, req.user.id);
  res.json({ success: true, data });
});

export const getGoal = asyncHandler(async (req, res) => {
  const data = await GoalService.get(req.user.id);
  res.json({ success: true, data });
});

export const updateGoal = asyncHandler(async (req, res) => {
  const data = await GoalService.update(req.body.target_hours, req.user.id);
  res.json({ success: true, data });
});

export const getStats = asyncHandler(async (req, res) => {
  const data = await StatsService.getStats(req.user.id);
  res.json({ success: true, data });
});

export const getCalendar = asyncHandler(async (req, res) => {
  const year = req.query.year ? Number(req.query.year) : Number(getLocalYear());
  const data = await StatsService.getCalendar(year, req.user.id);
  res.json({ success: true, data, year });
});

export const getAchievements = asyncHandler(async (req, res) => {
  const data = await AchievementService.getAll(req.user.id);
  res.json({ success: true, data });
});

export const getChallenges = asyncHandler(async (req, res) => {
  const data = await ChallengeService.getAll(req.user.id);
  res.json({ success: true, data });
});

export const getNote = asyncHandler(async (req, res) => {
  const date = req.params.date;
  const data = await NoteService.getByDate(date, req.user.id);
  res.json({ success: true, data });
});

export const saveNote = asyncHandler(async (req, res) => {
  const date = req.params.date;
  const data = await NoteService.save(date, req.body.content, req.body.productivity_score, req.user.id);
  res.json({ success: true, data });
});

export const getNotes = asyncHandler(async (req, res) => {
  const data = await NoteService.getAll(req.user.id);
  res.json({ success: true, data });
});

export const getProfile = asyncHandler(async (req, res) => {
  const data = await UserService.getProfile(req.user.id);
  res.json({ success: true, data });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const data = await UserService.updateSettings(req.body, req.user.id);
  res.json({ success: true, data });
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please select an image file to upload' });
  }
  const data = await UserService.uploadAvatar(req.file.buffer, req.user.id);
  res.json({ success: true, data, message: 'Avatar uploaded successfully' });
});

export const removeAvatar = asyncHandler(async (req, res) => {
  const data = await UserService.removeAvatar(req.user.id);
  res.json({ success: true, data, message: 'Avatar removed' });
});

export const exportData = asyncHandler(async (req, res) => {
  const format = req.query.format || 'json';
  const data = await ExportService.exportData(format, req.user.id);
  res.json({ success: true, data });
});

export const register = asyncHandler(async (req, res) => {
  const data = await AuthService.register(req.body);
  res.status(201).json({ success: true, data });
});

export const login = asyncHandler(async (req, res) => {
  const data = await AuthService.login(req.body);
  res.json({ success: true, data });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  await AuthService.logout(token);
  res.json({ success: true });
});

export const getSocialDirectory = asyncHandler(async (req, res) => {
  const data = await SocialModel.getDirectory(req.user.id, req.query);
  res.json({ success: true, data });
});

export const getPublicProfile = asyncHandler(async (req, res) => {
  const data = await SocialModel.getProfile(req.params.id, req.user.id);
  res.json({ success: true, data });
});

export const followUser = asyncHandler(async (req, res) => {
  const data = await SocialModel.follow(req.user.id, req.params.id);
  res.json({ success: true, data });
});

export const unfollowUser = asyncHandler(async (req, res) => {
  const data = await SocialModel.unfollow(req.user.id, req.params.id);
  res.json({ success: true, data });
});

export const getLeague = asyncHandler(async (req, res) => {
  const data = await LeagueModel.getLeaderboard(req.user.id);
  res.json({ success: true, data });
});

export const getLeagueMessages = asyncHandler(async (req, res) => {
  const data = await LeagueModel.getMessages(req.user.id, req.query);
  res.json({ success: true, data });
});

export const sendLeagueMessage = asyncHandler(async (req, res) => {
  const data = await LeagueModel.sendMessage(req.user.id, req.body.body);
  req.app.get('io')?.to(`league:${data.leagueId}`).emit('league:message', data.message);
  res.status(201).json({ success: true, data });
});

export const getConversations = asyncHandler(async (req, res) => {
  const data = await ChatModel.getConversations(req.user.id);
  res.json({ success: true, data });
});

export const createConversation = asyncHandler(async (req, res) => {
  const data = await ChatModel.createConversation(req.user.id, req.body.recipientId);
  res.status(201).json({ success: true, data });
});

export const getDirectMessages = asyncHandler(async (req, res) => {
  const data = await ChatModel.getMessages(req.user.id, req.params.id, req.query);
  res.json({ success: true, data });
});

export const sendDirectMessage = asyncHandler(async (req, res) => {
  const data = await ChatModel.sendMessage(req.user.id, req.params.id, req.body.body);
  req.app.get('io')?.to(`user:${data.recipientId}`).emit('direct:message', data.message);
  res.status(201).json({ success: true, data });
});


export const importData = asyncHandler(async (req, res) => {
  const data = await ExportService.importData(req.body, req.user.id);
  res.json({ success: true, data });
});
