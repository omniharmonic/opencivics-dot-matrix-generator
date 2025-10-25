import React, { useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import { type Point, type Line, type Settings } from '../types';

interface ArtCanvasProps {
  points: Point[];
  lines: Line[];
  settings: Settings;
  width: number;
  height: number;
}

export interface ArtCanvasHandles {
  exportSvg: () => void;
  exportPng: () => void;
}

const getCurvePath = (p1: Point, p2: Point, curvature: number): string => {
  if (curvature === 0) {
      return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
  }
  
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx*dx + dy*dy);
  if (len === 0) return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;

  // Perpendicular vector
  const normalX = -dy / len;
  const normalY = dx / len;

  const controlPointOffset = len * curvature * 0.5;

  const controlX = midX + normalX * controlPointOffset;
  const controlY = midY + normalY * controlPointOffset;

  return `M ${p1.x},${p1.y} Q ${controlX},${controlY} ${p2.x},${p2.y}`;
};


export const ArtCanvas = forwardRef<ArtCanvasHandles, ArtCanvasProps>(
  ({ points, lines, settings, width, height }, ref) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const { lineWidth, dotSize, curvature } = settings;
    
    const pointsById = useMemo(() => new Map(points.map(p => [p.id, p])), [points]);

    useImperativeHandle(ref, () => ({
      exportSvg,
      exportPng,
    }));

    const triggerDownload = (href: string, filename: string) => {
        const link = document.createElement('a');
        link.href = href;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        if (href.startsWith('blob:')) {
          URL.revokeObjectURL(href);
        }
    }

    const getSvgString = () => {
        if (!svgRef.current) return '';
        const svg = svgRef.current.cloneNode(true) as SVGSVGElement;
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        svg.setAttribute("width", `${width}`);
        svg.setAttribute("height", `${height}`);
        return new XMLSerializer().serializeToString(svg);
    }

    const exportSvg = () => {
      const svgData = getSvgString();
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `art-export-${Date.now()}.svg`);
    };

    const exportPng = () => {
      const svgData = getSvgString();
      const svgUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 2; // For higher resolution PNG
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(scale, scale);
          ctx.fillStyle = 'white';
          ctx.fillRect(0,0,width,height);
          ctx.drawImage(img, 0, 0);
          const pngUrl = canvas.toDataURL('image/png');
          triggerDownload(pngUrl, `art-export-${Date.now()}.png`);
        }
      };
      img.src = svgUrl;
    };

    return (
      <div className="bg-white rounded-lg shadow-2xl overflow-hidden aspect-square w-full max-w-[500px] md:max-w-[500px]">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
        >
          <rect width="100%" height="100%" fill="white" />
          {lines.map(([id1, id2], index) => {
            const p1 = pointsById.get(id1);
            const p2 = pointsById.get(id2);
            if (!p1 || !p2) return null;
            const d = getCurvePath(p1, p2, curvature);
            return (
              <path
                key={`${id1}-${id2}-${index}`}
                d={d}
                stroke="black"
                strokeWidth={lineWidth}
                strokeLinecap="round"
                fill="none"
              />
            );
          })}
          {dotSize > 0 && points.map(point => (
            <circle key={point.id} cx={point.x} cy={point.y} r={dotSize} fill="black" />
          ))}
        </svg>
      </div>
    );
  }
);