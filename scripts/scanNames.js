import { readFileSync } from 'fs';
const content = readFileSync('src/data/wildlifeCache.js', 'utf8');
const names = [];
const r = /"name":\s*"([^"]+)"/g;
let m;
while ((m = r.exec(content)) !== null) names.push(m[1]);

const suspicious = names.filter(n =>
  /[^\x00-\x7F]/.test(n) ||
  /\b(de las|de los|de manto|terrestre|dorado|Cascadas)\b/i.test(n)
);
console.log('Total names:', names.length);
console.log('Suspicious non-English:', suspicious.length);
suspicious.forEach(n => console.log(' -', n));
