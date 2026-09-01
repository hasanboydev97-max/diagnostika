const content = "$\\sqrt2\\cdot\\sqrt8 ifodani hisoblang.$";
let safeContent = String(content);

// 4. Ensure space around block math
safeContent = safeContent.replace(/(\$\$)([^\s$\\.,!?;:\n\d([{'\-])/gu, '$1 $2');
safeContent = safeContent.replace(/([^\s$\\])(\$\$)/gu, '$1 $2');

// 5. Ensure space around inline math
safeContent = safeContent.replace(/((?<!\$)\$(?!\$)(?:[^$\n\\]|\\.){1,150}?\$(?!\$))([^\s$.,!?;:\n([{'\-])/gu, '$1 $2');
safeContent = safeContent.replace(/([^\s$\\])(\$(?!\$))/gu, '$1 $2');

console.log(safeContent);
