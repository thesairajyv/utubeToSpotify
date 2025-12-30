const { normalize, tokenSetScore } = require('../utils/match');

test('normalize removes punctuation and parentheses', () => {
  expect(normalize('Song Title (Official Video)')).toBe('song title official video');
  expect(normalize("Artist ft. Someone")).toBe('artist someone');
});

test('tokenSetScore computes overlap', () => {
  const a = 'Hello World feat. Friend';
  const b = 'Hello World';
  const s = tokenSetScore(a, b);
  expect(s).toBeGreaterThan(0.5);
});
