import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  console.info(
    '%cAtrium Engine v1.3.2 (Hardened) • Original Architecture by Miko\n%cCopyright © 2026 Miko. All rights reserved.',
    'color:#FDE68A;font-weight:700;font-size:13px;',
    'color:#A78BFA;font-size:11px;'
  );

  if (window.location.protocol !== 'file:') {
    registerSW({ immediate: true });
  }
}

createRoot(document.getElementById('root')!).render(<App />);
