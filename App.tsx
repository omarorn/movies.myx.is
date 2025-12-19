
import React, { useState, useEffect, useRef } from 'react';
import { AppState, MovieScene, Genre, Mood, Archetype, GenerationConfig } from './types';
import { analyzeScript, generateVideo } from './services/geminiService';

const GENRES: Genre[] = ['Sci-fi', 'Comedy', 'Drama', 'Horror', 'Action', 'Romance'];
const MOODS: Mood[] = ['Uplifting', 'Suspenseful', 'Heartwarming', 'Dark', 'Epic', 'Noir'];
const ARCHETYPES: Archetype[] = ['Reluctant Hero', 'Wise Mentor', 'Cunning Villain', 'Comic Relief', 'Femme Fatale', 'The Outcast'];

const LoadingOverlay: React.FC<{ message: string }> = ({ message }) => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black p-6 text-center">
    <div className="relative w-24 h-24 mb-8">
      <div className="absolute inset-0 border-4 border-red-600/20 rounded-full animate-pulse"></div>
      <div className="absolute inset-0 border-t-4 border-red-600 rounded-full animate-spin"></div>
    </div>
    <p className="text-2xl font-serif text-white tracking-widest uppercase animate-pulse">{message}</p>
    <p className="mt-4 text-gray-500 text-sm tracking-tighter uppercase">Initializing cinematic protocols...</p>
  </div>
);

const Header: React.FC = () => (
  <header className="fixed top-0 left-0 right-0 z-40 px-6 py-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm">
    <div className="flex items-center space-x-2">
      <div className="w-8 h-8 bg-red-600 rounded-sm rotate-45 flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.5)]">
        <div className="w-4 h-4 bg-white rounded-full -rotate-45"></div>
      </div>
      <h1 className="text-xl font-serif font-bold tracking-tighter text-white uppercase">Script<span className="text-red-600">2</span>Screen</h1>
    </div>
    <div className="hidden md:block text-[10px] uppercase tracking-[0.3em] text-gray-400 font-bold">
      Cinematic Intelligence v3.5
    </div>
  </header>
);

const SelectionCard: React.FC<{ 
  title: string; 
  options: string[]; 
  selected: any; 
  onSelect: (val: any) => void;
  isMulti?: boolean;
}> = ({ title, options, selected, onSelect, isMulti }) => (
  <div className="space-y-4">
    <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 mb-2">{title}</h3>
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const isActive = isMulti ? selected.includes(opt) : selected === opt;
        return (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300 border ${
              isActive 
                ? 'bg-red-600 border-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]' 
                : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  </div>
);

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.KEY_SELECTION);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState<string>('');
  const [sceneInfo, setSceneInfo] = useState<MovieScene | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  
  // Configuration State
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [config, setConfig] = useState<GenerationConfig>({
    genre: 'Sci-fi',
    mood: 'Epic',
    archetypes: []
  });

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (hasKey) {
        setState(AppState.UPLOAD);
      }
    };
    checkKey();
  }, []);

  const handleOpenKey = async () => {
    try {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setState(AppState.UPLOAD);
    } catch (err) {
      setError("Failed to open key selection dialog.");
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError("Please upload a valid PDF script.");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setPdfBase64(base64);
      setState(AppState.CONFIGURE);
      setError(null);
    };
  };

  const startGeneration = async () => {
    if (!pdfBase64) return;
    
    setLoadingMsg("Analyzing Narrative Beats...");
    setState(AppState.ANALYZING);
    setVideoLoaded(false);
    setError(null);

    try {
      const analysis = await analyzeScript(pdfBase64, config);
      setSceneInfo(analysis);
      
      setLoadingMsg("Rendering Cinematic Vision...");
      setState(AppState.GENERATING);
      
      const movieUrl = await generateVideo(analysis.visualPrompt, (msg) => setLoadingMsg(msg));
      setVideoUrl(movieUrl);
      setState(AppState.RESULT);
    } catch (apiErr: any) {
      if (apiErr.message?.includes("Requested entity was not found")) {
        setState(AppState.KEY_SELECTION);
        setError("Your API key session expired. Please re-select your project.");
      } else {
        setError(apiErr.message || "A production error occurred. Please try again.");
        setState(AppState.CONFIGURE);
      }
    }
  };

  const toggleArchetype = (arch: Archetype) => {
    setConfig(prev => ({
      ...prev,
      archetypes: prev.archetypes.includes(arch)
        ? prev.archetypes.filter(a => a !== arch)
        : [...prev.archetypes, arch]
    }));
  };

  const reset = () => {
    setState(AppState.UPLOAD);
    setVideoUrl(null);
    setSceneInfo(null);
    setPdfBase64(null);
    setVideoLoaded(false);
    setError(null);
  };

  const handleVideoCanPlay = () => {
    // Subtle delay to ensure first frame is actually ready for a smooth fade
    setTimeout(() => {
      setVideoLoaded(true);
    }, 200);
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-6 bg-[#050505]">
      {/* Background Ambience */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_40%,#151515_0%,#050505_100%)] opacity-80"></div>
        {videoUrl && state === AppState.RESULT && (
          <video 
            autoPlay 
            muted 
            loop 
            className={`absolute inset-0 w-full h-full object-cover blur-3xl scale-110 transition-opacity duration-[2000ms] ease-in-out ${videoLoaded ? 'opacity-20' : 'opacity-0'}`}
            src={videoUrl}
          />
        )}
      </div>

      <Header />

      <main className="w-full max-w-5xl z-10 py-20">
        {state === AppState.KEY_SELECTION && (
          <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <h2 className="text-6xl md:text-8xl font-serif font-bold tracking-tight">Your Story,<br/>Our <span className="text-red-600">Vision.</span></h2>
            <p className="text-gray-400 max-w-md mx-auto text-lg leading-relaxed">Bridge the gap between word and image. Connect your API key to enter the director's chair.</p>
            <div className="flex flex-col items-center space-y-4 pt-4">
              <button 
                onClick={handleOpenKey}
                className="group relative px-10 py-5 bg-white text-black font-black rounded-full transition-all transform hover:scale-105 active:scale-95 flex items-center space-x-3 overflow-hidden"
              >
                <div className="absolute inset-0 bg-red-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <span className="relative z-10 group-hover:text-white transition-colors">INITIATE STUDIO</span>
                <svg className="relative z-10 w-5 h-5 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
              </button>
              <a 
                href="https://ai.google.dev/gemini-api/docs/billing" 
                target="_blank" 
                rel="noreferrer" 
                className="text-[10px] text-gray-500 hover:text-white underline underline-offset-8 uppercase tracking-widest font-bold"
              >
                Billing Documentation
              </a>
            </div>
          </div>
        )}

        {state === AppState.UPLOAD && (
          <div className="space-y-12 animate-in fade-in duration-1000 max-w-2xl mx-auto">
             <div className="text-center space-y-4">
                <h2 className="text-5xl font-serif font-bold">Cast Your Script</h2>
                <p className="text-gray-400 text-lg">Upload your PDF script to define the narrative foundation.</p>
             </div>

             <div className="relative group">
               <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-amber-600 rounded-3xl blur-xl opacity-20 group-hover:opacity-40 transition duration-1000"></div>
               <div className="relative bg-black border border-white/5 rounded-3xl p-20 flex flex-col items-center justify-center space-y-8 backdrop-blur-md">
                 <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-red-600/50 transition-colors">
                    <svg className="w-10 h-10 text-white/40 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                 </div>
                 <div className="text-center space-y-2">
                   <p className="text-xl font-medium tracking-tight">Drop your screenplay here</p>
                   <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">PDF Format Required</p>
                 </div>
                 <input 
                  type="file" 
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                 />
               </div>
             </div>

             {error && (
               <div className="p-4 bg-red-900/10 border border-red-900/30 rounded-xl flex items-center space-x-3 text-red-500 animate-in fade-in slide-in-from-top-4">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  <p className="text-xs font-bold uppercase tracking-wider">{error}</p>
               </div>
             )}
          </div>
        )}

        {state === AppState.CONFIGURE && (
          <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <h2 className="text-4xl font-serif font-bold">Director's Settings</h2>
                  <p className="text-gray-500">Tailor the visual aesthetic and character dynamics.</p>
                </div>
                <button onClick={reset} className="text-[10px] text-gray-600 hover:text-white uppercase tracking-widest font-bold transition-colors">Change Script</button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-12 bg-white/5 border border-white/10 p-10 rounded-3xl backdrop-blur-sm">
                <div className="space-y-10">
                   <SelectionCard 
                    title="Cinematic Genre" 
                    options={GENRES} 
                    selected={config.genre} 
                    onSelect={(val) => setConfig(prev => ({...prev, genre: val}))} 
                   />
                   <SelectionCard 
                    title="Atmospheric Mood" 
                    options={MOODS} 
                    selected={config.mood} 
                    onSelect={(val) => setConfig(prev => ({...prev, mood: val}))} 
                   />
                </div>
                <div className="space-y-10">
                   <SelectionCard 
                    title="Character Archetypes" 
                    options={ARCHETYPES} 
                    selected={config.archetypes} 
                    isMulti 
                    onSelect={(val) => toggleArchetype(val as Archetype)} 
                   />
                   <div className="pt-6">
                      <p className="text-[10px] text-gray-600 uppercase tracking-widest leading-relaxed">
                        Select multiple archetypes to weave complex character relationships into your generated scene.
                      </p>
                   </div>
                </div>
             </div>

             <div className="flex justify-center pt-8">
                <button 
                  onClick={startGeneration}
                  disabled={config.archetypes.length === 0}
                  className={`px-12 py-5 rounded-full font-black tracking-[0.2em] transition-all transform hover:scale-105 active:scale-95 ${
                    config.archetypes.length > 0 
                    ? 'bg-red-600 text-white shadow-[0_10px_30px_rgba(220,38,38,0.3)]' 
                    : 'bg-white/10 text-gray-500 cursor-not-allowed opacity-50'
                  }`}
                >
                  START PRODUCTION
                </button>
             </div>
             {config.archetypes.length === 0 && (
               <p className="text-center text-[10px] text-red-500/70 uppercase tracking-widest font-bold">Select at least one archetype to proceed</p>
             )}
          </div>
        )}

        {state === AppState.RESULT && videoUrl && sceneInfo && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in fade-in duration-1000">
            <div className="lg:col-span-2 space-y-6">
               <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] ring-1 ring-white/10 relative group">
                  <video 
                    ref={videoRef}
                    src={videoUrl} 
                    controls 
                    autoPlay
                    onCanPlay={handleVideoCanPlay}
                    className={`w-full h-full object-cover transition-opacity duration-[1500ms] ease-out ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
                  />
                  {!videoLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black">
                       <div className="w-12 h-12 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin"></div>
                    </div>
                  )}
                  <div className={`absolute top-6 left-6 px-4 py-1.5 bg-red-600 text-white text-[10px] font-bold uppercase tracking-[0.3em] rounded-full transition-opacity duration-1000 ${videoLoaded ? 'opacity-100' : 'opacity-0'} shadow-lg`}>
                    Final Render
                  </div>
                  {/* Subtle Cinematic Grain Overlay */}
                  <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
               </div>
               <div className="flex justify-between items-center px-4">
                  <div className="flex space-x-8">
                     <button className="text-[10px] uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-colors font-bold">Export Sequence</button>
                     <button className="text-[10px] uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-colors font-bold">Archive Project</button>
                  </div>
                  <button 
                    onClick={reset}
                    className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase tracking-[0.2em] text-red-500 hover:bg-red-600 hover:text-white transition-all font-black"
                  >
                    New Production +
                  </button>
               </div>
            </div>

            <div className={`space-y-10 bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-3xl h-fit transition-all duration-1000 transform ${videoLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
               <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 border border-red-600/30 text-[9px] font-black text-red-500 uppercase