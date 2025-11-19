
import { Body, SimulationConfig, Vector2 } from '../types';

const simpleId = () => Math.random().toString(36).substr(2, 9);

export const createBody = (
  pos: Vector2,
  vel: Vector2,
  mass: number,
  color: string,
  isFixed: boolean = false,
  density: number = 1.0
): Body => ({
  id: simpleId(),
  mass,
  density,
  pos,
  vel,
  // Radius derived from Mass and Density (Area ~ Mass/Density => Radius ~ Sqrt(Mass/Density))
  // We keep the minimum size of 3 for visibility
  radius: Math.max(3, Math.sqrt(mass / density)), 
  color,
  trail: [],
  isFixed,
});

export const updatePhysics = (
  bodies: Body[],
  config: SimulationConfig,
  dt: number // Delta time in seconds (usually 1/60)
): Body[] => {
  const n = bodies.length;
  if (n === 0) return bodies;

  const forces: Vector2[] = new Array(n).fill(0).map(() => ({ x: 0, y: 0 }));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const b1 = bodies[i];
      const b2 = bodies[j];

      const dx = b2.pos.x - b1.pos.x;
      const dy = b2.pos.y - b1.pos.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);

      // Prevent singularity and NaN errors
      if (dist < 1.0) continue;

      // F = G * m1 * m2 / r^2
      // We use a softening parameter to make it more stable visually
      const softenedDistSq = distSq + (config.softening * config.softening);
      const f = (config.G * b1.mass * b2.mass) / softenedDistSq;

      const fx = f * (dx / dist);
      const fy = f * (dy / dist);

      forces[i].x += fx;
      forces[i].y += fy;
      forces[j].x -= fx;
      forces[j].y -= fy;
    }
  }

  // Update positions and velocities
  return bodies.map((body, i) => {
    if (body.isFixed) return body;

    const ax = forces[i].x / body.mass;
    const ay = forces[i].y / body.mass;

    const newVel = {
      x: body.vel.x + ax * dt * config.timeScale,
      y: body.vel.y + ay * dt * config.timeScale,
    };

    const newPos = {
      x: body.pos.x + newVel.x * dt * config.timeScale,
      y: body.pos.y + newVel.y * dt * config.timeScale,
    };

    // Safety check for NaN
    if (isNaN(newPos.x) || isNaN(newPos.y) || isNaN(newVel.x) || isNaN(newVel.y)) {
        return body;
    }

    // Update trail
    let newTrail = body.trail;
    const lastPoint = newTrail.length > 0 ? newTrail[newTrail.length - 1] : null;

    // Check distance from last recorded trail point (or force add if empty)
    // We use a threshold of 10 squared (approx 3.16 pixels) to prevent trail clutter
    const distSq = lastPoint 
        ? (newPos.x - lastPoint.x) ** 2 + (newPos.y - lastPoint.y) ** 2
        : 999; 
    
    if (distSq > 10) {
       newTrail = [...body.trail, newPos];
       if (newTrail.length > config.trailLength) {
         newTrail = newTrail.slice(newTrail.length - config.trailLength);
       }
    }

    return {
      ...body,
      pos: newPos,
      vel: newVel,
      trail: newTrail,
    };
  });
};
