const rawOutput = '{"q": "x=1\\\\ny=2"}'; // LLM often outputs this for newlines or math line breaks? No, in LaTeX line break is \\, so raw json has \\\\
const rawOutput2 = '{"q": "x=1\\\\y=2"}'; // If LLM just outputs \\, raw json has 2 backslashes

console.log("raw2 parse:", JSON.parse(rawOutput2));
