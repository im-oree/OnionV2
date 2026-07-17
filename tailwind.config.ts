import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        app: 'var(--color-bg-app)',
        surface: { DEFAULT:'var(--color-bg-surface)', alt:'var(--color-bg-surface-alt)' },
        panel: { DEFAULT:'var(--color-bg-panel)', header:'var(--color-bg-panel-header)', hover:'var(--color-bg-hover)', active:'var(--color-bg-active)', input:'var(--color-bg-input)', raised:'var(--color-bg-raised)' },
        border: { DEFAULT:'var(--color-border)', light:'var(--color-border-light)', focus:'var(--color-border-focus)' },
        text: { primary:'var(--color-text-primary)', secondary:'var(--color-text-secondary)', disabled:'var(--color-text-disabled)', accent:'var(--color-text-accent)' },
        accent: { DEFAULT:'var(--color-accent)', hover:'var(--color-accent-hover)', muted:'var(--color-accent-muted)' },
        danger:'var(--color-danger)', warning:'var(--color-warning)', success:'var(--color-success)',
        playhead:'var(--timeline-playhead)',
      },
      fontFamily: { ui:'var(--font-family)', mono:'var(--font-family-mono)' },
      fontSize: { 'ui-xs':'var(--font-size-xs)', 'ui-sm':'var(--font-size-sm)', 'ui-md':'var(--font-size-md)', 'ui-lg':'var(--font-size-lg)' },
      spacing: { 'splitter':'var(--size-splitter)', 'row':'var(--size-row)', 'toolbar':'var(--size-toolbar-width)', 'menubar':'var(--size-menubar-height)', 'panel-header':'var(--size-panel-header)', 'tl-header':'var(--size-timeline-header)', 'tl-row':'var(--size-timeline-row)', 'outliner-indent':'var(--outliner-indent)' },
      borderRadius: { sm:'var(--radius-sm)', md:'var(--radius-md)' },
      zIndex: { menu:'var(--z-menu)', overlay:'var(--z-overlay)', modal:'var(--z-modal)', tooltip:'var(--z-tooltip)' },
      transitionDuration: { fast:'var(--transition-fast)', normal:'var(--transition-normal)' },
      boxShadow: { dropdown:'var(--shadow-dropdown)', modal:'var(--shadow-modal)', tooltip:'var(--shadow-tooltip)' },
      minWidth: { '0':'0' },
      minHeight: { '0':'0' },
    },
  },
  plugins: [],
};
export default config;
