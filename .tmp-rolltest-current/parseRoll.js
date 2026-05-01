"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INVALID_ROLL_MESSAGE = void 0;
exports.parseRollNumber = parseRollNumber;
const YEAR_MAP = {
    '25': '1',
    '24': '2',
    '23': '3',
    '22': '4',
};
const YEAR_LABEL_MAP = {
    '1': '1st',
    '2': '2nd',
    '3': '3rd',
    '4': '4th',
};
const BRANCH_MAP = {
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
exports.INVALID_ROLL_MESSAGE = INVALID_ROLL_MESSAGE;
function toBase36Value(value) {
    return parseInt(value, 36);
}
function isWithinRange(value, start, end) {
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
function resolveSection(branch, sectionKey) {
    if (branch === 'CSE') {
        if (isWithinRange(sectionKey, '0501', '0565'))
            return '1';
        if (isWithinRange(sectionKey, '0566', '05C9'))
            return '2';
        if (isWithinRange(sectionKey, '05D0', '05K3'))
            return '3';
        if (isWithinRange(sectionKey, '05K4', '05R7'))
            return '4';
        if (isWithinRange(sectionKey, '05R8', '05Z1'))
            return '5';
        return null;
    }
    if (branch === 'ECE') {
        if (isWithinRange(sectionKey, '0465', '04C8'))
            return '2';
        if (isWithinRange(sectionKey, '04C9', '04K2'))
            return '3';
        if (isWithinRange(sectionKey, '0401', '0464'))
            return '1';
        return null;
    }
    return '1';
}
function parseRollNumber(roll) {
    const normalized = roll.trim().toUpperCase();
    if (normalized.length !== 10)
        return null;
    const match = normalized.match(/^(22|23|24|25)(261)A([0-9]{2})([0-9A-Z]{2})$/);
    if (!match)
        return null;
    const intakeYear = match[1];
    const branchCode = match[3];
    const studentCode = match[4];
    const yearNumber = YEAR_MAP[intakeYear];
    const branch = BRANCH_MAP[branchCode];
    if (!yearNumber || !branch)
        return null;
    const sectionKey = `${branchCode}${studentCode}`;
    const section = resolveSection(branch, sectionKey);
    if (!section)
        return null;
    return {
        year: YEAR_LABEL_MAP[yearNumber],
        yearNumber,
        branch,
        section,
    };
}
