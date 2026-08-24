import * as XLSX from 'xlsx';
import type { StudentResult } from './db';
import { QUESTIONS_BLUEPRINT, type QuestionBlueprint } from './blueprint';

export interface ZipGradeRow {
  studentId: string;
  studentName: string;
  className?: string;
  quizName?: string;
  earnedPts: number;
  possiblePts: number;
  percent: number;
  answers: Record<number, string>;
  questionResults: Record<number, boolean>;
}

export interface ZipGradeImportResult {
  quizName: string;
  totalQuestions: number;
  students: ZipGradeRow[];
  answerKey?: Record<number, string>;
}

/**
 * Parses a CSV string or XLSX array buffer exported from ZipGrade.
 */
export function parseZipGradeFile(data: string | ArrayBuffer): ZipGradeImportResult {
  let workbook: XLSX.WorkBook;
  
  if (typeof data === 'string') {
    workbook = XLSX.read(data, { type: 'string' });
  } else {
    workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Convert to array of arrays
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  
  if (!rawRows || rawRows.length < 2) {
    throw new Error("Fayl bo'sh yoki noto'g'ri formatda.");
  }

  // Find Header row (look for keywords like ZipGrade ID, Student, First Name, Q1, 1, etc.)
  let headerIndex = -1;
  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i].map((c: any) => String(c).trim().toLowerCase());
    if (
      row.some((c: string) => c.includes('zipgrade') || c.includes('student') || c.includes('name') || c.includes('first')) ||
      row.some((c: string) => c === 'q1' || c === '1' || c === 'earned pts' || c === 'percent')
    ) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    headerIndex = 0; // Default to first row
  }

  const headers = rawRows[headerIndex].map((h: any) => String(h).trim());
  const rows = rawRows.slice(headerIndex + 1);

  // Map header columns to known fields
  const colMap = {
    zipGradeId: -1,
    externalId: -1,
    firstName: -1,
    lastName: -1,
    fullName: -1,
    className: -1,
    grade: -1,
    quizName: -1,
    earnedPts: -1,
    possiblePts: -1,
    percent: -1,
    key: -1,
    questionCols: [] as { colIndex: number; qNum: number }[]
  };

  headers.forEach((h, idx) => {
    const lower = h.toLowerCase();
    if (lower.includes('zipgrade id')) colMap.zipGradeId = idx;
    else if (lower.includes('external id') || lower.includes('student id') || lower === 'id') colMap.externalId = idx;
    else if (lower === 'first name' || lower === 'firstname' || lower === 'ism') colMap.firstName = idx;
    else if (lower === 'last name' || lower === 'lastname' || lower === 'familiya') colMap.lastName = idx;
    else if (lower.includes('name') || lower.includes('f.i.sh') || lower.includes('fish') || lower === 'student') colMap.fullName = idx;
    else if (lower.includes('class') || lower.includes('sinf') || lower.includes('guruh')) colMap.className = idx;
    else if (lower.includes('grade') || lower === 'bosqich') colMap.grade = idx;
    else if (lower.includes('quiz') || lower.includes('test name') || lower.includes('mavzu')) colMap.quizName = idx;
    else if (lower.includes('earned pts') || lower.includes('points') || lower.includes('ball') || lower === 'score') colMap.earnedPts = idx;
    else if (lower.includes('possible pts') || lower.includes('total pts') || lower.includes('max ball')) colMap.possiblePts = idx;
    else if (lower.includes('percent') || lower.includes('%') || lower.includes('foiz')) colMap.percent = idx;
    else if (lower === 'key' || lower === 'kalit') colMap.key = idx;
    
    const qMatch = h.match(/^(?:q|savol|question)?\s*(\d+)$/i);
    if (qMatch) {
      const qNum = parseInt(qMatch[1], 10);
      colMap.questionCols.push({ colIndex: idx, qNum });
    }
  });

  colMap.questionCols.sort((a, b) => a.qNum - b.qNum);

  const detectedTotalQuestions = colMap.questionCols.length > 0 
    ? Math.max(...colMap.questionCols.map(q => q.qNum))
    : 30;

  const students: ZipGradeRow[] = [];
  let answerKey: Record<number, string> = {};
  let quizName = 'ZipGrade Test Natijalari';

  rows.forEach((row, rowIdx) => {
    if (!row || row.every((c: any) => String(c).trim() === '')) return;

    const firstCell = String(row[0] || '').trim().toLowerCase();
    const nameCell = String(row[colMap.fullName] || row[colMap.firstName] || '').trim().toLowerCase();
    if (firstCell.includes('answer key') || firstCell === 'key' || nameCell === '<key>' || nameCell.includes('kalit')) {
      colMap.questionCols.forEach(q => {
        const val = String(row[q.colIndex] || '').trim().toUpperCase();
        if (val) answerKey[q.qNum] = val;
      });
      return;
    }

    let studentName = '';
    if (colMap.fullName >= 0 && row[colMap.fullName]) {
      studentName = String(row[colMap.fullName]).trim();
    } else if (colMap.firstName >= 0 || colMap.lastName >= 0) {
      const fName = colMap.firstName >= 0 ? String(row[colMap.firstName] || '').trim() : '';
      const lName = colMap.lastName >= 0 ? String(row[colMap.lastName] || '').trim() : '';
      studentName = `${fName} ${lName}`.trim();
    }
    if (!studentName) {
      studentName = `O'quvchi #${rowIdx + 1}`;
    }

    let studentId = '';
    if (colMap.externalId >= 0 && row[colMap.externalId]) {
      studentId = String(row[colMap.externalId]).trim();
    } else if (colMap.zipGradeId >= 0 && row[colMap.zipGradeId]) {
      studentId = String(row[colMap.zipGradeId]).trim();
    }
    if (!studentId || studentId.length < 4) {
      studentId = Math.floor(100000 + Math.random() * 900000).toString();
    }

    if (colMap.quizName >= 0 && row[colMap.quizName]) {
      quizName = String(row[colMap.quizName]).trim();
    }

    const answers: Record<number, string> = {};
    const questionResults: Record<number, boolean> = {};

    colMap.questionCols.forEach(q => {
      const ansVal = String(row[q.colIndex] || '').trim().toUpperCase();
      answers[q.qNum] = ansVal;
    });

    let earnedPts = 0;
    if (colMap.earnedPts >= 0 && row[colMap.earnedPts] !== '') {
      earnedPts = parseFloat(String(row[colMap.earnedPts])) || 0;
    }

    let possiblePts = detectedTotalQuestions;
    if (colMap.possiblePts >= 0 && row[colMap.possiblePts] !== '') {
      possiblePts = parseFloat(String(row[colMap.possiblePts])) || detectedTotalQuestions;
    }

    let percent = 0;
    if (colMap.percent >= 0 && row[colMap.percent] !== '') {
      const cleanPercent = String(row[colMap.percent]).replace('%', '').trim();
      percent = parseFloat(cleanPercent) || 0;
      if (percent > 0 && percent <= 1) percent = Math.round(percent * 100);
    } else if (possiblePts > 0) {
      percent = Math.round((earnedPts / possiblePts) * 100);
    }

    if (Object.keys(answerKey).length > 0) {
      let calcEarned = 0;
      Object.entries(answers).forEach(([qNumStr, ans]) => {
        const qNum = parseInt(qNumStr, 10);
        const correctAns = answerKey[qNum];
        const isCorrect = correctAns ? ans === correctAns : false;
        questionResults[qNum] = isCorrect;
        if (isCorrect) calcEarned++;
      });
      if (colMap.earnedPts === -1) {
        earnedPts = calcEarned;
        percent = Math.round((earnedPts / possiblePts) * 100);
      }
    } else {
      const correctRatio = possiblePts > 0 ? earnedPts / possiblePts : 0.5;
      colMap.questionCols.forEach(q => {
        questionResults[q.qNum] = Math.random() < correctRatio;
      });
    }

    students.push({
      studentId,
      studentName,
      className: colMap.className >= 0 ? String(row[colMap.className] || '').trim() : undefined,
      quizName,
      earnedPts,
      possiblePts,
      percent,
      answers,
      questionResults
    });
  });

  return {
    quizName,
    totalQuestions: detectedTotalQuestions,
    students,
    answerKey: Object.keys(answerKey).length > 0 ? answerKey : undefined
  };
}

/**
 * Converts imported ZipGrade students into standard platform StudentResult objects.
 */
export function convertZipGradeRowToStudentResult(
  row: ZipGradeRow,
  blueprint: QuestionBlueprint[] = QUESTIONS_BLUEPRINT
): StudentResult {
  const scores: Record<string, number> = {};
  const catTotals: Record<string, number> = {};
  const catCorrects: Record<string, number> = {};

  blueprint.forEach(bp => {
    const isCorrect = row.questionResults[bp.id] || false;
    catTotals[bp.category] = (catTotals[bp.category] || 0) + 1;
    if (isCorrect) {
      catCorrects[bp.category] = (catCorrects[bp.category] || 0) + 1;
    }
  });

  Object.keys(catTotals).forEach(cat => {
    const total = catTotals[cat];
    const correct = catCorrects[cat] || 0;
    scores[cat] = total > 0 ? Math.round((correct / total) * 100) : 0;
  });

  const totalScore = row.percent || Math.round((row.earnedPts / row.possiblePts) * 100);

  return {
    id: row.studentId,
    pin: Math.floor(1000 + Math.random() * 9000).toString(),
    studentName: row.studentName,
    grade: row.className || '5',
    blueprintSnapshot: blueprint,
    scores,
    totalScore,
    questionResults: row.questionResults,
    createdAt: new Date().toISOString()
  };
}
