import { describe, it, expect } from 'vitest';
import {
  fixSpreadsheetCellTerminology,
  stripUnwantedQuotes,
  sanitizeAcademicQuestion
} from '../../server/utils/academicSanitizer.js';

describe('academicSanitizer — Ilmiy terminologiya va format tozalagich', () => {
  it('Excel/Jadval kontekstida "hujayra" -> "katakcha"ga to\'g\'ri o\'giriladi', () => {
    const raw = "Microsoft Excel jadvalida ma'lumotlar kiritiladigan eng kichik birlik nima deb ataladi?";
    const fixed = fixSpreadsheetCellTerminology(raw);
    expect(fixed).toBe(raw); // o'zi yo'q

    const raw2 = "Excelda har bir hujayraning o'ziga xos manzili mavjud.";
    const fixed2 = fixSpreadsheetCellTerminology(raw2);
    expect(fixed2).toBe("Excelda har bir katakchaning o'ziga xos manzili mavjud.");

    const raw3 = "Hujayra rangini o'zgartirish";
    const fixed3 = fixSpreadsheetCellTerminology(raw3);
    expect(fixed3).toBe("Katakcha rangini o'zgartirish");
  });

  it('Biologiya fanidagi "hujayra" so\'ziga mutlaqo tegmaydi', () => {
    const bioText = "O'simlik hujayrasining qaysi organoidida fotosintez kechadi?";
    const fixed = fixSpreadsheetCellTerminology(bioText);
    expect(fixed).toBe(bioText);
  });

  it('Variantlar atrofidagi tashqi keraksiz tirnoqlarni tozalaydi', () => {
    expect(stripUnwantedQuotes("'O\\'qish rejimi (Read Mode)'")).toBe("O'qish rejimi (Read Mode)");
    expect(stripUnwantedQuotes('"Lenta (Ribbon)"')).toBe("Lenta (Ribbon)");
    expect(stripUnwantedQuotes("'ADD'")).toBe("ADD");
    expect(stripUnwantedQuotes("Oddiy matn")).toBe("Oddiy matn");
  });

  it('Foydalanuvchi keltirgan 9-savolni mukammal to\'g\'rilaydi va to\'g\'ri javobni sinxronlaydi', () => {
    const question = {
      questionNumber: 9,
      questionText: "Microsoft Excel jadvalida ma'lumotlar kiritiladigan eng kichik birlik nima deb ataladi?",
      options: ["Ustun", "Ish varag'i", "Hujayra", "Qator"],
      correctOption: "Hujayra",
      correctAnswerIndex: 2
    };

    const sanitized = sanitizeAcademicQuestion(question, "Informatika");

    expect(sanitized.options).toEqual(["Ustun", "Ish varag'i", "Katakcha", "Qator"]);
    expect(sanitized.correctOption).toBe("Katakcha");
    expect(sanitized.correctAnswerIndex).toBe(2);
  });

  it('Variantlarda tirnoqli keltirilgan savollarni tozalaydi', () => {
    const question = {
      questionNumber: 1,
      questionText: "Word hujjatida qaysi ko'rinish rejimi tavsiya etiladi?",
      options: [
        "'O'qish rejimi (Read Mode)'",
        "'Chop etish tartibi (Print Layout)'",
        "'Qora nusxa (Draft View)'",
        "'Web tartibi (Web Layout)'"
      ],
      correctOption: "'O'qish rejimi (Read Mode)'",
      correctAnswerIndex: 0
    };

    const sanitized = sanitizeAcademicQuestion(question, "Informatika");

    expect(sanitized.options[0]).toBe("O'qish rejimi (Read Mode)");
    expect(sanitized.options[1]).toBe("Chop etish tartibi (Print Layout)");
    expect(sanitized.correctOption).toBe("O'qish rejimi (Read Mode)");
  });
});
