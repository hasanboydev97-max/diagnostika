const text = "\\sqrt{144} - \\sqrt{49}";
const formatted = text.replace(/(\\[a-zA-Z]+(?:\{[^{}]*\})*)/g, (match) => {
    return `$${match}$`;
});
console.log(formatted);
