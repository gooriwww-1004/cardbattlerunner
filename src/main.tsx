// main.tsx
// 🔥 가장 위: localStorage 보호 패치
(function patchLocalStorage() {
  try {
    if (!window.localStorage) return;

    const originalSetItem = window.localStorage.setItem;
    window.localStorage.setItem = function (...args: any[]) {
      try {
        return originalSetItem.apply(window.localStorage, args as any);
      } catch (e) {
        // quota exceeded 같은 에러를 여기서 먹어버림
        console.warn('[patchLocalStorage] setItem blocked:', e);
        return;
      }
    } as any;
  } catch (e) {
    console.warn('[patchLocalStorage] failed to patch', e);
  }
})();

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);