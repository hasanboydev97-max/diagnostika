const content = 'f\\\\left'; // represents f\\left from JSON
const result2 = content.replace(/\\\\([a-zA-Z]+)/g, '\\$1');
console.log('With \\$1:', result2);
