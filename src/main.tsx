import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
// Inter, self-hosted via @fontsource (bundled by Vite — no runtime CDN).
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import './styles/global.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
