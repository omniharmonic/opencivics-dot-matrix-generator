import { type Point, type Line, type Settings, Strategy } from '../types';

// Simple pseudo-random number generator for deterministic randomness
const mulberry32 = (a: number) => () => {
  let t = a += 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

export const generateGridPoints = (
  centerX: number,
  centerY: number,
  ringCount: number,
  symmetrySides: number,
  chaos: number,
  seed: number,
): Point[] => {
  const points: Point[] = [];
  let idCounter = 0;
  const rand = mulberry32(seed);

  if (ringCount <= 0 || symmetrySides < 3) return [];

  const maxRadius = Math.min(centerX, centerY) * 0.9;
  const ringSpacing = maxRadius / (ringCount - 1 || 1);

  for (let ring = 0; ring < ringCount; ring++) {
    const radius = ring === 0 && ringCount > 1 ? 0 : ring * ringSpacing;
    if (ring === 0 && ringCount > 1) {
        // Special case for a single center point if there's more than one ring
        const chaosX = (rand() - 0.5) * chaos * 10;
        const chaosY = (rand() - 0.5) * chaos * 10;
        points.push({ id: idCounter++, x: centerX + chaosX, y: centerY + chaosY, ring, angle: 0 });
        continue;
    }
    
    const pointsInRing = ring === 0 ? 1 : ring * symmetrySides;
    for (let i = 0; i < pointsInRing; i++) {
      const angle = (i / pointsInRing) * 2 * Math.PI;
      const chaosX = (rand() - 0.5) * chaos * 10;
      const chaosY = (rand() - 0.5) * chaos * 10;
      const x = centerX + radius * Math.cos(angle) + chaosX;
      const y = centerY + radius * Math.sin(angle) + chaosY;
      points.push({ id: idCounter++, x, y, ring, angle });
    }
  }
  return points;
};

const connectPoints = (points: Point[], settings: Settings, rand: () => number): Line[] => {
  const lines: Line[] = [];
  const pointsByRing: Point[][] = [];
  
  for(const p of points) {
    if (!pointsByRing[p.ring]) pointsByRing[p.ring] = [];
    pointsByRing[p.ring].push(p);
  }

  const { startRing, endRing, tangentialStep, radialTwist, symmetrySides } = settings;

  for (let ring = startRing; ring <= endRing; ring++) {
    const currentRingPoints = pointsByRing[ring] || [];
    const nextRingPoints = pointsByRing[ring + 1] || [];
    
    // Tangential connections (within the same ring)
    if (tangentialStep > 0 && currentRingPoints.length > 1) {
        for (let i = 0; i < currentRingPoints.length; i++) {
            const p1 = currentRingPoints[i];
            const p2 = currentRingPoints[(i + tangentialStep) % currentRingPoints.length];
            lines.push([p1.id, p2.id]);
        }
    }
    
    // Radial connections (between adjacent rings)
    if (ring < endRing && nextRingPoints.length > 0 && currentRingPoints.length > 0) {
        for (let i = 0; i < currentRingPoints.length; i++) {
            const p1 = currentRingPoints[i];
            const ratio = nextRingPoints.length / currentRingPoints.length;
            const targetIndex = Math.round(i * ratio + (radialTwist * symmetrySides / 10));
            const p2 = nextRingPoints[targetIndex % nextRingPoints.length];
            if (p2) lines.push([p1.id, p2.id]);
        }
    }
  }
  return lines;
};

export const generateArt = (points: Point[], settings: Settings): Line[] => {
  const rand = mulberry32(settings.seed);
  const { strategy, startRing, endRing, clusterCount, maxConnections } = settings;
  
  const activePoints = points.filter(p => p.ring >= startRing && p.ring <= endRing);
  if (activePoints.length === 0) return [];
  
  switch (strategy) {
    case Strategy.Web:
    case Strategy.Spokes:
    case Strategy.Swirl:
        return connectPoints(points, settings, rand);

    case Strategy.Random: {
        const lines: Line[] = [];
        const connections: Record<number, number> = {};
        for(let i=0; i < activePoints.length * 2; i++) { // Attempt more connections
            const p1 = activePoints[Math.floor(rand() * activePoints.length)];
            const p2 = activePoints[Math.floor(rand() * activePoints.length)];
            connections[p1.id] = (connections[p1.id] || 0);
            connections[p2.id] = (connections[p2.id] || 0);
            if (p1.id !== p2.id && connections[p1.id] < maxConnections && connections[p2.id] < maxConnections) {
                lines.push([p1.id, p2.id]);
                connections[p1.id]++;
                connections[p2.id]++;
            }
        }
        return lines;
    }
    
    case Strategy.Clusters: {
        const lines: Line[] = [];
        const centers = [...Array(clusterCount)].map(() => activePoints[Math.floor(rand() * activePoints.length)]);
        for(const p of activePoints) {
            let closestCenter = centers[0];
            let minDistance = Infinity;
            for(const center of centers) {
                if (p.id === center.id) continue;
                const dist = Math.sqrt((p.x - center.x) ** 2 + (p.y - center.y) ** 2);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestCenter = center;
                }
            }
            if(closestCenter) lines.push([p.id, closestCenter.id]);
        }
        return lines;
    }

    default:
      return [];
  }
};
