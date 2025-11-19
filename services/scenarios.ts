
import { Body, SimulationConfig } from '../types';
import { BODY_COLORS, MAX_TRAIL_LENGTH } from '../constants';
import { createBody } from './physicsEngine';

export interface Scenario {
  name: string;
  getBodies: () => Body[];
  config?: Partial<SimulationConfig>;
}

export const SCENARIOS: Scenario[] = [
  {
    name: "Solar System (Simple)",
    getBodies: () => {
      return [
        createBody({ x: 0, y: 0 }, { x: 0, y: 0 }, 5000, '#fbbf24', true), // Sun
        createBody({ x: 200, y: 0 }, { x: 0, y: 3.5 }, 50, '#38bdf8'), // Earth
        createBody({ x: 350, y: 0 }, { x: 0, y: 2.6 }, 200, '#f87171'), // Mars/Jupiter hybrid
        createBody({ x: 600, y: 0 }, { x: 0, y: 2.0 }, 150, '#a78bfa'), // Outer
      ];
    },
    config: { G: 0.5, trailLength: 200, trailFade: true }
  },
  {
    name: "Sun, Earth & Moon",
    getBodies: () => {
      const G = 0.5;
      const sunMass = 5000;
      const earthMass = 200;
      const moonMass = 5;
      
      const earthDist = 400;
      const moonDist = 30;

      // V = sqrt(GM/r)
      const vEarth = Math.sqrt((G * sunMass) / earthDist);
      const vMoonRel = Math.sqrt((G * earthMass) / moonDist);

      return [
        createBody({ x: 0, y: 0 }, { x: 0, y: 0 }, sunMass, '#fbbf24', true), // Sun
        createBody({ x: earthDist, y: 0 }, { x: 0, y: vEarth }, earthMass, '#38bdf8'), // Earth
        createBody({ x: earthDist + moonDist, y: 0 }, { x: 0, y: vEarth + vMoonRel }, moonMass, '#e2e8f0'), // Moon
      ];
    },
    config: { G: 0.5, trailLength: 600, timeScale: 4.0, trailFade: true }
  },
  {
    name: "Chaos: Butterfly Effect",
    getBodies: () => {
      // Pythagorean 3-Body Problem setup (Burrau's Problem)
      // Vertices of 3-4-5 triangle.
      // To show butterfly effect, we create 3 PAIRS of bodies.
      // The "Ghost" bodies are offset by a tiny amount (0.1 pixels).
      // Since this is an N-Body simulation, the ghost bodies will interact with everything,
      // but starting them so close essentially models slight variations in initial conditions.
      
      const offset = 0.01;
      const scale = 50;

      const pairs = [
        { x: 3 * scale, y: 0, mass: 300, color: '#f87171', ghostColor: '#ef4444' }, // Red (Mass 3)
        { x: -1 * scale, y: 3 * scale, mass: 400, color: '#38bdf8', ghostColor: '#0ea5e9' }, // Blue (Mass 4)
        { x: -1 * scale, y: -3 * scale, mass: 500, color: '#34d399', ghostColor: '#10b981' } // Green (Mass 5)
      ];

      const bodies: Body[] = [];

      pairs.forEach(p => {
        // Primary
        bodies.push(createBody({ x: p.x, y: p.y }, { x: 0, y: 0 }, p.mass, p.color));
        // Ghost (slightly offset position)
        bodies.push(createBody({ x: p.x + offset, y: p.y + offset }, { x: 0, y: 0 }, p.mass, p.ghostColor));
      });

      return bodies;
    },
    config: { 
      G: 0.8, 
      trailLength: MAX_TRAIL_LENGTH, 
      trailFade: false, // Solid trails to see divergence clearly
      timeScale: 2.0,
      collisionEnabled: false
    }
  },
  {
    name: "Three-Body Figure 8",
    getBodies: () => {
      // Stable Figure-8 (Chenciner & Montgomery)
      const scale = 150;
      const vScale = 1.4; 
      
      const p1 = { x: 0.97000436 * scale, y: -0.24308753 * scale };
      const v3 = { x: 0.93240737 * vScale, y: 0.86473146 * vScale };
      const v1 = { x: -v3.x / 2, y: -v3.y / 2 };

      return [
        createBody(p1, v1, 100, '#f472b6'),
        createBody({ x: -p1.x, y: -p1.y }, v1, 100, '#38bdf8'),
        createBody({ x: 0, y: 0 }, v3, 100, '#fbbf24'),
      ];
    },
    config: { G: 1.0, trailLength: 500, timeScale: 3.0, trailFade: true } 
  },
  {
    name: "Galaxy Collision",
    getBodies: () => {
      const bodies: Body[] = [];
      
      // Galaxy 1
      const core1Pos = { x: -300, y: -150 };
      const core1Vel = { x: 1.5, y: 0.5 };
      bodies.push(createBody(core1Pos, core1Vel, 2000, '#fbbf24'));

      for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * 100;
        const v = Math.sqrt(1000 / dist); // Roughly orbital
        bodies.push(createBody(
          { x: core1Pos.x + Math.cos(angle) * dist, y: core1Pos.y + Math.sin(angle) * dist },
          { x: core1Vel.x - Math.sin(angle) * v, y: core1Vel.y + Math.cos(angle) * v },
          5,
          '#fcd34d'
        ));
      }

      // Galaxy 2
      const core2Pos = { x: 300, y: 150 };
      const core2Vel = { x: -1.5, y: -0.5 };
      bodies.push(createBody(core2Pos, core2Vel, 2000, '#38bdf8'));

      for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * 100;
        const v = Math.sqrt(1000 / dist); // Roughly orbital
        bodies.push(createBody(
          { x: core2Pos.x + Math.cos(angle) * dist, y: core2Pos.y + Math.sin(angle) * dist },
          { x: core2Vel.x - Math.sin(angle) * v, y: core2Vel.y + Math.cos(angle) * v },
          5,
          '#7dd3fc'
        ));
      }

      return bodies;
    },
    config: { G: 0.5, trailLength: 50, collisionEnabled: true, trailFade: true }
  },
  {
    name: "Lagrange Points",
    getBodies: () => {
      // Demonstrating Trojan Asteroids (L4 and L5)
      const sunMass = 5000;
      const r = 350;
      const G = 0.5;
      const v = Math.sqrt(G * sunMass / r);
      
      const sun = createBody({x: 0, y: 0}, {x: 0, y: 0}, sunMass, '#fbbf24', true);
      const planet = createBody({x: r, y: 0}, {x: 0, y: v}, 200, '#38bdf8');
      
      const angleL4 = Math.PI / 3;
      const l4 = createBody(
        { x: r * Math.cos(angleL4), y: r * Math.sin(angleL4) },
        { x: -v * Math.sin(angleL4), y: v * Math.cos(angleL4) },
        10, '#a78bfa'
      );
      
      const angleL5 = -Math.PI / 3;
      const l5 = createBody(
        { x: r * Math.cos(angleL5), y: r * Math.sin(angleL5) },
        { x: -v * Math.sin(angleL5), y: v * Math.cos(angleL5) },
        10, '#f472b6'
      );

      return [sun, planet, l4, l5];
    },
    config: { G: 0.5, trailLength: 600, trailFade: true }
  },
  {
    name: "Grid Collapse",
    getBodies: () => {
      const bodies: Body[] = [];
      const gridSize = 6;
      const spacing = 80;
      const offset = (gridSize * spacing) / 2;

      for(let i = 0; i < gridSize; i++) {
        for(let j = 0; j < gridSize; j++) {
           bodies.push(createBody(
             { x: i * spacing - offset, y: j * spacing - offset },
             { x: 0, y: 0 },
             100,
             BODY_COLORS[(i + j) % BODY_COLORS.length]
           ));
        }
      }
      return bodies;
    },
    config: { G: 0.5, collisionEnabled: true, timeScale: 2.0, trailFade: true }
  },
  {
    name: "Random Cluster",
    getBodies: () => {
      const bodies: Body[] = [];
      // Central mass
      bodies.push(createBody({ x: 0, y: 0 }, { x: 0, y: 0 }, 3000, '#ffffff', true));
      
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 150 + Math.random() * 400;
        const v = Math.sqrt(1500 / dist); 
        
        bodies.push(createBody(
          { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist },
          { x: -Math.sin(angle) * v, y: Math.cos(angle) * v },
          10 + Math.random() * 30,
          BODY_COLORS[i % BODY_COLORS.length]
        ));
      }
      return bodies;
    }
  },
  {
    name: "Binary Star System",
    getBodies: () => {
      return [
        createBody({ x: -100, y: 0 }, { x: 0, y: 2.5 }, 1000, '#f87171'),
        createBody({ x: 100, y: 0 }, { x: 0, y: -2.5 }, 1000, '#38bdf8'),
        createBody({ x: 0, y: 300 }, { x: -2, y: 0 }, 20, '#a78bfa'), // Planet
        createBody({ x: 0, y: -300 }, { x: 2, y: 0 }, 20, '#fbbf24'), // Planet
      ];
    },
    config: { G: 0.8, trailFade: true }
  },
  {
    name: "Collision Course",
    getBodies: () => {
      return [
        createBody({ x: -400, y: -100 }, { x: 2, y: 0.5 }, 500, '#f472b6'),
        createBody({ x: 400, y: 100 }, { x: -2, y: -0.5 }, 500, '#34d399'),
        // Debris field
        ...Array.from({ length: 20 }).map((_, i) => 
          createBody(
            { x: -50 + Math.random() * 100, y: -50 + Math.random() * 100 },
            { x: Math.random() - 0.5, y: Math.random() - 0.5 },
            5,
            BODY_COLORS[i % BODY_COLORS.length]
          )
        )
      ];
    },
    config: { collisionEnabled: true, G: 0.5, trailFade: true }
  }
];
