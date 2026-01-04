
import React, { useState, useEffect } from 'react';
import Menu from './components/Menu';
import Game from './components/Game';
import { GameMode, Difficulty, Language } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<GameMode>(GameMode.MENU);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.NORMAL);
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('snake_battle_lang');
    return (saved as Language) || Language.FR;
  });
  const [playerName, setPlayerName] = useState('PLAYER');
  const [gameKey, setGameKey] = useState(0);

  useEffect(() => {
    localStorage.setItem('snake_battle_lang', language);
  }, [language]);

  const handleStart = (selectedDifficulty: Difficulty, name: string) => {
    setPlayerName(name.trim() || 'PLAYER');
    setDifficulty(selectedDifficulty);
    setMode(GameMode.PLAYING);
    setGameKey(prev => prev + 1); // Ensure fresh start
  };

  const handleExit = () => {
    setMode(GameMode.MENU);
  };

  const handleRematch = () => {
    setGameKey(prev => prev + 1); // Force component remount to reset game state
  };

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
  };

  return (
    <>
      {mode === GameMode.MENU && (
        <Menu 
          onStart={handleStart} 
          language={language} 
          onSetLanguage={handleSetLanguage} 
        />
      )}
      {mode === GameMode.PLAYING && (
        <Game 
            key={gameKey} 
            difficulty={difficulty} 
            language={language}
            playerName={playerName}
            onExit={handleExit} 
            onRematch={handleRematch} 
        />
      )}
    </>
  );
};

export default App;
