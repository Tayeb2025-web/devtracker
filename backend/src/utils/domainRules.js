export function resolveOwnedUserIds(requestedId, user) {
  const id = String(requestedId ?? '').trim();
  if (!id) throw new Error('Authenticated user identity is required for data access.');

  const ids = new Set([id]);
  if (user?._id) ids.add(String(user._id));
  if (user?.legacy_id !== undefined && user.legacy_id !== null) ids.add(String(user.legacy_id));
  if (user?.username) ids.add(String(user.username));
  return [...ids];
}

export function canReceiveDirectMessage(privacy, recipientFollowsSender) {
  if (privacy === 'everyone') return true;
  if (privacy === 'followers') return Boolean(recipientFollowsSender);
  return false;
}

export function isValidClockTime(value) {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}(:\d{2})?$/.test(value)) return false;
  const [hour, minute, second = '0'] = value.split(':').map(Number);
  return hour <= 23 && minute <= 59 && second <= 59;
}

export function isValidIsoDate(value, maxDate) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime())
    && date.toISOString().slice(0, 10) === value
    && (!maxDate || value <= maxDate);
}

export function calculateChallengeProgress({ unit, challengeKey, sessions, currentStreak = 0, fromDate }) {
  if (unit === 'streak_days') return Number(currentStreak) || 0;
  if (unit === 'lifetime_hours' || (unit === 'hours' && !String(challengeKey || '').startsWith('custom_'))) {
    return Math.floor(sessions.reduce((sum, session) => sum + Number(session.duration_hours || 0), 0));
  }

  const scopedSessions = sessions.filter(session => !fromDate || session.session_date >= fromDate);
  if (unit === 'days') return new Set(scopedSessions.map(session => session.session_date)).size;
  return Math.floor(scopedSessions.reduce((sum, session) => sum + Number(session.duration_hours || 0), 0));
}
