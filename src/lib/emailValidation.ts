/**
 * Email validation utilities for MGIT college email verification
 */

/**
 * Validates if an email matches the MGIT college domain format
 * @param email - Email address to validate
 * @returns boolean indicating if email is valid MGIT format
 */
export function validateMGITEmail(email: string): boolean {
  return email.endsWith('@mgit.ac.in') && email.length > '@mgit.ac.in'.length;
}

/**
 * Validates if the email matches the user's roll number
 * Email local part must include intake year (first 2 digits) and last 4 digits of roll number
 * @param email - College email address
 * @param rollNumber - User's roll number
 * @returns boolean indicating if email matches roll number
 */
export function validateEmailMatchesRoll(email: string, rollNumber: string): boolean {
  if (!email || !rollNumber) return false;
  
  // Extract part before @
  const localPart = email.split('@')[0]?.toLowerCase(); // e.g. ashokkumar_csb253263
  
  if (!localPart) return false;
  
  const normalizedRoll = rollNumber.trim();
  if (normalizedRoll.length < 6) return false;

  // Intake year is first 2 digits
  const intakeYear = normalizedRoll.slice(0, 2);

  // Get last 4 digits of roll number
  const rollSuffix = normalizedRoll.slice(-4); // e.g. 0512
  
  return localPart.includes(intakeYear) && localPart.includes(rollSuffix);
}

/**
 * Masks email for display purposes
 * @param email - Email to mask
 * @returns Masked email (e.g. ashokkumar_csb***@mgit.ac.in)
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 3) return email;
  
  const maskedLocal = localPart.slice(0, -3) + '***';
  return `${maskedLocal}@${domain}`;
}

/**
 * Extracts roll number from MGIT email
 * @param email - MGIT email address
 * @returns Roll number if found, null otherwise
 */
export function extractRollFromEmail(email: string): string | null {
  if (!validateMGITEmail(email)) return null;
  
  const localPart = email.split('@')[0];
  
  // Look for patterns that match roll numbers (usually 6-10 digits with possible letters)
  const rollPattern = /(\d{4,})/;
  const match = localPart.match(rollPattern);
  
  return match ? match[1] : null;
}
