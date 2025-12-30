const wait = ms => new Promise(r => setTimeout(r, ms));

async function retry(fn, opts = {}) {
  const attempts = opts.attempts || 4;
  const base = opts.base || 200; // ms
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      const last = i === attempts - 1;
      const retryable = !err || !err.response || err.response.status >= 500 || err.response.status === 429;
      if (last || !retryable) throw err;
      const backoff = base * Math.pow(2, i) + Math.floor(Math.random() * base);
      await wait(backoff);
    }
  }
}

module.exports = { retry };
