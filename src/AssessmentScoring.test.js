import { getDrivingScores } from './Driving-minigame';
import { calculateScore } from './RobotEmotionGame';
import { buildUmbrellaResult } from './UmbrellaDilemma';
import { getAssessmentOutcome } from './App';

test.each([
  [{ robot: 0, cat: 0, elder: 0 }, 0, 0, 0],
  [{ robot: 12, cat: 0, elder: 0 }, 50, 0, 0],
  [{ robot: 0, cat: 12, elder: 0 }, 25, 25, 80],
  [{ robot: 0, cat: 0, elder: 12 }, 40, 10, 0],
  [{ robot: 0, cat: 3, elder: 3 }, 16, 9, 20],
])('applies the umbrella payoffs in proportion to shelter time', (shelter, rainProtection, empathy, ecology) => {
  const result = buildUmbrellaResult({ elapsed: 12, blocked: 150, shelter });
  expect(result.scores).toEqual({ rainProtection, empathy, ecology });
});

test('scores a complete emotion shape higher than a partial shape', () => {
  const scowl = Array.from({ length: 17 }, (_, index) => {
    const offset = index - 8;
    return `${21 + offset},${Math.abs(offset) > 6 ? 21 : 20}`;
  });
  expect(calculateScore([], 'anger')).toBe(0);
  expect(calculateScore(scowl.slice(0, 1), 'anger')).toBeLessThan(50);
  expect(calculateScore(scowl, 'anger')).toBe(100);
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
