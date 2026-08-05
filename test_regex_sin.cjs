const cleanWord = '\\sin(x';
console.log('Regex test:', /[0-9\\+*/=<>|\[\]{}^_\-]/.test(cleanWord));
