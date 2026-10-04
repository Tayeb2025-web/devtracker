// Read-only audit reproductions. Database methods are replaced with in-memory fakes.
// Never imports server.js/database.js and never opens a database connection.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { requireAdmin } from '../../backend/src/middlewares/auth.js';
import { User, UserModel } from '../../backend/src/models/UserModel.js';
import { getTargetUserIds, setCachedAdminId } from '../../backend/src/utils/userHelper.js';
import { SessionService, ExportService, AchievementService } from '../../backend/src/services/index.js';
import { getSessions } from '../../backend/src/controllers/index.js';
import { SessionModel, StudySession } from '../../backend/src/models/SessionModel.js';
import { TechnologyModel } from '../../backend/src/models/TechnologyModel.js';
import { ProjectModel } from '../../backend/src/models/ProjectModel.js';
import { Level, LevelModel, XpHistory, StreakModel, Challenge, ChallengeModel, NoteModel, AchievementModel } from '../../backend/src/models/GoalModel.js';
import { ChatModel, DirectConversation, DirectMessage } from '../../backend/src/models/SocialModel.js';
import { userSettingsValidation, sessionValidation } from '../../backend/src/middlewares/validation.js';

const outcomes = [];
const read = relative => fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
const lean = value => ({ lean: async () => value });
async function withFakes(fakes, action) {
  const originals = fakes.map(([object, key]) => object[key]);
  fakes.forEach(([object, key, value]) => { object[key] = value; });
  try { return await action(); }
  finally { fakes.forEach(([object, key], index) => { object[key] = originals[index]; }); }
}
async function run(name, action) {
  try { await action(); outcomes.push({ name, reproduced: true }); }
  catch (error) { outcomes.push({ name, reproduced: false, error: error.message }); }
}
async function invoke(handler, req) {
  return new Promise((resolve, reject) => {
    handler(req, { json: resolve }, error => error ? reject(error) : resolve('next'));
  });
}
async function validate(validators, body) {
  const req = { body, headers: {}, query: {}, params: {} };
  for (const validator of validators) {
    if (typeof validator.run === 'function') await validator.run(req);
    else validator(req, {}, () => {});
  }
  return req;
}

await run('Editable email grants administrator access to a regular user', async () => {
  const authSource = read('../../backend/src/middlewares/auth.js');
  const privilegedEmail = authSource.match(/req\.user\.email !== '([^']+)'/)[1];
  const req = await validate(userSettingsValidation, { email: privilegedEmail });
  req.user = { id: 'ordinary-user', role: 'user', email: req.body.email };
  assert.equal(await invoke(requireAdmin, req), 'next');
});

await run('Unknown user ID resolves to an unrelated oldest account', async () => {
  const existing = { _id: 'oldest-account', username: 'someone-else', email: 'someone@example.test' };
  await withFakes([[User, 'findOne', () => ({ ...lean(null), sort: () => lean(existing) })]], async () => {
    const result = await UserModel.findById('missing-user');
    assert.equal(result.id, 'oldest-account');
  });
});

await run('Legacy account can be claimed by an unrelated registration', async () => {
  const existing = { _id: 'legacy-account', username: 'developer', password_hash: null };
  await withFakes([
    [User, 'findOne', () => ({ sort: () => lean(existing) })],
    [User, 'findByIdAndUpdate', (id, update) => lean({ ...existing, ...update })],
  ], async () => {
    const result = await UserModel.claimLegacyUser({ displayName: 'Unrelated person', email: 'unrelated@example.test', passwordHash: 'fake' });
    assert.equal(result.id, existing._id);
    assert.equal(result.email, 'unrelated@example.test');
  });
});

await run('Any administrator receives primary legacy user aliases', async () => {
  const id = '0123456789abcdef01234567';
  setCachedAdminId(null);
  await withFakes([[User, 'findById', () => ({ select: () => lean({ role: 'admin', email: 'second-admin@example.test' }) })]], async () => {
    const ids = await getTargetUserIds(id);
    assert.ok(ids.includes('1') && ids.includes('tayeb'));
  });
});

await run('History controller discards projectId query filter', async () => {
  await withFakes([[SessionService, 'getSessions', async filters => {
    assert.equal(filters.projectId, undefined);
    return [];
  }]], () => invoke(getSessions, { user: { id: 'ordinary-user' }, query: { projectId: 'project-a' } }));
});

await run('Session validator accepts impossible time, future date and extreme duration', async () => {
  await validate(sessionValidation, {
    technology_id: 'technology-a', session_date: '2099-01-01',
    start_time: '99:99', end_time: '99:99', duration_minutes: 999999, duration_hours: 1,
  });
});

await run('Session validator rejects null note sent by timers with no note', async () => {
  await assert.rejects(validate(sessionValidation, {
    technology_id: 'technology-a', session_date: '2026-10-01',
    start_time: '12:00', end_time: '12:25', duration_minutes: 25, duration_hours: 0.4167,
    note: null,
  }));
  assert.ok(read('../../frontend/src/contexts/TimerContext.jsx').includes('note: sessionNote || null'));
});

await run('Backup import preserves source IDs instead of remapping new entities', async () => {
  let saved;
  await withFakes([
    [TechnologyModel, 'create', async () => ({ id: 'new-technology-id' })],
    [SessionModel, 'create', async data => { saved = data; return data; }],
    [StreakModel, 'recalculate', async () => {}], [LevelModel, 'recalculate', async () => {}],
    [TechnologyModel, 'recalculateHours', async () => {}], [ProjectModel, 'recalculateHours', async () => {}],
    [NoteModel, 'upsert', async () => {}],
  ], async () => {
    const result = await ExportService.importData({
      technologies: [{ id: 'source-technology-id', name: 'React' }],
      sessions: [{ technology_id: 'source-technology-id', session_date: '2026-10-01', duration_minutes: 60 }],
    }, 'ordinary-user');
    assert.equal(result.importedSessions, 1);
    assert.equal(saved.technology_id, 'source-technology-id');
  });
});

await run('Sending a direct message ignores recipient permission none', async () => {
  const recipient = { _id: 'recipient', allow_direct_messages: 'none' };
  const conversation = { user_low_id: 'sender', user_high_id: 'recipient', save: async () => {} };
  await withFakes([
    [DirectConversation, 'findById', async () => conversation],
    [DirectMessage, 'create', async data => ({ ...data, _id: 'message-id', created_at: new Date() })],
    [User, 'findById', () => lean(recipient)],
  ], async () => {
    const result = await ChatModel.sendMessage('sender', 'conversation', 'hello');
    assert.equal(result.recipientId, 'recipient');
    assert.equal(result.message.body, 'hello');
  });
});

await run('Concurrent XP updates lose one increment', async () => {
  let storedTotal = 0;
  let historyCount = 0;
  await withFakes([
    [Level, 'findOne', () => lean({ total_xp: 0 })],
    [Level, 'findOneAndUpdate', (filter, data) => { storedTotal = data.total_xp; return lean(data); }],
    [XpHistory, 'create', async () => { historyCount++; }],
  ], async () => {
    await Promise.all([LevelModel.addXp(100, 's1', 'ordinary-user'), LevelModel.addXp(100, 's2', 'ordinary-user')]);
    assert.equal(historyCount, 2);
    assert.equal(storedTotal, 100);
  });
});

await run('New custom challenge counts old lifetime hours and remains completed after reduction', async () => {
  let total = 20;
  const updates = [];
  const challenge = { _id: 'custom', unit: 'hours', current_value: 0, target_value: 5, status: 'active', started_at: new Date() };
  await withFakes([
    [StudySession, 'aggregate', async () => [{ total }]],
    [StreakModel, 'get', async () => ({ current_streak: 0, longest_streak: 0 })],
    [Challenge, 'find', async () => [challenge]],
    [Challenge, 'updateOne', async (filter, update) => { updates.push(update.$set); Object.assign(challenge, update.$set); }],
  ], async () => {
    await ChallengeModel.updateProgress('ordinary-user');
    assert.equal(challenge.status, 'completed');
    total = 1;
    await ChallengeModel.updateProgress('ordinary-user');
    assert.equal(challenge.current_value, 1);
    assert.equal(challenge.status, 'completed');
  });
});

await run('Default REACT/NODE JS/TAILWIND names do not unlock corresponding badges', async () => {
  const unlocked = [];
  await withFakes([
    [SessionModel, 'findAll', async () => [{ duration_hours: 60 }]],
    [StreakModel, 'get', async () => ({ current_streak: 0 })],
    [SessionModel, 'getTechDistribution', async () => ['REACT', 'NODE JS', 'TAILWIND'].map(name => ({ name, hours: 60 }))],
    [AchievementModel, 'unlock', async key => { unlocked.push(key); }],
    [ChallengeModel, 'updateProgress', async () => {}],
  ], async () => {
    await AchievementService.checkAll('ordinary-user');
    assert.ok(unlocked.includes('first_session'));
    assert.ok(!unlocked.includes('react_master') && !unlocked.includes('node_beginner') && !unlocked.includes('tailwind_expert'));
  });
});

await run('Axios error interceptor removes HTTP status used by AuthProvider', async () => {
  let onRejected;
  const source = read('../../frontend/src/services/api.js')
    .replace(/^import .*;$/gm, '').replace(/export default api;/, '').replace(/export const /g, 'const ');
  const sandbox = {
    API_BASE: '/api', localStorage: { getItem: () => null },
    axios: { create: () => ({ interceptors: { request: { use: () => {} }, response: { use: (ok, fail) => { onRejected = fail; } } } }) },
  };
  vm.runInNewContext(source, sandbox);
  const error = await onRejected({ response: { status: 401, data: { message: 'Expired' } } }).catch(err => err);
  assert.equal(error.message, 'Expired');
  assert.equal(error.response, undefined);
  assert.equal(error.statusCode, undefined);
});

await run('MongoDB IDs cannot identify own chat messages after Number conversion', async () => {
  const id = '0123456789abcdef01234567';
  assert.equal(Number(id) === Number(id), false);
  assert.ok(read('../../frontend/src/pages/Community.jsx').includes('Number(message.sender?.id) === Number(user?.id)'));
});

await run('Direct message socket event names disagree', async () => {
  const controller = read('../../backend/src/controllers/index.js');
  const community = read('../../frontend/src/pages/Community.jsx');
  assert.ok(controller.includes("emit('direct:message'"));
  assert.ok(community.includes("socket.on('chat:message'"));
  assert.ok(!community.includes("socket.on('direct:message'"));
});

console.log(JSON.stringify({ databaseConnected: false, checks: outcomes.length, reproduced: outcomes.filter(x => x.reproduced).length, outcomes }, null, 2));
if (outcomes.some(x => !x.reproduced)) process.exitCode = 1;
