import { body, param, query, validationResult } from 'express-validator';
import { AppError } from './errorHandler.js';
import { formatLocalDate } from '../utils/date.js';
import { isValidClockTime, isValidIsoDate } from '../utils/domainRules.js';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array().map(e => e.msg).join(', '), 400);
  }
  next();
};

export const sessionValidation = [
  body('technology_id').optional({ values: 'null' }).isString().withMessage('Invalid technology'),
  body('project_id').optional({ values: 'null' }).isString().withMessage('Invalid project'),
  body().custom((_, { req }) => {
    if (!req.body?.technology_id && !req.body?.project_id) throw new Error('Select a technology or a project');
    return true;
  }),
  body('session_date').custom(value => {
    if (!isValidIsoDate(value, formatLocalDate())) throw new Error('Valid session date is required and cannot be in the future');
    return true;
  }),
  body('start_time').custom(isValidTime).withMessage('Valid start time is required'),
  body('end_time').custom(isValidTime).withMessage('Valid end time is required'),
  body('duration_minutes').isInt({ min: 1, max: 720 }).withMessage('Duration must be between 1 minute and 12 hours'),
  body('duration_hours').optional({ values: 'null' }).isFloat({ min: 0.01, max: 12 }).withMessage('Invalid duration'),
  body('note').optional({ values: 'null' }).isString().isLength({ max: 1000 }).withMessage('Note must be 1000 characters or less'),
  body('client_session_id').isString().isLength({ min: 8, max: 128 }).withMessage('A stable session id is required'),
  validate,
];

export const sessionListValidation = [
  query('page').optional().isInt({ min: 1, max: 1000000 }).withMessage('Invalid session page'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100'),
  query('sortBy').optional().isIn(['date-desc', 'date-asc', 'duration-desc', 'duration-asc']).withMessage('Unsupported session sort order'),
  query('search').optional().isString().isLength({ max: 100 }).withMessage('Search text is too long'),
  validate,
];

function isValidTime(value) {
  if (!isValidClockTime(value)) throw new Error('Invalid time');
  return true;
}

export const technologyValidation = [
  body('name').trim().notEmpty().withMessage('Technology name is required'),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid color format'),
  body('icon').optional().isString(),
  body('custom_icon').optional({ values: 'null' }).isString().isLength({ max: 1400000 }).withMessage('Custom icon is too large'),
  body('category_id').optional({ values: 'null' }).isString().withMessage('Invalid folder'),
  validate,
];

export const projectValidation = [
  body('name').trim().isLength({ min: 1, max: 150 }).withMessage('Project name is required'),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid color format'),
  body('description').optional({ values: 'null' }).isString().isLength({ max: 5000 }).withMessage('Project description is too long'),
  validate,
];

export const categoryValidation = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Folder name is required'),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid color format'),
  validate,
];

export const categoryMoveValidation = [
  body('direction').isIn(['up', 'down']).withMessage('Direction must be up or down'),
  validate,
];

export const goalValidation = [
  body('target_hours').isFloat({ min: 0.5, max: 24 }).withMessage('Goal must be between 0.5 and 24 hours'),
  validate,
];

export const challengeValidation = [
  body('challenge_name').trim().isLength({ min: 2, max: 120 }).withMessage('Challenge name must be 2-120 characters'),
  body('challenge_description').optional({ values: 'null' }).isString().isLength({ max: 500 }).withMessage('Challenge description must be 500 characters or less'),
  body('target_value').isFloat({ min: 1, max: 10000 }).withMessage('Challenge target must be between 1 and 10,000'),
  body('unit').optional().isIn(['hours', 'days']).withMessage('Challenge unit must be hours or days'),
  validate,
];

export const presenceValidation = [
  body('is_studying').custom(value => typeof value === 'boolean').withMessage('Study state must be true or false'),
  body('technology_id').optional({ values: 'null' }).isString().withMessage('Invalid technology'),
  validate,
];

export const noteValidation = [
  body('content').optional().isString(),
  body('productivity_score').optional({ values: 'null' }).isInt({ min: 1, max: 10 }).withMessage('Score must be 1-10'),
  validate,
];

export const idParam = [
  param('id').isString().notEmpty().withMessage('Invalid ID'),
  validate,
];

export const dateParam = [
  param('date').isDate({ format: 'YYYY-MM-DD', delimiters: ['-'] }).withMessage('Invalid date'),
  validate,
];

export const calendarValidation = [
  query('year').optional().isInt({ min: 1300, max: 2100 }).withMessage('Year must be between 1300 and 2100'),
  query('calendar').optional().isIn(['afghan', 'iranian', 'gregorian']).withMessage('Unsupported calendar'),
  validate,
];

export const statsValidation = [
  query('calendar').optional().isIn(['afghan', 'iranian', 'gregorian']).withMessage('Unsupported calendar'),
  validate,
];

export const registerValidation = [
  body('displayName').trim().isLength({ min: 2, max: 150 }).withMessage('Name must be between 2 and 150 characters'),
  body('email').trim().isEmail().withMessage('A valid email is required'),
  body('password').isLength({ min: 8, max: 128 }).withMessage('Password must be at least 8 characters'),
  validate,
];

export const loginValidation = [
  body('email').trim().isEmail().withMessage('A valid email is required'),
  body('password').isString().notEmpty().withMessage('Password is required'),
  validate,
];

export const passwordChangeValidation = [
  body('currentPassword').isString().isLength({ min: 1, max: 128 }).withMessage('Current password is required'),
  body('newPassword').isString().isLength({ min: 8, max: 128 }).withMessage('New password must be 8-128 characters'),
  validate,
];

export const socialDirectoryValidation = [
  query('search').optional().isString().isLength({ max: 80 }).withMessage('Search must be 80 characters or less'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  validate,
];

export const messageListValidation = [
  query('beforeId').optional().isMongoId().withMessage('Invalid message cursor'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  validate,
];

export const directConversationValidation = [
  body('recipientId').isString().notEmpty().withMessage('A valid recipient is required'),
  validate,
];

export const chatMessageValidation = [
  body('body').trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be between 1 and 1000 characters'),
  validate,
];

const userSettingFields = new Set([
  'display_name',
  'theme',
  'calendar_type',
  'notification_enabled',
  'notification_time',
  'avatar_url',
  'bio',
  'is_profile_public',
  'allow_direct_messages',
]);

export const userSettingsValidation = [
  body().custom((_, { req }) => {
    const invalid = Object.keys(req.body || {}).filter(key => !userSettingFields.has(key));
    if (invalid.length) throw new Error(`Unsupported setting: ${invalid.join(', ')}`);
    return true;
  }),
  body('display_name').optional().trim().isLength({ min: 1, max: 150 }).withMessage('Display name must be 1-150 characters'),
  body('theme').optional().isIn(['light', 'dark']).withMessage('Theme must be light or dark'),
  body('calendar_type').optional().isIn(['afghan', 'iranian', 'gregorian']).withMessage('Calendar type must be afghan, iranian, or gregorian'),
  body('notification_enabled').optional().isBoolean().withMessage('Notification setting must be true or false'),
  body('notification_time').optional().custom(isValidTime).withMessage('Invalid notification time'),
  body('avatar_url').optional({ values: 'null' }).custom(value => {
    if (value === null || value === '' || (typeof value === 'string' && (value.startsWith('/') || /^https?:\/\//.test(value)))) {
      return true;
    }
    throw new Error('Avatar URL must be a valid URL or path');
  }),
  body('bio').optional({ values: 'null' }).trim().isLength({ max: 280 }).withMessage('Bio must be 280 characters or less'),
  body('is_profile_public').optional().isBoolean().withMessage('Profile visibility must be true or false'),
  body('allow_direct_messages').optional().isIn(['everyone', 'followers', 'none']).withMessage('Invalid direct message setting'),
  validate,
];
