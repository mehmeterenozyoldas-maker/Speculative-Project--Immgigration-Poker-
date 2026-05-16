import React, { useState, useEffect, useCallback, useMemo } from 'react';
import WorldHappinessCanvas from './components/WorldHappinessCanvas';
import { CountryData, HAPPINESS_DATA } from './constants';
import { GoogleGenAI } from "@google/genai";

// SVG Icons
const SearchIcon = () => (
  <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
);
const FilterIcon = () => (
  <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
);

const App: React.FC = () => {
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");

  // Extract unique regions
  const regions = useMemo(() => {
    const unique = new Set(HAPPINESS_DATA.map(c => c["Regional indicator"]));
    return ["All Regions", ...Array.from(unique).sort()];
  }, []);

  // Compute filtered data
  const filteredData = useMemo(() => {
    return HAPPINESS_DATA.filter(country => {
      const matchesSearch = country["Country name"].toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRegion = selectedRegion === "All Regions" || country["Regional indicator"] === selectedRegion;
      return matchesSearch && matchesRegion;
    });
  }, [searchQuery, selectedRegion]);

  // Gemini Service Call
  const fetchHappinessInsight = useCallback(async (countryName: string) => {
    if (!process.env.API_KEY) {
      console.warn("No API Key available for Gemini.");
      setAiInsight("Happiness is a journey, not a destination. (Add API Key for AI insights!)");
      return;
    }

    setIsLoadingAi(true);
    setAiInsight(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Give me a single, short, whimsical, and heartwarming sentence about why it is wonderful to live in ${countryName}. Focus on specific culture, nature, or vibes unique to that country. Keep it under 20 words.`,
      });
      setAiInsight(response.text.trim());
    } catch (error) {
      console.error("Error fetching AI insight:", error);
      setAiInsight("Happiness can be found even in the darkest of times, if one only remembers to turn on the light.");
    } finally {
      setIsLoadingAi(false);
    }
  }, []);

  // Effect to trigger AI when country changes
  useEffect(() => {
    if (selectedCountry) {
      fetchHappinessInsight(selectedCountry["Country name"]);
    } else {
      setAiInsight(null);
    }
  }, [selectedCountry, fetchHappinessInsight]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#050510]">
      
      {/* 3D Canvas Layer */}
      <WorldHappinessCanvas 
        selectedCountry={selectedCountry} 
        onSelectCountry={setSelectedCountry} 
        filteredCountries={filteredData}
      />

      {/* Top Bar: Search and Filters */}
      <div className="absolute top-0 right-0 p-6 z-20 flex flex-col items-end gap-3 pointer-events-none">
         <div className="pointer-events-auto flex items-center gap-2 backdrop-blur-md bg-white/5 border border-white/10 rounded-full p-1 pl-4 shadow-lg transition-all hover:bg-white/10">
            <SearchIcon />
            <input 
              type="text" 
              placeholder="Find a country..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-white text-sm placeholder-white/30 w-32 md:w-48"
            />
         </div>

         <div className="pointer-events-auto relative group">
            <div className="flex items-center gap-2 backdrop-blur-md bg-white/5 border border-white/10 rounded-full py-2 px-4 shadow-lg cursor-pointer hover:bg-white/10 transition-all">
              <FilterIcon />
              <span className="text-white text-sm whitespace-nowrap">{selectedRegion}</span>
            </div>
            {/* Dropdown - Simple CSS hover for now, accessible via pointer-events-auto */}
            <div className="absolute right-0 top-full mt-2 w-56 max-h-60 overflow-y-auto rounded-xl backdrop-blur-xl bg-[#0a0a15]/90 border border-white/10 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
               {regions.map(region => (
                 <button
                   key={region}
                   onClick={() => setSelectedRegion(region)}
                   className={`w-full text-left px-4 py-2 text-xs hover:bg-white/10 transition-colors ${selectedRegion === region ? 'text-white font-bold bg-white/5' : 'text-white/70'}`}
                 >
                   {region}
                 </button>
               ))}
            </div>
         </div>
         
         <div className="text-white/30 text-[10px] uppercase tracking-widest mt-1 text-right">
            Showing {filteredData.length} countries
         </div>
      </div>

      {/* Glassmorphism HUD Overlay for Selected Country */}
      {selectedCountry && (
        <div 
          className="absolute top-1/2 left-1/2 md:left-2/3 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 w-full max-w-md px-6"
        >
          <div className="
            pointer-events-auto 
            backdrop-blur-xl bg-white/5 border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]
            rounded-2xl p-8 
            text-left 
            transition-all duration-700 ease-out 
            opacity-0 translate-y-4 animate-[fadeInUp_0.7s_ease-out_forwards]
          ">
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 mb-2 tracking-tight">
              {selectedCountry["Country name"]}
            </h1>
            
            <div className="h-px w-full bg-gradient-to-r from-white/30 to-transparent my-4"></div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 mb-6">
              
              <div>
                <span className="text-white/40 text-[10px] uppercase tracking-[0.1em] block mb-1">Happiness Score</span>
                <span className="text-3xl font-light text-white tabular-nums">
                  {selectedCountry["Ladder score"].toFixed(2)}
                </span>
              </div>

              <div>
                <span className="text-white/40 text-[10px] uppercase tracking-[0.1em] block mb-1">Region</span>
                <span className="text-sm font-medium text-white/90 leading-tight block">
                  {selectedCountry["Regional indicator"]}
                </span>
              </div>

              <div>
                <span className="text-white/40 text-[10px] uppercase tracking-[0.1em] block mb-1">GDP (Log)</span>
                <span className="text-lg font-light text-white/80 tabular-nums">
                  {selectedCountry["Log GDP per capita"]?.toFixed(2) ?? "N/A"}
                </span>
              </div>

              <div>
                <span className="text-white/40 text-[10px] uppercase tracking-[0.1em] block mb-1">Generosity</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-light text-white/80 tabular-nums">
                    {selectedCountry["Generosity"] > 0 ? '+' : ''}{selectedCountry["Generosity"].toFixed(3)}
                  </span>
                </div>
              </div>

            </div>

            {/* AI Insight Section */}
            <div className="min-h-[60px] relative border-t border-white/5 pt-4">
              <span className="absolute -top-2 left-0 bg-black/20 text-[9px] px-2 py-0.5 rounded text-yellow-500/80 uppercase tracking-widest border border-white/5">Gemini Insight</span>
              {isLoadingAi ? (
                <div className="flex items-center space-x-3 text-white/50 animate-pulse mt-2">
                  <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full shadow-[0_0_10px_#facc15]"></div>
                  <span className="text-xs font-light tracking-wide">LISTENING TO THE STARS...</span>
                </div>
              ) : (
                aiInsight && (
                  <p className="text-lg text-yellow-100/90 font-light leading-snug italic animate-fadeIn mt-2">
                    "{aiInsight}"
                  </p>
                )
              )}
            </div>

            <button 
              onClick={() => setSelectedCountry(null)}
              className="mt-8 text-white/30 text-xs hover:text-white transition-colors uppercase tracking-widest flex items-center gap-2 group"
            >
              <span className="group-hover:-translate-x-1 transition-transform">←</span> Return to Nebula
            </button>
          </div>
        </div>
      )}

      {/* Intro/Footer UI (HUD Style) */}
      {!selectedCountry && (
        <>
          <div className="absolute top-8 left-8 pointer-events-none z-10">
            <div className="backdrop-blur-md bg-black/20 border border-white/5 rounded-lg p-4 inline-block">
              <h1 className="text-white text-xl font-bold tracking-tight mb-1">Happiness Nebula</h1>
              <p className="text-blue-200/60 text-xs uppercase tracking-widest">Global Data Visualization 2024</p>
            </div>
          </div>
          <div className="absolute bottom-8 right-8 pointer-events-none z-10 text-right">
             <div className="text-white/30 text-[10px] space-y-1">
                <p>INTERACTIVE 3D EXPERIENCE</p>
                <p>POWERED BY REACT THREE FIBER & GEMINI AI</p>
             </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeInUp {
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
      `}</style>
    </div>
  );
};

export default App;