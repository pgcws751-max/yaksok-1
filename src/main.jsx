import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { applyFontSize } from './lib/fontSize.js';
import { registerSW } from './lib/pwa.js';

applyFontSize();
registerSW();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
