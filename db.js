const users = new Set();
const tokens = []; // { id, userId, provider, token, createdAt }
const jobs = new Map(); // id -> job

function createUser(userId) {
  users.add(userId);
}

function saveToken(userId, provider, tokenJson) {
  tokens.push({
    id: tokens.length + 1,
    userId,
    provider,
    token: tokenJson,
    createdAt: Date.now()
  });
}

function getLatestToken(userId, provider) {
  const userTokens = tokens.filter(t => t.userId === userId && t.provider === provider);
  if (userTokens.length === 0) return null;
  // sort desc by id
  userTokens.sort((a, b) => b.id - a.id);
  return JSON.parse(userTokens[0].token);
}

function createJob(job) {
  const defaults = {
    status: 'pending',
    songsTotal: 0,
    songsTransferred: 0,
    createdAt: Date.now(),
    completedAt: null,
    error: null
  };
  jobs.set(job.id, { ...defaults, ...job });
}

function updateJobProgress(id, songsTransferred) {
  if (jobs.has(id)) {
    const job = jobs.get(id);
    job.songsTransferred = songsTransferred;
    jobs.set(id, job);
  }
}

function setJobStatus(id, status, error) {
  if (jobs.has(id)) {
    const job = jobs.get(id);
    job.status = status;
    job.error = error || null;
    if (['completed', 'failed'].includes(status)) {
      job.completedAt = Date.now();
    }
    jobs.set(id, job);
  }
}

function getJob(id) {
  return jobs.get(id);
}

module.exports = { createUser, saveToken, getLatestToken, createJob, updateJobProgress, setJobStatus, getJob };
