import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

declare const __ATRIUM_PWA_DISABLED__: boolean;

if (typeof window !== 'undefined') {
  console.info(
    '%cAtrium Engine v1.5.0 (Hardened) • Original Architecture by Miko\n%cCopyright © 2026 Miko. All rights reserved.',
    'color:#FDE68A;font-weight:700;font-size:13px;',
    'color:#A78BFA;font-size:11px;'
  );

  const pwaDisabled =
    typeof __ATRIUM_PWA_DISABLED__ !== 'undefined' && __ATRIUM_PWA_DISABLED__;

  if (window.location.protocol !== 'file:' && !pwaDisabled) {
    registerSW({ immediate: true });
  }
}

createRoot(document.getElementById('root')!).render(<App />);
