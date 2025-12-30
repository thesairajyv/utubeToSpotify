const { retry } = require('../utils/retry');

test('retry succeeds after transient failures', async () => {
  let count = 0;
  const fn = jest.fn(async () => {
    count++;
    if (count < 3) throw { response: { status: 500 } };
    return 'ok';
  });
  const res = await retry(fn, { attempts: 4, base: 10 });
  expect(res).toBe('ok');
  expect(fn).toHaveBeenCalledTimes(3);
});
