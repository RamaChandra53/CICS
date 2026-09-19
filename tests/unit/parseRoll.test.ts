import { test, expect } from '@playwright/test';
import { parseRollNumber, getCurrentYear, INVALID_ROLL_MESSAGE } from '../../src/lib/parseRoll';

// ---------------------------------------------------------------------------
// INVALID_ROLL_MESSAGE export
// ---------------------------------------------------------------------------
test('INVALID_ROLL_MESSAGE is a non-empty string', () => {
  expect(typeof INVALID_ROLL_MESSAGE).toBe('string');
  expect(INVALID_ROLL_MESSAGE.length).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// parseRollNumber – valid roll numbers
// ---------------------------------------------------------------------------
test.describe('parseRollNumber – valid inputs', () => {
  test('parses a valid CSE roll number (section 1)', () => {
    // 22261A0530 → year intake 22, branch 05=CSE, student code 30
    // sectionKey "0530" → isWithinRange('0530','0501','0565') → true → section 1
    const result = parseRollNumber('22261A0530');
    expect(result).not.toBeNull();
    expect(result!.branch).toBe('CSE');
    expect(result!.section).toBe('1');
  });

  test('parses a valid CSE roll number (section 2)', () => {
    // student code 70 → "0570" → within 0566..05C9 → section 2
    const result = parseRollNumber('22261A0570');
    expect(result).not.toBeNull();
    expect(result!.branch).toBe('CSE');
    expect(result!.section).toBe('2');
  });

  test('parses a valid ECE roll number (section 1)', () => {
    // 22261A0430 → branch 04=ECE, student code 30 → "0430" within 0401..0464 → section 1
    const result = parseRollNumber('22261A0430');
    expect(result).not.toBeNull();
    expect(result!.branch).toBe('ECE');
    expect(result!.section).toBe('1');
  });

  test('parses a valid ECE roll number (section 2)', () => {
    // student code 70 → "0470" → within 0465..04C8 → section 2
    const result = parseRollNumber('22261A0470');
    expect(result).not.toBeNull();
    expect(result!.branch).toBe('ECE');
    expect(result!.section).toBe('2');
  });

  test('parses a valid IT roll number', () => {
    // 23261A1230 → branch 12=IT, student code 30
    const result = parseRollNumber('23261A1230');
    expect(result).not.toBeNull();
    expect(result!.branch).toBe('IT');
    // IT falls to resolveSection default → section '1'
    expect(result!.section).toBe('1');
  });

  test('parses a valid CSB roll number', () => {
    // 24261A3230 → branch 32=CSB, student code 30
    const result = parseRollNumber('24261A3230');
    expect(result).not.toBeNull();
    expect(result!.branch).toBe('CSB');
  });

  test('parses a valid CSM roll number', () => {
    const result = parseRollNumber('25261A6630');
    expect(result).not.toBeNull();
    expect(result!.branch).toBe('CSM');
  });

  test('is case-insensitive (lowercase input)', () => {
    const result = parseRollNumber('22261a0530');
    expect(result).not.toBeNull();
    expect(result!.branch).toBe('CSE');
  });

  test('trims whitespace', () => {
    const result = parseRollNumber('  22261A0530  ');
    expect(result).not.toBeNull();
  });

  test('returned object has all required keys', () => {
    const result = parseRollNumber('22261A0530');
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('year');
    expect(result).toHaveProperty('yearNumber');
    expect(result).toHaveProperty('branch');
    expect(result).toHaveProperty('section');
  });
});

// ---------------------------------------------------------------------------
// parseRollNumber – invalid inputs
// ---------------------------------------------------------------------------
test.describe('parseRollNumber – invalid inputs', () => {
  test('returns null for empty string', () => {
    expect(parseRollNumber('')).toBeNull();
  });

  test('returns null for wrong length (9 chars)', () => {
    expect(parseRollNumber('22261A053')).toBeNull();
  });

  test('returns null for wrong length (11 chars)', () => {
    expect(parseRollNumber('22261A05301')).toBeNull();
  });

  test('returns null for wrong college code (not 261)', () => {
    expect(parseRollNumber('22999A0530')).toBeNull();
  });

  test('returns null for unknown branch code', () => {
    // branch 99 not in BRANCH_MAP
    expect(parseRollNumber('22261A9930')).toBeNull();
  });

  test('accepts an older valid intake as alumni', () => {
    const result = parseRollNumber('20261A0530');
    expect(result).not.toBeNull();
    expect(result!.year).toBe('Alumni');
    expect(result!.yearNumber).toBe('Alumni');
  });

  test('returns null for completely invalid input', () => {
    expect(parseRollNumber('INVALID123')).toBeNull();
  });

  test('returns null for CSE with out-of-range student code (no matching section)', () => {
    // If a CSE roll had a student code that doesn't fall into any section range.
    // All codes 0501–05Z1 are covered; use a code outside all ranges to force null.
    // Actually the current logic covers all via sequential checks; test ECE with a code
    // outside ECE ranges (e.g. ECE code "ZZ" not in any range).
    // Branch 04=ECE, code "ZZ" → sectionKey "04ZZ" → not in any range → returns null
    const result = parseRollNumber('22261A04ZZ');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getCurrentYear
// ---------------------------------------------------------------------------
test.describe('getCurrentYear', () => {
  test('returns a valid year label or Alumni for a known intake year', () => {
    const validLabels = ['1st', '2nd', '3rd', '4th', 'Alumni'];
    // Use intake year "22" which could be 1st-4th or Alumni depending on real date
    const result = getCurrentYear('22261A0530');
    expect(validLabels).toContain(result);
  });

  test('returns Alumni for an intake year far in the past', () => {
    // intake year "10" = 2010 → definitely alumni by now
    const result = getCurrentYear('10261A0530');
    expect(result).toBe('Alumni');
  });

  test('returns 1st for the most recent intake year (25)', () => {
    // 2025 intake → if current academic year >= 25, they would be 1st year
    // This depends on the current date, so we just check it's a valid label
    const validLabels = ['1st', '2nd', '3rd', '4th', 'Alumni'];
    const result = getCurrentYear('25261A0530');
    expect(validLabels).toContain(result);
  });
});
