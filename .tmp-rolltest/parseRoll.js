"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRollNumber = parseRollNumber;
const YEAR_MAP = {
    '25': '1st',
    '24': '2nd',
    '23': '3rd',
    '22': '4th',
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
function decodeBase36Pair(value) {
    const parsed = Number.parseInt(value, 36);
    if (Number.isNaN(parsed)) {
        throw new Error('Invalid student number in roll number.');
    }
    return parsed;
}
function getCseSection(studentCode) {
    const rollIndex = decodeBase36Pair(studentCode);
    if (rollIndex < 1 || rollIndex > decodeBase36Pair('Z1')) {
        throw new Error('Unsupported CSE student number range in roll number.');
    }
    if (rollIndex <= decodeBase36Pair('65'))
        return '1';
    if (rollIndex <= decodeBase36Pair('C9'))
        return '2';
    if (rollIndex <= decodeBase36Pair('K3'))
        return '3';
    if (rollIndex <= decodeBase36Pair('R7'))
        return '4';
    return '5';
}
function parseRollNumber(roll) {
    const normalized = roll.trim().toUpperCase();
    if (normalized.length < 10) {
        throw new Error('Roll number is too short to parse.');
    }
    const yearCode = normalized.slice(0, 2);
    const branchCode = normalized.slice(6, 8);
    const studentCode = normalized.slice(8, 10);
    const year = YEAR_MAP[yearCode];
    if (!year) {
        throw new Error('Unknown intake year in roll number.');
    }
    const branch = BRANCH_MAP[branchCode];
    if (!branch) {
        throw new Error('Unknown branch code in roll number.');
    }
    const section = branch === 'CSE' ? getCseSection(studentCode) : '1';
    return { year, branch, section };
}
