import { test, expect } from '@playwright/test';
import {
  validateMGITEmail,
  validateEmailMatchesRoll,
  maskEmail,
  extractRollFromEmail,
} from '../../src/lib/emailValidation';

// ---------------------------------------------------------------------------
// validateMGITEmail
// ---------------------------------------------------------------------------
test.describe('validateMGITEmail', () => {
  test('accepts a valid MGIT email', () => {
    expect(validateMGITEmail('student@mgit.ac.in')).toBe(true);
  });

  test('accepts email with long local part', () => {
    expect(validateMGITEmail('ashokkumar_csb253263@mgit.ac.in')).toBe(true);
  });

  test('rejects an email with wrong domain', () => {
    expect(validateMGITEmail('student@gmail.com')).toBe(false);
  });

  test('rejects an empty string', () => {
    expect(validateMGITEmail('')).toBe(false);
  });

  test('rejects a bare domain with no local part', () => {
    // "@mgit.ac.in" itself is exactly the domain, length is NOT > domain length
    expect(validateMGITEmail('@mgit.ac.in')).toBe(false);
  });

  test('rejects email that only equals the domain', () => {
    expect(validateMGITEmail('mgit.ac.in')).toBe(false);
  });

  test('rejects subdomain spoofing', () => {
    expect(validateMGITEmail('student@evil.mgit.ac.in')).toBe(false);
  });

  test('rejects email ending with mgit.ac.in but wrong domain', () => {
    // e.g. "student@notmgit.ac.in" – does not end with @mgit.ac.in
    expect(validateMGITEmail('student@notmgit.ac.in')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateEmailMatchesRoll
// ---------------------------------------------------------------------------
test.describe('validateEmailMatchesRoll', () => {
  test('returns true when email contains intake year and roll suffix', () => {
    // Roll: 22261A0501  → intakeYear=22, suffix=0501
    // Email local part: ashokkumar22_0501 → contains "22" and "0501"
    expect(validateEmailMatchesRoll('ashokkumar22_0501@mgit.ac.in', '22261A0501')).toBe(true);
  });

  test('returns false when email does not contain roll suffix', () => {
    expect(validateEmailMatchesRoll('john_smith@mgit.ac.in', '22261A0501')).toBe(false);
  });

  test('returns false for empty email', () => {
    expect(validateEmailMatchesRoll('', '22261A0501')).toBe(false);
  });

  test('returns false for empty roll number', () => {
    expect(validateEmailMatchesRoll('student22_0501@mgit.ac.in', '')).toBe(false);
  });

  test('returns false when roll number is too short (< 6 chars)', () => {
    expect(validateEmailMatchesRoll('st22@mgit.ac.in', '22261')).toBe(false);
  });

  test('returns false when only intake year matches but suffix does not', () => {
    // Roll: 22261A0501 → year=22, suffix=0501
    // Email has 22 but wrong suffix
    expect(validateEmailMatchesRoll('student22_9999@mgit.ac.in', '22261A0501')).toBe(false);
  });

  test('is case-insensitive for the local part', () => {
    // email local part is lowercased before comparison
    expect(validateEmailMatchesRoll('STUDENT22_0501@mgit.ac.in', '22261A0501')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// maskEmail
// ---------------------------------------------------------------------------
test.describe('maskEmail', () => {
  test('masks the last 3 chars of local part', () => {
    // "ashokkumar" → slice(0, -3) = "ashokku" → "ashokku***@mgit.ac.in"
    expect(maskEmail('ashokkumar@mgit.ac.in')).toBe('ashokku***@mgit.ac.in');
  });

  test('returns unchanged email if local part is 3 chars or fewer', () => {
    expect(maskEmail('ab@mgit.ac.in')).toBe('ab@mgit.ac.in');
    expect(maskEmail('abc@mgit.ac.in')).toBe('abc@mgit.ac.in');
  });

  test('returns unchanged input when there is no @ symbol', () => {
    expect(maskEmail('notanemail')).toBe('notanemail');
  });

  test('returns unchanged input for empty string', () => {
    expect(maskEmail('')).toBe('');
  });

  test('masks correctly for a local part of exactly 4 chars', () => {
    expect(maskEmail('abcd@mgit.ac.in')).toBe('a***@mgit.ac.in');
  });

  test('preserves domain after masking', () => {
    // "longname" (8 chars) → slice(0, -3) = "longn" → "longn***@gmail.com"
    const result = maskEmail('longname@gmail.com');
    expect(result).toBe('longn***@gmail.com');
  });
});

// ---------------------------------------------------------------------------
// extractRollFromEmail
// ---------------------------------------------------------------------------
test.describe('extractRollFromEmail', () => {
  test('extracts numeric sequence from a valid MGIT email', () => {
    // local part "student22261" contains the roll-like digits
    const result = extractRollFromEmail('student22261@mgit.ac.in');
    expect(result).toBe('22261');
  });

  test('returns null for a non-MGIT email', () => {
    expect(extractRollFromEmail('student@gmail.com')).toBeNull();
  });

  test('returns null for an empty string', () => {
    expect(extractRollFromEmail('')).toBeNull();
  });

  test('returns null when local part has no 4+ digit sequence', () => {
    // local part "abc" → no 4+ digit match
    expect(extractRollFromEmail('abc@mgit.ac.in')).toBeNull();
  });

  test('extracts first long numeric sequence when multiple exist', () => {
    const result = extractRollFromEmail('ab1234_5678@mgit.ac.in');
    expect(result).toBe('1234');
  });
});
