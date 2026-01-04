import { Difficulty } from '../types';

const STORAGE_PREFIX = 'battle_snake_highscore_';

export const getHighScore = (difficulty: Difficulty): number => {
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${difficulty}`);
    return stored ? parseInt(stored, 10) : 0;
  } catch (error) {
    console.warn('Failed to read high score from localStorage', error);
    return 0;
  }
};

export const saveHighScore = (difficulty: Difficulty, score: number): boolean => {
  try {
    const currentHigh = getHighScore(difficulty);
    if (score > currentHigh) {
      localStorage.setItem(`${STORAGE_PREFIX}${difficulty}`, score.toString());
      return true;
    }
    return false;
  } catch (error) {
    console.warn('Failed to save high score to localStorage', error);
    return false;
  }
};
