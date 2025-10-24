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
  startRing: number,
  endRing: number,
  symmetrySides: number,
  chaos: number,
  seed: number,
): Point[] => {
  const points: Point[] = [];
  let idCounter = 0;
  const rand = mulberry32(seed);

  if (endRing < startRing || symmetrySides < 3) return [];

  const maxRadius = Math.min(centerX, centerY) * 0.9;
  const totalRings = endRing + 1; // +1 because ring 0 exists
  const ringSpacing = maxRadius / (totalRings - 1 || 1);

  for (let ring = connectionStartRing; ring <= connectionEndRing; ring++) {
    const radius = ring === 0 ? 0 : ring * ringSpacing;

    if (ring === 0) {
        // Special case for center point
        const chaosX = (rand() - 0.5) * chaos * 10;
        const chaosY = (rand() - 0.5) * chaos * 10;
        points.push({ id: idCounter++, x: centerX + chaosX, y: centerY + chaosY, ring, angle: 0 });
        continue;
    }

    const pointsInRing = ring * symmetrySides;
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

  const { connectionStartRing, connectionEndRing, tangentialStep, radialTwist, symmetrySides } = settings;

  for (let ring = connectionStartRing; ring <= connectionEndRing; ring++) {
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
    if (ring < connectionEndRing && nextRingPoints.length > 0 && currentRingPoints.length > 0) {
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
  const { strategy, connectionStartRing, connectionEndRing, clusterCount, maxConnections } = settings;

  const activePoints = points.filter(p => p.ring >= connectionStartRing && p.ring <= connectionEndRing);
  if (activePoints.length === 0) return [];

  switch (strategy) {
    case Strategy.Web:
        return generateWebStrategy(points, settings, rand);

    case Strategy.Spokes:
        return generateSpokesStrategy(points, settings, rand);

    case Strategy.Swirl:
        return generateSwirlStrategy(points, settings, rand);

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

// Web Strategy: Connects both tangentially and radially for complex web patterns
const generateWebStrategy = (points: Point[], settings: Settings, rand: () => number): Line[] => {
  return connectPoints(points, settings, rand);
};

// Spokes Strategy: Primarily radial connections from center outward, minimal tangential
const generateSpokesStrategy = (points: Point[], settings: Settings, rand: () => number): Line[] => {
  const lines: Line[] = [];
  const pointsByRing: Point[][] = [];

  for(const p of points) {
    if (!pointsByRing[p.ring]) pointsByRing[p.ring] = [];
    pointsByRing[p.ring].push(p);
  }

  const { connectionStartRing, connectionEndRing, radialTwist, symmetrySides } = settings;

  // Focus on radial connections (spokes), minimal tangential
  for (let ring = connectionStartRing; ring < connectionEndRing; ring++) {
    const currentRingPoints = pointsByRing[ring] || [];
    const nextRingPoints = pointsByRing[ring + 1] || [];

    if (nextRingPoints.length > 0 && currentRingPoints.length > 0) {
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

// Swirl Strategy: Emphasizes tangential connections with twisted radial connections
const generateSwirlStrategy = (points: Point[], settings: Settings, rand: () => number): Line[] => {
  const lines: Line[] = [];
  const pointsByRing: Point[][] = [];

  for(const p of points) {
    if (!pointsByRing[p.ring]) pointsByRing[p.ring] = [];
    pointsByRing[p.ring].push(p);
  }

  const { connectionStartRing, connectionEndRing, tangentialStep, radialTwist, symmetrySides } = settings;

  for (let ring = connectionStartRing; ring <= connectionEndRing; ring++) {
    const currentRingPoints = pointsByRing[ring] || [];
    const nextRingPoints = pointsByRing[ring + 1] || [];

    // Strong tangential connections for swirl effect
    if (currentRingPoints.length > 1) {
        for (let i = 0; i < currentRingPoints.length; i++) {
            const p1 = currentRingPoints[i];
            // Create multiple tangential connections for swirl effect
            const step1 = Math.max(1, tangentialStep);
            const step2 = Math.max(1, tangentialStep + 1);

            const p2 = currentRingPoints[(i + step1) % currentRingPoints.length];
            const p3 = currentRingPoints[(i + step2) % currentRingPoints.length];

            lines.push([p1.id, p2.id]);
            if (rand() > 0.5) { // Add some randomness
                lines.push([p1.id, p3.id]);
            }
        }
    }

    // Twisted radial connections
    if (ring < connectionEndRing && nextRingPoints.length > 0 && currentRingPoints.length > 0) {
        for (let i = 0; i < currentRingPoints.length; i++) {
            const p1 = currentRingPoints[i];
            const ratio = nextRingPoints.length / currentRingPoints.length;
            // Stronger twist for swirl effect
            const twist = (radialTwist * symmetrySides / 5) + (rand() - 0.5) * 2;
            const targetIndex = Math.round(i * ratio + twist);
            const p2 = nextRingPoints[targetIndex % nextRingPoints.length];
            if (p2) lines.push([p1.id, p2.id]);
        }
    }
  }

  return lines;
};
