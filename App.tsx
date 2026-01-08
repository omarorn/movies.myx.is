
import React, { useState, useEffect, useRef } from 'react';
import { AppState, MovieScene, Genre, Mood, Archetype, GenerationConfig, Subtitle, CameraMovement } from './types';
import { analyzeScript, generateVideo, generateStoryboard } from './services/geminiService';

const GENRES: Genre[] = ['Sci-fi', 'Comedy', 'Drama', 'Horror', 'Action', 'Romance'];
const MOODS: Mood[] = ['Uplifting', 'Suspenseful', 'Heartwarming', 'Dark', 'Epic', 'Noir'];
const ARCHETYPES: Archetype[] = ['Reluctant Hero', 'Wise Mentor', 'Cunning Villain', 'Comic Relief', 'Femme Fatale', 'The Outcast'];
const CAMERA_MOVES: CameraMovement[] = ['Static', 'Cinematic Push-In', 'Slow Pan Left', 'Slow Pan Right', 'Handheld Shake', 'Drone Flyover', 'Zoom Out'];

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
  
  // Playback state
  const [currentTime, setCurrentTime] = useState(0);
  const [showSubtitles, setShowSubtitles] = useState(true);

  // Configuration State
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [config, setConfig] = useState<GenerationConfig>({
    genre: 'Sci-fi',
    mood: 'Epic',
    archetypes: [],
    camera: 'Cinematic Push-In',
    includeSubtitles: true
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      try {
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (hasKey) {
          setState(AppState.UPLOAD);
        }
      } catch (e) {
        setState(AppState.KEY_SELECTION);
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
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setLoadingMsg("Reading Script...");
    const reader = new FileReader();
    
    reader.onload = () => {
      try {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        setPdfBase64(base64);
        setState(AppState.CONFIGURE);
        setError(null);
      } catch (err: any) {
        setError("Error processing script. Please try another file.");
      } finally {
        setLoadingMsg("");
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      setError("Failed to read the file. Please try again.");
      setLoadingMsg("");
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsDataURL(file);
  };

  // Phase 1: Analyze Script & Generate Storyboard
  const startAnalysis = async () => {
    if (!pdfBase64) return;
    
    setLoadingMsg("Analyzing Narrative Beats...");
    setState(AppState.ANALYZING);
    setError(null);

    try {
      // 1. Analyze Text
      const analysis = await analyzeScript(pdfBase64, config);
      setSceneInfo(analysis);

      // 2. Generate Storyboard
      setLoadingMsg("Sketching Storyboard...");
      const storyboard = await generateStoryboard(analysis.visualPrompt);
      setSceneInfo(prev => prev ? ({ ...prev, storyboardImage: storyboard }) : analysis);

      setState(AppState.STORYBOARD);
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

  // Phase 2: Generate Final Video
  const startVideoGeneration = async () => {
    if (!sceneInfo) return;
    
    setLoadingMsg("Rendering Cinematic Vision...");
    setState(AppState.GENERATING);
    setVideoLoaded(false);

    try {
      // Use prompt from sceneInfo (which user might have technically influenced by camera choice earlier)
      // If we allowed editing the visual prompt, we'd pass the edited one here.
      const movieUrl = await generateVideo(sceneInfo.visualPrompt, (msg) => setLoadingMsg(msg));
      setVideoUrl(movieUrl);
      setState(AppState.RESULT);
    } catch (apiErr: any) {
      setError(apiErr.message || "Video generation failed.");
      setState(AppState.STORYBOARD);
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
    setTimeout(() => {
      setVideoLoaded(true);
    }, 200);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const updateSubtitleText = (index: number, newText: string) => {
    if (!sceneInfo) return;
    const newSubtitles = [...(sceneInfo.subtitles || [])];
    newSubtitles[index] = { ...newSubtitles[index], text: newText };
    setSceneInfo({ ...sceneInfo, subtitles: newSubtitles });
  };

  const updateSubtitleTime = (index: number, field: 'startTime' | 'endTime', value: string) => {
    if (!sceneInfo) return;
    const newSubtitles = [...(sceneInfo.subtitles || [])];
    const val = parseFloat(value);
    newSubtitles[index] = { ...newSubtitles[index], [field]: isNaN(val) ? 0 : val };
    setSceneInfo({ ...sceneInfo, subtitles: newSubtitles });
  };

  const currentSubtitle = sceneInfo?.subtitles?.find(
    s => currentTime >= s.startTime && currentTime <= s.endTime
  );

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
              <button onClick={handleOpenKey} className="group relative px-10 py-5 bg-white text-black font-black rounded-full transition-all transform hover:scale-105 active:scale-95 flex items-center space-x-3 overflow-hidden">
                <div className="absolute inset-0 bg-red-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <span className="relative z-10 group-hover:text-white transition-colors">INITIATE STUDIO</span>
                <svg className="relative z-10 w-5 h-5 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
              </button>
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-[10px] text-gray-500 hover:text-white underline underline-offset-8 uppercase tracking-widest font-bold">Billing Documentation</a>
            </div>
            {error && <p className="text-red-500 text-sm font-bold uppercase tracking-widest">{error}</p>}
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
                 <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
               </div>
             </div>
             {error && <div className="p-4 bg-red-900/10 border border-red-900/30 rounded-xl flex items-center space-x-3 text-red-500 animate-in fade-in slide-in-from-top-4"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg><p className="text-xs font-bold uppercase tracking-wider">{error}</p></div>}
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
                   <SelectionCard title="Cinematic Genre" options={GENRES} selected={config.genre} onSelect={(val) => setConfig(prev => ({...prev, genre: val}))} />
                   <SelectionCard title="Atmospheric Mood" options={MOODS} selected={config.mood} onSelect={(val) => setConfig(prev => ({...prev, mood: val}))} />
                   <SelectionCard title="Camera Movement" options={CAMERA_MOVES} selected={config.camera} onSelect={(val) => setConfig(prev => ({...prev, camera: val}))} />
                </div>
                <div className="space-y-10">
                   <SelectionCard title="Character Archetypes" options={ARCHETYPES} selected={config.archetypes} isMulti onSelect={(val) => toggleArchetype(val as Archetype)} />
                   <div className="pt-6 space-y-4">
                      <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setConfig(prev => ({ ...prev, includeSubtitles: !prev.includeSubtitles }))}>
                        <div className={`w-12 h-6 rounded-full transition-all duration-300 relative ${config.includeSubtitles ? 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]' : 'bg-white/10'}`}>
                          <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${config.includeSubtitles ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${config.includeSubtitles ? 'text-white' : 'text-gray-500'}`}>Generate Cinematic Subtitles</span>
                      </div>
                      <p className="text-[10px] text-gray-600 uppercase tracking-widest leading-relaxed">Enabling subtitles allows the AI to weave dialogue into the visual metadata.</p>
                   </div>
                </div>
             </div>
             <div className="flex justify-center pt-8">
                <button onClick={startAnalysis} disabled={config.archetypes.length === 0} className={`px-12 py-5 rounded-full font-black tracking-[0.2em] transition-all transform hover:scale-105 active:scale-95 ${config.archetypes.length > 0 ? 'bg-red-600 text-white shadow-[0_10px_30px_rgba(220,38,38,0.3)]' : 'bg-white/10 text-gray-500 cursor-not-allowed opacity-50'}`}>
                  INITIALIZE STORYBOARD
                </button>
             </div>
          </div>
        )}

        {state === AppState.STORYBOARD && sceneInfo && (
          <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-700">
            <div className="flex justify-between items-end">
                <div className="space-y-2">
                  <h2 className="text-4xl font-serif font-bold">Storyboard Visualization</h2>
                  <p className="text-gray-500">Review the AI-generated visual concept before final production.</p>
                </div>
                <div className="flex space-x-4">
                   <button onClick={() => setState(AppState.CONFIGURE)} className="text-[10px] text-gray-600 hover:text-white uppercase tracking-widest font-bold transition-colors">Adjust Settings</button>
                   <button onClick={startVideoGeneration} className="px-8 py-3 bg-red-600 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-700 transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)]">Generate Video</button>
                </div>
            </div>

            <div className="bg-black border border-white/10 rounded-3xl overflow-hidden relative shadow-2xl">
              {sceneInfo.storyboardImage ? (
                <img src={sceneInfo.storyboardImage} alt="Storyboard" className="w-full h-auto object-cover" />
              ) : (
                <div className="aspect-video bg-white/5 flex items-center justify-center text-gray-500">Processing Storyboard...</div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-8">
                <h3 className="text-3xl font-serif font-bold">{sceneInfo.title}</h3>
                <p className="text-sm text-gray-300 italic mt-2 opacity-80">{sceneInfo.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                <h4 className="text-[10px] uppercase font-black text-gray-500 tracking-[0.3em] mb-4">Production Data</h4>
                <div className="space-y-2 text-xs text-gray-300">
                  <p><span className="text-gray-500 font-bold uppercase w-24 inline-block">Genre:</span> {sceneInfo.genre}</p>
                  <p><span className="text-gray-500 font-bold uppercase w-24 inline-block">Mood:</span> {sceneInfo.mood}</p>
                  <p><span className="text-gray-500 font-bold uppercase w-24 inline-block">Cast:</span> {sceneInfo.characters.join(', ')}</p>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-gray-500 font-bold uppercase mb-2">Visual Prompt:</p>
                    <p className="font-mono text-[10px] text-gray-400 leading-relaxed bg-black/50 p-2 rounded">{sceneInfo.visualPrompt}</p>
                  </div>
                </div>
              </div>

              {sceneInfo.subtitles && sceneInfo.subtitles.length > 0 && (
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                   <h4 className="text-[10px] uppercase font-black text-gray-500 tracking-[0.3em] mb-4">Dialogue Editor</h4>
                   <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                     {sceneInfo.subtitles.map((sub, idx) => (
                       <div key={idx} className="flex flex-col space-y-1 bg-black/20 p-2 rounded border border-white/5 hover:border-white/10 transition-colors">
                         <div className="flex items-center space-x-2 mb-1">
                            <span className="text-[9px] text-gray-500 font-bold uppercase w-8">Time</span>
                            <input 
                                type="number" 
                                step="0.1"
                                value={sub.startTime}
                                onChange={(e) => updateSubtitleTime(idx, 'startTime', e.target.value)}
                                className="w-12 bg-black/40 border border-white/10 rounded px-1 py-0.5 text-[10px] text-gray-300 focus:outline-none focus:border-red-600 text-center"
                                placeholder="Start"
                            />
                            <span className="text-gray-500">-</span>
                            <input 
                                type="number" 
                                step="0.1"
                                value={sub.endTime}
                                onChange={(e) => updateSubtitleTime(idx, 'endTime', e.target.value)}
                                className="w-12 bg-black/40 border border-white/10 rounded px-1 py-0.5 text-[10px] text-gray-300 focus:outline-none focus:border-red-600 text-center"
                                placeholder="End"
                            />
                         </div>
                         <input 
                           type="text" 
                           value={sub.text}
                           onChange={(e) => updateSubtitleText(idx, e.target.value)}
                           className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600 transition-colors"
                         />
                       </div>
                     ))}
                   </div>
                </div>
              )}
            </div>
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
                    onTimeUpdate={handleTimeUpdate}
                    className={`w-full h-full object-cover transition-opacity duration-[1500ms] ease-out ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
                  />
                  
                  {/* Subtitle Overlay */}
                  {showSubtitles && (
                    <div className="absolute bottom-16 left-0 right-0 px-8 flex justify-center pointer-events-none">
                      <div className={`transition-all duration-300 transform ${currentSubtitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        {currentSubtitle && (
                          <p className="text-[#fbbf24] text-xl md:text-2xl font-semibold text-center leading-tight tracking-wide drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] font-sans bg-black/40 px-4 py-1 rounded backdrop-blur-sm">
                            {currentSubtitle.text}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

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
               
               {/* Result View Actions */}
               <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                  <div className="flex items-center space-x-6">
                     {sceneInfo.subtitles && sceneInfo.subtitles.length > 0 && (
                       <button 
                        onClick={() => setShowSubtitles(!showSubtitles)}
                        className={`text-[10px] uppercase tracking-[0.2em] font-bold transition-all duration-300 ${showSubtitles ? 'text-red-500' : 'text-gray-500 hover:text-white'}`}
                       >
                         {showSubtitles ? 'Hide Subtitles' : 'Show Subtitles'}
                       </button>
                     )}
                     <div className="h-4 w-px bg-white/10"></div>
                     <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Camera: <span className="text-white">{config.camera}</span></span>
                  </div>
                  <div className="flex space-x-3">
                     <button 
                       onClick={() => setState(AppState.STORYBOARD)}
                       className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] uppercase tracking-[0.2em] text-white transition-all font-bold"
                     >
                       Edit Storyboard
                     </button>
                     <button 
                       onClick={startVideoGeneration}
                       className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-[10px] uppercase tracking-[0.2em] text-white transition-all font-bold shadow-lg"
                     >
                       Regenerate Video
                     </button>
                  </div>
               </div>
            </div>

            <div className={`space-y-6 bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl h-fit transition-all duration-1000 transform ${videoLoaded ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
               <div className="space-y-2">
                  <h3 className="text-2xl font-serif font-bold leading-tight">{sceneInfo.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 border border-red-600/30 text-[9px] font-black text-red-500 uppercase tracking-widest rounded-sm">{sceneInfo.genre}</span>
                  </div>
               </div>
               
               {sceneInfo.storyboardImage && (
                 <div className="rounded-xl overflow-hidden border border-white/10">
                   <img src={sceneInfo.storyboardImage} alt="Reference" className="w-full opacity-60 grayscale hover:grayscale-0 transition-all duration-500" />
                   <div className="bg-black/80 p-2 text-center text-[9px] uppercase tracking-widest text-gray-500">Original Storyboard</div>
                 </div>
               )}

               {sceneInfo.subtitles && sceneInfo.subtitles.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-white/10">
                   <h4 className="text-[10px] uppercase font-black text-gray-500 tracking-[0.3em]">Quick Edit Subtitles</h4>
                   <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                     {sceneInfo.subtitles.map((sub, idx) => (
                       <div key={idx} className="flex flex-col space-y-1 mb-2 bg-white/5 p-2 rounded">
                          <div className="flex items-center space-x-2">
                             <input 
                                 type="number" 
                                 step="0.1"
                                 value={sub.startTime}
                                 onChange={(e) => updateSubtitleTime(idx, 'startTime', e.target.value)}
                                 className="w-10 bg-black/40 border border-white/5 rounded px-1 py-0.5 text-[9px] text-gray-300 focus:outline-none focus:border-red-600/50 text-center"
                             />
                             <span className="text-[9px] text-gray-600">-</span>
                             <input 
                                 type="number" 
                                 step="0.1"
                                 value={sub.endTime}
                                 onChange={(e) => updateSubtitleTime(idx, 'endTime', e.target.value)}
                                 className="w-10 bg-black/40 border border-white/5 rounded px-1 py-0.5 text-[9px] text-gray-300 focus:outline-none focus:border-red-600/50 text-center"
                             />
                             <input 
                               type="text" 
                               value={sub.text}
                               onChange={(e) => updateSubtitleText(idx, e.target.value)}
                               className="flex-1 bg-black/40 border border-white/5 rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-red-600/50 transition-colors"
                             />
                          </div>
                       </div>
                     ))}
                   </div>
                   <p className="text-[9px] text-gray-600 italic">Timing edits apply immediately to overlay.</p>
                </div>
               )}

               <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                  <button onClick={reset} className="text-[10px] text-red-500 hover:text-white uppercase tracking-widest font-bold transition-colors">Start New Project</button>
               </div>
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 text-[9px] text-gray-600 uppercase tracking-[0.5em] font-black pointer-events-none select-none">
        Gemini 3 Flash • Veo 3.1 Fast Render
      </footer>

      {(state === AppState.ANALYZING || state === AppState.GENERATING || loadingMsg !== "") && (
        <LoadingOverlay message={loadingMsg} />
      )}
    </div>
  );
};

export default App;
