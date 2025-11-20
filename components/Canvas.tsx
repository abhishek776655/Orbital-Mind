
import React, { useRef, useEffect, useCallback } from 'react';
import { Body, Viewport, SimulationConfig, Vector2, InteractionMode } from '../types';
import { SUB_STEPS, MIN_ZOOM, MAX_ZOOM } from '../constants';
import { updatePhysics } from '../services/physicsEngine';

interface CanvasProps {
  bodies: Body[];
  setBodies: React.Dispatch<React.SetStateAction<Body[]>>;
  config: SimulationConfig;
  viewport: Viewport;
  setViewport: React.Dispatch<React.SetStateAction<Viewport>>;
  isRunning: boolean;
  selectedBodyId: string | null;
  onBodySelect: (id: string | null) => void;
  interactionMode: InteractionMode;
  onBodyCreate: (pos: Vector2, vel: Vector2) => void;
  creationMass: number;
}

const Canvas: React.FC<CanvasProps> = ({
  bodies,
  setBodies,
  config,
  viewport,
  setViewport,
  isRunning,
  selectedBodyId,
  onBodySelect,
  interactionMode,
  onBodyCreate,
  creationMass,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const bodiesRef = useRef<Body[]>(bodies);
  
  // Input Refs
  const isDraggingRef = useRef(false);
  const isPanRef = useRef(false);
  const lastMousePosRef = useRef<Vector2>({ x: 0, y: 0 });
  const startMousePosRef = useRef<Vector2>({ x: 0, y: 0 });
  
  // Touch Zoom/Pan Refs
  const lastTouchDistanceRef = useRef<number>(0);
  const lastPinchCenterRef = useRef<Vector2>({ x: 0, y: 0 });

  // Creation Refs
  const isCreatingRef = useRef(false);
  const creationStartRef = useRef<Vector2>({ x: 0, y: 0 });
  const creationEndRef = useRef<Vector2>({ x: 0, y: 0 });

  const timeRef = useRef<number>(0); // Track simulation time for wave animation

  // Intelligent State Reconciliation
  useEffect(() => {
    const bodyMap = new Map<string, Body>(bodiesRef.current.map(b => [b.id, b]));
    
    const isScenarioLoad = bodies.length > 0 && bodies.every(b => !bodyMap.has(b.id));
    
    if (isScenarioLoad || bodies.length === 0) {
        bodiesRef.current = bodies;
    } else {
        bodiesRef.current = bodies.map(b => {
            const existing = bodyMap.get(b.id);
            if (existing) {
                return {
                    ...existing,
                    mass: b.mass,
                    density: b.density, // Sync density
                    radius: b.radius,
                    color: b.color,
                    isFixed: b.isFixed,
                };
            }
            return b;
        });
    }
  }, [bodies]);

  const drawSpacetimeGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, bodies: Body[], time: number) => {
    if (!config.showGrid) return;

    const gridSize = 60; // Base grid cell size in pixels
    const cols = Math.ceil(width / viewport.zoom / gridSize) + 2;
    const rows = Math.ceil(height / viewport.zoom / gridSize) + 2;
    
    // Calculate world bounds visible in viewport
    const startX = -viewport.offset.x / viewport.zoom - gridSize;
    const startY = -viewport.offset.y / viewport.zoom - gridSize;

    ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)'; // Subtle cyan
    ctx.lineWidth = 1 / viewport.zoom;
    ctx.beginPath();

    // Helper to calculate distorted position
    const getDistortedPos = (x: number, y: number): {x: number, y: number} => {
        let dx = 0;
        let dy = 0;

        // Apply distortion from massive bodies
        bodies.forEach(body => {
            // Optimization: Skip small bodies for wave generation to save performance
            if (body.mass < 10) return; 

            const distX = x - body.pos.x;
            const distY = y - body.pos.y;
            const distSq = distX*distX + distY*distY;
            const dist = Math.sqrt(distSq);

            if (dist < 1) return;

            // 1. Static Gravity Well Distortion (pulls grid towards mass)
            // Fading out quickly with distance
            const gravityStrength = (body.mass * config.G) / (distSq + 1000);
            const pull = Math.min(gravityStrength * 50, dist * 0.8); // Cap pull to avoid grid crossing itself
            
            dx -= (distX / dist) * pull;
            dy -= (distY / dist) * pull;

            // 2. Gravitational Wave Ripple (Sine wave emanating from body)
            if (config.waveAmplitude > 0) {
                // Wave Math: Amplitude * sin(k*r - w*t)
                // We scale amplitude by mass so only heavy things ripple visibly
                const waveVal = Math.sin(dist * config.waveFrequency - time * 5);
                
                // Decay wave with distance (1/sqrt(r) for 2D energy conservation approx)
                const decay = Math.max(0, 1 - dist / 2000); // Fade out over distance
                
                // Directional displacement (longitudinal wave)
                const rippleStrength = config.waveAmplitude * (body.mass / 200) * waveVal * decay;
                
                dx += (distX / dist) * rippleStrength;
                dy += (distY / dist) * rippleStrength;
            }
        });

        return { x: x + dx, y: y + dy };
    };

    // Draw Horizontal Lines
    for (let j = 0; j < rows; j++) {
        const y = startY + j * gridSize;
        // Start line
        const startPos = getDistortedPos(startX, y);
        ctx.moveTo(startPos.x, startPos.y);

        for (let i = 1; i < cols; i++) {
            const x = startX + i * gridSize;
            const pos = getDistortedPos(x, y);
            ctx.lineTo(pos.x, pos.y);
        }
    }

    // Draw Vertical Lines
    for (let i = 0; i < cols; i++) {
        const x = startX + i * gridSize;
        // Start line
        const startPos = getDistortedPos(x, startY);
        ctx.moveTo(startPos.x, startPos.y);

        for (let j = 1; j < rows; j++) {
            const y = startY + j * gridSize;
            const pos = getDistortedPos(x, y);
            ctx.lineTo(pos.x, pos.y);
        }
    }

    ctx.stroke();
  };

  const render = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Update time for waves (slowed down)
    if (isRunning) {
        timeRef.current += 0.01 * config.timeScale;
    }

    // 1. Update Physics (if running)
    if (isRunning && bodiesRef.current.length > 0) {
      let currentBodies = bodiesRef.current;
      try {
        for (let i = 0; i < SUB_STEPS; i++) {
            currentBodies = updatePhysics(currentBodies, config, 1 / (60 * SUB_STEPS));
        }
        bodiesRef.current = currentBodies;
      } catch (e) {
        console.error("Physics error:", e);
      }
    }

    // 2. Clear Canvas
    ctx.fillStyle = '#000000'; // Pure black
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 3. Viewport Transform
    ctx.save();
    ctx.translate(viewport.offset.x, viewport.offset.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    // 4. Draw Spacetime Grid (Waves) - Draw BEFORE bodies/trails
    if (config.showGrid) {
        drawSpacetimeGrid(ctx, canvas.width, canvas.height, bodiesRef.current, timeRef.current);
    }

    // 5. Draw Trails
    if (config.showTrails) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      bodiesRef.current.forEach((body) => {
        const trail = body.trail;
        const len = trail.length;
        if (len < 2) return;
        
        ctx.strokeStyle = body.color;

        if (!config.trailFade) {
          // "Chaos" Mode
          ctx.beginPath();
          ctx.moveTo(trail[0].x, trail[0].y);
          for (let i = 1; i < len; i++) {
            ctx.lineTo(trail[i].x, trail[i].y);
          }
          ctx.lineTo(body.pos.x, body.pos.y);
          
          ctx.globalAlpha = 0.6; 
          ctx.lineWidth = 1.5 / viewport.zoom;
          ctx.stroke();
          ctx.globalAlpha = 1.0;

        } else {
          // "Standard" Mode
          const startIndex = 0;
          for (let i = startIndex; i < len - 1; i++) {
            const p1 = trail[i];
            const p2 = trail[i + 1];
            
            const ratio = i / len;
            const alpha = Math.max(0.1, ratio * ratio * 0.8); 
            
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            
            ctx.globalAlpha = alpha;
            ctx.lineWidth = Math.max(0.5, (1 + ratio * 2.5) / viewport.zoom);
            ctx.stroke();
          }
          // Head of trail
          const lastPoint = trail[len - 1];
          ctx.beginPath();
          ctx.moveTo(lastPoint.x, lastPoint.y);
          ctx.lineTo(body.pos.x, body.pos.y);
          
          ctx.globalAlpha = 0.9; 
          ctx.lineWidth = Math.max(1, 3.5 / viewport.zoom);
          ctx.stroke();
        }
      });
      ctx.globalAlpha = 1.0;
    }

    // 6. Draw Bodies
    bodiesRef.current.forEach((body) => {
      // Selection Highlight ring
      if (body.id === selectedBodyId) {
        ctx.beginPath();
        ctx.arc(body.pos.x, body.pos.y, body.radius + 8 / viewport.zoom, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2 / viewport.zoom;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(body.pos.x, body.pos.y, body.radius, 0, Math.PI * 2);
      ctx.fillStyle = body.color;
      
      // Glow effect
      ctx.shadowBlur = body.id === selectedBodyId ? 30 : 15;
      ctx.shadowColor = body.color;
      
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // 7. Draw Creation Vector (if creating)
    if (interactionMode === InteractionMode.CREATE && isCreatingRef.current) {
        const start = creationStartRef.current; // World Coords
        const end = creationEndRef.current;     // World Coords
        
        // Convert World to Screen for calculation (optional, but easier for lines relative to zoom)
        // Actually we are inside transformed context, so we use world coords.
        
        // Draw Ghost Body
        const tempRadius = Math.max(3, Math.sqrt(creationMass));
        ctx.beginPath();
        ctx.arc(start.x, start.y, tempRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2 / viewport.zoom;
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw Vector Line
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 3 / viewport.zoom;
        ctx.stroke();

        // Draw Arrowhead
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLen = 10 / viewport.zoom;
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headLen * Math.cos(angle - Math.PI / 6), end.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(end.x - headLen * Math.cos(angle + Math.PI / 6), end.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.lineTo(end.x, end.y);
        ctx.fillStyle = 'white';
        ctx.fill();
    }

    ctx.restore();

    requestRef.current = requestAnimationFrame(render);
  }, [config, isRunning, viewport, selectedBodyId, interactionMode, creationMass]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(render);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [render]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Interaction Handlers
  const getWorldPos = (clientX: number, clientY: number) => {
    return {
      x: (clientX - viewport.offset.x) / viewport.zoom,
      y: (clientY - viewport.offset.y) / viewport.zoom,
    };
  };

  const handleStart = (clientX: number, clientY: number) => {
    const worldPos = getWorldPos(clientX, clientY);
    startMousePosRef.current = { x: clientX, y: clientY };

    if (interactionMode === InteractionMode.CREATE) {
        isCreatingRef.current = true;
        creationStartRef.current = worldPos;
        creationEndRef.current = worldPos;
    } else {
        isDraggingRef.current = true;
        isPanRef.current = false;
        lastMousePosRef.current = { x: clientX, y: clientY };
    }
  };

  const handleMove = (clientX: number, clientY: number) => {
    const worldPos = getWorldPos(clientX, clientY);
    
    if (interactionMode === InteractionMode.CREATE) {
        if (isCreatingRef.current) {
            creationEndRef.current = worldPos;
        }
    } else {
        if (isDraggingRef.current) {
          const dx = clientX - lastMousePosRef.current.x;
          const dy = clientY - lastMousePosRef.current.y;
          
          if (Math.abs(clientX - startMousePosRef.current.x) > 5 || Math.abs(clientY - startMousePosRef.current.y) > 5) {
            isPanRef.current = true;
          }

          setViewport((prev) => ({
            ...prev,
            offset: { x: prev.offset.x + dx, y: prev.offset.y + dy },
          }));
          lastMousePosRef.current = { x: clientX, y: clientY };
        }
    }
  };

  const handleEnd = (clientX: number, clientY: number) => {
    if (interactionMode === InteractionMode.CREATE) {
        if (isCreatingRef.current) {
            isCreatingRef.current = false;
            
            // Calculate Velocity based on drag vector
            const velocityScale = 0.05;
            const vx = (creationEndRef.current.x - creationStartRef.current.x) * velocityScale;
            const vy = (creationEndRef.current.y - creationStartRef.current.y) * velocityScale;
            
            // Even a click (zero drag) creates a body with 0 velocity
            onBodyCreate(creationStartRef.current, { x: vx, y: vy });
        }
    } else {
        isDraggingRef.current = false;

        if (!isPanRef.current) {
          const clickPos = getWorldPos(clientX, clientY);
          
          let clickedId: string | null = null;
          // Hit testing
          for (let i = bodiesRef.current.length - 1; i >= 0; i--) {
            const b = bodiesRef.current[i];
            const dist = Math.sqrt(
              Math.pow(clickPos.x - b.pos.x, 2) + Math.pow(clickPos.y - b.pos.y, 2)
            );
            if (dist <= Math.max(b.radius * 1.5, 15 / viewport.zoom)) { 
              clickedId = b.id;
              break;
            }
          }
          onBodySelect(clickedId);
        }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => handleStart(e.clientX, e.clientY);
  const handleMouseMove = (e: React.MouseEvent) => handleMove(e.clientX, e.clientY);
  const handleMouseUp = (e: React.MouseEvent) => handleEnd(e.clientX, e.clientY);

  // --- MULTI-TOUCH GESTURES (Pinch Zoom & Pan) ---
  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
      // START PINCH
      // Reset single-finger states
      isDraggingRef.current = false;
      isCreatingRef.current = false;
      isPanRef.current = true; // Prevent click/select on release
      
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const cx = (t1.clientX + t2.clientX) / 2;
      const cy = (t1.clientY + t2.clientY) / 2;
      
      lastTouchDistanceRef.current = dist;
      lastPinchCenterRef.current = { x: cx, y: cy };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
      // MOVE PINCH
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const cx = (t1.clientX + t2.clientX) / 2;
      const cy = (t1.clientY + t2.clientY) / 2;
      
      if (lastTouchDistanceRef.current > 0) {
          setViewport(prev => {
            const oldZoom = prev.zoom;
            const oldOffset = prev.offset;
            
            // 1. Zoom Scale
            const scale = dist / lastTouchDistanceRef.current;
            const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom * scale));
            
            // 2. Pan + Zoom Offset Correction
            // We want the world point that was under the PREVIOUS pinch center
            // to move to under the CURRENT pinch center (handling both pan and zoom).
            
            const lastCenter = lastPinchCenterRef.current;
            
            // World coordinates of the previous center
            const worldX = (lastCenter.x - oldOffset.x) / oldZoom;
            const worldY = (lastCenter.y - oldOffset.y) / oldZoom;
            
            // New offset so that worldX, worldY maps to cx, cy
            // Screen = World * Zoom + Offset  =>  Offset = Screen - World * Zoom
            const newOffsetX = cx - worldX * newZoom;
            const newOffsetY = cy - worldY * newZoom;
            
            return {
                zoom: newZoom,
                offset: { x: newOffsetX, y: newOffsetY }
            };
          });
      }
      
      lastTouchDistanceRef.current = dist;
      lastPinchCenterRef.current = { x: cx, y: cy };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
        // All fingers lifted
        if (e.changedTouches.length > 0) {
            handleEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        }
        isDraggingRef.current = false;
        isCreatingRef.current = false;
    } else if (e.touches.length === 1) {
        // Transited from 2 fingers to 1 finger
        // We treat this as a reset for single-finger pan to avoid jumps
        const t = e.touches[0];
        lastMousePosRef.current = { x: t.clientX, y: t.clientY };
        
        // Ensure we don't accidentally create objects if we were in create mode before pinching
        isCreatingRef.current = false; 
        
        // Allow resuming pan if we are in VIEW mode
        isDraggingRef.current = interactionMode === InteractionMode.VIEW;
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    const zoomSensitivity = 0.001;
    const newZoom = Math.max(0.05, Math.min(10, viewport.zoom - e.deltaY * zoomSensitivity));
    setViewport((prev) => ({ ...prev, zoom: newZoom }));
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { 
          isDraggingRef.current = false; 
          isCreatingRef.current = false; // Cancel creation if leaving canvas
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      className={`absolute top-0 left-0 w-full h-full touch-none ${interactionMode === InteractionMode.CREATE ? 'cursor-crosshair' : 'cursor-move'}`}
    />
  );
};

export default Canvas;
