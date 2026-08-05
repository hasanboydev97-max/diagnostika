export function autoFormatMath(text: string): string {
  if (!text) return text;

  // Step 1: Temporarily hide everything that is ALREADY properly wrapped in $ or $$
  // to avoid double-wrapping it. The AI often wraps SOME math but forgets others.
  const placeholders: string[] = [];
  let hiddenText = text.replace(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g, (match) => {
    placeholders.push(match);
    return `__MATH_BLOCK_${placeholders.length - 1}__`;
  });

  // Step 2: Now find LaTeX commands that are left out in the open (unwrapped)
  // We look for commands like \sqrt, \frac, \left, \right, \text, \sin, etc.
  // This robust regex handles nested braces up to 2 levels deep (which covers 99% of school math).
  // E.g., \sqrt{7-4\sqrt{3}} or \frac{\sqrt{a}}{\sqrt[4]{b}}
  const commandRegex = /\\[a-zA-Z]+(?:\[[^\]]*\])*(?:\{(?:[^{}]|\{[^{}]*\})*\})*/g;

  hiddenText = hiddenText.replace(commandRegex, (match) => {
    return `$${match}$`;
  });

  // Step 3: Restore the properly wrapped blocks
  for (let i = 0; i < placeholders.length; i++) {
    hiddenText = hiddenText.replace(`__MATH_BLOCK_${i}__`, placeholders[i]);
  }

  // Return the hiddenText which now has placeholders restored
  return hiddenText;
}
