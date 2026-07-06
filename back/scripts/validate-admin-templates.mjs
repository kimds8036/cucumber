import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { renderAdminIndexHtml, renderAdminLoginHtml, getAdminStaticDir } from '../src/admin/renderAdminPage.js';
import { getAdminBasePath } from '../src/config/adminPath.js';

const base = getAdminBasePath();
const index = renderAdminIndexHtml();
const login = renderAdminLoginHtml();

const errors = [];

if (index.includes('{{')) errors.push('index: unresolved placeholders');
if (login.includes('{{')) errors.push('login: unresolved placeholders');
if (!index.includes('class="sidebar"')) errors.push('index: missing sidebar');
if (!index.includes('id="panel-dashboard"')) errors.push('index: missing dashboard panel');
if (!index.includes('student-id-reject-dialog')) errors.push('index: missing dialogs');
if (!index.includes(`${base}/assets/js/01-core.js`)) errors.push('index: wrong script path');
if (!login.includes(`${base}/assets/js/login.js`)) errors.push('login: wrong script path');
if (!index.includes('대시보드')) errors.push('index: korean encoding broken');
if (!login.includes('관리자 로그인')) errors.push('login: korean encoding broken');

const adminRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '../admin');
const requiredAssets = [
  'assets/css/admin.css',
  'assets/css/login.css',
  'assets/js/login.js',
  'assets/js/01-core.js',
  'assets/js/06-bootstrap.js',
  'partials/sidebar.html',
  'partials/topbar.html',
  'partials/content.html',
  'partials/dialogs.html',
  'index.html',
  'login.html',
];

for (const rel of requiredAssets) {
  if (!fs.existsSync(path.join(adminRoot, rel))) {
    errors.push(`missing file: ${rel}`);
  }
}

if (errors.length) {
  console.error('VALIDATION FAILED:\n', errors.join('\n'));
  process.exit(1);
}

console.log('OK admin templates', { base, indexLen: index.length, loginLen: login.length });
