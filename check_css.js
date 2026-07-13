const fs = require('fs');
const css = fs.readFileSync('client/src/pages/TodayFollowup.css', 'utf8');

let open = 0;
let close = 0;

for (let i = 0; i < css.length; i++) {
  if (css[i] === '{') open++;
  if (css[i] === '}') close++;
}

console.log(`Open braces: ${open}`);
console.log(`Close braces: ${close}`);
console.log(`Difference: ${open - close}`);

// Also let's check if there are any unclosed comments
let inComment = false;
for (let i = 0; i < css.length - 1; i++) {
  if (css[i] === '/' && css[i+1] === '*') inComment = true;
  if (css[i] === '*' && css[i+1] === '/') inComment = false;
}
console.log(`In comment at EOF: ${inComment}`);
