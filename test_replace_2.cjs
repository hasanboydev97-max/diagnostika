const content = "\\\\sqrt";
console.log("Original content:", content);
let cleanContent = content.replace(/\\\\([a-zA-Z]+)/g, '\\$1');
console.log("Replaced with '\\\\$1':", cleanContent);

let cleanContent2 = content.replace(/\\\\([a-zA-Z]+)/g, '\\\\$1');
console.log("Replaced with '\\\\\\\\$1':", cleanContent2);

let cleanContent3 = content.replace(/\\\\([a-zA-Z]+)/g, (match, p1) => '\\' + p1);
console.log("Replaced with function:", cleanContent3);
