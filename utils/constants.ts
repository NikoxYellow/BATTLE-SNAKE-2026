import { Difficulty, GameConfig, Language } from '../types';

// CONFIGURATION PORTRAIT
export const BASE_CELL_SIZE = 20; 
export const GRID_W = 30; 
export const GRID_H = 40; 

export const WINNING_SCORE = 30; 
export const MAX_TIME_SEC = 180; 

export const COLORS = {
  // Deep Tactical Grid
  GRID_BG: '#080810',        
  GRID_LINES: '#12121e',      
  ARENA_BORDER: '#1a1a2e',
  
  // Neon High-Fidelity Snakes
  PLAYER: '#00FF00',         
  PLAYER_HEAD: '#00FF00',    
  BOT_RED: '#FF0000',        
  BOT_RED_HEAD: '#FF0000',
  BOT_ORANGE: '#FF9900',     
  BOT_ORANGE_HEAD: '#FF9900',
  
  // Items
  APPLE: '#32CD32',          // Bright Lime Green
  APPLE_GLOW: 'rgba(50, 205, 50, 0.8)',
  POISON: '#8A2BE2',         // VIOLET/PURPLE
  POISON_GLOW: 'rgba(138, 43, 226, 0.7)',
  TRAP: '#FFD700',           // Gold/Yellow
  
  // Walls (Concrete Style)
  WALL_MAIN: '#808080',      
  WALL_BORDER: '#A9A9A9',
  WARNING: 'rgba(255, 48, 48, 0.3)', 
};

export const DIFFICULTY_CONFIG: Record<Difficulty, GameConfig> = {
  [Difficulty.NORMAL]: {
    gridSize: GRID_W,
    speed: 150, 
    winningScore: WINNING_SCORE,
    maxTime: MAX_TIME_SEC,
    wallCount: 200, 
    wallInterval: [10, 10], // Every 10s
    poisonInterval: [0, 0], 
    trapInterval: [0, 0], 
    blackoutInterval: [0, 0]
  },
  [Difficulty.MOYEN]: {
    gridSize: GRID_W,
    speed: 100, 
    winningScore: WINNING_SCORE,
    maxTime: MAX_TIME_SEC,
    wallCount: 200,
    wallInterval: [5, 5],   // Every 5s
    poisonInterval: [12, 12], 
    trapInterval: [18, 18], 
    blackoutInterval: [0, 0]
  },
  [Difficulty.DIFFICILE]: {
    gridSize: GRID_W,
    speed: 70, 
    winningScore: WINNING_SCORE,
    maxTime: MAX_TIME_SEC,
    wallCount: 300, 
    wallInterval: [2, 2], // Every 2s (Extreme Chaos)
    poisonInterval: [6, 6],   
    trapInterval: [10, 10],   
    blackoutInterval: [0, 0]
  },
};

export const TRANSLATIONS = {
  [Language.FR]: {
    START: "DÉPLOIEMENT",
    NORMAL: "NORMAL",
    MOYEN: "MOYEN",
    DIFFICILE: "DIFFICILE",
    P1_SCORE: "VOUS",
    AI_NAME: "OPPOSANT",
    RACE_LEADER: "LEADER",
    TIME: "CHRONO",
    VICTORY: "VICTOIRE",
    DEFEAT: "K.O.",
    SUBTITLE_DEFEAT: "ÉLIMINÉ ! DOMINATION IA.",
    SUBTITLE_VICTORY: "CHAMPION ! SUPRÉMATIE TOTALE.",
    DRAW: "ÉGALITÉ",
    YOU_WIN: "DOMINATION TOTALE",
    WINNER_IS: "PREND LE CONTRÔLE",
    NEW_RECORD: "RECORD DE GUERRE",
    PLAY_AGAIN: "RE-DÉPLOIEMENT",
    MENU: "QG",
    WARNING_WALL: "BARRICADE !",
    WARNING_REVERSE: "SYSTÈME BROUILLÉ !",
    WARNING_BLACKOUT: "COUPURE !",
    ME: "MOI",
    CONTROLS: "TACTIQUE :",
    KEYS: "TOUCHES",
    HIGH_SCORE: "RECORD",
    SNARKY: [
      "ERREUR TACTIQUE : LATENCE RÉFLEXE DÉTECTÉE.",
      "TRAJECTOIRE INTERCEPTÉE PAR L'IA.",
      "PROTOCOLE DE COMBAT ÉCHOUÉ.",
      "VOTRE UNITÉ A ÉTÉ DÉPASSÉE.",
      "ANALYSE : L'ADVERSAIRE ÉTAIT SIMPLEMENT PLUS RAPIDE.",
      "ZONE DE COMBAT NON MAÎTRISÉE.",
      "SIGNAL PERDU. PILOTE HORS SERVICE."
    ]
  },
  [Language.EN]: {
    START: "DEPLOY",
    NORMAL: "NORMAL",
    MOYEN: "MEDIUM",
    DIFFICILE: "DIFFICULT",
    P1_SCORE: "YOU",
    AI_NAME: "OPPONENT",
    RACE_LEADER: "RACE LEADER",
    TIME: "TIMER",
    VICTORY: "VICTORY",
    DEFEAT: "K.O.",
    SUBTITLE_DEFEAT: "KNOCKED OUT! AI DOMINANCE.",
    SUBTITLE_VICTORY: "CHAMPION! TOTAL SUPREMACY.",
    DRAW: "DRAW",
    YOU_WIN: "TOTAL DOMINATION",
    WINNER_IS: "TAKES CONTROL",
    NEW_RECORD: "WAR RECORD",
    PLAY_AGAIN: "RE-DEPLOY",
    MENU: "HQ",
    WARNING_WALL: "BARRICADE!",
    WARNING_REVERSE: "SYSTEM JAMMED!",
    WARNING_BLACKOUT: "BLACKOUT!",
    ME: "ME",
    CONTROLS: "TACTICS:",
    KEYS: "KEYS",
    HIGH_SCORE: "RECORD",
    SNARKY: [
      "TACTICAL ERROR: REFLEX LATENCY DETECTED.",
      "TRAJECTORY INTERCEPTED BY AI.",
      "COMBAT PROTOCOL FAILED.",
      "YOUR UNIT HAS BEEN OUTMANEUVERED.",
      "ANALYSIS: OPPONENT WAS SIMPLY FASTER.",
      "ARENA CONTROL LOST.",
      "SIGNAL LOST. PILOT OFFLINE."
    ]
  }
};