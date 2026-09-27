export const MGIT_BRANCHES: Readonly<Record<string, string>> = { '01':'CIVIL','02':'EEE','03':'MECH','04':'ECE','05':'CSE','12':'IT','14':'MCT','18':'MME','32':'CSB','66':'CSM','67':'CSD' };
export function normalizeRollNumber(input: string): string { return input.trim().toUpperCase(); }
export type ParsedRollNumber = { rollNumber:string; joiningYear:number; collegeCode:string; branchCode:string; branch:string; studentSequence:string };
export function parseRollNumber(input:string): ParsedRollNumber|null { const rollNumber=normalizeRollNumber(input); const m=rollNumber.match(/^(\d{2})(\d{3})([A-Z])(\d{2})([0-9A-Z]{2})$/); if(!m||m[3]!=='A'||!MGIT_BRANCHES[m[4]]) return null; return {rollNumber,joiningYear:2000+Number(m[1]),collegeCode:m[2],branchCode:m[4],branch:MGIT_BRANCHES[m[4]],studentSequence:m[5]}; }
export const INVALID_ROLL_MESSAGE='Invalid roll number. Please check and try again.';
