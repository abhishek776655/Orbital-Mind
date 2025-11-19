
import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Gauge, LayoutList, Scale, Lock, Unlock, History, Menu, ChevronUp, ChevronDown, X, Waves, Grid3X3, ZoomIn, ZoomOut, Scan } from 'lucide-react';
import { SimulationConfig, Body, Viewport } from '../types';
import { SCENARIOS, Scenario } from '../services/scenarios';
import { DEFAULT_CONFIG, MAX_TRAIL_LENGTH, MIN_ZOOM, MAX_ZOOM, INITIAL_VIEWPORT } from '../constants';

interface ControlsProps {
  config: SimulationConfig;
  setConfig: React.Dispatch<React.SetStateAction<SimulationConfig>>;
  isRunning: boolean;
  setIsRunning: React.Dispatch<React.SetStateAction<boolean>>;
  bodies: Body[];
  setBodies: React.Dispatch<React.SetStateAction<Body[]>>;
  onReset: () => void;
  selectedBodyId: string | null;
  viewport: Viewport;
  setViewport: React.Dispatch<React.SetStateAction<Viewport>>;
}

const Controls: React.FC<ControlsProps> = ({
  config,
  setConfig,
  isRunning,
  setIsRunning,
  bodies,
  setBodies,
  onReset,
  selectedBodyId,
  viewport,
  setViewport,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileConfigOpen, setIsMobileConfigOpen] = useState(false);

  const selectedBody = bodies.find(b => b.id === selectedBodyId);

  const loadScenario = (scenario: Scenario) => {
    setBodies(scenario.getBodies());
    setConfig(prev => ({ ...prev, ...DEFAULT_CONFIG, ...scenario.config }));
    setIsRunning(false); 
    setIsMobileMenuOpen(false); // Close menu on mobile after selection
  };

  const updateSelectedBodyMass = (newMass: number) => {
    if (!selectedBodyId) return;
    
    // Validation: Clamp value between 0.1 and 1,000,000
    let clampedMass = newMass;
    if (isNaN(clampedMass)) clampedMass = 1;
    clampedMass = Math.max(0.1, Math.min(1000000, clampedMass));

    setBodies(prev => prev.map(b => {
        if (b.id === selectedBodyId) {
            const density = b.density || 1;
            return { 
                ...b, 
                mass: clampedMass, 
                radius: Math.max(3, Math.sqrt(clampedMass / density)) 
            };
        }
        return b;
    }));
  };

  const updateSelectedBodyDensity = (newDensity: number) => {
    if (!selectedBodyId) return;
    
    // Clamp density
    const clampedDensity = Math.max(0.1, Math.min(20, newDensity));

    setBodies(prev => prev.map(b => {
        if (b.id === selectedBodyId) {
            return { 
                ...b, 
                density: clampedDensity,
                radius: Math.max(3, Math.sqrt(b.mass / clampedDensity)) 
            };
        }
        return b;
    }));
  };

  const toggleSelectedBodyFixed = () => {
    if (!selectedBodyId) return;
    setBodies(prev => prev.map(b => {
        if (b.id === selectedBodyId) {
            return { ...b, isFixed: !b.isFixed };
        }
        return b;
    }));
  };

  const handleZoomIn = () => {
    setViewport(prev => ({ ...prev, zoom: Math.min(MAX_ZOOM, prev.zoom * 1.2) }));
  };

  const handleZoomOut = () => {
    setViewport(prev => ({ ...prev, zoom: Math.max(MIN_ZOOM, prev.zoom / 1.2) }));
  };

  const handleResetZoom = () => {
    setViewport(INITIAL_VIEWPORT);
  };

  const sliderClass = "h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <>
      {/* --- MOBILE HEADER & TOGGLES --- */}
      <div className="md:hidden absolute top-4 left-4 z-50 pointer-events-auto">
        <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-3 bg-slate-800/80 backdrop-blur text-white rounded-full shadow-lg border border-white/10"
        >
            <Menu size={20} />
        </button>
      </div>

      {/* --- DESKTOP ZOOM CONTROLS (Floating bottom-right) --- */}
      <div className={`
        hidden md:flex flex-col gap-2 z-40 pointer-events-auto
        absolute bottom-8 right-8
        bg-black/80 rounded-xl border border-white/10 p-2
        opacity-40 hover:opacity-100 transition-opacity duration-300
      `}>
        <button 
            onClick={handleZoomIn} 
            className="p-2 bg-white/5 hover:bg-white/20 rounded-lg text-cyan-400 transition-colors active:scale-95"
            title="Zoom In"
        >
            <ZoomIn size={20} />
        </button>
        <button 
            onClick={handleResetZoom} 
            className="p-2 bg-white/5 hover:bg-white/20 rounded-lg text-slate-400 hover:text-white transition-colors active:scale-95"
            title="Reset View"
        >
            <Scan size={20} />
        </button>
        <button 
            onClick={handleZoomOut} 
            className="p-2 bg-white/5 hover:bg-white/20 rounded-lg text-cyan-400 transition-colors active:scale-95"
            title="Zoom Out"
        >
            <ZoomOut size={20} />
        </button>
      </div>

      {/* --- MOBILE BACKDROP --- */}
      {isMobileMenuOpen && (
        <div 
            className="fixed inset-0 bg-black/60 z-[55] md:hidden pointer-events-auto backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* --- SCENARIO SELECTION PANEL (Sidebar on Mobile / Float on Desktop) --- */}
      <div className={`
        z-[60] pointer-events-auto
        /* Mobile Styles */
        fixed inset-y-0 left-0 w-72 bg-slate-900/95 backdrop-blur-xl border-r border-white/10 shadow-2xl
        transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}

        /* Desktop Styles override */
        md:absolute md:top-6 md:right-6 md:left-auto md:bottom-auto md:w-64 md:h-auto md:max-h-[80vh] 
        md:bg-black/80 md:rounded-xl md:border md:border-white/10 
        md:translate-x-0 
        md:opacity-40 md:hover:opacity-100 md:transition-opacity md:duration-300
        md:z-50
      `}>
        <div className="p-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 md:mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    <LayoutList size={14} />
                    Simulation Types
                </div>
                <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="md:hidden text-slate-400 hover:text-white"
                >
                    <X size={20} />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-2">
                 {SCENARIOS.map((scenario) => (
                    <button
                    key={scenario.name}
                    onClick={() => loadScenario(scenario)}
                    className="text-left px-3 py-3 md:py-2.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/5 hover:border-cyan-500/30 text-sm font-medium text-slate-300 hover:text-white transition-all duration-200 hover:translate-x-1 active:scale-95"
                    >
                    {scenario.name}
                    </button>
                ))}
            </div>
        </div>
      </div>


      {/* --- MOBILE BOTTOM ACTION BAR (Always Visible on Mobile) --- */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900/90 backdrop-blur-md border-t border-white/10 p-4 z-50 flex items-center justify-between pb-6 pointer-events-auto">
         <div className="flex items-center gap-4">
            <button
                onClick={() => setIsRunning(!isRunning)}
                className={`p-3 rounded-full transition-all duration-200 flex items-center justify-center shadow-lg active:scale-95 ${
                isRunning 
                    ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/50' 
                    : 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/50'
                }`}
            >
                {isRunning ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
            </button>
            <button
                onClick={onReset}
                className="p-3 bg-white/5 active:bg-white/20 rounded-full text-slate-400 transition-colors shadow-lg active:scale-95"
            >
                <RotateCcw size={18} />
            </button>
         </div>

         <button 
            onClick={() => setIsMobileConfigOpen(!isMobileConfigOpen)}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-white"
         >
             {isMobileConfigOpen ? <ChevronDown size={24} /> : <ChevronUp size={24} />}
             <span className="text-[10px] uppercase font-bold tracking-wider">Config</span>
         </button>
      </div>


      {/* --- MAIN CONTROLS PANEL (Bottom Sheet on Mobile / Float on Desktop) --- */}
      <div className={`
        z-40 pointer-events-auto
        /* Mobile Styles */
        fixed bottom-0 left-0 w-full bg-slate-900/95 backdrop-blur-xl rounded-t-2xl border-t border-white/10 shadow-2xl pb-24 pt-6 px-6
        transition-transform duration-300 ease-out
        ${isMobileConfigOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}

        /* Desktop Styles override */
        md:absolute md:bottom-8 md:left-1/2 md:-translate-x-1/2 md:w-[95%] md:max-w-3xl md:h-auto 
        md:bg-black/80 md:rounded-2xl md:border md:border-white/10 
        md:opacity-40 md:hover:opacity-100 
        md:translate-y-0
        md:transition-opacity md:duration-300
      `}>
        
        {/* Desktop Playback Row (Hidden on Mobile as it is in the bottom bar) */}
        <div className="hidden md:flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => setIsRunning(!isRunning)}
                    className={`p-3 rounded-full transition-all duration-200 flex items-center justify-center shadow-lg active:scale-95 ${
                    isRunning 
                        ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 ring-1 ring-amber-500/50' 
                        : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 ring-1 ring-cyan-500/50'
                    }`}
                >
                    {isRunning ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                </button>
                <button
                    onClick={onReset}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors shadow-lg active:scale-95"
                    title="Reset"
                >
                    <RotateCcw size={20} />
                </button>
                
                <div className="h-8 w-px bg-white/10 mx-2"></div>

                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</span>
                    <span className={`font-mono text-sm font-medium ${isRunning ? 'text-cyan-400' : 'text-amber-400'}`}>
                        {isRunning ? 'RUNNING' : 'PAUSED'}
                    </span>
                </div>
            </div>
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            
            {/* Left Column: Physics, Trails & Waves */}
            <div className="flex flex-col gap-5">
                {/* Mobile View Controls (Only visible on mobile) */}
                <div className="md:hidden flex items-center justify-between bg-white/5 p-2 rounded-lg border border-white/5 mb-2">
                     <span className="text-xs font-bold text-slate-400 uppercase ml-2">Zoom View</span>
                     <div className="flex items-center gap-2">
                        <button onClick={handleZoomIn} className="p-2 bg-white/10 rounded text-cyan-400"><ZoomIn size={16} /></button>
                        <button onClick={handleResetZoom} className="p-2 bg-white/10 rounded text-slate-400"><Scan size={16} /></button>
                        <button onClick={handleZoomOut} className="p-2 bg-white/10 rounded text-cyan-400"><ZoomOut size={16} /></button>
                     </div>
                </div>

                {/* Speed Slider */}
                <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <span className="flex items-center gap-2 text-cyan-500">
                            <Gauge size={16} /> 
                            Sim Speed
                        </span>
                        <span className="font-mono text-white bg-white/10 px-1.5 py-0.5 rounded">
                            {config.timeScale.toFixed(1)}x
                        </span>
                    </div>
                    <div className="relative flex items-center h-8">
                         <input
                            type="range"
                            min="0.1"
                            max="50.0"
                            step="0.1"
                            value={config.timeScale}
                            onChange={(e) => setConfig(prev => ({ ...prev, timeScale: parseFloat(e.target.value) }))}
                            className={`${sliderClass} w-full`}
                        />
                    </div>
                </div>

                {/* Trails Toggles & Length */}
                <div className="flex flex-col gap-3">
                     <div className="flex items-center justify-between gap-4 mb-1">
                        <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold uppercase tracking-wider">
                            <History size={16} />
                            Trails
                        </div>
                        {/* Fade Toggle */}
                        <div className={`flex items-center gap-2 transition-opacity ${!config.showTrails ? 'opacity-40' : ''}`}>
                             <span className="text-[10px] font-bold text-slate-500 uppercase">Fade</span>
                            <button
                                disabled={!config.showTrails}
                                onClick={() => setConfig(prev => ({ ...prev, trailFade: !prev.trailFade }))}
                                className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                                    config.trailFade ? 'bg-emerald-500/20 ring-1 ring-emerald-500/50' : 'bg-white/10'
                                }`}
                            >
                                <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-emerald-400 transition-transform ml-0.5 ${
                                    config.trailFade ? 'translate-x-3' : 'translate-x-0 opacity-50 grayscale'
                                }`} />
                            </button>
                        </div>
                        {/* On/Off */}
                        <button
                            onClick={() => setConfig(prev => ({ ...prev, showTrails: !prev.showTrails }))}
                             className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                config.showTrails ? 'bg-emerald-500/20 ring-1 ring-emerald-500/50' : 'bg-white/10'
                            }`}
                        >
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-emerald-400 transition-transform ml-1 ${
                                config.showTrails ? 'translate-x-4' : 'translate-x-0 opacity-50 grayscale'
                            }`} />
                        </button>
                     </div>
                     {/* Trail Length Slider */}
                     <div className={`relative flex items-center h-8 transition-opacity duration-300 ${!config.showTrails ? 'opacity-40 pointer-events-none' : ''}`}>
                         <input
                            type="range"
                            min="0"
                            max={MAX_TRAIL_LENGTH}
                            step="50"
                            value={config.trailLength}
                            disabled={!config.showTrails || !config.trailFade}
                            onChange={(e) => setConfig(prev => ({ ...prev, trailLength: parseInt(e.target.value) }))}
                            className={`${sliderClass} w-full`}
                        />
                    </div>
                </div>

                {/* Spacetime / Gravity Waves (Moved to Left Column) */}
                <div className="flex flex-col gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                     <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <span className="flex items-center gap-2 text-indigo-400">
                            <Waves size={16} /> 
                            Spacetime & Waves
                        </span>
                         <button
                            onClick={() => setConfig(prev => ({ ...prev, showGrid: !prev.showGrid }))}
                            className={`p-1 rounded transition-colors ${config.showGrid ? 'text-cyan-400 bg-cyan-900/30' : 'text-slate-600 bg-white/5'}`}
                            title="Toggle Grid"
                        >
                            <Grid3X3 size={16} />
                        </button>
                    </div>
                    
                    <div className={`flex flex-col gap-2 transition-opacity duration-300 ${!config.showGrid ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
                         <div className="flex items-center gap-4">
                             <span className="text-[10px] font-medium text-slate-500 w-16 text-right uppercase tracking-wide">Amplitude</span>
                             <input
                                type="range"
                                min="0"
                                max="20"
                                step="0.5"
                                value={config.waveAmplitude}
                                onChange={(e) => setConfig(prev => ({ ...prev, waveAmplitude: parseFloat(e.target.value) }))}
                                className={`${sliderClass} flex-1`}
                            />
                         </div>
                         <div className="flex items-center gap-4">
                             <span className="text-[10px] font-medium text-slate-500 w-16 text-right uppercase tracking-wide">Freq</span>
                             <input
                                type="range"
                                min="0.01"
                                max="0.1"
                                step="0.005"
                                value={config.waveFrequency}
                                onChange={(e) => setConfig(prev => ({ ...prev, waveFrequency: parseFloat(e.target.value) }))}
                                className={`${sliderClass} flex-1`}
                            />
                         </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Body Selection & Properties */}
            <div className="flex flex-col gap-5">
                {/* Selected Body Controls */}
                <div className={`flex flex-col gap-3 transition-all duration-300 ${selectedBody ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                    <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <span className="flex items-center gap-2 text-purple-400">
                            <Scale size={16} /> 
                            Body Properties
                        </span>
                         <div className="flex items-center gap-3">
                            {selectedBody && (
                                <span className="text-[10px] font-bold text-slate-500 uppercase">
                                    ANCHOR
                                </span>
                            )}
                            <button
                                onClick={toggleSelectedBodyFixed}
                                disabled={!selectedBody}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-all border min-w-[74px] justify-center ${
                                    selectedBody?.isFixed 
                                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-[0_0_10px_-4px_rgba(168,85,247,0.5)]' 
                                    : 'bg-slate-800/50 border-white/10 text-slate-400 hover:bg-white/5'
                                }`}
                            >
                                {selectedBody?.isFixed ? <Lock size={11} /> : <Unlock size={11} />}
                                {selectedBody?.isFixed ? 'LOCKED' : 'FREE'}
                            </button>
                         </div>
                    </div>
                    
                    {/* Mass Slider */}
                    <div className="flex items-center gap-3 h-8">
                        <span className="text-[10px] font-medium text-slate-500 w-14 text-right uppercase tracking-wide">Mass</span>
                        <input
                            type="range"
                            min="1"
                            max="1000000"
                            step="1"
                            disabled={!selectedBody}
                            value={selectedBody ? selectedBody.mass : 100}
                            onChange={(e) => updateSelectedBodyMass(parseFloat(e.target.value))}
                            className={`${sliderClass} flex-1`}
                        />
                         <input 
                            type="number"
                            min="0.1"
                            max="1000000"
                            step="any"
                            disabled={!selectedBody}
                            value={selectedBody ? selectedBody.mass : ''}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val)) {
                                    updateSelectedBodyMass(val);
                                }
                            }}
                            className="font-mono text-xs text-white bg-white/10 border border-white/20 px-1.5 py-0.5 rounded w-16 text-center focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all appearance-none"
                        />
                    </div>

                    {/* Density Slider */}
                    <div className="flex items-center gap-3 h-8">
                         <span className="text-[10px] font-medium text-slate-500 w-14 text-right uppercase tracking-wide">Density</span>
                         <input
                            type="range"
                            min="0.1"
                            max="10"
                            step="0.1"
                            disabled={!selectedBody}
                            value={selectedBody ? (selectedBody.density || 1) : 1}
                            onChange={(e) => updateSelectedBodyDensity(parseFloat(e.target.value))}
                            className={`${sliderClass} flex-1`}
                        />
                         <input 
                            type="number"
                            min="0.1"
                            max="50"
                            step="0.1"
                            disabled={!selectedBody}
                            value={selectedBody ? (selectedBody.density || 1) : ''}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val)) {
                                    updateSelectedBodyDensity(val);
                                }
                            }}
                            className="font-mono text-xs text-white bg-white/10 border border-white/20 px-1.5 py-0.5 rounded w-16 text-center focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all appearance-none"
                        />
                    </div>

                </div>
            </div>
        </div>
      </div>
    </>
  );
};

export default Controls;
