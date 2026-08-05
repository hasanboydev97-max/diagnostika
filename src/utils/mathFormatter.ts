export function autoFormatMath(text: string): string {
  if (!text) return text;
  
  // If the text already has KaTeX delimiters, assume the AI did its job correctly.
  if (text.includes('$') || text.includes('\\[') || text.includes('\\(')) {
    return text;
  }

  // Define patterns for math expressions that frequently miss $ signs.
  
  // Pattern 1: Expressions with \ (like \sqrt, \frac, \infty, \sin, \cos, \text)
  // We match the command and any immediate arguments {}
  let formatted = text.replace(/(\\[a-zA-Z]+(?:\{[^{}]*\})*)/g, (match) => {
    return `$${match}$`;
  });

  // Pattern 2: Polynomials and equations (e.g., f(x) = x^2 - 5x + 6, or x^3)
  // Match x^2, y_1, 2x+3=0 etc.
  // We'll wrap sequences containing ^ or _ or = that have variables.
  // To avoid breaking normal text, we only wrap if it contains ^, _, or = next to variables/numbers.
  formatted = formatted.replace(/([a-zA-Z0-9]+[\^_][a-zA-Z0-9]+(?:[\+\-\*\/][a-zA-Z0-9]+)*)/g, (match) => {
    // If it's already wrapped in $ from previous step, don't re-wrap.
    // Wait, regex replace won't touch already processed parts if we are careful, but let's just do it sequentially.
    return `$${match}$`;
  });

  // Clean up double dollar signs that might have been created
  formatted = formatted.replace(/\$\$/g, '$');
  
  // Clean up empty dollars
  formatted = formatted.replace(/\$\$/g, '');

  return formatted;
}
