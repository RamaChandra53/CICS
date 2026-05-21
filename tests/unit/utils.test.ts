import { test, expect } from '@playwright/test';
import { formatTimeAgo, generateAnonUsername } from '../../src/lib/utils';

// ---------------------------------------------------------------------------
// formatTimeAgo
// ---------------------------------------------------------------------------
test.describe('formatTimeAgo', () => {
  function dateSecsAgo(seconds: number): string {
    return new Date(Date.now() - seconds * 1000).toISOString();
  }

  test('returns "just now" for timestamps less than 60 seconds ago', () => {
    expect(formatTimeAgo(dateSecsAgo(0))).toBe('just now');
    expect(formatTimeAgo(dateSecsAgo(30))).toBe('just now');
    expect(formatTimeAgo(dateSecsAgo(59))).toBe('just now');
  });

  test('returns "1 min ago" for exactly 60 seconds ago', () => {
    expect(formatTimeAgo(dateSecsAgo(60))).toBe('1 min ago');
  });

  test('uses singular "min" for 1 minute', () => {
    expect(formatTimeAgo(dateSecsAgo(90))).toBe('1 min ago');
  });

  test('uses plural "mins" for 2+ minutes', () => {
    expect(formatTimeAgo(dateSecsAgo(120))).toBe('2 mins ago');
    expect(formatTimeAgo(dateSecsAgo(59 * 60))).toBe('59 mins ago');
  });

  test('returns "1 hour ago" for exactly 60 minutes ago', () => {
    expect(formatTimeAgo(dateSecsAgo(60 * 60))).toBe('1 hour ago');
  });

  test('uses singular "hour" for 1 hour', () => {
    expect(formatTimeAgo(dateSecsAgo(90 * 60))).toBe('1 hour ago');
  });

  test('uses plural "hours" for 2+ hours', () => {
    expect(formatTimeAgo(dateSecsAgo(2 * 60 * 60))).toBe('2 hours ago');
    expect(formatTimeAgo(dateSecsAgo(23 * 60 * 60))).toBe('23 hours ago');
  });

  test('returns "1 day ago" for exactly 24 hours ago', () => {
    expect(formatTimeAgo(dateSecsAgo(24 * 60 * 60))).toBe('1 day ago');
  });

  test('uses singular "day" for 1 day', () => {
    expect(formatTimeAgo(dateSecsAgo(36 * 60 * 60))).toBe('1 day ago');
  });

  test('uses plural "days" for 2-6 days ago', () => {
    expect(formatTimeAgo(dateSecsAgo(2 * 24 * 60 * 60))).toBe('2 days ago');
    expect(formatTimeAgo(dateSecsAgo(6 * 24 * 60 * 60))).toBe('6 days ago');
  });

  test('falls back to locale date string for 7+ days ago', () => {
    const oldDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result = formatTimeAgo(oldDate.toISOString());
    expect(result).toBe(oldDate.toLocaleDateString());
  });

  test('falls back to locale date string for old dates', () => {
    const result = formatTimeAgo('2020-01-01T00:00:00.000Z');
    expect(result).toBe(new Date('2020-01-01T00:00:00.000Z').toLocaleDateString());
  });
});

// ---------------------------------------------------------------------------
// generateAnonUsername
// ---------------------------------------------------------------------------
test.describe('generateAnonUsername', () => {
  const ADJECTIVES = ['Red', 'Blue', 'Green', 'Purple', 'Gold', 'Silver', 'Dark', 'Bright', 'Swift', 'Bold'];
  const ANIMALS = ['Panda', 'Falcon', 'Tiger', 'Eagle', 'Wolf', 'Fox', 'Hawk', 'Bear', 'Lion', 'Shark'];

  test('returns a non-empty string', () => {
    const username = generateAnonUsername();
    expect(typeof username).toBe('string');
    expect(username.length).toBeGreaterThan(0);
  });

  test('matches the expected format: AdjectiveAnimal_N', () => {
    const username = generateAnonUsername();
    // Pattern: starts with known adjective, then animal, underscore, 1-2 digit number
    const pattern = /^[A-Z][a-z]+[A-Z][a-z]+_\d{1,2}$/;
    expect(username).toMatch(pattern);
  });

  test('contains a known adjective', () => {
    const username = generateAnonUsername();
    const hasAdj = ADJECTIVES.some(adj => username.startsWith(adj));
    expect(hasAdj).toBe(true);
  });

  test('contains a known animal', () => {
    const username = generateAnonUsername();
    const hasAnimal = ANIMALS.some(animal => username.includes(animal));
    expect(hasAnimal).toBe(true);
  });

  test('number suffix is between 0 and 99', () => {
    const username = generateAnonUsername();
    const numStr = username.split('_')[1];
    const num = parseInt(numStr, 10);
    expect(num).toBeGreaterThanOrEqual(0);
    expect(num).toBeLessThanOrEqual(99);
  });

  test('produces different usernames across multiple calls (probabilistic)', () => {
    // With 10 adjectives × 10 animals × 100 numbers = 10000 combinations,
    // the chance of 5 consecutive identical results is astronomically low.
    const usernames = new Set(Array.from({ length: 20 }, () => generateAnonUsername()));
    expect(usernames.size).toBeGreaterThan(1);
  });
});
