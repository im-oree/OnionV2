import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './styles/panels.css';
import { useCompositionStore } from './state/compositionStore';
import { registerAllEffects } from './renderer/effects/registerEffects';

// Phase 5: Register all built-in effects at startup
registerAllEffects();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Initialize with a default composition
const initTimer = setTimeout(() => {
  const state = useCompositionStore.getState();
  if (state.compositions.length === 0) {
    state.addComposition({ name: 'My Composition' });
  }
}, 0);

// Cleanup for HMR
import.meta.hot?.dispose?.(() => clearTimeout(initTimer));
