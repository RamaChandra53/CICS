import { test, expect } from '@playwright/test';
import { formatTimeAgo } from '../../src/lib/utils';
import { generatePseudoUsername, validatePseudoUsername } from '../../src/lib/usernameGenerator';

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

  test('uses relative weeks for 7+ days ago', () => {
    const result = formatTimeAgo(dateSecsAgo(7 * 24 * 60 * 60));
    expect(result).toBe('1 week ago');
  });

  test('uses relative years for old dates', () => {
    const result = formatTimeAgo('2020-01-01T00:00:00.000Z');
    expect(result).toMatch(/^\d+ years ago$/);
  });
});

// ---------------------------------------------------------------------------
// pseudo username generation
// ---------------------------------------------------------------------------
test.describe('generatePseudoUsername', () => {
  test('returns a non-empty string', () => {
    const username = generatePseudoUsername();
    expect(typeof username).toBe('string');
    expect(username.length).toBeGreaterThan(0);
  });

  test('matches the expected PascalCase format', () => {
    const username = generatePseudoUsername();
    expect(username).toMatch(/^[A-Z][A-Za-z0-9]+$/);
  });

  test('generates a valid pseudo username', () => {
    const username = generatePseudoUsername();
    expect(validatePseudoUsername(username)).toBeNull();
  });

  test('rejects roll-number-like usernames', () => {
    expect(validatePseudoUsername('22261A0530')).toBe('Username cannot be a roll number');
  });

  test('rejects usernames with spaces', () => {
    expect(validatePseudoUsername('Campus User')).toBe('Username cannot contain spaces');
  });

  test('produces different usernames across multiple calls (probabilistic)', () => {
    const usernames = new Set(Array.from({ length: 20 }, () => generatePseudoUsername()));
    expect(usernames.size).toBeGreaterThan(1);
  });
});
