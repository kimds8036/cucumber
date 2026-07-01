import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminDir = path.resolve(__dirname, '../admin');
const src = fs.readFileSync(path.join(adminDir, 'Focux admin.html'), 'utf8');

const styleMatch = src.match(/<style>([\s\S]*?)<\/style>/);
const scriptMatch = src.match(/<script>([\s\S]*?)<\/script>/);
if (!styleMatch || !scriptMatch) {
  throw new Error('Failed to parse Focux admin.html');
}

const bodyStart = src.indexOf('<body>') + '<body>'.length;
const scriptStart = src.indexOf('<script>');
const body = src.slice(bodyStart, scriptStart).trim();

const sidebarMatch = body.match(
  /<!-- ── Sidebar[\s\S]*?(?=<!-- ── Main)/,
);
const mainMatch = body.match(/<!-- ── Main[\s\S]*/);
if (!sidebarMatch || !mainMatch) {
  throw new Error('Failed to extract sidebar/main');
}

const mainBlock = mainMatch[0];
const topbarMatch = mainBlock.match(
  /<div class="topbar">[\s\S]*?<\/div>\s*(?=<div class="content">)/,
);
if (!topbarMatch) {
  throw new Error('Failed to extract topbar');
}

const contentMatch = mainBlock.match(
  /<div class="content">([\s\S]*)<\/div>\s*<\/div>\s*<\/div>\s*$/,
);
if (!contentMatch) {
  throw new Error('Failed to extract content');
}

fs.mkdirSync(path.join(adminDir, 'assets/css'), { recursive: true });
fs.mkdirSync(path.join(adminDir, 'assets/js'), { recursive: true });
fs.mkdirSync(path.join(adminDir, 'partials'), { recursive: true });

fs.writeFileSync(
  path.join(adminDir, 'assets/css/admin.css'),
  `${styleMatch[1].trim()}\n`,
);

fs.writeFileSync(path.join(adminDir, 'partials/sidebar.html'), sidebarMatch[0].trim());
fs.writeFileSync(path.join(adminDir, 'partials/topbar.html'), topbarMatch[0].trim());
fs.writeFileSync(path.join(adminDir, 'partials/content.html'), contentMatch[1].trim());

let js = scriptMatch[1].trim();
const jsHeader = `const ADMIN_BASE = window.__ADMIN_BASE__ || '';
function adminUrl(subpath) {
  const p = subpath.startsWith('/') ? subpath : \`/\${subpath}\`;
  return \`\${ADMIN_BASE}\${p}\`;
}
`;

const replacements = [
  ["window.location.href = '/admin/login'", "window.location.href = adminUrl('/login')"],
  ["window.location.replace('/admin')", "window.location.replace(adminUrl('/'))"],
  ["history.pushState({ adminGuard: true }, '', '/admin')", "history.pushState({ adminGuard: true }, '', adminUrl('/'))"],
];

for (const [from, to] of replacements) {
  js = js.split(from).join(to);
}

fs.writeFileSync(path.join(adminDir, 'assets/js/admin-app.js'), `${jsHeader}${js}\n`);

console.log('Split complete:', {
  css: styleMatch[1].length,
  sidebar: sidebarMatch[0].length,
  topbar: topbarMatch[0].length,
  content: contentMatch[1].length,
  js: js.length,
});
