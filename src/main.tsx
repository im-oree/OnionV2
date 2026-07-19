import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './styles/panels.css';
import './styles/themes/dark.css';
import './styles/themes/darker.css';
import './styles/themes/blender-classic.css';
import './styles/themes/light.css';
import './styles/themes/high-contrast.css';
import { registerAllEffects } from './renderer/effects/registerEffects';
import { registerExpressionControls } from './renderer/effects/ExpressionControls';

registerAllEffects();
registerExpressionControls();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
