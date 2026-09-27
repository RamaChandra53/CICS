import { parseRollNumber, normalizeRollNumber, INVALID_ROLL_MESSAGE, MGIT_BRANCHES } from './rollNumber';
export { parseRollNumber, normalizeRollNumber, INVALID_ROLL_MESSAGE, MGIT_BRANCHES };
export function getCurrentYear(rollNumber:string):string { const p=parseRollNumber(rollNumber); if(!p)return 'Alumni'; const n=new Date(); const ay=n.getMonth()>=6?n.getFullYear():n.getFullYear()-1; const d=ay-p.joiningYear; return ({0:'1st',1:'2nd',2:'3rd',3:'4th'} as Record<number,string>)[d] ?? (d<0?'1st':'Alumni'); }
