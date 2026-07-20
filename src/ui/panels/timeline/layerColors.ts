export interface LayerPalette {
  from: string;
  to: string;
  accent: string;
}

export const ADJUSTMENT_COLOR: LayerPalette = {
  from: '#f5e478', to: '#e8b84b', accent: '#f0c94b',
};

export const LAYER_COLORS: LayerPalette[] = [
  { from: '#5b6aff', to: '#8b5cf6', accent: '#7c6bff' },
  { from: '#ff5c87', to: '#ff8a5c', accent: '#ff7070' },
  { from: '#3ac9d1', to: '#2ee6c0', accent: '#33ddc8' },
  { from: '#f0b660', to: '#ff8a4d', accent: '#f0a040' },
  { from: '#7fd858', to: '#4dc98e', accent: '#60d070' },
  { from: '#c880ff', to: '#8b6aff', accent: '#b070ff' },
  { from: '#ff6ba3', to: '#ff4d9a', accent: '#ff5c90' },
  { from: '#5b8fff', to: '#3ac9d1', accent: '#4ab0e8' },
  { from: '#f06060', to: '#ff5540', accent: '#e85050' },
  { from: '#a0a0b0', to: '#787888', accent: '#909098' },
];