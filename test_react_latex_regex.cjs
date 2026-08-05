const str = '$\\sqrt{75}$';
const match = /\$((?:\\.|[^$])*)\$/g.exec(str);
console.log(match);
