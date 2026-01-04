
import React, { useEffect, useRef, useState } from 'react';
import { GameMode, Difficulty, GameConfig, SnakeEntity, EntityType, ItemType, GameItem, Point, Wall, Language } from '../types';
import { DIFFICULTY_CONFIG, COLORS, GRID_W, GRID_H, MAX_TIME_SEC, BASE_CELL_SIZE, TRANSLATIONS } from '../utils/constants';
import { getNextMove } from '../utils/pathfinding';
import { soundManager } from '../utils/audio';
import { saveHighScore, getHighScore } from '../utils/storage';
import { Clock, ArrowLeft, ShieldAlert, Trophy, Zap, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Volume2, VolumeX, Pause, Play } from 'lucide-react';

interface GameProps {
  difficulty: Difficulty;
  language: Language;
  playerName: string;
  onExit: () => void;
  onRematch: () => void;
}

interface GameAlert {
  id: number;
  text: string;
  type: 'info' | 'warning' | 'danger';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

const PLAYER_SPEED_MULT = 1.2;
const AI_RESPAWN_DELAY = 3000;

const getRandomPosition = (snakes: SnakeEntity[], walls: Wall[], items: GameItem[]): Point => {
  const occupied = new Set<string>();
  snakes.forEach(s => !s.isDead && s.body.forEach(p => occupied.add(`${p.x},${p.y}`)));
  walls.forEach(w => occupied.add(`${w.position.x},${w.position.y}`));
  items.forEach(i => occupied.add(`${i.position.x},${i.position.y}`));

  let attempts = 0;
  while (attempts < 1000) {
    attempts++;
    const pos = {
      x: Math.floor(Math.random() * (GRID_W - 2)) + 1, 
      y: Math.floor(Math.random() * (GRID_H - 2)) + 1,
    };
    if (!occupied.has(`${pos.x},${pos.y}`)) return pos;
  }
  return { x: Math.floor(GRID_W/2), y: Math.floor(GRID_H/2) };
};

const createSnake = (id: EntityType, startX: number, startY: number, color: string, headColor: string, label: string): SnakeEntity => ({
  id,
  body: [{ x: startX, y: startY }, { x: startX, y: startY + 1 }, { x: startX, y: startY + 2 }],
  direction: { x: 0, y: -1 },
  nextDirection: { x: 0, y: -1 },
  color,
  headColor,
  score: 0,
  isDead: false,
  growPending: 0,
  label,
  reversedControls: false,
  reverseTimer: 0
});

const Game: React.FC<GameProps> = ({ difficulty, language, playerName, onExit, onRematch }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const t = TRANSLATIONS[language];
  
  const [gameState, setGameState] = useState<GameMode>(GameMode.PLAYING);
  const [timeLeft, setTimeLeft] = useState(MAX_TIME_SEC);
  const [snakesState, setSnakesState] = useState<SnakeEntity[]>([]);
  const [alert, setAlert] = useState<GameAlert | null>(null);
  const [snarkyMessage, setSnarkyMessage] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isMuted, setIsMuted] = useState(soundManager.getMuteState());
  const [bestScore, setBestScore] = useState(getHighScore(difficulty));

  const snakesRef = useRef<SnakeEntity[]>([]);
  const itemsRef = useRef<GameItem[]>([]);
  const wallsRef = useRef<Wall[]>([]);
  const config = DIFFICULTY_CONFIG[difficulty];

  const lastTimeRef = useRef<number>(0);
  const playerAccumulator = useRef<number>(0);
  const aiAccumulator = useRef<number>(0);
  const gameTimeRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  
  const particlesRef = useRef<Particle[]>([]);
  const shakeRef = useRef<number>(0);

  const lastWallSpawnRef = useRef<number>(0);
  const lastPoisonSpawnRef = useRef<number>(0);
  const lastTrapSpawnRef = useRef<number>(0);

  const aiLabel = t.AI_NAME; 
  const aiInterval = config.speed;
  const playerInterval = Math.round(aiInterval / PLAYER_SPEED_MULT);

  // Use a ref for the loop function to prevent stale closures and fix the "persistent arrow" bug
  const loopRef = useRef<(time: number) => void>(() => {});

  const handleResize = () => {
    if (canvasRef.current && containerRef.current) {
      const parent = containerRef.current;
      const arenaW = 600;
      const arenaH = 800;
      const ratio = arenaW / arenaH;
      let finalW = parent.clientWidth, finalH = parent.clientHeight;
      if (finalW / finalH > ratio) { finalW = finalH * ratio; } else { finalH = finalW / ratio; }
      canvasRef.current.style.width = `${finalW}px`;
      canvasRef.current.style.height = `${finalH}px`;
      canvasRef.current.width = arenaW;
      canvasRef.current.height = arenaH;
    }
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 100);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    soundManager.init();
    
    const initialSnakes: SnakeEntity[] = [
      createSnake(EntityType.PLAYER, 15, 30, COLORS.PLAYER, COLORS.PLAYER_HEAD, playerName),
      createSnake(EntityType.BOT_RED, 5, 5, COLORS.BOT_RED, COLORS.BOT_RED_HEAD, aiLabel)
    ];
    if (difficulty === Difficulty.DIFFICILE) {
      initialSnakes.push(createSnake(EntityType.BOT_ORANGE, 25, 5, COLORS.BOT_ORANGE, COLORS.BOT_ORANGE_HEAD, aiLabel));
    }
    snakesRef.current = initialSnakes;

    itemsRef.current = [{
      id: 'apple_init', type: ItemType.APPLE,
      position: getRandomPosition(initialSnakes, [], []), isWarning: false
    }];

    lastTimeRef.current = performance.now();
    gameTimeRef.current = 0;

    const tick = (time: number) => {
        loopRef.current(time);
        frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);

    let currentCD = 3;
    soundManager.playCountdown(true);
    const cdInterval = setInterval(() => {
        currentCD--;
        if (currentCD > 0) { setCountdown(currentCD); soundManager.playCountdown(true); } 
        else if (currentCD === 0) { setCountdown(0); soundManager.playCountdown(false); clearInterval(cdInterval); }
    }, 1000);

    return () => { cancelAnimationFrame(frameRef.current); clearInterval(cdInterval); };
  }, [difficulty, playerName]);

  const togglePause = () => {
    if (gameState === GameMode.PLAYING && countdown === 0) {
        setIsPaused(prev => !prev);
        soundManager.playUIClick();
    }
  };

  const toggleMute = () => { setIsMuted(soundManager.toggleMute()); };

  const createParticles = (x: number, y: number, color: string, count: number = 10) => {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 4;
        particlesRef.current.push({
            x: x * BASE_CELL_SIZE + BASE_CELL_SIZE / 2,
            y: y * BASE_CELL_SIZE + BASE_CELL_SIZE / 2,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            color, life: 1.0, maxLife: 1.0, size: 2 + Math.random() * 4
        });
    }
  };

  const updateParticles = (dt: number) => {
    particlesRef.current.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vx *= 0.95; p.vy *= 0.95; p.life -= dt * 0.002;
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
  };

  const setDirection = (newDir: Point) => {
    if (isPaused || countdown > 0) return;
    const player = snakesRef.current.find(s => s.id === EntityType.PLAYER);
    if (!player || player.isDead || gameState !== GameMode.PLAYING) return;
    let d = { ...newDir };
    if (player.reversedControls) { d.x *= -1; d.y *= -1; }
    if (d.x !== -player.direction.x && d.y !== -player.direction.y) {
      player.nextDirection = d;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); togglePause(); return; }
      let dir: Point | null = null;
      switch (e.key) {
        case 'ArrowUp': case 'w': dir = { x: 0, y: -1 }; break;
        case 'ArrowDown': case 's': dir = { x: 0, y: 1 }; break;
        case 'ArrowLeft': case 'a': dir = { x: -1, y: 0 }; break;
        case 'ArrowRight': case 'd': dir = { x: 1, y: 0 }; break;
      }
      if (dir) { e.preventDefault(); setDirection(dir); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, isPaused, countdown]);

  const updateSnakes = (ids: EntityType[]) => {
    const allSnakes = snakesRef.current;
    const movingSnakes = allSnakes.filter(s => ids.includes(s.id) && !s.isDead);
    if (movingSnakes.length === 0) return;

    const winScore = difficulty === Difficulty.DIFFICILE ? 30 : 20;

    const nextHeads = new Map<EntityType, Point>();
    movingSnakes.forEach(snake => {
        if (snake.id !== EntityType.PLAYER) {
            const apple = itemsRef.current.find(i => i.type === ItemType.APPLE);
            if (apple) snake.nextDirection = getNextMove(snake.body[0], apple.position, allSnakes, wallsRef.current, snake.id, difficulty);
        }
        snake.direction = snake.nextDirection;
        nextHeads.set(snake.id, { x: snake.body[0].x + snake.direction.x, y: snake.body[0].y + snake.direction.y });
    });

    const deaths = new Set<EntityType>();
    movingSnakes.forEach(snake => {
        const h = nextHeads.get(snake.id)!;
        if (h.x < 0 || h.x >= GRID_W || h.y < 0 || h.y >= GRID_H) { deaths.add(snake.id); return; }
        if (wallsRef.current.some(w => !w.isWarning && w.position.x === h.x && w.position.y === h.y)) { deaths.add(snake.id); return; }
        for (const other of allSnakes) {
            if (other.isDead) continue;
            const isMoving = movingSnakes.some(m => m.id === other.id);
            const effBody = (isMoving && other.growPending === 0) ? other.body.slice(0, -1) : other.body;
            if (effBody.some(p => p.x === h.x && p.y === h.y)) { deaths.add(snake.id); break; }
        }
    });

    movingSnakes.forEach(snake => {
        if (deaths.has(snake.id)) {
            snake.isDead = true; soundManager.playDie(); shakeRef.current = snake.id === EntityType.PLAYER ? 15 : 5;
            createParticles(snake.body[0].x, snake.body[0].y, snake.color, 25); return;
        }
        const h = nextHeads.get(snake.id)!;
        if (snake.reversedControls) { snake.reverseTimer -= 100; if (snake.reverseTimer <= 0) snake.reversedControls = false; }
        snake.body.unshift(h);
        if (snake.growPending > 0) snake.growPending--; else snake.body.pop();

        const iIdx = itemsRef.current.findIndex(i => !i.isWarning && i.position.x === h.x && i.position.y === h.y);
        if (iIdx !== -1) {
            const item = itemsRef.current[iIdx];
            if (item.type === ItemType.APPLE) {
                snake.score++; snake.growPending++; soundManager.playEat();
                createParticles(h.x, h.y, COLORS.APPLE, 8); itemsRef.current.splice(iIdx, 1);
                itemsRef.current.push({ id: `a_${Date.now()}`, type: ItemType.APPLE, position: getRandomPosition(snakesRef.current, wallsRef.current, itemsRef.current), isWarning: false });
                if (snake.id === EntityType.PLAYER && snake.score > bestScore) setBestScore(snake.score);
                if (snake.score >= winScore && snake.id === EntityType.PLAYER) endGame(playerName);
            } else if (item.type === ItemType.POISON) {
                snake.isDead = true; soundManager.playDie(); createParticles(h.x, h.y, COLORS.POISON, 15); shakeRef.current = 10; itemsRef.current.splice(iIdx, 1);
            } else if (item.type === ItemType.TRAP) {
                snake.reversedControls = true; snake.reverseTimer = 3000; soundManager.playTrap();
                createParticles(h.x, h.y, COLORS.TRAP, 8); itemsRef.current.splice(iIdx, 1);
                if (snake.id === EntityType.PLAYER) triggerAlert("WARNING_REVERSE", "warning");
            }
        }
    });
    setSnakesState([...snakesRef.current]);
  };

  const mainLoop = (currentTime: number) => {
    const dt = currentTime - lastTimeRef.current;
    lastTimeRef.current = currentTime;
    if (gameState === GameMode.PLAYING && !isPaused && countdown === 0) {
        gameTimeRef.current += dt;
        playerAccumulator.current += dt; aiAccumulator.current += dt;
        if (playerAccumulator.current >= playerInterval) { updateSnakes([EntityType.PLAYER]); playerAccumulator.current -= playerInterval; }
        if (aiAccumulator.current >= aiInterval) { updateSnakes(snakesRef.current.filter(s => s.id !== EntityType.PLAYER).map(s => s.id)); aiAccumulator.current -= aiInterval; }
        checkSpawns(gameTimeRef.current); checkRespawn(currentTime);
        const timeLeftSec = Math.max(0, MAX_TIME_SEC - Math.floor(gameTimeRef.current / 1000));
        setTimeLeft(timeLeftSec);
        const player = snakesRef.current.find(s => s.id === EntityType.PLAYER);
        if (player?.isDead) endGame(t.DEFEAT); else if (timeLeftSec <= 0) endGame(determineWinner());
    }
    updateParticles(dt); if (shakeRef.current > 0) { shakeRef.current -= dt * 0.1; }
    render();
  };
  loopRef.current = mainLoop;

  const checkSpawns = (totalMs: number) => {
      const sec = totalMs / 1000;
      if (config.wallInterval[0] > 0 && sec - lastWallSpawnRef.current >= config.wallInterval[0]) { spawnWall(performance.now()); lastWallSpawnRef.current = sec; }
      if (config.poisonInterval[0] > 0 && sec - lastPoisonSpawnRef.current >= config.poisonInterval[0]) { spawnItem(ItemType.POISON); lastPoisonSpawnRef.current = sec; }
      if (config.trapInterval[0] > 0 && sec - lastTrapSpawnRef.current >= config.trapInterval[0]) { spawnItem(ItemType.TRAP); lastTrapSpawnRef.current = sec; }
  };

  const spawnWall = (now: number) => {
      const p = getRandomPosition(snakesRef.current, wallsRef.current, itemsRef.current);
      wallsRef.current.push({ position: p, isWarning: true, spawnTime: now });
      soundManager.playWarning(); shakeRef.current = 2;
      setTimeout(() => { const w = wallsRef.current.find(wall => wall.spawnTime === now); if (w) w.isWarning = false; }, 500);
  };

  const spawnItem = (type: ItemType) => {
      itemsRef.current.push({ id: `${type}_${Date.now()}`, type, position: getRandomPosition(snakesRef.current, wallsRef.current, itemsRef.current), isWarning: false });
  };

  const checkRespawn = (now: number) => {
    snakesRef.current.forEach(s => {
        if (s.isDead && s.id !== EntityType.PLAYER) {
            if (!s.respawnTimer) s.respawnTimer = now + AI_RESPAWN_DELAY;
            if (now >= s.respawnTimer) {
                const p = getRandomPosition(snakesRef.current, wallsRef.current, itemsRef.current);
                s.isDead = false; s.body = [{ x: p.x, y: p.y }, { x: p.x, y: p.y + 1 }, { x: p.x, y: p.y + 2 }];
                s.direction = { x: 0, y: -1 }; s.nextDirection = { x: 0, y: -1 }; s.respawnTimer = undefined;
            }
        }
    });
  };

  const determineWinner = (): string => {
    const sorted = [...snakesRef.current].sort((a, b) => b.score - a.score);
    return sorted[0].label;
  };

  const triggerAlert = (textKey: string, type: 'info' | 'warning' | 'danger') => {
    const txt = (TRANSLATIONS[language] as any)[textKey] || textKey;
    setAlert({ id: Date.now(), text: txt, type }); soundManager.playWarning();
    setTimeout(() => setAlert(prev => prev && prev.text === txt ? null : prev), 1500);
  };

  const endGame = (label: string) => {
    if (gameState !== GameMode.PLAYING) return;
    const p = snakesRef.current.find(s => s.id === EntityType.PLAYER);
    if (p) saveHighScore(difficulty, p.score);
    setGameState(label === playerName ? GameMode.VICTORY : GameMode.GAME_OVER);
    if (label !== playerName) {
      const snarky = (TRANSLATIONS[language] as any).SNARKY;
      if (snarky) setSnarkyMessage(snarky[Math.floor(Math.random() * snarky.length)]);
    }
  };

  const render = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      const w = canvasRef.current!.width, h = canvasRef.current!.height, cs = BASE_CELL_SIZE;
      ctx.save();
      if (shakeRef.current > 0) ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current);
      ctx.fillStyle = COLORS.GRID_BG; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = COLORS.GRID_LINES; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = 0; x <= w; x += cs) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
      for (let y = 0; y <= h; y += cs) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
      ctx.stroke();

      ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = '#ff3131'; ctx.strokeStyle = '#ff3131'; ctx.lineWidth = 4; ctx.strokeRect(0, 0, w, h); ctx.restore();

      wallsRef.current.forEach(wall => {
          const x = wall.position.x * cs, y = wall.position.y * cs;
          if (wall.isWarning) { ctx.fillStyle = COLORS.WARNING; ctx.fillRect(x + 2, y + 2, cs - 4, cs - 4); } 
          else { ctx.fillStyle = COLORS.WALL_MAIN; ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2); ctx.strokeStyle = COLORS.WALL_BORDER; ctx.lineWidth = 2; ctx.strokeRect(x + 2, y + 2, cs - 4, cs - 4); }
      });

      itemsRef.current.forEach(item => {
          const cx = item.position.x * cs + cs / 2, cy = item.position.y * cs + cs / 2, r = cs / 2 - 2;
          ctx.save();
          if (item.type === ItemType.APPLE) {
              ctx.shadowColor = COLORS.APPLE; ctx.shadowBlur = 15; ctx.fillStyle = COLORS.APPLE; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
              ctx.shadowBlur = 0; ctx.fillStyle = '#006400'; ctx.beginPath(); ctx.ellipse(cx + 2, cy - r - 1, 3, 5, Math.PI / 4, 0, Math.PI * 2); ctx.fill();
              ctx.strokeStyle = COLORS.APPLE_GLOW; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, Math.PI * 2); ctx.stroke();
          } else if (item.type === ItemType.POISON) {
              ctx.shadowColor = COLORS.POISON; ctx.shadowBlur = 20; ctx.fillStyle = COLORS.POISON; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
              ctx.strokeStyle = COLORS.POISON_GLOW; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, Math.PI * 2); ctx.stroke();
          } else if (item.type === ItemType.TRAP) {
              ctx.shadowColor = COLORS.TRAP; ctx.shadowBlur = 10; ctx.fillStyle = COLORS.TRAP; ctx.beginPath(); ctx.roundRect(cx - r, cy - r, r * 2, r * 2, 4); ctx.fill();
          }
          ctx.restore();
      });

      snakesRef.current.forEach(snake => {
          if (snake.isDead) return;
          const segRadius = cs / 2 - 0.5;
          ctx.save(); ctx.shadowBlur = 15; ctx.shadowColor = snake.color;
          for (let i = snake.body.length - 1; i >= 0; i--) {
              const p = snake.body[i], cx = p.x * cs + cs / 2, cy = p.y * cs + cs / 2;
              ctx.fillStyle = snake.color; ctx.beginPath(); ctx.arc(cx, cy, segRadius, 0, Math.PI * 2); ctx.fill();
              if (i === 0) {
                  ctx.shadowBlur = 0;
                  const dx = snake.direction.x, dy = snake.direction.y, ePush = 5, eSpread = 5;
                  const lEX = cx + (dx * ePush) - (dy * eSpread), lEY = cy + (dy * ePush) + (dx * eSpread);
                  const rEX = cx + (dx * ePush) + (dy * eSpread), rEY = cy + (dy * ePush) - (dx * eSpread);
                  ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(lEX, lEY, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(rEX, rEY, 3.5, 0, Math.PI * 2); ctx.fill();
                  ctx.fillStyle = 'black'; ctx.beginPath(); ctx.arc(lEX + dx * 1.5, lEY + dy * 1.5, 1.8, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(rEX + dx * 1.5, rEY + dy * 1.5, 1.8, 0, Math.PI * 2); ctx.fill();
                  ctx.strokeStyle = '#FF0000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + dx * 8, cy + dy * 8); ctx.lineTo(cx + dx * 16, cy + dy * 16);
                  const tx = cx + dx * 16, ty = cy + dy * 16, fS = 5;
                  ctx.moveTo(tx, ty); ctx.lineTo(tx + (dy * fS) + (dx * fS), ty - (dx * fS) + (dy * fS));
                  ctx.moveTo(tx, ty); ctx.lineTo(tx - (dy * fS) + (dx * fS), ty + (dx * fS) + (dy * fS)); ctx.stroke();
                  // INDICATOR: Fixed logic via gameTimeRef to ensure it stops exactly at 2000ms
                  if (snake.id === EntityType.PLAYER && gameTimeRef.current < 2000) {
                    const bob = Math.sin(Date.now() / 150) * 8, triX = cx, triY = cy - 45 + bob;
                    ctx.save(); ctx.shadowColor = COLORS.TRAP; ctx.shadowBlur = 20; ctx.fillStyle = COLORS.TRAP; ctx.beginPath();
                    ctx.moveTo(triX - 12, triY); ctx.lineTo(triX + 12, triY); ctx.lineTo(triX, triY + 15); ctx.closePath(); ctx.fill(); ctx.restore();
                  }
              }
          }
          ctx.restore();
      });

      particlesRef.current.forEach(p => { ctx.fillStyle = p.color; ctx.globalAlpha = p.life; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); });
      ctx.globalAlpha = 1.0; ctx.restore();
  };

  const leader = snakesRef.current.length > 0 ? [...snakesRef.current].sort((a, b) => b.score - a.score)[0] : null;
  const player = snakesState.find(s => s.id === EntityType.PLAYER);
  const bR = snakesState.find(s => s.id === EntityType.BOT_RED), bO = snakesState.find(s => s.id === EntityType.BOT_ORANGE);

  return (
    <div className="w-full h-screen bg-[#050505] flex flex-col items-center font-sans crt-screen overflow-hidden">
        <div className="w-full max-w-[1000px] flex justify-between items-center px-6 py-4 bg-white/5 backdrop-blur-xl border-b border-white/10 z-20 shadow-2xl rounded-b-2xl">
             <div className="flex flex-col items-start min-w-[120px]">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#00ff80] animate-pulse" /><span className="text-[10px] text-[#00ff80] font-black uppercase tracking-[0.2em]">{playerName}</span></div>
                <div className="flex items-baseline gap-1"><span className="text-3xl font-black text-white">{player?.score || 0}</span><span className="text-[10px] text-white/30 font-bold ml-1">BEST: {bestScore}</span></div>
             </div>
             <div className="flex flex-col items-center">
                 <div className="bg-black/40 px-6 py-2 rounded-full border border-white/5 flex items-center gap-3 mb-1">
                    <span className="font-mono text-2xl font-black text-white/90 tracking-widest">{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
                 </div>
                 <div className="flex items-center gap-2"><Trophy className={`w-3 h-3 ${leader?.id === EntityType.PLAYER ? 'text-[#00ff80]' : 'text-red-500'}`} /><span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">{t.RACE_LEADER}: <span className={leader?.id === EntityType.PLAYER ? 'text-[#00ff80]' : 'text-white'}>{leader?.label}</span></span></div>
             </div>
             <div className="flex items-center gap-4">
                 <button onClick={toggleMute} className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">{isMuted ? <VolumeX className="w-5 h-5 text-red-500" /> : <Volume2 className="w-5 h-5 text-white" />}</button>
                 <div className="flex flex-col items-end min-w-[120px] gap-0">
                    <div className="flex items-center gap-3"><span className="text-[10px] text-[#ff3131] font-black uppercase tracking-[0.1em]">{t.AI_NAME}:</span><span className="text-xl font-black text-white">{bR?.score || 0}</span></div>
                    {bO && <div className="flex items-center gap-3"><span className="text-[10px] text-[#ff9000] font-black uppercase tracking-[0.1em]">{t.AI_NAME}:</span><span className="text-xl font-black text-white">{bO?.score || 0}</span></div>}
                 </div>
             </div>
        </div>
        <div ref={containerRef} className="relative flex-1 w-full flex items-center justify-center overflow-hidden min-h-0 p-4">
             <div className="relative pointer-events-auto shadow-[0_0_100px_rgba(0,0,0,0.9)] bg-black rounded-sm border border-white/5 overflow-hidden">
                <canvas ref={canvasRef} className="block" style={{ objectFit: 'contain' }} />
                {countdown > 0 && <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm"><span className="text-[180px] font-black italic text-white animate-bounce" style={{ fontFamily: '"Black Ops One", cursive' }}>{countdown}</span></div>}
                {isPaused && <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-md" onClick={togglePause}><div className="flex flex-col items-center gap-4"><Pause className="w-24 h-24 text-white animate-pulse" /><span className="text-4xl font-black text-white tracking-[0.5em] uppercase">PAUSED</span></div></div>}
                {alert && <div className="absolute top-10 inset-x-0 flex justify-center z-30 pointer-events-none px-4"><div className="px-10 py-4 rounded-full border border-white/20 font-black uppercase text-white shadow-2xl backdrop-blur-3xl bg-orange-600/50 flex items-center gap-4"><ShieldAlert className="w-6 h-6" /><span>{alert.text}</span></div></div>}
             </div>
             {gameState !== GameMode.PLAYING && (
                 <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/95 backdrop-blur-2xl">
                      <div className="relative z-50 flex flex-col items-center w-full px-6 text-center">
                          {gameState === GameMode.VICTORY ? <h2 className="text-7xl sm:text-9xl font-black text-[#00ff80] italic drop-shadow-[0_0_50px_#00ff80] mb-6" style={{ fontFamily: '"Black Ops One", cursive' }}>{t.VICTORY}</h2> : <h2 className="text-8xl sm:text-[180px] font-black text-red-600 italic drop-shadow-[0_0_60px_rgba(220,38,38,0.8)] mb-6" style={{ fontFamily: '"Black Ops One", cursive' }}>{t.DEFEAT}</h2>}
                          <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8 mb-12 shadow-inner"><p className="text-[#00ff80] font-mono text-[10px] uppercase tracking-[0.3em] opacity-50 mb-4">TACTICAL ANALYSIS</p><p className="text-white font-black uppercase text-xl italic leading-tight">"{snarkyMessage || (gameState === GameMode.VICTORY ? t.YOU_WIN : t.WINNER_IS)}"</p></div>
                          <div className="flex flex-col gap-6 w-full max-w-xs">
                              <button onClick={onRematch} className={`w-full py-6 font-black uppercase tracking-[0.3em] text-lg rounded-2xl ${gameState === GameMode.VICTORY ? 'bg-[#00ff80] text-black shadow-[#00ff80]/40' : 'bg-red-600 text-white shadow-red-600/40'}`}>{t.PLAY_AGAIN}</button>
                              <button onClick={onExit} className="w-full py-4 text-white/50 font-bold uppercase border border-white/5 rounded-xl"><ArrowLeft className="w-5 h-5 inline mr-2" /> {t.MENU}</button>
                          </div>
                      </div>
                 </div>
             )}
        </div>
        <div className="w-full max-w-[600px] px-8 py-6 flex justify-between items-center z-30 bg-black/50 backdrop-blur-md border-t border-white/5 rounded-t-3xl">
           <button onClick={togglePause} className="w-16 h-16 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white">{isPaused ? <Play className="w-8 h-8" /> : <Pause className="w-8 h-8" />}</button>
           <div className="grid grid-cols-3 gap-3">
              <div /><button onMouseDown={() => setDirection({ x: 0, y: -1 })} className="w-14 h-14 rounded-xl bg-white/5 border border-white/20 flex items-center justify-center"><ChevronUp className="w-8 h-8 text-white" /></button><div />
              <button onMouseDown={() => setDirection({ x: -1, y: 0 })} className="w-14 h-14 rounded-xl bg-white/5 border border-white/20 flex items-center justify-center"><ChevronLeft className="w-8 h-8 text-white" /></button>
              <button onMouseDown={() => setDirection({ x: 0, y: 1 })} className="w-14 h-14 rounded-xl bg-white/5 border border-white/20 flex items-center justify-center"><ChevronDown className="w-8 h-8 text-white" /></button>
              <button onMouseDown={() => setDirection({ x: 1, y: 0 })} className="w-14 h-14 rounded-xl bg-white/5 border border-white/20 flex items-center justify-center"><ChevronRight className="w-8 h-8 text-white" /></button>
           </div>
           <div className="w-16 h-16" /> 
        </div>
    </div>
  );
};

export default Game;
