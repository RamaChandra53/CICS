import { test, expect } from '@playwright/test';
import { normalizeRollNumber, parseRollNumber } from '../../src/lib/rollNumber';

test.describe('roll number parsing', () => {
  test('normalizes whitespace and case', () => expect(normalizeRollNumber(' 26265a3201 ')).toBe('26265A3201'));
  test('parses regular and lateral structural fields without assigning section', () => {
    const regular = parseRollNumber('25261A3201');
    const lateral = parseRollNumber('26265A3201');
    expect(regular?.branch).toBe('CSB');
    expect(lateral?.joiningYear).toBe(2026);
    expect(lateral?.branchCode).toBe('32');
  });
  test('rejects unknown branch and malformed values', () => {
    expect(parseRollNumber('25261A9901')).toBeNull();
    expect(parseRollNumber('not-a-roll')).toBeNull();
  });
});
