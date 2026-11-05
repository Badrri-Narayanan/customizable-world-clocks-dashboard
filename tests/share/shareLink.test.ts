import { buildShareUrl, clearShareHash, parseShareHash } from '../../src/share/shareLink';

const known = new Set(['a', 'b', 'chennai-tamil-nadu-in']);

test('round-trips ids through a URL', () => {
  const url = buildShareUrl(['a', 'chennai-tamil-nadu-in'], 'https://x.test/');
  expect(url).toBe('https://x.test/#/share?c=a,chennai-tamil-nadu-in');
  expect(parseShareHash(new URL(url).hash, known)).toEqual(['a', 'chennai-tamil-nadu-in']);
});

test('non-share hash → null', () => {
  expect(parseShareHash('', known)).toBeNull();
  expect(parseShareHash('#/other', known)).toBeNull();
});

describe('bad links (Review Focus 2)', () => {
  test('empty list', () => {
    expect(parseShareHash('#/share?c=', known)).toEqual([]);
    expect(parseShareHash('#/share', known)).toEqual([]);
  });
  test('unknown, duplicate and malformed ids are dropped without throwing', () => {
    expect(parseShareHash('#/share?c=a,zzz,a,%%%', known)).toEqual(['a']);
  });
  test('capped at 100 ids', () => {
    const many = Array.from({ length: 150 }, (_, i) => `id${i}`);
    expect(parseShareHash(`#/share?c=${many.join(',')}`, new Set(many))).toHaveLength(100);
  });
});

test('clearShareHash removes the hash but keeps path and query', () => {
  history.replaceState(null, '', '/app/?x=1#/share?c=a');
  clearShareHash();
  expect(location.pathname + location.search + location.hash).toBe('/app/?x=1');
});
