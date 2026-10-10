import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import UserLookup from './components/UserLookup.jsx';

const sidebar = document.getElementById('admin-sidebar-root');
const chrome = document.getElementById('admin-chrome-root');
if (sidebar && chrome) {
  const root = document.createElement('div');
  root.id = 'admin-console-app';
  document.body.appendChild(root);
  createRoot(root).render(<App />);
}

const lookup = document.getElementById('ops-user-lookup-root');
if (lookup) createRoot(lookup).render(<UserLookup />);
