
export enum GameMode {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export enum Difficulty {
  NORMAL = 'NORMAL',
  MOYEN = 'MOYEN',
  DIFFICILE = 'DIFFICILE'
}

export enum Language {
  FR = 'FR',
  EN = 'EN'
}

export interface Point {
  x: number;
  y: number;
}

export enum EntityType {
  PLAYER = 'PLAYER',
  BOT_RED = 'BOT_RED',
  BOT_ORANGE = 'BOT_ORANGE'
}

export interface SnakeEntity {
  id: EntityType;
  body: Point[];
  direction: Point;
  nextDirection: Point;
  color: string;
  headColor: string;
  score: number;
  isDead: boolean;
  growPending: number;
  label: string;
  reversedControls: boolean;
  reverseTimer: number;
  respawnTimer?: number; // Time in ms until respawn
}

export enum ItemType {
  APPLE = 'APPLE',     // +1 Score
  POISON = 'POISON',   // Death
  TRAP = 'TRAP'        // Reverse Controls
}

export interface GameItem {
  id: string;
  type: ItemType;
  position: Point;
  expiresAt?: number;
  isWarning?: boolean; // If true, it's a spawn indicator (0.3-0.5s)
  spawnTime?: number;
  activeTime?: number; // When it becomes active after warning
}

export interface Wall {
  position: Point;
  isWarning: boolean;
  spawnTime: number;
}

export interface GameConfig {
  gridSize: number;
  speed: number;
  winningScore: number;
  maxTime: number; // in seconds
  wallCount: number; 
  // Spawn Intervals [min_sec, max_sec]
  wallInterval: [number, number];
  poisonInterval: [number, number];
  trapInterval: [number, number];
  blackoutInterval: [number, number];
}
