import { getDrivingScores } from './Driving-minigame';
import { calculateScore } from './RobotEmotionGame';
import { buildUmbrellaResult } from './UmbrellaDilemma';
import { getAssessmentOutcome } from './App';

test.each([
  [{ robot: 0, cat: 0, elder: 0 }, 0, 0, 0],
  [{ robot: 0, cat: 1.99, elder: 0 }, 0, 0, 0],
  [{ robot: 0, cat: 2, elder: 0 }, 15, 10, 20],
  [{ robot: 0, cat: 4.99, elder: 0 }, 15, 10, 20],
  [{ robot: 0, cat: 5, elder: 0 }, 30, 20, 40],
  [{ robot: 0, cat: 8, elder: 0 }, 40, 30, 60],
  [{ robot: 11, cat: 0, elder: 0 }, 80, 0, 0],
  [{ robot: 0, cat: 11, elder: 0 }, 50, 40, 80],
  [{ robot: 0, cat: 0, elder: 11 }, 65, 25, 0],
  [{ robot: 5, cat: 5, elder: 2 }, 88, 26, 40],
])('calculates umbrella scores', (shelter, rainProtection, empathy, ecology) => {
  const result = buildUmbrellaResult({ elapsed: 12, blocked: 150, shelter });
  expect(result.scores).toEqual({ rainProtection, empathy, ecology });
});

test('scores the anger drawing higher when it includes both eyebrows', () => {
  const mouth = Array.from({ length: 17 }, (_, index) => {
    const offset = index - 8;
    return `${21 + offset},${Math.abs(offset) > 6 ? 21 : 20}`;
  });
  const leftBrow = Array.from({ length: 8 }, (_, index) => `${10 + index},${5 + Math.round(index * 4 / 7)}`);
  const rightBrow = Array.from({ length: 8 }, (_, index) => `${32 - index},${5 + Math.round(index * 4 / 7)}`);
  const scowl = [...mouth, ...leftBrow, ...rightBrow];
  const roughScowl = scowl.map((pixel, index) => {
    const [x, y] = pixel.split(',').map(Number);
    return `${x + 2},${y + 1 + (index % 3 === 0 ? 1 : 0)}`;
  });
  const widerScowl = [...mouth, ...[...leftBrow, ...rightBrow].map((pixel) => {
    const [x, y] = pixel.split(',').map(Number);
    return `${x < 21 ? x - 1 : x + 1},${y - 2}`;
  })];

  expect(calculateScore([], 'anger')).toBe(0);
  expect(calculateScore(mouth, 'anger')).toBeLessThan(50);
  expect(calculateScore([...mouth, ...leftBrow], 'anger')).toBeLessThan(calculateScore(roughScowl, 'anger'));
  expect(calculateScore(roughScowl, 'anger')).toBeGreaterThanOrEqual(75);
  expect(calculateScore(widerScowl, 'anger')).toBeGreaterThanOrEqual(90);
  expect(calculateScore(scowl, 'anger')).toBe(100);
});

test('accepts a rough smile while penalizing flat, inverted, and cluttered drawings', () => {
  const offsets = Array.from({ length: 19 }, (_, index) => index - 9);
  const curve = (x) => Math.round(4 * (1 - Math.pow(Math.abs(x) / 9, 1.65)));
  const smile = offsets.map((x) => `${21 + x},${18 + curve(x)}`);
  const roughSmile = offsets.map((x, index) => (
    `${24 + x},${16 + curve(x) + (index % 3 === 0 ? 1 : 0)}`
  ));
  const flatLine = offsets.map((x) => `${21 + x},20`);
  const frown = offsets.map((x) => `${21 + x},${22 - curve(x)}`);
  const clutteredSmile = [...smile, ...offsets.map((x) => `${21 + x},13`)];

  expect(calculateScore(roughSmile, 'joy')).toBeGreaterThanOrEqual(75);
  expect(calculateScore(flatLine, 'joy')).toBeLessThan(65);
  expect(calculateScore(frown, 'joy')).toBeLessThan(55);
  expect(calculateScore(clutteredSmile, 'joy')).toBeLessThan(65);
});

test.each([
  ['left', 80, 50],
  ['right', 0, 50],
  ['both', 0, 0],
])('scores ecology and adaptability when driving hits %s', (collision, Ecology, Adaptability) => {
  expect(getDrivingScores(collision)).toEqual({ Ecology, Adaptability });
});

test.each([
  [30, 60, 80, 80, 50, 60, true],
  [38, 83, 40, 90, 50, 60.2, true],
  [29, 100, 100, 100, 50, 75.8, false],
  [30, 59, 80, 80, 50, 59.8, false],
])('requires both the per-statistic floor and the average', (Preservation, Empathy, Ecology, Cooperation, Adaptability, average, passed) => {
  expect(getAssessmentOutcome({ Preservation, Empathy, Ecology, Cooperation, Adaptability }))
    .toEqual({ average, passed });
});
