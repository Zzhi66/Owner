import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './shared/styles/tokens.css';
import './shared/styles/prototype.css';
import './shared/styles/hud.css';
import './shared/styles/react.css';
import './shared/styles/navigation.css';

const root = document.getElementById('root');
if (!root) throw new Error('应用挂载节点不存在');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
