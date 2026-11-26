import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { applyFontSize } from './lib/fontSize.js';
import { registerSW } from './lib/pwa.js';
import { isNative } from './lib/native.js';

applyFontSize();
// 안드로이드 앱에서는 서비스 워커 대신 휴대폰 자체 알림을 씁니다
if (!isNative()) registerSW();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
