const oneBackslash = 'a\\b';
const twoBackslashes = 'a\\\\b';
console.log('one:', oneBackslash.length, oneBackslash);
console.log('two:', twoBackslashes.length, twoBackslashes);

const regex = /\\\\([a-zA-Z]+)/g;

console.log('Regex matches 1 backslash:', regex.test(oneBackslash));
console.log('Regex matches 2 backslashes:', regex.test(twoBackslashes));

console.log('Replace 1 backslash:', oneBackslash.replace(regex, '\\$1'));
console.log('Replace 2 backslashes:', twoBackslashes.replace(regex, '\\$1'));
