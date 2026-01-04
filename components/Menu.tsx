
import React, { useEffect, useState } from 'react';
import { Loader2, Volume2, VolumeX, CassetteTape, User } from 'lucide-react';
import { Difficulty, Language } from '../types';
import { soundManager } from '../utils/audio';
import { getOrGenerateTitleImage } from '../utils/assets';
import { TRANSLATIONS } from '../utils/constants';
import { getHighScore } from '../utils/storage';

interface MenuProps {
  onStart: (difficulty: Difficulty, name: string) => void;
  language: Language;
  onSetLanguage: (lang: Language) => void;
}

const Menu: React.FC<MenuProps> = ({ onStart, language, onSetLanguage }) => {
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [playerName, setPlayerName] = useState('PLAYER');
  const [highScores, setHighScores] = useState<Record<Difficulty, number>>({
      [Difficulty.NORMAL]: 0,
      [Difficulty.MOYEN]: 0,
      [Difficulty.DIFFICILE]: 0,
  });
  const t = TRANSLATIONS[language];

  useEffect(() => {
    const loadAssets = async () => {
        const img = await getOrGenerateTitleImage();
        if (img) setBgImage(img);
        
        setHighScores({
            [Difficulty.NORMAL]: getHighScore(Difficulty.NORMAL),
            [Difficulty.MOYEN]: getHighScore(Difficulty.MOYEN),
            [Difficulty.DIFFICILE]: getHighScore(Difficulty.DIFFICILE),
        });
        
        setLoading(false);
    };
    loadAssets();
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (val.length <= 10) {
      setPlayerName(val);
    }
  };

  const handleSelect = (diff: Difficulty) => {
    if (soundEnabled) {
        soundManager.init();
        if (diff === Difficulty.NORMAL) soundManager.playEat();
        if (diff === Difficulty.MOYEN) soundManager.playWarning();
        if (diff === Difficulty.DIFFICILE) soundManager.playDie();
    }
    onStart(diff, playerName || 'PLAYER');
  };

  const toggleSound = () => {
      setSoundEnabled(!soundEnabled);
      if (!soundEnabled) soundManager.init();
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center font-sans relative overflow-hidden p-4 crt-screen">
      
      {loading ? (
         <div className="flex flex-col items-center gap-4">
             <Loader2 className="w-16 h-16 animate-spin text-red-600 opacity-80" />
             <div className="text-[10px] tracking-[0.5em] uppercase font-mono text-red-600/50 animate-pulse">Initializing Battle System</div>
         </div>
      ) : (
         <div className="flex flex-col items-center w-full max-w-[1000px] gap-6 animate-fade-in relative z-10">
             
             {/* MAIN TV SCREEN */}
             <div className="relative w-full aspect-video shadow-[0_0_120px_rgba(255,0,0,0.15)] rounded-2xl overflow-hidden border-[16px] border-[#1e1e24] shadow-2xl">
                 <img 
                   src={bgImage || ''} 
                   alt="Snake Battle Background" 
                   className="w-full h-full object-cover brightness-[0.9] contrast-[1.1]"
                 />

                 {/* CENTRAL SELECTION BOX */}
                 <div className="absolute inset-0 flex flex-col items-center justify-center mt-20">
                    <div className="w-[45%] bg-[#0f0f13]/90 backdrop-blur-md border-2 border-slate-700/50 rounded-lg overflow-hidden flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                        
                        {/* NAME INPUT SECTION */}
                        <div className="p-4 border-b border-white/10 bg-white/5 flex flex-col gap-2">
                           <label className="text-[9px] text-white/40 uppercase tracking-[0.3em] font-black flex items-center gap-2">
                             <User className="w-3 h-3" /> {language === Language.FR ? 'IDENTIFICATION UNITÉ' : 'UNIT IDENTIFICATION'}
                           </label>
                           <input 
                             type="text" 
                             value={playerName} 
                             onChange={handleNameChange}
                             placeholder="PLAYER"
                             className="bg-black/50 border border-white/10 rounded px-3 py-2 text-white font-black tracking-widest uppercase focus:outline-none focus:border-[#00ff80]/50 transition-colors text-center"
                           />
                        </div>

                        <button onClick={() => handleSelect(Difficulty.NORMAL)} className="w-full py-4 px-6 hover:bg-white/10 transition-colors flex justify-between items-center group border-b border-white/5">
                            <span className="font-black text-xs tracking-widest text-slate-400 group-hover:text-white uppercase">[1] {t.NORMAL}</span>
                            <span className="font-mono text-emerald-400 font-bold opacity-50">{highScores[Difficulty.NORMAL]}</span>
                        </button>
                        <button onClick={() => handleSelect(Difficulty.MOYEN)} className="w-full py-4 px-6 hover:bg-white/10 transition-colors flex justify-between items-center group border-b border-white/5">
                            <span className="font-black text-xs tracking-widest text-slate-400 group-hover:text-white uppercase">[2] {t.MOYEN}</span>
                            <span className="font-mono text-orange-400 font-bold opacity-50">{highScores[Difficulty.MOYEN]}</span>
                        </button>
                        <button onClick={() => handleSelect(Difficulty.DIFFICILE)} className="w-full py-4 px-6 hover:bg-white/10 transition-colors flex justify-between items-center group border-2 border-emerald-400/30 m-1 rounded bg-emerald-400/5">
                            <span className="font-black text-xs tracking-widest text-emerald-400 group-hover:text-emerald-300 uppercase">[3] {t.DIFFICILE}</span>
                            <span className="font-mono text-emerald-400 font-bold opacity-80">{highScores[Difficulty.DIFFICILE]}</span>
                        </button>
                    </div>
                 </div>
             </div>
             
             <div className="w-full flex justify-between items-center px-10 py-4 text-white/60">
                 <div className="flex items-center gap-4 text-[12px] font-bold tracking-widest uppercase">
                    <span>LANGUAGE:</span>
                    <button 
                        onClick={() => onSetLanguage(Language.EN)}
                        className={`transition-all ${language === Language.EN ? 'text-white' : 'text-white/30 hover:text-white/50'}`}
                    >
                        [ 🇺🇸 ENGLISH ]
                    </button>
                    <button 
                        onClick={() => onSetLanguage(Language.FR)}
                        className={`transition-all ${language === Language.FR ? 'text-white' : 'text-white/30 hover:text-white/50'}`}
                    >
                        [ 🇫🇷 FRANÇAIS ]
                    </button>
                 </div>
                 
                 <div className="flex items-center gap-6 text-[12px] font-bold tracking-widest uppercase">
                    <button 
                        onClick={toggleSound}
                        className="flex items-center gap-3 transition-colors hover:text-white"
                    >
                        SOUND: <span className={soundEnabled ? 'text-emerald-400' : 'text-red-500'}>{soundEnabled ? 'ON' : 'OFF'}</span>
                    </button>
                    <CassetteTape className="w-6 h-6 opacity-40" />
                 </div>
             </div>
         </div>
      )}
    </div>
  );
};

export default Menu;
