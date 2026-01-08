import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Share2, Info, X, BookOpen, Menu } from 'lucide-react';
import { EtymologyData, LoadingState, GraphNode, TimelineStep } from './types';
import { fetchEtymology } from './services/geminiService';
import { GraphView } from './components/GraphView';
import { Timeline } from './components/Timeline';
import { COMMON_LANGUAGES, INITIAL_WORD, INITIAL_LANG } from './constants';

const App: React.FC = () => {
  const [word, setWord] = useState(INITIAL_WORD);
  const [language, setLanguage] = useState(INITIAL_LANG);
  const [status, setStatus] = useState<LoadingState>(LoadingState.IDLE);
  const [data, setData] = useState<EtymologyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  
  // Controls specific to mobile view toggling
  const [activeTab, setActiveTab] = useState<'timeline' | 'graph'>('timeline');

  // Load initial data
  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!word.trim()) return;

    setStatus(LoadingState.LOADING);
    setError(null);
    setSelectedNode(null);

    try {
      const result = await fetchEtymology(word, language);
      setData(result);
      setStatus(LoadingState.SUCCESS);
      // Auto-switch to graph on desktop, or keep timeline on mobile usually
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch etymology. Please try again.");
      setStatus(LoadingState.ERROR);
    }
  };

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    // On mobile, show a toast or small bottom sheet? 
    // For now we just highlight it.
  }, []);

  const handleTimelineStepClick = (step: TimelineStep) => {
    // Find corresponding node in graph if possible
    if (!data) return;
    const node = data.graph.nodes.find(n => n.label === step.word && n.language === step.language);
    if (node) {
       setSelectedNode(node);
       setActiveTab('graph'); // Switch to graph to see it
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#fdfbf7] text-stone-800 overflow-hidden">
      
      {/* Header / Search Bar */}
      <header className="flex-none z-50 bg-[#fdfbf7]/80 backdrop-blur-md border-b border-stone-200 p-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center shadow-md">
              <span className="font-serif italic font-bold text-[#fdfbf7] text-xl">E</span>
            </div>
            <h1 className="text-2xl font-serif font-bold tracking-tight text-stone-800">Etymon</h1>
          </div>

          <form onSubmit={handleSearch} className="flex-1 max-w-2xl w-full relative group">
            <div className="flex items-center bg-white border border-stone-300 rounded-full overflow-hidden shadow-sm hover:shadow-md focus-within:ring-2 focus-within:ring-stone-400 focus-within:border-stone-400 transition-all">
              <div className="pl-4 text-stone-400">
                <Search size={20} />
              </div>
              <input 
                type="text" 
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="Enter a word (e.g. salary, galaxy)..."
                className="flex-1 bg-transparent border-none text-stone-800 px-3 py-3 focus:ring-0 placeholder:text-stone-400 font-serif text-lg"
              />
              <div className="h-6 w-[1px] bg-stone-200 mx-1"></div>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-transparent border-none text-stone-600 text-base px-3 py-3 focus:ring-0 cursor-pointer hover:text-stone-900 font-serif"
              >
                {COMMON_LANGUAGES.map(lang => (
                  <option key={lang} value={lang} className="bg-white text-stone-800">{lang}</option>
                ))}
              </select>
              <button 
                type="submit" 
                disabled={status === LoadingState.LOADING}
                className="px-6 py-3 bg-stone-800 hover:bg-stone-700 text-[#fdfbf7] font-serif font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === LoadingState.LOADING ? <Loader2 size={20} className="animate-spin" /> : 'Explore'}
              </button>
            </div>
          </form>

          <div className="relative group hidden md:block">
            <button className="p-2 text-stone-500 hover:text-stone-800 transition-colors">
              <Info size={24} />
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 p-3 bg-stone-800 text-[#fdfbf7] text-sm font-serif italic rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 text-center">
              Search any word to learn about its etymology
              <div className="absolute -top-1 right-3 w-2 h-2 bg-stone-800 transform rotate-45"></div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Error State */}
        {status === LoadingState.ERROR && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/50 backdrop-blur-sm p-4">
             <div className="bg-red-50 border border-red-200 p-8 rounded-xl max-w-md text-center shadow-xl">
                <h3 className="text-red-800 font-serif font-bold text-2xl mb-2">Error</h3>
                <p className="text-red-700 mb-6 font-serif">{error}</p>
                <button onClick={() => handleSearch()} className="px-6 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg font-serif">Retry</button>
             </div>
          </div>
        )}

        {/* Desktop Split View / Mobile Tab View */}
        <div className={`flex w-full h-full ${status === LoadingState.LOADING ? 'opacity-50 pointer-events-none' : ''}`}>
          
          {/* Left Pane: Timeline & Story (Scrollable) */}
          <div className={`
             md:w-1/3 lg:w-[420px] xl:w-[480px] flex-none bg-[#fdfbf7] border-r border-stone-200 flex flex-col h-full
             ${activeTab === 'timeline' ? 'block' : 'hidden md:flex'}
          `}>
             <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
               {data && (
                 <>
                   <div className="mb-8 p-6 bg-white rounded-lg border border-stone-200 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-stone-200 to-stone-100"></div>
                      <h2 className="text-4xl font-serif font-bold text-stone-900 mb-2 italic">{data.word}</h2>
                      <div className="flex gap-2 text-sm text-stone-500 mb-4 uppercase tracking-widest font-semibold border-b border-stone-100 pb-4">
                         <span>{data.language}</span>
                         <span>•</span>
                         <span>Etymology</span>
                      </div>
                      <p className="text-stone-700 leading-relaxed text-lg font-serif">
                        {data.summary}
                      </p>
                   </div>
                   
                   <div className="flex items-center gap-4 mb-6">
                      <div className="h-[1px] bg-stone-300 flex-1"></div>
                      <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-widest">Evolution Timeline</h3>
                      <div className="h-[1px] bg-stone-300 flex-1"></div>
                   </div>
                   
                   <Timeline 
                      timeline={data.timeline} 
                      onStepClick={handleTimelineStepClick}
                      selectedWord={selectedNode?.label}
                   />
                 </>
               )}
               {!data && status !== LoadingState.LOADING && (
                 <div className="flex flex-col items-center justify-center h-full text-stone-400 gap-6">
                    <BookOpen size={64} className="opacity-20" />
                    <p className="font-serif text-xl italic">Search for a word to begin your journey.</p>
                 </div>
               )}
             </div>
          </div>

          {/* Right Pane: 3D Graph (Interactive) */}
          <div className={`
             flex-1 bg-[#f5f5f4] relative h-full
             ${activeTab === 'graph' ? 'block' : 'hidden md:block'}
          `}>
             {data ? (
               <GraphView 
                  data={data.graph} 
                  onNodeClick={handleNodeClick}
                  selectedNodeId={selectedNode?.id}
               />
             ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#f5f5f4]">
                   {status === LoadingState.LOADING ? (
                      <div className="flex flex-col items-center gap-6">
                         <div className="relative w-20 h-20">
                            <div className="absolute inset-0 rounded-full border-4 border-stone-200"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-t-stone-800 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                         </div>
                         <p className="text-stone-600 font-serif text-lg italic animate-pulse">Consulting the archives...</p>
                      </div>
                   ) : (
                      <div className="text-stone-300 font-serif text-6xl font-bold italic opacity-40 select-none">Etymon</div>
                   )}
                </div>
             )}

             {/* Node Details Overlay */}
             {selectedNode && (
                <div className="absolute bottom-8 left-6 right-6 md:left-auto md:right-8 md:w-80 bg-white/95 backdrop-blur-sm border border-stone-200 p-6 rounded-lg shadow-xl animate-in slide-in-from-bottom-4 fade-in duration-200">
                   <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">{selectedNode.language}</span>
                          {selectedNode.era && (
                             <>
                               <span className="text-stone-300">•</span>
                               <span className="text-xs font-semibold text-stone-500 font-serif italic">{selectedNode.era}</span>
                             </>
                          )}
                        </div>
                        <h3 className="text-3xl font-serif font-bold text-stone-900">{selectedNode.label}</h3>
                        {selectedNode.transliteration && (
                           <p className="text-lg text-stone-600 font-serif italic mb-1">{selectedNode.transliteration}</p>
                        )}
                        <span className="text-xs text-stone-500 capitalize bg-stone-100 px-2 py-0.5 rounded border border-stone-200 mt-2 inline-block font-sans">
                          {selectedNode.type}
                        </span>
                        
                        {/* Definition Section */}
                        {selectedNode.definition && (
                          <div className="mt-4 pt-3 border-t border-stone-200">
                             <p className="text-stone-800 font-serif italic text-lg leading-relaxed">
                               "{selectedNode.definition}"
                             </p>
                          </div>
                        )}
                      </div>
                      <button onClick={() => setSelectedNode(null)} className="text-stone-400 hover:text-stone-800 transition-colors flex-shrink-0">
                         <X size={20} />
                      </button>
                   </div>
                </div>
             )}
          </div>

        </div>
      </main>

      {/* Mobile Tab Bar */}
      <nav className="md:hidden flex border-t border-stone-200 bg-white">
        <button 
          onClick={() => setActiveTab('timeline')}
          className={`flex-1 py-4 text-base font-serif flex items-center justify-center gap-2 ${activeTab === 'timeline' ? 'text-stone-900 bg-stone-50 font-bold' : 'text-stone-500'}`}
        >
          <BookOpen size={20} />
          Story
        </button>
        <button 
          onClick={() => setActiveTab('graph')}
          className={`flex-1 py-4 text-base font-serif flex items-center justify-center gap-2 ${activeTab === 'graph' ? 'text-stone-900 bg-stone-50 font-bold' : 'text-stone-500'}`}
        >
          <Share2 size={20} />
          Graph
        </button>
      </nav>
    </div>
  );
};

export default App;