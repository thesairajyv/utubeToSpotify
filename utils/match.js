function normalize(s) {
  if (!s) return '';
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ') // remove parentheses
    .replace(/ft\.|feat\.|featuring/gi, ' ')
    .replace(/[^a-z0-9\s]/g, ' ') // remove punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSetScore(a, b) {
  const na = normalize(a).split(' ').filter(Boolean);
  const nb = normalize(b).split(' ').filter(Boolean);
  if (!na.length || !nb.length) return 0;
  const aset = new Set(na);
  const common = nb.filter(x => aset.has(x)).length;
  // score based on overlap and lengths
  return common / Math.max(na.length, nb.length);
}

module.exports = { normalize, tokenSetScore };
