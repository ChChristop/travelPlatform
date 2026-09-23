import React from 'react';
import ReactDOM from 'react-dom/client';
import { PlatformApp } from './PlatformApp.jsx';
import './platform.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <PlatformApp />
    </React.StrictMode>
  );
}
