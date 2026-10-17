import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './shared/styles/tokens.css';
import './shared/styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('应用挂载节点不存在');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
