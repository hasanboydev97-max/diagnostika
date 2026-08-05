const str = '{"q": "\\frac", "newline": "a\\nb", "quote": "\\""}';
const regex = /(?<!\\)\\(?!["\\/])/g;
console.log(JSON.parse(str.replace(regex, "\\\\")));
