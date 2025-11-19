
export interface Vector2 {
  x: number;
  y: number;
}

export interface Body {
  id: string;
  mass: number;
  density: number; // Added density for dynamic radius calculation
  pos: Vector2;
  vel: Vector2;
  radius: number;
  color: string;
  trail: Vector2[];
  isFixed?: boolean;
}

export interface SimulationConfig {
  G: number; // Gravitational constant
  timeScale: number;
  trailLength: number;
  trailFade: boolean; // Controls if trails taper/fade or remain solid
  collisionEnabled: boolean;
  softening: number; // To prevent infinite forces at r=0
  showTrails: boolean;
  
  // Gravitational Wave / Spacetime Grid Config
  showGrid: boolean;
  waveAmplitude: number; // Strength of the distortion/ripple
  waveFrequency: number; // Tightness of the ripples
}

export interface Viewport {
  offset: Vector2;
  zoom: number;
}

export enum SimulationState {
  PAUSED,
  RUNNING,
}
