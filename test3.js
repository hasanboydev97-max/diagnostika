const text = 'Hisoblang: $$\\sqrt{81}$$';
console.log("Original bug:", text.replace(/\$\$([\s\S]*?)\$\$/g, '$$1$'));
console.log("Fixed string:", text.replace(/\$\$([\s\S]*?)\$\$/g, '$$$1$$'));
