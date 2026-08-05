const katex = require("katex");
console.log(katex.renderToString("\\begin{cases}\\n4x - 3y = 1\\\\2x + 3y = 11\\n\\end{cases}", {throwOnError: false}));
