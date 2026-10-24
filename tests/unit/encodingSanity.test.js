import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function getSourceFiles(dir, extensions = ['.js', '.ts', '.tsx']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        results = results.concat(getSourceFiles(fullPath, extensions));
      }
    } else {
      if (extensions.some(ext => file.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

// Mojibake signatures that happen when UTF-8 bytes are decoded as Windows-1252 / ISO-8859-1
const MOJIBAKE_PATTERNS = [
  { name: 'Broken Emoji (ðŸ...)', regex: /ðŸ/ },
  { name: 'Broken Checkmark/Symbol (âœ...)', regex: /âœ/ },
  { name: 'Broken Em-dash (â€”)', regex: /â€”/ },
  { name: 'Broken Arrow (â†’ or â† )', regex: /â†/ },
  { name: 'Broken Warning/Flash (âš...)', regex: /âš/ },
  { name: 'Broken Middle Dot (Â·)', regex: /Â·/ },
  { name: 'Broken Degree (Â°)', regex: /Â°/ },
  { name: 'Broken Cyrillic (Ð°-Ñ...)', regex: /Ð°-Ñ/ },
  { name: 'Broken Uzbek Apostrophe (Ê»)', regex: /Ê»/ }
];

describe('Encoding & Character Sanity (Zero Mojibake)', () => {
  const sourceFiles = [
    ...getSourceFiles(path.resolve(process.cwd(), 'src')),
    ...getSourceFiles(path.resolve(process.cwd(), 'server'))
  ];

  it('scans source files and finds source files', () => {
    expect(sourceFiles.length).toBeGreaterThan(10);
  });

  it('ensures all source files in src/ and server/ have zero Mojibake corruption', () => {
    const violations = [];

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split(/\r?\n/);

      lines.forEach((line, lineIndex) => {
        for (const pattern of MOJIBAKE_PATTERNS) {
          if (pattern.regex.test(line)) {
            violations.push({
              file: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
              line: lineIndex + 1,
              type: pattern.name,
              preview: line.trim()
            });
          }
        }
      });
    }

    if (violations.length > 0) {
      const summary = violations
        .map(v => `${v.file}:${v.line} [${v.type}] -> ${v.preview}`)
        .join('\n');
      expect.fail(`Found ${violations.length} Mojibake character corruptions:\n${summary}`);
    } else {
      expect(violations).toHaveLength(0);
    }
  });
});
