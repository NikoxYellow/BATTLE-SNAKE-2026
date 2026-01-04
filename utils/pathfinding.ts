
import { Point, SnakeEntity, Wall, Difficulty } from '../types';
import { GRID_W, GRID_H } from './constants';

interface Node {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

const isWalkable = (
  x: number,
  y: number,
  snakes: SnakeEntity[],
  walls: Wall[],
  checkWarnings: boolean = false
): boolean => {
  if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return false;

  // Wall collisions
  if (walls.some(w => (checkWarnings || !w.isWarning) && w.position.x === x && w.position.y === y)) return false;

  // Snake collisions
  for (const snake of snakes) {
    const len = snake.body.length;
    // Dead snakes are permanent obstacles, alive snakes' tails are treated as solid (simpler AI)
    const effectiveLen = snake.isDead ? len : len - 1;

    for (let i = 0; i < effectiveLen; i++) {
       if (snake.body[i].x === x && snake.body[i].y === y) return false;
    }
  }

  return true;
};

const getAccessibleArea = (
  startX: number,
  startY: number,
  snakes: SnakeEntity[],
  walls: Wall[],
  limit: number
): number => {
  const queue: {x: number, y: number}[] = [{x: startX, y: startY}];
  const visited = new Set<string>();
  visited.add(`${startX},${startY}`);
  let count = 0;

  while (queue.length > 0) {
    const curr = queue.shift()!;
    count++;
    if (count >= limit) return limit;

    const neighbors = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
    for (const n of neighbors) {
      const nx = curr.x + n.x;
      const ny = curr.y + n.y;
      const key = `${nx},${ny}`;
      if (!visited.has(key) && isWalkable(nx, ny, snakes, walls, true)) {
        visited.add(key);
        queue.push({x: nx, y: ny});
      }
    }
  }
  return count;
};

const findPath = (
  start: Point,
  end: Point,
  snakes: SnakeEntity[],
  walls: Wall[],
  timeoutOps: number = 1000
): Point[] | null => {
  const openSet: Node[] = [];
  const closedSet = new Set<string>();
  const hDist = Math.abs(start.x - end.x) + Math.abs(start.y - end.y);
  openSet.push({ x: start.x, y: start.y, g: 0, h: hDist, f: hDist, parent: null });
  
  let ops = 0;
  while (openSet.length > 0) {
    ops++;
    if (ops > timeoutOps) return null; 

    let lowestIdx = 0;
    for(let i=1; i<openSet.length; i++) {
      if(openSet[i].f < openSet[lowestIdx].f) lowestIdx = i;
    }
    const current = openSet[lowestIdx];
    
    if (current.x === end.x && current.y === end.y) {
      const path: Point[] = [];
      let temp: Node | null = current;
      while(temp) {
        path.push({x: temp.x, y: temp.y});
        temp = temp.parent;
      }
      return path.reverse();
    }
    
    openSet.splice(lowestIdx, 1);
    closedSet.add(`${current.x},${current.y}`);
    
    const neighbors = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
    for(const n of neighbors) {
      const nx = current.x + n.x;
      const ny = current.y + n.y;
      if(closedSet.has(`${nx},${ny}`)) continue;
      if(!isWalkable(nx, ny, snakes, walls, true)) continue;
      
      const gScore = current.g + 1;
      let existing = openSet.find(node => node.x === nx && node.y === ny);
      if(!existing) {
        const hVal = Math.abs(nx - end.x) + Math.abs(ny - end.y);
        openSet.push({ x: nx, y: ny, g: gScore, h: hVal, f: gScore + hVal, parent: current });
      } else if (gScore < existing.g) {
        existing.g = gScore;
        existing.f = gScore + existing.h;
        existing.parent = current;
      }
    }
  }
  return null;
};

export const getNextMove = (
  head: Point,
  target: Point,
  snakes: SnakeEntity[],
  walls: Wall[],
  selfId: string,
  difficulty: Difficulty
): Point => {
  const me = snakes.find(s => s.id === selfId);
  if (!me) return { x: 0, y: 0 };
  
  const neighbors = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
  const validMoves = neighbors.filter(dir => {
    // Prevent immediate 180-degree turn
    if (dir.x === -me.direction.x && dir.y === -me.direction.y) return false;
    return isWalkable(head.x + dir.x, head.y + dir.y, snakes, walls, false);
  });

  if (validMoves.length === 0) return me.direction;

  // TIER 1: NORMAL (Greedy heuristic)
  if (difficulty === Difficulty.NORMAL) {
    const dx = target.x - head.x;
    const dy = target.y - head.y;

    // Sort moves by which one gets us closer to target
    const greedyMoves = [...validMoves].sort((a, b) => {
      const distA = Math.abs((head.x + a.x) - target.x) + Math.abs((head.y + a.y) - target.y);
      const distB = Math.abs((head.x + b.x) - target.x) + Math.abs((head.y + b.y) - target.y);
      return distA - distB;
    });

    // Pick best or random if best is blocked
    return greedyMoves[0] || me.direction;
  }

  // TIER 2: MOYEN (Pathfinder BFS)
  if (difficulty === Difficulty.MOYEN) {
    const path = findPath(head, target, snakes, walls);
    if (path && path.length > 1) {
      return { x: path[1].x - head.x, y: path[1].y - head.y };
    }
    // Fallback: simple greedy if no path found
    return validMoves[0] || me.direction;
  }

  // TIER 3: DIFFICILE (Survivalist BFS + Area Fallback)
  const path = findPath(head, target, snakes, walls);
  if (path && path.length > 1) {
    const move = { x: path[1].x - head.x, y: path[1].y - head.y };
    // Safety check: ensure moving here doesn't lead to a tiny trapped room
    const space = getAccessibleArea(head.x + move.x, head.y + move.y, snakes, walls, me.body.length + 5);
    if (space >= me.body.length) return move;
  }

  // Fallback: SURVIVAL MODE (Find largest open area)
  let bestSurvivalMove = validMoves[0];
  let maxSpace = -1;
  for (const move of validMoves) {
    const space = getAccessibleArea(head.x + move.x, head.y + move.y, snakes, walls, 150);
    if (space > maxSpace) {
      maxSpace = space;
      bestSurvivalMove = move;
    }
  }
  return bestSurvivalMove;
};
