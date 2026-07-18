import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './styles/panels.css';
import { useCompositionStore } from './state/compositionStore';
import { registerAllEffects } from './renderer/effects/registerEffects';

registerAllEffects();

// Ensure a default composition exists BEFORE first render
{
  const state = useCompositionStore.getState();
  if (state.compositions.length === 0) {
    state.addComposition({ name: 'My Composition' });
  }
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
