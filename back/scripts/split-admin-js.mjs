import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsDir = path.resolve(__dirname, '../admin/assets/js');
const src = fs.readFileSync(path.join(jsDir, 'admin-app.js'), 'utf8').split('\n');

const chunks = [
  { file: '01-core.js', start: 0, end: 342 },
  { file: '02-student-ids.js', start: 342, end: 494 },
  { file: '03-reports-dashboard.js', start: 494, end: 975 },
  { file: '04-appeals-users-logs.js', start: 975, end: 1200 },
  { file: '05-inquiries.js', start: 1200, end: 1649 },
  { file: '06-bootstrap.js', start: 1649, end: src.length },
];

for (const { file, start, end } of chunks) {
  const body = src.slice(start, end).join('\n').trim();
  fs.writeFileSync(path.join(jsDir, file), `${body}\n`);
}

fs.unlinkSync(path.join(jsDir, 'admin-app.js'));
console.log('JS modules:', chunks.map((c) => c.file).join(', '));
