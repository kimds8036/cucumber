import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAdminBasePath } from '../config/adminPath.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const adminRoot = path.resolve(__dirname, '../../admin');

function readPartial(relativePath) {
  return fs.readFileSync(path.join(adminRoot, relativePath), 'utf8');
}

function injectAdminBase(html, basePath) {
  const baseJson = JSON.stringify(basePath);
  return html
    .replaceAll('{{ADMIN_BASE}}', basePath)
    .replaceAll('{{ADMIN_BASE_JSON}}', baseJson);
}

export function renderAdminIndexHtml() {
  const basePath = getAdminBasePath();
  let html = readPartial('index.html');
  html = injectAdminBase(html, basePath);
  html = html.replace('{{SIDEBAR}}', readPartial('partials/sidebar.html'));
  html = html.replace('{{TOPBAR}}', readPartial('partials/topbar.html'));
  html = html.replace('{{CONTENT}}', readPartial('partials/content.html'));
  html = html.replace('{{DIALOGS}}', readPartial('partials/dialogs.html'));
  return html;
}

export function renderAdminLoginHtml() {
  const basePath = getAdminBasePath();
  return injectAdminBase(readPartial('login.html'), basePath);
}

export function getAdminStaticDir() {
  return path.join(adminRoot, 'assets');
}
