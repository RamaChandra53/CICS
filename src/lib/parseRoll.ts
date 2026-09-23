type ParsedRoll = {
  year: string;
  yearNumber: string;
  branch: string;
  section: string;
};

const BRANCH_MAP: Record<string, string> = {
  '01': 'CIVIL',
  '02': 'EEE',
  '03': 'MECH',
  '04': 'ECE',
  '05': 'CSE',
  '12': 'IT',
  '14': 'MCT',
  '18': 'MME',
  '32': 'CSB',
  '66': 'CSM',
  '67': 'CSD',
};

const INVALID_ROLL_MESSAGE = 'Invalid roll number. Please check and try again.';

function toBase36Value(value: string) {
  return parseInt(value, 36);
}

function isWithinRange(value: string, start: string, end: string) {
  const valueNumber = toBase36Value(value);
  const startNumber = toBase36Value(start);
  const endNumber = toBase36Value(end);

  if (Number.isNaN(valueNumber) || Number.isNaN(startNumber) || Number.isNaN(endNumber)) {
    return false;
  }

  const lower = Math.min(startNumber, endNumber);
  const upper = Math.max(startNumber, endNumber);
  return valueNumber >= lower && valueNumber <= upper;
}

function resolveSection(branch: string, sectionKey: string) {
  if (branch === 'CSE') {
    if (isWithinRange(sectionKey, '0501', '0565')) return '1';
    if (isWithinRange(sectionKey, '0566', '05C9')) return '2';
    if (isWithinRange(sectionKey, '05D0', '05K3')) return '3';
    if (isWithinRange(sectionKey, '05K4', '05R7')) return '4';
    if (isWithinRange(sectionKey, '05R8', '05Z1')) return '5';
    return null;
  }

  if (branch === 'ECE') {
    if (isWithinRange(sectionKey, '0465', '04C8')) return '2';
    if (isWithinRange(sectionKey, '04C9', '04K2')) return '3';
    if (isWithinRange(sectionKey, '0401', '0464')) return '1';
    return null;
  }

  return '1';
}

export function getCurrentYear(rollNumber: string): string {
  const intakeYear = parseInt(rollNumber.slice(0, 2))
  const now = new Date()
  // Academic year starts in July
  const academicYear = now.getMonth() >= 6 
    ? now.getFullYear() % 100 
    : (now.getFullYear() - 1) % 100
  
  const diff = academicYear - intakeYear
  
  if (diff < 0) return '1st';

  const yearMap: Record<number, string> = {
    0: '1st',
    1: '2nd',
    2: '3rd',
    3: '4th',
  }
  
  return yearMap[diff] ?? 'Alumni'
}

export function parseRollNumber(roll: string): ParsedRoll | null {
  const normalized = roll.trim().toUpperCase();
  if (normalized.length !== 10) return null;

  const match = normalized.match(/^([0-9]{2})(261)A([0-9]{2})([0-9A-Z]{2})$/);
  if (!match) return null;

  const branchCode = match[3];
  const studentCode = match[4];

  const branch = BRANCH_MAP[branchCode];
  if (!branch) return null;

  const sectionKey = `${branchCode}${studentCode}`;
  const section = resolveSection(branch, sectionKey);
  if (!section) return null;

  // Use dynamic year calculation
  const currentYear = getCurrentYear(normalized);
  let yearNumber: string;
  
  if (currentYear === 'Alumni') {
    yearNumber = 'Alumni';
  } else {
    // Map year labels back to numbers for compatibility
    const labelToNumber: Record<string, string> = {
      '1st': '1',
      '2nd': '2',
      '3rd': '3',
      '4th': '4',
    };
    yearNumber = labelToNumber[currentYear] || '1';
  }

  return {
    year: currentYear,
    yearNumber,
    branch,
    section,
  };
}

export { INVALID_ROLL_MESSAGE };
