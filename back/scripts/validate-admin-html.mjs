import 'dotenv/config';
import fs from 'fs';
import { renderAdminIndexHtml, renderAdminLoginHtml } from '../src/admin/renderAdminPage.js';

const errors = [];
const index = renderAdminIndexHtml();
const login = renderAdminLoginHtml();

if (index.includes('{{')) errors.push('index: unreplaced placeholders');
if (login.includes('{{')) errors.push('login: unreplaced placeholders');
if (!index.includes('class="layout"')) errors.push('index: missing layout');
if (!index.includes('class="sidebar"')) errors.push('index: missing sidebar');
if (!index.includes('class="topbar"')) errors.push('index: missing topbar');
if (!index.includes('panel-dashboard')) errors.push('index: missing dashboard panel');
if (!index.includes('dialog-backdrop')) errors.push('index: missing dialogs');
if (!login.includes('admin-login-form')) errors.push('login: missing form');
if (!login.includes('login.js')) errors.push('login: missing login.js');
if (!index.includes('01-core.js')) errors.push('index: missing core js');

const assets = [
  'admin/assets/css/admin.css',
  'admin/assets/css/login.css',
  'admin/assets/js/login.js',
  'admin/assets/js/01-core.js',
  'admin/assets/js/06-bootstrap.js',
  'admin/partials/sidebar.html',
  'admin/partials/topbar.html',
  'admin/partials/content.html',
  'admin/partials/dialogs.html',
];
for (const f of assets) {
  if (!fs.existsSync(f)) errors.push(`missing file: ${f}`);
}

const openDiv = (index.match(/<div/g) || []).length;
const closeDiv = (index.match(/<\/div>/g) || []).length;
if (openDiv !== closeDiv) {
  errors.push(`index: div mismatch ${openDiv} vs ${closeDiv}`);
}

if (errors.length) {
  console.error('FAIL\n' + errors.join('\n'));
  process.exit(1);
}

console.log('OK');
console.log('index length', index.length, 'login length', login.length);
