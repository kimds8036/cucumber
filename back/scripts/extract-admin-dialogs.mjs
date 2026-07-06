import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const adminDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../admin');
const src = fs.readFileSync(path.join(adminDir, 'Focux admin.html'), 'utf8');
const marker = '<div class="dialog-backdrop" id="student-id-reject-dialog"';
const start = src.indexOf(marker);
const end = src.indexOf('<script>');
if (start < 0 || end < 0) throw new Error('markers not found');
fs.writeFileSync(path.join(adminDir, 'partials/dialogs.html'), `${src.slice(start, end).trim()}\n`, 'utf8');
console.log('dialogs.html ok');
