
import React, { useState, useEffect, useRef } from 'react';
import Canvas from './components/Canvas';
import Controls from './components/Controls';
import { Body, SimulationConfig, Viewport, InteractionMode } from './types';
import { DEFAULT_CONFIG, INITIAL_VIEWPORT, BODY_COLORS } from './constants';
import { SCENARIOS, Scenario } from './services/scenarios';
import { ChevronRight, Atom, Shuffle } from 'lucide-react';
import { createBody } from './services/physicsEngine';

const App: React.FC = () => {
  const [bodies, setBodies] = useState<Body[]>([]);
  const [initialBodies, setInitialBodies] = useState<Body[]>([]);
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [viewport, setViewport] = useState<Viewport>(INITIAL_VIEWPORT);
  const [isRunning, setIsRunning] = useState(true); // Start running immediately for background
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(InteractionMode.VIEW);
  const [creationMass, setCreationMass] = useState(100);
  
  // App State
  const [hasStarted, setHasStarted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // UI Visibility State
  const [isUIActive, setIsUIActive] = useState(true);
  const inactivityTimerRef = useRef<number | null>(null);

  const handleLoadScenario = (scenario: Scenario) => {
    const generatedBodies = scenario.getBodies();
    setBodies(generatedBodies);
    setInitialBodies(generatedBodies);
    setConfig({ ...DEFAULT_CONFIG, ...scenario.config });
    setIsRunning(false);
    setSelectedBodyId(null);
  };

  const loadRandomScenario = () => {
    const randomScenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
    const generatedBodies = randomScenario.getBodies();
    
    setBodies(generatedBodies);
    setInitialBodies(generatedBodies);
    setConfig({ ...DEFAULT_CONFIG, ...randomScenario.config });
    
    // Viewport positioning logic
    let initialOffset = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    // On mobile, center the camera on the heaviest body to ensure visibility
    if (window.innerWidth < 768 && generatedBodies.length > 0) {
        const heaviest = generatedBodies.reduce((prev, curr) => (prev.mass > curr.mass) ? prev : curr);
        initialOffset = {
            x: (window.innerWidth / 2) - heaviest.pos.x,
            y: (window.innerHeight / 2) - heaviest.pos.y
        };
    }

    setViewport({
        offset: initialOffset,
        zoom: 1,
    });
  };

  // Load random scenario on mount for the background
  useEffect(() => {
    loadRandomScenario();
  }, []);

  // Inactivity Timer Logic
  useEffect(() => {
    const resetTimer = () => {
        setIsUIActive(true);
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        
        // Only set timeout if the app has started
        if (hasStarted) {
            inactivityTimerRef.current = window.setTimeout(() => {
                setIsUIActive(false);
            }, 3000);
        }
    };

    const events = ['mousemove', 'mousedown', 'touchstart', 'keydown', 'wheel'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    
    // Initial call
    resetTimer();

    return () => {
        events.forEach(e => window.removeEventListener(e, resetTimer));
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [hasStarted]);

  const handleStart = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setHasStarted(true);
      setIsTransitioning(false);
    }, 800);
  };

  const handleReset = () => {
    // Restore from initialBodies
    if (initialBodies.length > 0) {
        setBodies(initialBodies.map(b => ({
            ...b,
            // Generate new ID to force Canvas reconciliation to accept new positions
            // otherwise it preserves the current simulation state if IDs match.
            id: Math.random().toString(36).substr(2, 9),
            trail: [],
            pos: { ...b.pos },
            vel: { ...b.vel }
        })));
    } else {
        setBodies([]);
    }
    setIsRunning(false);
    setSelectedBodyId(null);
  };

  const handleCreateBody = (pos: { x: number, y: number }, vel: { x: number, y: number }) => {
    const color = BODY_COLORS[Math.floor(Math.random() * BODY_COLORS.length)];
    // Random slightly varied color for visual interest if needed, but sticking to palette is safer
    const newBody = createBody(pos, vel, creationMass, color);
    setBodies(prev => [...prev, newBody]);
  };

  const toggleInteractionMode = () => {
      setInteractionMode(prev => prev === InteractionMode.VIEW ? InteractionMode.CREATE : InteractionMode.VIEW);
      setSelectedBodyId(null); // Clear selection when switching modes
  };

  // Helper to manage UI visibility classes
  // When hidden: opacity-0 and disable pointer events on all children
  const uiVisibilityClass = (hasStarted && !isTransitioning && isUIActive) 
    ? 'opacity-100 translate-y-0' 
    : (hasStarted && !isTransitioning && !isUIActive)
        ? 'opacity-0 translate-y-0 [&_*]:pointer-events-none' // Keep position, fade out, disable clicks
        : 'opacity-0 translate-y-0 pointer-events-none'; // Initial hidden state (was translate-y-10)

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden font-sans selection:bg-cyan-500/30">
      {/* The Background Simulation */}
      <div className={`absolute inset-0 transition-all duration-1000 ease-in-out transform ${!hasStarted ? 'opacity-60 scale-105 blur-[1px]' : 'opacity-100 scale-100 blur-0'}`}>
        <Canvas
          bodies={bodies}
          setBodies={setBodies}
          config={config}
          viewport={viewport}
          setViewport={setViewport}
          isRunning={isRunning}
          selectedBodyId={selectedBodyId}
          onBodySelect={setSelectedBodyId}
          interactionMode={interactionMode}
          onBodyCreate={handleCreateBody}
          creationMass={creationMass}
        />
      </div>
      
      {/* Main Controls Layer - Fullscreen overlay that allows click-through */}
      <div className={`absolute inset-0 z-40 pointer-events-none flex flex-col justify-between transition-all duration-700 ease-out transform ${uiVisibilityClass}`}>
        <Controls
            config={config}
            setConfig={setConfig}
            isRunning={isRunning}
            setIsRunning={setIsRunning}
            bodies={bodies}
            setBodies={setBodies}
            onReset={handleReset}
            selectedBodyId={selectedBodyId}
            viewport={viewport}
            setViewport={setViewport}
            onLoadScenario={handleLoadScenario}
            interactionMode={interactionMode}
            onToggleMode={toggleInteractionMode}
            creationMass={creationMass}
            setCreationMass={setCreationMass}
        />
      </div>

      {/* Startup / Hero Screen */}
      {!hasStarted && (
        <div className={`absolute inset-0 flex flex-col items-center justify-center z-50 transition-all duration-700 ${isTransitioning ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100'}`}>
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/80 backdrop-blur-[2px]" />
            
            <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl">
                <div className="mb-6 p-4 bg-white/5 rounded-full border border-white/10 shadow-[0_0_50px_-12px_rgba(6,182,212,0.5)] animate-pulse">
                    <Atom size={48} className="text-cyan-400" />
                </div>
                
                <h1 className="text-5xl md:text-7xl font-black text-white mb-2 tracking-tighter drop-shadow-2xl">
                    ORBITAL<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">MIND</span>
                </h1>
                
                <p className="text-lg md:text-xl text-slate-300 mb-12 font-light max-w-md leading-relaxed">
                    An interactive N-body gravity simulation. 
                    Explore chaotic systems, stable orbits, and the dance of the cosmos.
                </p>

                <div className="flex flex-col md:flex-row items-center gap-4">
                    <button 
                        onClick={handleStart}
                        className="group relative px-8 py-4 bg-white text-black font-bold text-lg tracking-wider uppercase rounded-full overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.6)] focus:outline-none focus:ring-2 focus:ring-white/50 active:scale-95"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            Launch Simulation
                            <ChevronRight size={20} className="transition-transform group-hover:translate-x-1" />
                        </span>
                        <div className="absolute inset-0 bg-cyan-400 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300 ease-out opacity-20" />
                    </button>

                    <button
                        onClick={loadRandomScenario}
                        className="px-6 py-4 rounded-full border border-white/10 bg-black/30 backdrop-blur text-slate-300 hover:bg-white/10 hover:text-white hover:border-white/30 transition-all active:scale-95 flex items-center gap-2 text-sm font-medium uppercase tracking-wider"
                    >
                        <Shuffle size={18} />
                        Shuffle Universe
                    </button>
                </div>

                <div className="mt-16 flex items-center gap-8 text-xs text-slate-500 font-mono uppercase tracking-widest">
                    <span>Physics Engine: Verlet</span>
                    <span>•</span>
                    <span>Accuracy: High</span>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
