import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const adminDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../admin');
const src = fs.readFileSync(path.join(adminDir, 'Focux admin.html'), 'utf8');

const bodyStart = src.indexOf('<body>') + '<body>'.length;
const scriptStart = src.indexOf('<script>');
const body = src.slice(bodyStart, scriptStart).trim();

const sidebarMatch = body.match(/<!-- ── Sidebar[\s\S]*?(?=<!-- ── Main)/);
const mainMatch = body.match(/<!-- ── Main[\s\S]*/);
if (!sidebarMatch || !mainMatch) throw new Error('sidebar/main not found');

const mainBlock = mainMatch[0];
const topbarMatch = mainBlock.match(
  /<div class="topbar">[\s\S]*?<\/div>\s*(?=<div class="content">)/,
);
const contentInnerMatch = mainBlock.match(
  /<div class="content">([\s\S]*)<\/div>\s*<\/div>\s*<\/div>\s*$/,
);
if (!topbarMatch || !contentInnerMatch) throw new Error('topbar/content not found');

const fullContent = contentInnerMatch[1];
const dialogMarker = '<div class="dialog-backdrop"';
const dialogIdx = fullContent.indexOf(dialogMarker);
const panelsHtml = dialogIdx >= 0 ? fullContent.slice(0, dialogIdx).trim() : fullContent.trim();
const dialogsHtml = dialogIdx >= 0 ? fullContent.slice(dialogIdx).trim() : '';

fs.writeFileSync(path.join(adminDir, 'partials/content.html'), `${panelsHtml}\n`, 'utf8');
if (dialogsHtml) {
  fs.writeFileSync(path.join(adminDir, 'partials/dialogs.html'), `${dialogsHtml}\n`, 'utf8');
}

console.log('content.html', panelsHtml.length, 'dialogs.html', dialogsHtml.length);
