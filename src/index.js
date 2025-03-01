import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

if (process.env.NODE_ENV === 'development') {
  window.console = window._originalConsole || console;
}

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
