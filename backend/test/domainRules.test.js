import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../src/services/AuthService.js';
import { inferTechnologyKey } from '../src/models/TechnologyModel.js';
import { attachRequestId } from '../src/middlewares/requestId.js';
import { getCalendarDateParts, getCalendarYearRange, getCalendarYearStart } from '../src/utils/date.js';
import {
  calculateChallengeProgress,
  canReceiveDirectMessage,
  isValidClockTime,
  isValidIsoDate,
  resolveOwnedUserIds,
} from '../src/utils/domainRules.js';

test('account aliases belong only to the resolved account, regardless of role', () => {
  assert.deepEqual(
    resolveOwnedUserIds('current-admin', {
      _id: 'object-id', legacy_id: 42, username: 'current-admin', role: 'admin',
    }),
    ['current-admin', 'object-id', '42'],
  );
  assert.deepEqual(resolveOwnedUserIds('missing-user', null), ['missing-user']);
  assert.throws(() => resolveOwnedUserIds('  ', null), /identity is required/);
});

test('message privacy permits only the configured audience', () => {
  assert.equal(canReceiveDirectMessage('everyone', false), true);
  assert.equal(canReceiveDirectMessage('followers', true), true);
  assert.equal(canReceiveDirectMessage('followers', false), false);
  assert.equal(canReceiveDirectMessage('none', true), false);
  assert.equal(canReceiveDirectMessage('unknown', true), false);
});

test('time and date validation reject impossible values and future dates', () => {
  assert.equal(isValidClockTime('00:00'), true);
  assert.equal(isValidClockTime('23:59:59'), true);
  assert.equal(isValidClockTime('24:00'), false);
  assert.equal(isValidClockTime('12:60'), false);
  assert.equal(isValidIsoDate('2024-02-29', '2024-12-31'), true);
  assert.equal(isValidIsoDate('2023-02-29', '2024-12-31'), false);
  assert.equal(isValidIsoDate('2025-01-01', '2024-12-31'), false);
});

test('custom challenge progress counts activity after its start date only', () => {
  const sessions = [
    { session_date: '2026-01-01', duration_hours: 5 },
    { session_date: '2026-01-10', duration_hours: 0.75 },
    { session_date: '2026-01-10', duration_hours: 0.75 },
    { session_date: '2026-01-12', duration_hours: 1 },
  ];

  assert.equal(calculateChallengeProgress({
    unit: 'hours', challengeKey: 'custom_1', sessions, fromDate: '2026-01-10',
  }), 2);
  assert.equal(calculateChallengeProgress({
    unit: 'days', challengeKey: 'custom_2', sessions, fromDate: '2026-01-10',
  }), 2);
  assert.equal(calculateChallengeProgress({ unit: 'lifetime_hours', sessions }), 7);
  assert.equal(calculateChallengeProgress({ unit: 'streak_days', sessions, currentStreak: 4 }), 4);
});

test('password hashes are salted and verified without accepting malformed hashes', async () => {
  const first = await hashPassword('correct horse battery staple');
  const second = await hashPassword('correct horse battery staple');
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('correct horse battery staple', first), true);
  assert.equal(await verifyPassword('wrong password', first), false);
  assert.equal(await verifyPassword('anything', 'invalid'), false);
});

test('technology achievements use stable identity across display-name variations', () => {
  assert.equal(inferTechnologyKey('REACT'), 'react');
  assert.equal(inferTechnologyKey('React.js'), 'react');
  assert.equal(inferTechnologyKey('NODE JS'), 'nodejs');
  assert.equal(inferTechnologyKey('Node.js'), 'nodejs');
  assert.equal(inferTechnologyKey('Tailwind CSS'), 'tailwind');
  assert.equal(inferTechnologyKey('My Framework'), null);
});

test('statistics year grouping follows the selected calendar', () => {
  assert.deepEqual(getCalendarDateParts('2026-01-01', 'gregorian'), { year: 2026, month: 1, day: 1 });
  assert.deepEqual(getCalendarDateParts('2026-01-01', 'afghan'), { year: 1404, month: 10, day: 11 });
  assert.equal(getCalendarYearStart('gregorian', new Date('2026-10-04T12:00:00Z')), '2026-01-01');
  assert.equal(getCalendarYearStart('afghan', new Date('2026-10-04T12:00:00Z')), '2026-03-21');
});

test('calendar year ranges match the selected calendar without loading session rows', () => {
  assert.deepEqual(getCalendarYearRange(2026, 'gregorian'), {
    startDate: '2026-01-01', endDate: '2026-12-31',
  });
  assert.deepEqual(getCalendarYearRange(1404, 'afghan'), {
    startDate: '2025-03-21', endDate: '2026-03-20',
  });
  assert.deepEqual(getCalendarYearRange(1404, 'iranian'), {
    startDate: '2025-03-21', endDate: '2026-03-20',
  });
  assert.throws(() => getCalendarYearRange(2026, 'unknown'), /valid year and calendar/);
});

test('each request receives a traceable server-generated request id', () => {
  const req = {};
  const headers = {};
  let passedToNext = false;
  attachRequestId(req, { setHeader: (name, value) => { headers[name] = value; } }, () => { passedToNext = true; });

  assert.match(req.requestId, /^[0-9a-f-]{36}$/i);
  assert.equal(headers['X-Request-ID'], req.requestId);
  assert.equal(passedToNext, true);
});
