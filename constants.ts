
import { SimulationConfig } from './types';

export const DEFAULT_CONFIG: SimulationConfig = {
  G: 0.5,
  timeScale: 5.0,
  trailLength: 100,
  trailFade: true,
  collisionEnabled: false,
  softening: 5.0,
  showTrails: true,
  
  // Wave Defaults
  showGrid: false,
  waveAmplitude: 0.0, // 0.0 means off/flat grid
  waveFrequency: 0.02,
};

export const INITIAL_VIEWPORT = {
  offset: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
  zoom: 1,
};

export const MAX_TRAIL_LENGTH = 2000;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5.0;

// Physics constants
export const SUB_STEPS = 4; // Number of substeps per frame for stability

// Preset Colors
export const BODY_COLORS = [
  '#38bdf8', // sky-400
  '#f472b6', // pink-400
  '#a78bfa', // violet-400
  '#34d399', // emerald-400
  '#fbbf24', // amber-400
  '#f87171', // red-400
];
